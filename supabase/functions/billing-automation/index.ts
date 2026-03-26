import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, serviceRoleKey)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const formatMonth = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Missing Edge Function secrets' }, 500)

  const billingMonth = formatMonth(new Date())

  const { data: houses, error: housesError } = await supabase
    .from('houses')
    .select('id, building_id, tenant_id, rent_amount, buildings(owner_id)')
    .not('tenant_id', 'is', null)

  if (housesError) return json({ error: housesError.message }, 500)

  let generated = 0

  for (const house of houses || []) {
    const invoiceNumber = `INV-${billingMonth.replace('-', '')}-${String(house.id).slice(0, 6)}`
    const { data: existing } = await supabase
      .from('invoice_records')
      .select('id')
      .eq('house_id', house.id)
      .eq('billing_month', billingMonth)
      .maybeSingle()

    if (existing?.id) continue

    const dueDate = new Date()
    dueDate.setDate(5)

    await supabase.from('invoice_records').insert({
      owner_id: (house as any).buildings?.owner_id,
      tenant_id: house.tenant_id,
      building_id: house.building_id,
      house_id: house.id,
      invoice_number: invoiceNumber,
      billing_month: billingMonth,
      due_date: dueDate.toISOString().slice(0, 10),
      total_amount: Number(house.rent_amount || 0),
      outstanding_amount: Number(house.rent_amount || 0),
      line_items: [
        {
          id: `line-${house.id}`,
          category: 'rent',
          label: 'Monthly rent',
          amount: Number(house.rent_amount || 0)
        }
      ]
    })

    await supabase.from('notification_queue').insert({
      owner_id: (house as any).buildings?.owner_id,
      recipient_user_id: house.tenant_id,
      channel: 'in_app',
      template_key: 'rent_invoice_created',
      payload: { house_id: house.id, billing_month: billingMonth, invoice_number: invoiceNumber }
    })

    generated += 1
  }

  await supabase.from('job_runs').insert({
    job_type: 'billing_automation',
    status: 'completed',
    payload: { billing_month: billingMonth, generated }
  })

  return json({ success: true, billingMonth, generated })
})
