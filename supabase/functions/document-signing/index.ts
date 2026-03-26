import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const docusignBaseUrl = Deno.env.get('DOCUSIGN_BASE_URL') ?? ''
const docusignAccountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID') ?? ''
const docusignAccessToken = Deno.env.get('DOCUSIGN_ACCESS_TOKEN') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase secrets' }, 500)

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Missing action' }, 400)

  if (body.action === 'review_document') {
    const { reviewId, status, reviewNotes, reviewerId } = body
    if (!reviewId || !status) return json({ error: 'Missing review payload' }, 400)

    await supabase.from('document_verification_reviews').update({
      status,
      review_notes: reviewNotes || null,
      reviewer_id: reviewerId || null,
      updated_at: new Date().toISOString()
    }).eq('id', reviewId)

    return json({ success: true, reviewId, status })
  }

  if (body.action === 'request_signature') {
    const { ownerId, tenantEmail, tenantName, documentBase64, documentName, houseId, subject } = body
    if (!ownerId || !tenantEmail || !documentBase64 || !documentName) {
      return json({ error: 'Missing signature request payload' }, 400)
    }

    let providerEnvelopeId: string | null = null
    if (docusignBaseUrl && docusignAccountId && docusignAccessToken) {
      const response = await fetch(`${docusignBaseUrl}/restapi/v2.1/accounts/${docusignAccountId}/envelopes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${docusignAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailSubject: subject || 'Signature request from Nilayam',
          documents: [
            {
              documentBase64,
              name: documentName,
              fileExtension: 'pdf',
              documentId: '1'
            }
          ],
          recipients: {
            signers: [
              {
                email: tenantEmail,
                name: tenantName || 'Tenant',
                recipientId: '1',
                routingOrder: '1'
              }
            ]
          },
          status: 'sent'
        })
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) return json({ error: payload?.message || 'DocuSign envelope creation failed' }, response.status)
      providerEnvelopeId = payload?.envelopeId || null
    }

    const { data: requestRow, error } = await supabase.from('signature_requests').insert({
      owner_id: ownerId,
      agreement_house_id: houseId || null,
      tenant_id: null,
      document_url: providerEnvelopeId || documentName,
      status: 'pending'
    }).select('id').single()

    if (error || !requestRow) return json({ error: error?.message || 'Failed to create signature request' }, 500)
    return json({ success: true, signatureRequestId: requestRow.id, providerEnvelopeId })
  }

  return json({ error: 'Unknown action' }, 400)
})
