# yieldsync-app

YieldSync frontend (landing, auth, dashboard) — Next.js App Router.

## Routes

- `/` — Landing
- `/login` / `/signup` — Auth (Supabase email, Google, Solana)
- `/dashboard` — App shell (hash sections)

## Local

```bash
pnpm install
cp .env.example .env.local
# fill Supabase keys
pnpm dev
```

## Vercel / Supabase

Set these environment variables in the Vercel project (Production + Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

In Supabase → Authentication:

1. Enable Email, Google, Web3 (Solana) as needed
2. Add redirect URLs:
   - `https://yieldsync.io/auth/callback`
   - `https://*.vercel.app/auth/callback`
3. Site URL: production domain

## Stack

Next.js · Tailwind v4 · shadcn/base-ui · Supabase Auth
