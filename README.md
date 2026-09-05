# Flight Fare Finder

Build a SaaS landing page + authenticated app shell for Flight Price Notifier (機票降價通知), a product that watches popular flight routes from Taipei and emails the user when the cheapest fare drops to or below their target price — targeted at budget-driven travelers who don't care exactly when they fly, they just want a ticket under their budget.

The site must include:

A public landing page (/) with:

Hero section: product name "Flight Price Notifier" prominently displayed, value prop 「設定航線與目標價，機票降價就通知你」 (English subtitle: "Set a route and a target price — we email you when the fare drops."), and a primary CTA button labeled "Sign in / 登入" in the top-right header.

Features section with exactly 3 feature cards:

Card 1: 「盯緊熱門航線 (Always-on route watching)」 — 持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。

Card 2: 「達標自動通知 (Target-price email alerts)」 — 低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。

Card 3: 「隨時取消 (Cancel anytime)」 — 月訂閱制，不想用隨時停，沒有綁約。

Footer with copyright 「© 2026 Flight Price Notifier」.

Authentication backed by this project's **own Supabase project** (`eunzvsytymwxiwgdxqyn`), talked to directly from the browser with `@supabase/supabase-js`:

Sign Up page with email + password

Sign In page with email + password

Sign Out functionality

Email confirmation can be disabled for simplicity in this v1

An authenticated app shell at /app that the user lands on after signing in:

Greets the signed-in user by email: 「Hi {user.email}」

A placeholder message: 「你的航線追蹤儀表板即將上線 — 下一個里程碑會加上訂閱航線的功能。」 (English: "Your dashboard is coming soon. Route-subscription will be added in the next milestone.")

A Sign Out button in the header

Design requirements:

Modern, professional dark theme (purple/violet accent on a near-black background)

Use Inter or a similar sans-serif font

Mobile responsive

Tasteful subtle animations (fade-in on scroll is fine; don't overdo it)

Out of scope for this v1: route-subscription form, target-price input, fare display, payment, custom database tables (do NOT create a subscriptions or profiles table — only use Supabase's default auth.users). Those come in later milestones. Stick to landing page + auth + placeholder dashboard.

The UI was originally scaffolded with [Lovable](https://lovable.dev); the backend is a self-owned Supabase project.

## Stack

Plain **Vite + React SPA** (client-side only) — no SSR, no server runtime.

- Routing: [React Router](https://reactrouter.com) (`/`, `/auth`, `/sign-in`, `/sign-up`, `/app`)
- Auth/data: self-owned Supabase project (`@supabase/supabase-js`), running entirely in the browser
- Styling: Tailwind CSS v4 + shadcn/ui
- Build: `vite build` → static assets in `dist/`

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Copy `.env.example` to `.env` (or use the committed `.env`) before running. Only three
variables matter, all read through `import.meta.env` in
`src/integrations/supabase/client.ts`:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://eunzvsytymwxiwgdxqyn.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (browser-safe, RLS-gated; the current name for what used to be called the anon key) |
| `VITE_SUPABASE_PROJECT_ID` | `eunzvsytymwxiwgdxqyn` (reference only — also mirrored in `supabase/config.toml`) |

## Deploying to Vercel

The app is a static SPA, so no serverless functions or adapters are needed.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` |

Set those three in **Vercel → Project → Settings → Environment Variables** for every
environment you deploy (Production / Preview / Development), then redeploy — Vite inlines
them at build time, so a redeploy is required for a change to take effect.

Note: Vercel's Supabase marketplace integration also injects `POSTGRES_*`, `SUPABASE_*`
and `NEXT_PUBLIC_SUPABASE_*` variables. This app is Vite, not Next.js, so none of those
reach the bundle — only the `VITE_`-prefixed ones above are used.

`vercel.json` adds the SPA fallback rewrite so deep links such as `/app` and
`/sign-up` are served `index.html` and resolved by React Router on the client.
`public/_redirects` provides the same fallback on Netlify-style hosts.
