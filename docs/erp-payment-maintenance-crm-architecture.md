# Nilayam ERP Sprint: Payments, Maintenance, CRM

## What this sprint adds

This implementation layer introduces the operating model for:

- Payment engine and owner-direct settlement
- Invoice / ledger / reconciliation ERP
- Maintenance SLA and vendor work orders
- Lead / visit / booking CRM

## Payment engine design

- `payments` remains the raw collection table.
- `invoice_records` becomes the billing source of truth per unit and billing month.
- `payment_reconciliations` links collected money to invoice expectations.
- `owner_payouts` tracks when the owner should receive or has received settlement.

### Direct owner settlement

- Manual UPI / bank transfer means the tenant pays the owner directly.
- In that case:
  - collection is recorded
  - proof may be uploaded
  - owner verifies receipt
  - payout record can be marked as already settled or direct-owner

### Online payment settlement

- Standard checkout does not mean owner-direct settlement.
- For direct owner online settlement, linked-account or Route-style transfer is required.
- Until then, mark those payments as platform-side collections pending payout / transfer review.

## Invoice and reconciliation flow

1. Generate invoice for the billing month.
2. Tenant pays via direct owner rail or gateway.
3. Match payment to invoice.
4. Compute variance.
5. Mark as `matched`, `unmatched`, or `review_required`.
6. Trigger owner payout workflow if needed.

## Maintenance SLA flow

1. Tenant raises request.
2. Owner intake creates or updates work order.
3. Vendor is assigned.
4. SLA due time is tracked.
5. Work order moves through `assigned`, `in_progress`, `completed`.
6. Cost and closure quality can be added later.

## CRM flow

1. Lead enters from marketplace, referral, website, or walk-in.
2. Lead moves through stage pipeline.
3. Visit is scheduled.
4. Negotiation and booking token are recorded.
5. Winning lead can later convert into tenant onboarding and agreement workflow.

## Current app behavior

- The app now exposes these ERP structures in the frontend and local workspace state.
- The SQL migration file `supabase/erp_payment_crm_extension.sql` is ready for database rollout.
- Next backend step is to move these local workflows into Supabase tables and secure RLS policies.
