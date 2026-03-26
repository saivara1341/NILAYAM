import { createClient } from 'npm:@supabase/supabase-js@2'
import crypto from 'node:crypto'
import { processRazorpayEvent } from '../_shared/razorpay-processing.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const razorpayWebhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const verifySignature = (body: string, signature: string) => {
  const expected = crypto.createHmac('sha256', razorpayWebhookSecret).update(body).digest('hex')
  return expected === signature
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey || !razorpayWebhookSecret) {
    return json({ error: 'Missing Edge Function secrets' }, 500)
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!signature) return json({ error: 'Missing X-Razorpay-Signature' }, 400)
  if (!verifySignature(rawBody, signature)) return json({ error: 'Invalid signature' }, 401)

  let body: Record<string, any>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  try {
    return json(await processRazorpayEvent(supabase, body, signature))
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown processing error'
    return json({ error: 'Webhook processing failed', details }, 500)
  }
})
