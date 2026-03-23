# Nilayam Supabase And Backend Runbook

## Goal

Bring up the full Nilayam stack with:
- Supabase schema and storage configured
- Razorpay backend running on port `8080`
- Vite frontend pointed at the correct API
- Android/iOS wrappers syncing against the production web build

## 1. Required environment

Frontend and backend both expect values from `.env.local`.

Set at minimum:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
VITE_GEMINI_API_KEY=...
```

## 2. Supabase SQL rollout order

Run these scripts in the Supabase SQL editor in this order:

1. [complete_schema.sql](/C:/Users/DEVIVARA%20PRASAD/Downloads/nilayam-property-management%20(1)/supabase/complete_schema.sql)
2. [add_verification_fields.sql](/C:/Users/DEVIVARA%20PRASAD/Downloads/nilayam-property-management%20(1)/supabase/add_verification_fields.sql)
3. [add_service_providers_and_documents.sql](/C:/Users/DEVIVARA%20PRASAD/Downloads/nilayam-property-management%20(1)/supabase/add_service_providers_and_documents.sql)

Use [full_production_setup.sql](/C:/Users/DEVIVARA%20PRASAD/Downloads/nilayam-property-management%20(1)/supabase/full_production_setup.sql) only if you are building a fresh production database and want the repo’s all-in-one variant instead of the incremental path above.

## 3. Storage buckets to verify

After SQL rollout, confirm these buckets exist:

- `id-proofs`
- `tenant_documents`

Also verify that RLS/storage policies allow:
- tenants to upload their own ID proof
- tenants and owners to access tenant documents for the assigned house

## 4. Backend run steps

The backend is a Spring Boot app in [backend-java](/C:/Users/DEVIVARA%20PRASAD/Downloads/nilayam-property-management%20(1)/backend-java).

Recommended local stack:

1. Install Java 21
2. Install Maven
3. Start backend:

```bash
cd backend-java
mvn spring-boot:run
```

Expected API base:

- `http://localhost:8080/api/create-order`
- `http://localhost:8080/api/verify-payment`

## 5. Frontend run steps

```bash
npm install
npm run dev
```

Frontend runs on:

- `http://localhost:5173`

The Vite proxy already forwards `/api` to `http://localhost:8080`.

## 6. Production build and mobile sync

```bash
npm run build
npm run cap:sync
```

For native shells:

```bash
npm run app:android
npm run app:open:android

npm run app:ios
npm run app:open:ios
```

## 7. Verification checklist

- `npx tsc --noEmit`
- `npm run build`
- backend starts without missing Razorpay config errors
- tenant can view dashboard and due payment
- owner can open maintenance page and filter requests
- service providers page loads and accepts review/registration
- document upload works for tenant details and ID verification

## 8. Known follow-up work

- The main frontend bundle is still large; more route/component splitting can continue
- Real Supabase migration ownership should be consolidated so there is one authoritative production path
- Maven and Java are required locally to fully verify backend startup
