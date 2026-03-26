import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const basicAuth = () => 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

const safeInsertAudit = async (payload: Record<string, unknown>) => {
  await supabase.from('audit_log_entries').insert(payload).then(() => undefined).catch(() => undefined)
}

const safeCreateApproval = async (payload: Record<string, unknown>) => {
  await supabase.from('approval_requests').insert(payload).then(() => undefined).catch(() => undefined)
}

const createRazorpayOrder = async (payload: { amount: number; currency?: string; receipt?: string; notes?: Record<string, unknown> }) => {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: Math.round(Number(payload.amount || 0) * 100),
      currency: payload.currency || 'INR',
      receipt: payload.receipt,
      notes: payload.notes || {}
    })
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    return { error: body?.error?.description || 'Order creation failed', details: body, status: response.status }
  }

  return { data: body, status: response.status }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase secrets' }, 500)

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Missing action' }, 400)

  if (body.action === 'prepare_payment_order') {
    if (!razorpayKeyId || !razorpayKeySecret) return json({ error: 'Missing Razorpay secrets' }, 500)

    const amount = Number(body.amount || 0)
    const paymentType = String(body.paymentType || body.payment_type || 'rent')
    const tenantId = String(body.tenantId || body.tenant_id || '')
    const houseId = String(body.houseId || body.house_id || '')
    const paymentId = typeof body.paymentId === 'string' && !body.paymentId.startsWith('rent_due_') ? body.paymentId : null

    if (!tenantId || !houseId || !Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Invalid payment initialization payload' }, 400)
    }

    const { data: houseMeta, error: houseError } = await supabase
      .from('houses')
      .select('id, building_id, buildings(owner_id)')
      .eq('id', houseId)
      .maybeSingle()

    if (houseError || !houseMeta) {
      return json({ error: houseError?.message || 'Unable to resolve payment house mapping' }, 400)
    }

    const ownerId = (houseMeta as any)?.buildings?.owner_id || null
    const buildingId = houseMeta?.building_id || null

    const { data: ownerProfile } = ownerId
      ? await supabase
          .from('profiles')
          .select('full_name, payment_methods')
          .eq('id', ownerId)
          .maybeSingle()
      : { data: null as any }

    const linkedAccountId =
      ownerProfile?.payment_methods?.razorpayLinkedAccountId
      || ownerProfile?.payment_methods?.razorpayRouteAccountId
      || null
    const ownerDisplayName = ownerProfile?.full_name || ownerProfile?.payment_methods?.payeeName || 'Property Owner'

    let effectivePaymentId = paymentId as string | null

    if (effectivePaymentId) {
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          tenant_id: tenantId,
          house_id: houseId,
          amount,
          payment_type: paymentType,
          owner_id: ownerId,
          building_id: buildingId,
          status: 'pending',
          paid_date: null,
          settlement_preference: linkedAccountId ? 'route_transfer' : 'direct_owner',
          settlement_status: 'initializing'
        })
        .eq('id', effectivePaymentId)

      if (updatePaymentError) return json({ error: updatePaymentError.message }, 500)
    } else {
      const { data: insertedPayment, error: insertPaymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenantId,
          house_id: houseId,
          owner_id: ownerId,
          building_id: buildingId,
          amount,
          payment_type: paymentType,
          status: 'pending',
          due_date: new Date().toISOString(),
          settlement_preference: linkedAccountId ? 'route_transfer' : 'direct_owner',
          settlement_status: 'initializing'
        })
        .select('id')
        .single()

      if (insertPaymentError || !insertedPayment) {
        return json({ error: insertPaymentError?.message || 'Unable to create payment record' }, 500)
      }

      effectivePaymentId = insertedPayment.id
    }

    const orderPayload = await createRazorpayOrder({
      amount,
      currency: body.currency || 'INR',
      receipt: `rcpt_${effectivePaymentId}`,
      notes: {
        tenantId,
        houseId,
        paymentType,
        paymentId: effectivePaymentId,
        tenant_id: tenantId,
        house_id: houseId,
        building_id: buildingId || '',
        owner_id: ownerId || '',
        payment_id: effectivePaymentId,
        linked_account_id: linkedAccountId || '',
        owner_display_name: ownerDisplayName
      }
    })

    if ('error' in orderPayload) {
      await supabase.from('payments').update({
        status: 'failed',
        settlement_status: 'order_creation_failed'
      }).eq('id', effectivePaymentId)
      return json({ error: orderPayload.error, details: orderPayload.details }, orderPayload.status)
    }

    await supabase.from('payments').update({
      razorpay_order_id: orderPayload.data.id,
      status: 'pending',
      settlement_status: 'order_created',
      settlement_preference: linkedAccountId ? 'route_transfer' : 'direct_owner'
    }).eq('id', effectivePaymentId)

    await safeInsertAudit({
      owner_id: ownerId,
      actor_id: tenantId,
      action: 'payment_order_prepared',
      entity_table: 'payments',
      entity_id: String(effectivePaymentId),
      metadata: { razorpay_order_id: orderPayload.data.id, amount, paymentType }
    })

    return json({
      paymentId: effectivePaymentId,
      ownerId,
      buildingId,
      linkedAccountId,
      ownerDisplayName,
      order: orderPayload.data
    })
  }

  if (body.action === 'create_order') {
    if (!razorpayKeyId || !razorpayKeySecret) return json({ error: 'Missing Razorpay secrets' }, 500)

    const orderPayload = await createRazorpayOrder({
      amount: Number(body.amount || 0),
      currency: body.currency || 'INR',
      receipt: body.receipt,
      notes: body.notes || {}
    })
    if ('error' in orderPayload) return json({ error: orderPayload.error, details: orderPayload.details }, orderPayload.status)
    const payload = orderPayload.data

    if (body.notes?.payment_id) {
      await supabase.from('payments').update({
        razorpay_order_id: payload.id,
        status: 'pending',
        settlement_status: 'order_created',
        settlement_preference: 'route_transfer'
      }).eq('id', body.notes.payment_id)
    }

    return json(payload)
  }

  if (body.action === 'verify_payment') {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id, owner_id, building_id } = body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ success: false, message: 'Missing verification fields' }, 400)
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(razorpayKeySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`))
    const expected = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('')
    const success = expected === razorpay_signature

    if (payment_id) {
      await supabase.from('payments').update({
        status: success ? 'pending' : 'failed',
        razorpay_payment_id,
        razorpay_signature,
        settlement_status: success ? 'verification_passed' : 'verification_failed',
        owner_id: owner_id || null,
        building_id: building_id || null
      }).eq('id', payment_id)

      await safeInsertAudit({
        owner_id: owner_id || null,
        actor_id: owner_id || null,
        action: success ? 'payment_verification_passed' : 'payment_verification_failed',
        entity_table: 'payments',
        entity_id: String(payment_id),
        metadata: { razorpay_order_id, razorpay_payment_id }
      })
    }

    return json({ success, message: success ? 'Payment verification accepted' : 'Invalid payment signature' }, success ? 200 : 400)
  }

  if (body.action === 'submit_manual_proof') {
    const { paymentId, tenantId, houseId, amount, paymentType, fileName } = body
    if (!tenantId || !houseId || !amount) return json({ error: 'Missing manual proof payload' }, 400)

    let effectivePaymentId = paymentId as string | null
    if (!effectivePaymentId) {
      const { data: insertedPayment, error } = await supabase.from('payments').insert({
        tenant_id: tenantId,
        house_id: houseId,
        amount,
        payment_type: paymentType || 'rent',
        status: 'pending',
        settlement_status: 'proof_uploaded'
      }).select('id').single()

      if (error || !insertedPayment) return json({ error: error?.message || 'Unable to create payment' }, 500)
      effectivePaymentId = insertedPayment.id
    } else {
      await supabase.from('payments').update({
        status: 'pending',
        settlement_status: 'proof_uploaded'
      }).eq('id', effectivePaymentId)
    }

    await safeCreateApproval({
      owner_id: null,
      request_type: 'manual_payment_review',
      entity_table: 'payments',
      entity_id: effectivePaymentId,
      submitted_by: tenantId,
      notes: `Manual proof uploaded: ${fileName || 'proof file'}`
    })

    await safeInsertAudit({
      owner_id: null,
      actor_id: tenantId,
      action: 'manual_payment_proof_uploaded',
      entity_table: 'payments',
      entity_id: String(effectivePaymentId),
      metadata: { fileName, amount, paymentType }
    })

    return json({ success: true, paymentId: effectivePaymentId })
  }

  if (body.action === 'approve_payment' || body.action === 'reject_payment' || body.action === 'mark_paid') {
    const paymentId = body.paymentId as string | undefined
    if (!paymentId) return json({ error: 'Missing paymentId' }, 400)

    const successState = body.action === 'reject_payment' ? 'failed' : 'completed'
    const settlementState = body.action === 'reject_payment' ? 'rejected' : 'owner_approved'

    const { data: paymentRow } = await supabase
      .from('payments')
      .update({
        status: successState,
        paid_date: body.action === 'reject_payment' ? null : new Date().toISOString(),
        settlement_status: settlementState
      })
      .eq('id', paymentId)
      .select('id, owner_id, amount, building_id')
      .single()

    await supabase.from('approval_requests').update({
      status: body.action === 'reject_payment' ? 'rejected' : 'approved',
      updated_at: new Date().toISOString()
    }).eq('entity_table', 'payments').eq('entity_id', paymentId).then(() => undefined).catch(() => undefined)

    await safeInsertAudit({
      owner_id: paymentRow?.owner_id || null,
      actor_id: paymentRow?.owner_id || null,
      action: body.action,
      entity_table: 'payments',
      entity_id: String(paymentId),
      metadata: { amount: paymentRow?.amount || null }
    })

    if (body.action !== 'reject_payment' && paymentRow?.owner_id) {
      await supabase.from('owner_payouts').insert({
        owner_id: paymentRow.owner_id,
        building_id: paymentRow.building_id,
        payment_id: paymentId,
        amount: paymentRow.amount,
        payout_status: 'pending',
        settlement_mode: 'direct_owner',
        destination_label: 'Owner settlement after approval',
        notes: 'Queued after payment approval'
      }).then(() => undefined).catch(() => undefined)
    }

    return json({ success: true, paymentId, status: successState })
  }

  if (body.action === 'mark_payment_failed') {
    const paymentId = body.paymentId as string | undefined
    if (!paymentId) return json({ error: 'Missing paymentId' }, 400)

    const failureReason = String(body.reason || 'Payment failed')
    await supabase.from('payments').update({
      status: 'failed',
      settlement_status: 'checkout_failed',
      gateway_payload: body.gateway_payload || {}
    }).eq('id', paymentId)

    await safeInsertAudit({
      owner_id: body.owner_id || null,
      actor_id: body.tenant_id || null,
      action: 'payment_failed',
      entity_table: 'payments',
      entity_id: String(paymentId),
      metadata: { reason: failureReason }
    })

    return json({ success: true, paymentId, status: 'failed' })
  }

  return json({ error: 'Unknown action' }, 400)
})
