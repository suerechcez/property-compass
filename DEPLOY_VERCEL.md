# Vercel deployment

This project is a TanStack Start SSR app. To deploy on Vercel:

1. Push the repo to GitHub and import into Vercel.
2. Vercel will use `vercel.json` — it sets `NITRO_PRESET=vercel` so nitro emits a Vercel-compatible build under `.vercel/output`.
3. Add the following **Environment Variables** in Vercel Project Settings → both Production and Preview:

   Client (exposed to browser):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

   Server (secret):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOVABLE_API_KEY` (for AI forecast)

   Copy the values from the project `.env` in Lovable (Backend → Secrets).

4. Deploy. First run compiles the app; subsequent pushes redeploy automatically.

> Note: the fastest one-click deploy remains the built-in **Publish** button in Lovable, which serves the same SSR app on `*.lovable.app`.
