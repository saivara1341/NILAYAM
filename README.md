<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hVHiBtFxMKuol5CUci6eZczRQ55nwqqh

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Create your active environment file:
   `Copy-Item .env.test.example .env.test`
3. Fill in the real values for Supabase, Razorpay, and Gemini.
4. Run the app in test mode:
   `npm run dev:test`

## Live And Test Environments

This app now supports separate `test` and `live` frontend environments through Vite modes.

- `npm run dev:test`
  Uses `.env.test`
- `npm run build:test`
  Builds with `.env.test`
- `npm run dev:live`
  Uses `.env.production`
- `npm run build:live`
  Builds with `.env.production`

Suggested setup:

- Copy `.env.test.example` to `.env.test`
- Copy `.env.production.example` to `.env.production`
- Put your test Supabase project keys in `.env.test`
- Put your live Supabase project keys in `.env.production`

## Google Sign-In

`Continue with Google` now redirects back to the hash route used by the app:

- Local test callback:
  `http://localhost:5173/#/dashboard-router`
- Live callback:
  `https://nilayam.in/#/dashboard-router`

To make Google login work:

1. In Supabase, open `Authentication -> Providers -> Google` and enable Google.
2. In Google Cloud, add the Supabase callback URL shown by your Supabase project to the OAuth client.
3. In Supabase `Authentication -> URL Configuration`, add these redirect URLs:
   `http://localhost:5173/#/dashboard-router`
   `https://nilayam.in/#/dashboard-router`
4. Make sure `.env.test` points to your test Supabase project and `.env.production` points to your live Supabase project.

If you deploy to another domain, set `VITE_AUTH_REDIRECT_URL` to that exact `#/dashboard-router` URL.

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

After you push this repo to GitHub:

1. Go to `Settings -> Pages`
2. Set `Source` to `GitHub Actions`
3. Push changes to the `main` branch

Your site URL will be:

`https://<your-github-username>.github.io/<your-repository-name>/`

Every new push to `main` will rebuild and update the same URL automatically.

Optional GitHub secrets for production-like frontend config:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_API_BASE_URL`
- `VITE_GEMINI_API_KEY`

Notes:

- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` is not used by this app. Use `VITE_SUPABASE_ANON_KEY` instead.
- Do not put your Razorpay secret in a `VITE_` variable. Keep the secret only on your backend server.
- For manual payment proof upload, run the SQL in [supabase/add_payment_proofs_bucket.sql](supabase/add_payment_proofs_bucket.sql) in Supabase before using the feature.
