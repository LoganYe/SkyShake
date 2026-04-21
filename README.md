# SkyShake

SkyShake is a Vite + React + TypeScript app for looking up flights and estimating turbulence risk. The project also includes Supabase Edge Functions for auth, subscription state, checkout, and turbulence/weather lookups.

## Current assessment

This repo was not ready for reliable local debugging when I opened it:

- the README was still scaffold-level boilerplate
- the app had no checked-in env template
- auth state was being subscribed to from multiple hooks
- the main page mixed UI, quota checks, flight lookup, and turbulence lookup in one component
- the map only rendered the first route and did not update correctly after subsequent searches
- several production files still relied on `any`

The current refactor addresses those issues and adds a mock mode so the UI can be debugged locally even without live Supabase credentials.

## Stack

- Vite
- React 18
- TypeScript
- Tailwind + shadcn/ui
- Supabase
- Capacitor

## Local debugging

### Option 1: debug the UI immediately with mock mode

This is the fastest path when you do not have Supabase credentials yet.

1. Copy `.env.example` to `.env.local`
2. Leave `VITE_APP_MODE=mock`
3. Install dependencies:

```sh
npm install
```

4. Start the dev server:

```sh
npm run dev
```

In mock mode:

- auth is bypassed with a local debug user
- checkout and customer portal are stubbed
- flight and turbulence data come from local mock generators
- the UI remains fully navigable for layout and interaction debugging

### Option 2: debug against live Supabase services

1. Copy `.env.example` to `.env.local`
2. Set:

```sh
VITE_APP_MODE=live
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

3. Install dependencies and start the dev server:

```sh
npm install
npm run dev
```

If you want live subscriptions and checkout to work, you will also need the corresponding Supabase Edge Function secrets and Stripe config in your Supabase project.

## Quality checks

Run the full local check suite:

```sh
npm run check
```

Or run them separately:

```sh
npm run lint
npm run typecheck
npm run build
```

## Important files

- `src/config/runtime.ts`: runtime mode and env handling
- `src/providers/AuthProvider.tsx`: single source of truth for auth state
- `src/hooks/useFlightTracking.ts`: flight search orchestration
- `src/services/tracking.ts`: live vs mock data access boundary
- `src/lib/mock-flight-data.ts`: local debug data generators
- `src/components/debug/RuntimeModeNotice.tsx`: visible app-mode indicator

## Known gaps that still matter

- the project still ships a very large client bundle
- generated shadcn UI files still emit some low-value fast-refresh warnings
- the airport coordinate dataset is static and incomplete, so some real-world routes may not render on the map until the dataset is expanded
- native packaging is no longer tied to a hosted preview, but iOS/Android folders still need to be generated and verified in a real device build workflow
