import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const extractPayloadReference = (payload: Record<string, any> | null) => {
  if (!payload) return { entityType: null, entityId: null }
  if (payload.payment?.entity?.id) return { entityType: 'payment', entityId: payload.payment.entity.id as string }
  if (payload.transfer?.entity?.id) return { entityType: 'transfer', entityId: payload.transfer.entity.id as string }
  if (payload.order?.entity?.id) return { entityType: 'order', entityId: payload.order.entity.id as string }
  return { entityType: null, entityId: null }
}

type ProcessOptions = {
  forceReplay?: boolean
}

export async function processRazorpayEvent(
  supabase: SupabaseClient,
  body: Record<string, any>,
  signature: string,
  options: ProcessOptions = {}
) {
  const eventName = String(body.event ?? 'unknown')
  const payload = (body.payload as Record<string, any> | null) ?? null
  const { entityType, entityId } = extractPayloadReference(payload)
  const eventId = (body.account_id ? `${body.account_id}:${eventName}:${entityId ?? 'unknown'}` : null) as string | null

  const { data: existing } = await supabase
    .from('razorpay_webhook_events')
    .select('id, processing_status')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing && !options.forceReplay) {
    return { success: true, duplicate: true, webhook_id: existing.id, status: existing.processing_status }
  }

  let webhookId = existing?.id as string | undefined
  if (!webhookId) {
    const { data: webhookRow, error: webhookError } = await supabase
      .from('razorpay_webhook_events')
      .insert({
        event_id: eventId,
        event_name: eventName,
        reference_id: entityId,
        entity_type: entityType,
        signature,
        payload: body,
        processing_status: 'received',
      })
      .select('id')
      .single()

    if (webhookError || !webhookRow) {
      throw new Error(webhookError?.message || 'Failed to persist webhook')
    }
    webhookId = webhookRow.id
  } else {
    await supabase
      .from('razorpay_webhook_events')
      .update({
        payload: body,
        signature,
        processing_status: 'received',
        processing_notes: 'Webhook replay requested'
      })
      .eq('id', webhookId)
  }

  const paymentEntity = payload?.payment?.entity ?? null
  const transferEntity = payload?.transfer?.entity ?? null

  try {
    if (eventName === 'payment.captured' && paymentEntity?.id) {
      const notes = paymentEntity.notes ?? {}
      const externalReference = String(paymentEntity.id)
      const amount = Number(paymentEntity.amount ?? 0) / 100
      const ownerId = notes.owner_id ?? null
      const buildingId = notes.building_id ?? null
      const invoiceId = notes.invoice_id ?? null

      const { data: paymentRow } = await supabase
        .from('payments')
        .select('id')
        .eq('external_reference', externalReference)
        .maybeSingle()

      let paymentId = paymentRow?.id ?? null

      if (!paymentId) {
        const { data: insertedPayment, error: insertedPaymentError } = await supabase
          .from('payments')
          .insert({
            tenant_id: notes.tenant_id ?? null,
            house_id: notes.house_id ?? null,
            owner_id: ownerId,
            building_id: buildingId,
            amount,
            payment_type: notes.paymentType ?? 'rent',
            status: 'completed',
            payment_channel: 'razorpay',
            settlement_preference: 'route_transfer',
            settlement_status: 'captured',
            external_reference: externalReference,
            gateway_payload: paymentEntity,
            paid_date: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insertedPaymentError || !insertedPayment) throw new Error(insertedPaymentError?.message || 'Unable to create payment record')
        paymentId = insertedPayment.id
      } else {
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            payment_channel: 'razorpay',
            settlement_status: 'captured',
            gateway_payload: paymentEntity,
            paid_date: new Date().toISOString(),
          })
          .eq('id', paymentId)
      }

      if (invoiceId && paymentId) {
        const { error: rpcError } = await supabase.rpc('apply_payment_to_invoice', {
          p_invoice_id: invoiceId,
          p_payment_id: paymentId,
          p_detected_amount: amount,
          p_channel: 'razorpay',
          p_notes: `Captured via Razorpay payment ${externalReference}`,
        })
        if (rpcError) throw new Error(rpcError.message)
      }

      if (ownerId && paymentId) {
        const { data: payoutRow, error: payoutError } = await supabase
          .from('owner_payouts')
          .insert({
            owner_id: ownerId,
            building_id: buildingId,
            payment_id: paymentId,
            amount,
            payout_status: 'processing',
            settlement_mode: 'razorpay_route',
            destination_label: notes.owner_display_name ?? 'Owner linked account',
            notes: `Awaiting Route transfer for ${externalReference}`,
          })
          .select('id')
          .single()

        if (payoutError || !payoutRow) throw new Error(payoutError?.message || 'Unable to create owner payout')

        await supabase.from('payout_transfer_logs').upsert({
          owner_payout_id: payoutRow.id,
          payment_id: paymentId,
          owner_id: ownerId,
          razorpay_payment_id: externalReference,
          linked_account_id: notes.linked_account_id ?? null,
          amount,
          currency: paymentEntity.currency ?? 'INR',
          transfer_status: 'initiated',
          request_payload: body,
        }, { onConflict: 'owner_payout_id' })
      }
    }

    if (eventName === 'transfer.processed' && transferEntity?.id) {
      const transferId = String(transferEntity.id)
      const { data: transferLog } = await supabase
        .from('payout_transfer_logs')
        .select('id, owner_payout_id')
        .eq('razorpay_transfer_id', transferId)
        .maybeSingle()

      if (transferLog?.id) {
        await supabase
          .from('payout_transfer_logs')
          .update({
            transfer_status: 'processed',
            response_payload: body,
            completed_at: new Date().toISOString(),
          })
          .eq('id', transferLog.id)

        if (transferLog.owner_payout_id) {
          await supabase.rpc('mark_payout_completed', {
            p_owner_payout_id: transferLog.owner_payout_id,
            p_notes: `Razorpay transfer ${transferId} processed`,
          })
        }
      }
    }

    if (eventName === 'transfer.failed' && transferEntity?.id) {
      const transferId = String(transferEntity.id)
      const { data: transferLog } = await supabase
        .from('payout_transfer_logs')
        .select('id, owner_payout_id, owner_id, payment_id, amount')
        .eq('razorpay_transfer_id', transferId)
        .maybeSingle()

      await supabase
        .from('payout_transfer_logs')
        .update({
          transfer_status: 'failed',
          response_payload: body,
          error_message: transferEntity.error?.description ?? 'Transfer failed',
          completed_at: new Date().toISOString(),
        })
        .eq('razorpay_transfer_id', transferId)

      if (transferLog?.owner_payout_id) {
        await supabase.from('payout_retry_queue').insert({
          owner_payout_id: transferLog.owner_payout_id,
          owner_id: transferLog.owner_id,
          payment_id: transferLog.payment_id,
          retry_reason: transferEntity.error?.description ?? 'Route transfer failed',
          status: 'queued',
          payload: body
        }).then(() => undefined).catch(() => undefined)
      }
    }

    await supabase
      .from('razorpay_webhook_events')
      .update({
        processing_status: 'processed',
        processing_notes: options.forceReplay ? 'Webhook replayed successfully' : 'Webhook verified and persisted successfully',
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookId)

    return { success: true, webhook_id: webhookId, event: eventName, reference_id: entityId }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown processing error'
    await supabase
      .from('razorpay_webhook_events')
      .update({
        processing_status: 'failed',
        processing_notes: details,
      })
      .eq('id', webhookId)
    throw error
  }
}
