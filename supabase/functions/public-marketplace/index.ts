import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Supabase secrets' }, 500)

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Missing action' }, 400)

  if (body.action === 'property_by_id') {
    const listingId = Number(body.listingId || 0)
    if (!Number.isFinite(listingId) || listingId <= 0) return json({ error: 'Invalid listingId' }, 400)

    const { data, error } = await supabase
      .from('marketplace_view')
      .select('*')
      .eq('id', listingId)
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)
    if (!data) return json({ error: 'Property listing not found' }, 404)

    return json(data)
  }

  if (body.action === 'product_by_id') {
    const productId = String(body.productId || '').trim()
    if (!productId) return json({ error: 'Invalid productId' }, 400)

    const { data, error } = await supabase
      .from('marketplace_product_listings')
      .select('id, created_at, seller_id, seller_name, seller_role, title, description, price, category, condition, contact_info, location, images')
      .eq('id', productId)
      .maybeSingle()

    if (error) return json({ error: error.message }, 500)
    if (!data) return json({ error: 'Product listing not found' }, 404)

    return json({
      ...data,
      price: Number((data as any).price || 0)
    })
  }

  return json({ error: 'Unknown action' }, 400)
})
