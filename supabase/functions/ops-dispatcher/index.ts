import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Edge Function secrets' }, 500)

  const [retryQueue, notifications, replayRequests] = await Promise.all([
    supabase
      .from('payout_retry_queue')
      .select('id, attempts, owner_payout_id')
      .in('status', ['queued', 'retrying'])
      .lte('next_retry_at', new Date().toISOString())
      .limit(20),
    supabase
      .from('notification_queue')
      .select('id, attempts, channel, destination, payload')
      .in('status', ['queued', 'retrying'])
      .lte('next_attempt_at', new Date().toISOString())
      .limit(50),
    supabase
      .from('webhook_replay_requests')
      .select('id, webhook_event_id')
      .in('status', ['queued', 'retrying'])
      .limit(20)
  ])

  if (retryQueue.error || notifications.error || replayRequests.error) {
    return json({ error: 'Failed to load ops queues' }, 500)
  }

  for (const item of retryQueue.data || []) {
    await supabase
      .from('payout_retry_queue')
      .update({
        status: item.attempts >= 4 ? 'dead_letter' : 'retrying',
        attempts: (item.attempts || 0) + 1,
        next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
      .eq('id', item.id)

    await supabase.from('job_runs').insert({
      job_type: 'payout_retry',
      status: 'queued',
      payload: { payout_retry_queue_id: item.id, owner_payout_id: item.owner_payout_id }
    })
  }

  for (const notification of notifications.data || []) {
    await supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        attempts: (notification.attempts || 0) + 1
      })
      .eq('id', notification.id)
  }

  for (const replay of replayRequests.data || []) {
    await supabase
      .from('webhook_replay_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', replay.id)
  }

  return json({
    success: true,
    payoutRetriesProcessed: retryQueue.data?.length || 0,
    notificationsProcessed: notifications.data?.length || 0,
    webhookReplaysProcessed: replayRequests.data?.length || 0
  })
})
