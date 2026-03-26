# Nilayam Platform Scaling And Payments

## Current delivery model

Nilayam already runs as:

- A responsive web app through Vite + React.
- A Progressive Web App through `public/manifest.json`.
- An Android and iOS app shell through Capacitor.
- Supabase-backed auth, database, storage, and realtime.

## Razorpay settlement truth

With standard Razorpay Checkout:

- The tenant pays into the Razorpay account connected to the checkout keys.
- Settlement goes to the bank account of that Razorpay business account.
- It does not automatically settle to each property owner's personal bank account.

If you want the money to land with the respective owner instead of the platform account, you need a marketplace / linked-account payout model such as:

- Razorpay Route or the equivalent linked-account / split-settlement product approved for your business.
- Owner onboarding with KYC and bank verification.
- A backend-controlled transfer or split after payment capture.
- Audit logs for each transfer, reversal, and failed payout.

Manual UPI and bank transfer already support direct-to-owner collection, because the tenant pays the owner's UPI ID, mobile-linked UPI, or bank account directly.

## Recommended payment architecture

Use a dual-rail approach:

1. Manual owner-direct rail
   - Owner saves UPI ID, QR, mobile, and bank details.
   - Tenant pays directly to owner.
   - Tenant uploads proof.
   - Owner verifies and marks payment received.

2. Razorpay managed rail
   - Keep standard checkout only for plans, platform fees, or owners who are fully onboarded into a linked-account flow.
   - For owner-direct settlement, do not assume standard checkout is enough.
   - Only enable direct-owner Razorpay settlement after linked-account onboarding is complete.

## Scale-up roadmap

### 1. Data model and tenancy integrity

- Make `houses.tenant_id`, `buildings.owner_id`, and payment foreign keys mandatory where appropriate.
- Add row-level security for owner-only and tenant-only access.
- Separate operational tables for reminders, score events, maintenance events, payout events, and marketplace transactions.
- Add idempotency keys for payment creation and verification.

### 2. Supabase scaling

- Add indexes on `owner_id`, `tenant_id`, `house_id`, `building_id`, `due_date`, and `created_at`.
- Move heavy owner dashboards into database views or edge-function aggregations.
- Use storage buckets with signed URLs for payment proofs and documents.
- Archive old activity logs and raw proofs to colder storage as volume grows.
- Introduce read replicas or caching for dashboard-heavy screens when usage spikes.

### 3. Backend hardening

- Move all payment verification and payout logic behind backend APIs or edge functions.
- Never trust frontend-set payment success alone.
- Verify Razorpay signatures server-side and write immutable audit records.
- Add retry-safe webhook handlers for capture, transfer, refund, and settlement events.

### 4. Mobile and web quality

- Keep Capacitor as the app shell and PWA as the browser fallback.
- Test payment deep links separately on Android app, Android browser, iPhone Safari, and desktop web.
- Gracefully fall back from app-specific UPI intent to generic `upi://pay`.

### 5. Observability

- Track payment funnel metrics: created, checkout-opened, paid, verified, failed, retried.
- Track owner collection latency and pending proof age.
- Alert on webhook failure, proof backlog, and repeated payout retries.

## Tenant scorecard logic

Recommended scoring factors:

- On-time payment rate.
- Overdue or failed payment cycles.
- Identity verification readiness.
- Agreement acknowledgement and lifecycle completion.
- Reminder pressure.
- Open maintenance / care signals.

High score means:

- Payments are timely.
- ID is verified.
- Agreement workflow is acknowledged.
- Few escalations are needed.

Low score means:

- Overdue or failed payments continue.
- ID or agreement steps are incomplete.
- Repeated reminders or unresolved issues exist.

## What to build next for top-1% readiness

- Owner linked-account onboarding flow for direct Razorpay settlement.
- Webhook ingestion for capture, transfer, refund, and settlement updates.
- A payout ledger for each owner.
- Automated reconciliation between payment, proof, settlement, and owner receivable.
- Background jobs for reminders, overdue rollups, and score recomputation.
