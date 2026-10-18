# EarthVeda Essentials

A redesigned React/Vite storefront built on the Earthveda JavaScript commerce foundation. The default mode is a standalone **Vercel frontend preview**, with German/English routes, product discovery, a pair-based flavour quiz, bundles, wishlist, basket, exact delivery totals and a no-payment checkout walkthrough.

## Start the frontend

Use Node 24 and Git Bash in this directory:

```bash
npm ci
cp .env.vercel.example .env.local
npm run dev
```

Open the URL printed by Vite. No MongoDB, Docker or API process is needed for the default preview.

```bash
npm run check
```

This runs lint, formatting, unit/business tests, React DOM interaction tests and the frontend build. The UI suite uses jsdom rather than a real browser.

## Deploy to Vercel

Follow [the complete Git Bash launch guide](docs/VERCEL_FRONTEND_LAUNCH_BASH.md). Import the repository, select the directory containing this file as the project root and retain the provided `vercel.json` settings:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Node | 24.x |
| Install | `npm ci --include=dev` |
| Build | `npm run check` |
| Output | `dist` |
| Public mode | `VITE_COMMERCE_MODE=preview` |

Connect `earthvedaessentials.de` from Vercel's Domains settings using the DNS values shown for your project. All future pushes to the linked production branch deploy through Vercel's Git integration.

## Preview boundaries

The preview does not accept orders, charge money, send emails or save newsletter/customer details. Payment choices are illustrative. The actual connected backend currently uses Stripe card checkout. No cards or bank credentials are collected by the preview.

Prices are in EUR: single packs 2,99 €, 8-pack 23,92 €, 16-pack 47,84 €, plus 4,99 € DE or 11,99 € GB delivery. Bundles currently contain foxnuts only.

Fill your public merchant details and approved story in `src/content/site.js`. The requested story PDF was not found. Legal pages are preview drafts, and verified food information remains necessary before real sales. Keep the presentation appropriately protected until public business details are ready. The preview is marked noindex, which is not access control.

## Project map

| Area | Location |
| --- | --- |
| Homepage | `src/pages/Home.jsx` |
| Hero and product discovery | `src/components/EditorialHero.jsx`, `DiscoverySection.jsx` |
| New design system | `src/styles/redesign.css` |
| Bilingual redesign copy | `src/content/refreshCopy.js` |
| Public business and story | `src/content/site.js` |
| Preview catalogue | `src/content/previewStore.js` |
| Quiz and cart | `src/components/BoxBuilder.jsx`, `src/lib/cart.js` |
| Demonstration checkout | `src/pages/PreviewCheckout.jsx` |
| Legal preview | `src/pages/PreviewLegal.jsx` |
| Shared pricing/market rules | `shared/pricing.js`, `shared/markets.js` |
| UI tests | `tests/storefront.ui.js` |
| Optional retained backend | `server/` |

The backend, admin, worker, MongoDB schema, tests, Docker and restricted SSH deployment scripts remain available. To work on that phase use [the full-stack setup guide](docs/STEP_BY_STEP.md) and [the backend deployment guide](docs/CI_CD_DEPLOYMENT_BASH.md), set `VITE_COMMERCE_MODE=connected` for its frontend, and provision the services they require. Docker builds default to connected mode. GitHub backend/image jobs are opt-in with `BACKEND_ENABLED=true`; frontend verification runs by default.

See [verification](docs/VERIFICATION.md) for actual test results and remaining limits.
