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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

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
- `VITE_GEMINI_API_KEY`
