import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase secrets' }, 500)

  const [failedJobs, failedNotifications, pendingWebhooks] = await Promise.all([
    supabase.from('job_runs').select('id', { count: 'exact', head: true }).in('status', ['failed', 'retrying']),
    supabase.from('notification_queue').select('id', { count: 'exact', head: true }).in('status', ['failed', 'retrying']),
    supabase.from('razorpay_webhook_events').select('id', { count: 'exact', head: true }).in('processing_status', ['received', 'failed'])
  ])

  const incidents = [
    {
      title: 'Webhook processing backlog',
      severity: (pendingWebhooks.count || 0) > 20 ? 'high' : 'medium',
      status: (pendingWebhooks.count || 0) > 0 ? 'open' : 'resolved',
      source: 'webhook_queue',
      payload: { count: pendingWebhooks.count || 0 }
    },
    {
      title: 'Background job failures',
      severity: (failedJobs.count || 0) > 10 ? 'critical' : 'medium',
      status: (failedJobs.count || 0) > 0 ? 'open' : 'resolved',
      source: 'job_runs',
      payload: { count: failedJobs.count || 0 }
    },
    {
      title: 'Notification delivery failures',
      severity: (failedNotifications.count || 0) > 10 ? 'high' : 'medium',
      status: (failedNotifications.count || 0) > 0 ? 'open' : 'resolved',
      source: 'notification_queue',
      payload: { count: failedNotifications.count || 0 }
    }
  ]

  for (const incident of incidents) {
    const { data: existing } = await supabase
      .from('security_incidents')
      .select('id')
      .eq('title', incident.title)
      .maybeSingle()

    if (existing?.id) {
      await supabase.from('security_incidents').update({
        severity: incident.severity,
        status: incident.status,
        payload: incident.payload,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id)
    } else {
      await supabase.from('security_incidents').insert(incident)
    }
  }

  return json({ success: true, incidents: incidents.length })
})
