import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const basicAuth = () => 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) return json({ error: 'Missing onboarding secrets' }, 500)

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Missing action' }, 400)

  if (body.action === 'start_onboarding') {
    const { ownerId, fullName, email, phone, businessType } = body
    if (!ownerId || !fullName || !email || !phone) return json({ error: 'Missing owner details' }, 400)

    const contactResponse = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fullName,
        email,
        contact: phone,
        type: 'vendor',
        reference_id: ownerId
      })
    })
    const contactPayload = await contactResponse.json().catch(() => null)
    if (!contactResponse.ok) return json({ error: contactPayload?.error?.description || 'Failed to create Razorpay contact' }, contactResponse.status)

    const accountResponse = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        phone,
        type: businessType || 'route',
        legal_business_name: fullName,
        contact_name: fullName,
        business_type: 'individual',
        profile: {
          category: 'housing',
          subcategory: 'rent'
        }
      })
    })
    const accountPayload = await accountResponse.json().catch(() => null)
    if (!accountResponse.ok) return json({ error: accountPayload?.error?.description || 'Failed to create linked account' }, accountResponse.status)

    await supabase.from('owner_linked_accounts').upsert({
      owner_id: ownerId,
      provider: 'razorpay_route',
      linked_account_id: accountPayload.id,
      contact_id: contactPayload.id,
      kyc_status: 'submitted',
      onboarding_payload: accountPayload,
      requirements: accountPayload.requirements || []
    }, { onConflict: 'owner_id' })

    await supabase.from('document_verification_reviews').insert({
      owner_id: ownerId,
      document_type: 'owner_kyc',
      status: 'pending',
      review_notes: 'Route onboarding started; complete KYC requirements.'
    }).then(() => undefined).catch(() => undefined)

    return json({ success: true, linkedAccountId: accountPayload.id, contactId: contactPayload.id })
  }

  if (body.action === 'sync_status') {
    const ownerId = body.ownerId as string | undefined
    if (!ownerId) return json({ error: 'Missing ownerId' }, 400)

    const { data: linkedAccount } = await supabase
      .from('owner_linked_accounts')
      .select('id, linked_account_id')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (!linkedAccount?.linked_account_id) return json({ error: 'Linked account not found' }, 404)

    const response = await fetch(`https://api.razorpay.com/v2/accounts/${linkedAccount.linked_account_id}`, {
      headers: { Authorization: basicAuth() }
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) return json({ error: payload?.error?.description || 'Failed to sync linked account' }, response.status)

    const status = payload?.status === 'activated' ? 'verified' : payload?.status === 'rejected' ? 'rejected' : 'submitted'
    await supabase.from('owner_linked_accounts').update({
      kyc_status: status,
      onboarding_payload: payload,
      requirements: payload.requirements || [],
      last_synced_at: new Date().toISOString()
    }).eq('id', linkedAccount.id)

    return json({ success: true, kyc_status: status, payload })
  }

  return json({ error: 'Unknown action' }, 400)
})
