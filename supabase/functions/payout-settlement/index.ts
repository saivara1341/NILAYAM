import { createClient } from 'npm:@supabase/supabase-js@2'
import { processRazorpayEvent } from '../_shared/razorpay-processing.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const basicAuth = () => 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

const createTransfer = async (paymentId: string, linkedAccountId: string, amount: number, notes: Record<string, unknown>) => {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transfers: [
        {
          account: linkedAccountId,
          amount: Math.round(amount * 100),
          currency: 'INR',
          notes
        }
      ]
    })
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.description || payload?.message || 'Razorpay transfer failed')
  return payload
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    return json({ error: 'Missing payout settlement secrets' }, 500)
  }

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Missing action' }, 400)

  if (body.action === 'execute_transfer') {
    const payoutId = body.ownerPayoutId as string | undefined
    if (!payoutId) return json({ error: 'Missing ownerPayoutId' }, 400)

    const { data: payout } = await supabase
      .from('owner_payouts')
      .select('id, owner_id, payment_id, amount')
      .eq('id', payoutId)
      .single()

    if (!payout?.payment_id) return json({ error: 'Missing payment for payout' }, 400)

    const [{ data: payment }, { data: account }] = await Promise.all([
      supabase.from('payments').select('external_reference').eq('id', payout.payment_id).single(),
      supabase.from('owner_linked_accounts').select('linked_account_id').eq('owner_id', payout.owner_id).maybeSingle()
    ])

    if (!payment?.external_reference || !account?.linked_account_id) {
      return json({ error: 'Payment reference or linked account missing' }, 400)
    }

    try {
      const transferResponse = await createTransfer(payment.external_reference, account.linked_account_id, Number(payout.amount || 0), {
        owner_payout_id: payout.id,
        owner_id: payout.owner_id
      })

      const transferId = transferResponse?.items?.[0]?.id || null
      await supabase.from('payout_transfer_logs').upsert({
        owner_payout_id: payout.id,
        payment_id: payout.payment_id,
        owner_id: payout.owner_id,
        razorpay_payment_id: payment.external_reference,
        razorpay_transfer_id: transferId,
        linked_account_id: account.linked_account_id,
        amount: payout.amount,
        currency: 'INR',
        transfer_status: 'processing',
        request_payload: body,
        response_payload: transferResponse
      }, { onConflict: 'owner_payout_id' })

      await supabase.from('owner_payouts').update({
        payout_status: 'processing',
        settlement_mode: 'razorpay_route'
      }).eq('id', payout.id)

      return json({ success: true, payoutId: payout.id, transferId })
    } catch (error) {
      await supabase.from('payout_retry_queue').insert({
        owner_payout_id: payout.id,
        owner_id: payout.owner_id,
        payment_id: payout.payment_id,
        retry_reason: error instanceof Error ? error.message : 'Transfer failed',
        status: 'queued',
        attempts: 0
      }).then(() => undefined).catch(() => undefined)

      return json({ error: error instanceof Error ? error.message : 'Transfer failed' }, 500)
    }
  }

  if (body.action === 'retry_queue') {
    const queueId = body.queueId as string | undefined
    if (!queueId) return json({ error: 'Missing queueId' }, 400)

    const { data: queueItem } = await supabase
      .from('payout_retry_queue')
      .select('id, owner_payout_id, attempts')
      .eq('id', queueId)
      .single()

    if (!queueItem) return json({ error: 'Retry queue item not found' }, 404)

    await supabase
      .from('payout_retry_queue')
      .update({
        status: 'retrying',
        attempts: (queueItem.attempts || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId)

    return await (async () => {
      const response = await fetch(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_transfer', ownerPayoutId: queueItem.owner_payout_id })
      })
      const payload = await response.json()
      if (response.ok) {
        await supabase.from('payout_retry_queue').update({ status: 'completed' }).eq('id', queueId)
      } else {
        await supabase.from('payout_retry_queue').update({
          status: queueItem.attempts >= 4 ? 'dead_letter' : 'queued',
          last_error: payload.error || 'Retry failed',
          next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        }).eq('id', queueId)
      }
      return json(payload, response.status)
    })()
  }

  if (body.action === 'replay_webhook') {
    const webhookEventId = body.webhookEventId as string | undefined
    if (!webhookEventId) return json({ error: 'Missing webhookEventId' }, 400)

    const { data: webhookEvent } = await supabase
      .from('razorpay_webhook_events')
      .select('payload, signature')
      .eq('id', webhookEventId)
      .single()

    if (!webhookEvent?.payload) return json({ error: 'Webhook event not found' }, 404)

    const result = await processRazorpayEvent(
      supabase,
      webhookEvent.payload as Record<string, any>,
      webhookEvent.signature || '',
      { forceReplay: true }
    )

    await supabase.from('webhook_replay_requests').insert({
      webhook_event_id: webhookEventId,
      status: 'completed',
      processed_at: new Date().toISOString(),
      replay_notes: 'Replay executed successfully'
    }).then(() => undefined).catch(() => undefined)

    return json(result)
  }

  return json({ error: 'Unknown action' }, 400)
})
