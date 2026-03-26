import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? ''
const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? ''
const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN') ?? ''
const twilioFromSms = Deno.env.get('TWILIO_FROM_NUMBER') ?? ''
const twilioFromWhatsapp = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to,
      subject,
      html
    })
  })
  if (!response.ok) throw new Error('Resend delivery failed')
}

const sendTwilioMessage = async (to: string, body: string, whatsapp = false) => {
  const auth = 'Basic ' + btoa(`${twilioSid}:${twilioAuth}`)
  const payload = new URLSearchParams({
    To: whatsapp ? `whatsapp:${to}` : to,
    From: whatsapp ? twilioFromWhatsapp : twilioFromSms,
    Body: body
  })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload
  })
  if (!response.ok) throw new Error('Twilio delivery failed')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase secrets' }, 500)

  const body = await req.json().catch(() => ({}))
  const queueId = body.queueId as string | undefined

  let items: any[] = []
  if (queueId) {
    const { data } = await supabase.from('notification_queue').select('*').eq('id', queueId)
    items = data || []
  } else {
    const { data } = await supabase
      .from('notification_queue')
      .select('*')
      .in('status', ['queued', 'retrying'])
      .lte('next_attempt_at', new Date().toISOString())
      .limit(50)
    items = data || []
  }

  let processed = 0
  for (const item of items) {
    try {
      if (item.channel === 'email' && resendApiKey && resendFromEmail && item.destination) {
        await sendEmail(item.destination, item.payload?.title || 'Nilayam Update', item.payload?.body || '')
      } else if (item.channel === 'sms' && twilioSid && twilioAuth && twilioFromSms && item.destination) {
        await sendTwilioMessage(item.destination, item.payload?.body || '', false)
      } else if (item.channel === 'whatsapp' && twilioSid && twilioAuth && twilioFromWhatsapp && item.destination) {
        await sendTwilioMessage(item.destination, item.payload?.body || '', true)
      }

      await supabase.from('notification_queue').update({
        status: 'sent',
        attempts: (item.attempts || 0) + 1,
        updated_at: new Date().toISOString()
      }).eq('id', item.id)
      processed += 1
    } catch (error) {
      await supabase.from('notification_queue').update({
        status: (item.attempts || 0) >= 4 ? 'failed' : 'retrying',
        attempts: (item.attempts || 0) + 1,
        last_error: error instanceof Error ? error.message : 'Notification delivery failed',
        next_attempt_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', item.id)
    }
  }

  return json({ success: true, processed })
})
