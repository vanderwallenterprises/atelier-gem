# ATELIER GEM — implementation plan

Loose-gemstone marketplace with an AI Jeweler Studio. Built in `AI-Jeweler/atelier`
alongside the earlier FastAPI prototype (`AI-Jeweler/app`), which stays runnable until
this app reaches parity.

## Repository findings (2026-10-27)

| Item | Finding | Decision |
|---|---|---|
| Existing code | FastAPI + SQLite prototype: GIA Report Results client, grading scales, pricing table with sources, SVG ring/pendant preview, seller-claim-vs-GIA comparison, Nivoda + affiliate-feed connectors | Port the domain logic (pricing data, GIA query and field names, grade scales, comparison rules) to TypeScript; leave the prototype in place |
| Tooling | Node 24, npm 11, git. **No** Docker, Postgres, Supabase CLI or Stripe CLI | Hosted Supabase project for runtime; **PGlite** (real Postgres in WASM) to run migrations + RLS tests locally without Docker |
| Next.js | 16.4.3 (App Router, `proxy.ts` replaces middleware, async request APIs, Turbopack default) | Follow the bundled docs in `node_modules/next/dist/docs` |
| Playwright | Not installed (machine policy: ask before installing) | E2E specs written; browsers installed only after approval |

## Architecture

- `src/app` — routes (Server Components by default; client components only for interaction).
- `src/lib/services/*` — business logic (one service per domain; no route does a whole workflow).
- `src/lib/domain/*` — pure functions: money, carat/measurement validation, state machines,
  commission, quote totals, pricing estimate. Unit-tested.
- `src/lib/integrations/*` — interfaces + providers: `ReportVerificationProvider`,
  `LanguageModelProvider`, `ConceptImageProvider`, `PaymentProvider`, `NotificationProvider`.
  Each has an "unconfigured" implementation that says so — never a fake success.
- `supabase/migrations/*.sql` — schema, constraints, indexes, RLS, storage buckets.
- `supabase/seed.sql` — development sample data, every row marked `is_sample = true`.
- Money: integer minor units + ISO currency everywhere. Carats/mm: `numeric`.

## Brand

Centralised in `src/config/brand.ts` (name, tagline, metadata, contact). Ivory background,
charcoal/olive navigation, restrained brass accent, editorial serif headings + readable sans.
No stock photography is bundled: hero and placeholders use original SVG gem artwork until
real photography is supplied (no fabricated imagery of "inventory").

## Checklist

Legend: [x] done · [~] built, needs external credentials to run end-to-end · [ ] not started

### Phase 1 — Setup, design system, navigation, public pages
- [x] Dependencies (Supabase, Zod, RHF, lucide, Vitest, Testing Library, PGlite)
- [x] Brand config + design tokens (color, type, spacing, radius, shadow, breakpoints)
- [x] UI primitives (Button, Field/Input/Select/Textarea, Badge, Surface, Notice, Skeleton, EmptyState) — dialogs use native <details>/<dialog> where needed
- [x] Site header (desktop nav + right controls), mobile bottom nav, footer
- [x] Homepage sections (hero, categories, curated stones, 3 steps, verification, sellers, studio preview, FAQ)
- [x] How it works, For sellers, Jewelers, policy pages (terms, privacy, authenticity, fees, shipping, returns, disputes, AI disclosure)
- [x] not-found, error, loading states
- [x] Lint, typecheck, unit tests, production build

### Phase 2 — Database, auth, profiles, onboarding
- [x] Migrations: all entities in spec §20, constraints, indexes, `updated_at` triggers
- [x] RLS policies for every table (spec §21) + helper functions (`is_admin`, `has_capability`)
- [x] PGlite test harness with an `auth` shim; RLS tests
- [ ] Supabase SSR clients (browser, server, service-role server-only), `proxy.ts` session refresh
- [ ] Sign up / sign in / sign out / verify email / forgot + reset password
- [ ] Onboarding (multi-select intents) + seller onboarding + maker onboarding
- [ ] Account settings, profile editing, suspension handling

### Phase 3 — Listings, wizard, search, detail, favorites
- [ ] GemstoneListingService + Zod schemas; 6-step wizard with drafts
- [ ] Signed uploads to private storage; image reorder/primary/captions
- [~] Search service with URL params, filters, sorting, cursor pagination (built; needs a Supabase project to run against real data)
- [x] Gemstone cards, grid, skeletons, empty/error states
- [ ] Detail page (gallery + zoom, specs, disclosures, report status, similar stones, share, report listing)
- [ ] Favorites (stones, sellers)

### Phase 4 — Verification, seller dashboard, moderation
- [ ] Report verification state machine + three separate checks (record / document consistency / physical match)
- [ ] `ReportVerificationProvider` (unconfigured default; GIA Report Results API adapter requires credentials)
- [ ] Admin-assisted review queue, private notes, audit events
- [ ] Seller dashboard (overview, listings, orders, earnings, verification, store profile, settings)

### Phase 5 — AI Jeweler Studio
- [ ] Design + design_versions services, status state machine
- [ ] Guided start (piece type) → preferences → conversational iteration
- [ ] `LanguageModelProvider` (OpenAI) with Zod-validated structured output; prompt-injection isolation
- [ ] `ConceptImageProvider` with graceful "not configured" fallback; SVG preview always available
- [ ] Estimates from versioned pricing data (ported from prototype) — labelled estimates

### Phase 6 — Jewelry makers and quotes
- [ ] Maker onboarding, profile, portfolio, regions
- [ ] Quote requests, quotes (itemised, expiry, policies), compare, approve

### Phase 7 — Checkout, payments, orders, payouts
- [ ] Server-side pricing, commission, idempotent checkout (Stripe Checkout, test mode)
- [ ] Signed webhook handling with idempotency; order/payment/payout state machines
- [ ] Connect onboarding for sellers; payout eligibility rules

### Phase 8 — Messaging, notifications, admin
- [ ] Conversations with participant authorization; read status
- [ ] Notifications + `NotificationProvider` interface
- [ ] Admin: users, sellers, listings, verifications, orders, disputes, makers, audit, analytics

### Phase 9 — Hardening and docs
- [ ] Rate limits (auth, messaging, uploads, AI, checkout)
- [ ] Accessibility pass (keyboard, focus, contrast, reduced motion)
- [ ] Playwright E2E (after approval to install browsers)
- [ ] README: setup, env, DB, storage, AI, payments test mode, deployment, production checklist

## External services the owner must set up

| Service | Needed for | Status |
|---|---|---|
| Supabase project (free tier works) | Database, auth, storage | Not yet created |
| Stripe account (test mode) + Connect | Checkout, payouts | Not yet created |
| OpenAI API key | AI Jeweler conversation + concept images | Not yet provided |
| GIA Report Results API key | Automatic report-record checks | Application in progress |
| Email provider (e.g. Resend/Postmark) | Notifications beyond Supabase auth emails | Optional |
