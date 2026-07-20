# SkyShake

SkyShake is now an iOS-first Flutter app backed by a separate Node/Fastify API.
That same Node service now also serves the deployable landing page, so the
marketing/demo route preview no longer depends on building Flutter web.

That split is intentional. The mobile app does not talk directly to third-party
flight providers, because that design falls apart as soon as a provider needs
secrets, rate limits, billing controls, or request normalization.

## Current Stack

- Mobile frontend: Flutter + Dart
- Deployable landing page: Node/Fastify-served HTML/CSS/JS
- Mobile app shell: Flutter Material 3 with a two-tab iOS-first layout
- App state: `provider`
- Network client: `dio`
- Backend: Node.js + TypeScript + Fastify
- Weather provider: Open-Meteo, fetched server-side
- Flight provider: AeroDataBox via RapidAPI by default
- Map rendering: `flutter_map` + OpenStreetMap tiles

## What Is Truly Live Right Now

- The landing page at `/` is served directly from the Node backend and can run
  a live route check without a Flutter web build.
- Route risk analysis by airport pair is live. The backend selects Open-Meteo
  hourly forecasts at each waypoint's estimated time, including surface
  weather, CAPE, and 300/250/200 hPa cruise-layer winds.
- Flight-number lookup is exposed in the Flutter UI and backed by
  `GET /v1/flights/search` on the backend. It is only live when
  `FLIGHT_PROVIDER=aerodatabox` and `AERODATABOX_API_KEY` are configured.
- There is no silent mock fallback in the backend path. If the upstream call
  fails, SkyShake returns an error instead of inventing data.
- Live location and schedule fields are still provider-dependent. Some flights
  return schedule-only data or partial airport timing data.
- Repeated identical flight lookups are cached:
  - successful results: 60 seconds
  - not-found results: 30 seconds
  - all provider caches are capped at 1,000 least-recently-used entries
    during single-process development
  - production uses Redis so completed cache entries are shared across instances
- Flight lookup responses carry safe diagnostics:
  - provider name
  - `live` vs `cache` source
  - whether the provider response was partial
  - which field groups were missing
- The `Use this route` action copies provider-backed departure, arrival, and
  aircraft data into the route form, but it still requires an explicit user-run
  analysis step.

## Repo Layout

- `lib/`: Flutter frontend
- `backend/`: Node/TypeScript backend service and deployable landing page
- `test/`: Flutter tests
- `web/`: Flutter web shell
- `shared/airport-catalog.json`: the hand-edited airport catalog source
- `tool/generate-airport-catalog.mjs`: deterministic TypeScript/Dart catalog generator

## Mobile Shell

SkyShake mobile v1 intentionally stays narrow:

- `Flight` tab
  - real flight-number lookup through the backend
  - partial-data and cache/live diagnostics
  - `Use this route`
- `Route` tab
  - airport-to-airport turbulence estimate
  - explicit `Run check`
  - dedicated route result screen with summary, map, and segment analysis

This is not a full operational flight-tracking app. The route result is still a
weather-backed model, not a validated flown-track truth product.

## Entrypoints

- `lib/main_dev.dart`
  - local or simulator development
  - defaults to `http://127.0.0.1:8787` when `BACKEND_BASE_URL` is omitted
- `lib/main_prod.dart`
  - production/mobile builds
  - requires an explicit `BACKEND_BASE_URL`
  - rejects localhost and non-HTTPS URLs
- `lib/main.dart`
  - forwards to `main_prod.dart`

This is deliberate. A hidden localhost default is acceptable for simulator
development, but not for a production mobile app.

## Local Development

1. Install Flutter dependencies:

```bash
flutter pub get
```

2. Install backend dependencies:

```bash
cd backend
npm install
cd ..
```

3. Optional but recommended: copy the backend env template.

```bash
cp backend/.env.example backend/.env
```

Recommended backend env for local development:

```bash
APP_STORE_URL=https://apps.apple.com/us/app/your-app/id123456789
FLIGHT_PROVIDER=aerodatabox
AERODATABOX_MARKETPLACE=rapidapi
AERODATABOX_API_KEY=your-key-here
AERODATABOX_ENABLE_FLIGHT_PLAN=false
```

Local development defaults to process-memory caches and disables App Attest,
because iOS simulators cannot produce Apple attestations.

`APP_STORE_URL` drives the landing page's primary CTA. If it is omitted, the
landing page falls back to an App Store search URL for `SkyShake` instead of
pretending a listing URL is known.

4. Start the backend:

```bash
cd backend
npm run dev
```

5. Run the mobile-friendly development entrypoint:

```bash
flutter run -d ios -t lib/main_dev.dart --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
```

For web debugging:

```bash
flutter run -d chrome -t lib/main_dev.dart --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
```

Flutter web opens the application shell for debugging. The backend owns the
deployable marketing/demo landing page at `/`; there is no second Flutter
landing implementation to keep in sync.

When changing the supported airport list, edit only
`shared/airport-catalog.json`, then regenerate both compiled catalogs:

```bash
cd backend
npm run generate:airports
```

Backend tests and builds fail if either generated file drifts from that source.

The Flutter web app talks to the backend over HTTP from a different local
origin. If you see `Could not reach the backend...`, that usually means one of
two things:

- the backend process is not running on `127.0.0.1:8787`
- the browser cannot make a cross-origin request to the backend

In the app:

- `Flight` calls the backend flight lookup endpoint.
- `Use this route` copies the provider's departure, arrival, and aircraft into
  the route analysis form when those airport codes exist in SkyShake's bundled
  catalog.
- `Route` performs the turbulence estimate.

## iOS Networking Notes

- `main_dev.dart` is allowed to target a local HTTP backend during simulator
  development.
- `Info.plist` now uses `NSAllowsLocalNetworking` instead of globally enabling
  arbitrary insecure loads.
- Production builds must use an explicit HTTPS backend URL.
- `127.0.0.1` is a simulator/dev convenience, not a viable production mobile
  backend target.

## Backend Operational Controls

- Provider-backed API routes default to 30 requests per 60 seconds. Configure
  this with `PROVIDER_RATE_LIMIT_MAX` and `PROVIDER_RATE_LIMIT_WINDOW_MS`.
- Production (`NODE_ENV=production`) requires `REDIS_URL`; rate counters and
  completed provider cache entries are shared across instances. Development
  and tests retain bounded process-memory stores.
- Production also requires Apple App Attest configuration:
  `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`, and
  `APP_ATTEST_ALLOW_DEVELOPMENT=false`. `APP_ATTEST_MODE` must be `required`
  (and defaults to it in production).
- The Flutter production client registers an Apple-attested app-instance key
  and binds a fresh assertion to every protected request. Challenges are
  single-use and assertion counters are updated atomically in Redis.
- App Attest proves app-instance integrity; it is not a user account or a
  human identity system. A static key embedded in Flutter would not provide
  this protection and is intentionally not used.
- The landing page route preview uses the narrower anonymous
  `/v1/public/route-analysis/airports` endpoint. Flight endpoints and mobile
  route endpoints require App Attest in production.
- `TRUST_PROXY_HOPS` defaults to `0`. Set it only to the exact trusted proxy hop
  count used by the deployment; incorrect proxy trust makes IP-based limits
  inaccurate or spoofable.
- Browser CORS requests are accepted from localhost development origins and
  origins explicitly listed in `CORS_ALLOWED_ORIGINS`. Native mobile requests
  and same-origin landing-page requests do not require CORS.
- Route analysis has an 18-second total processing deadline by default,
  configured with `ROUTE_ANALYSIS_TIMEOUT_MS`. The deadline cancels already
  active Open-Meteo fetches; individual provider requests also have bounded
  lifetimes.
- Structured backend logging defaults to `LOG_LEVEL=info`. Expected provider
  failures log sanitized status/code/provider metadata; authorization and
  cookie headers are redacted.
- The backend landing response uses a per-request nonce CSP, avoids dynamic
  HTML parsing sinks, and sends nosniff, frame, referrer, and permissions
  headers.

Production deployment requires the Apple App Attest capability for team
`595KFFGG66` and bundle `com.skyshake.app`, plus provisioning profiles that
carry the matching entitlement. Debug builds use the development App Attest
environment; Release/Profile use production. A physical iOS device is needed
for development attestation, and TestFlight/App Store distribution is needed
to validate the production AAGUID end to end.

## Validation

Frontend:

```bash
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
flutter build ios --simulator --no-codesign -t lib/main_dev.dart --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
flutter build web --release -t lib/main_dev.dart --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
```

Backend:

```bash
cd backend
npm test
npm run build
npm audit --omit=dev
```

An optional real-Redis integration test verifies cross-instance rate limits,
caches, challenge consumption, and assertion counters:

```bash
REDIS_TEST_URL=redis://127.0.0.1:6379/0 npm test -- --run test/redis-integration.test.ts
```

## Critical Notes

- “Real data” still does **not** mean “ground truth turbulence.” The response is
  explicitly `weather-proxy` version 2 and non-operational. It uses
  time-aligned forecast weather and cruise-level wind shear, but it has not
  been scientifically calibrated against aviation EDR or PIREPs.
- SkyShake no longer emits a fabricated EDR value. Operational turbulence
  guidance requires an aviation-grade data source and an external validation
  program; unit tests and disclaimers cannot create that evidence.
- AeroDataBox is used here as a cost-sensitive provider, not as an operational
  aviation-grade source of truth.
- AeroDataBox responses can be partial. Missing live position, incomplete
  timing, or schedule-only payloads are expected failure modes, not rare edge
  cases.
- Redis is operationally required in production. An unavailable Redis instance
  fails closed for rate limits and attestation instead of silently weakening
  enforcement to process-local state.
- Flutter web local debugging depends on the backend staying reachable from the
  browser. A dead local API process and missing CORS headers fail in nearly the
  same way from the frontend’s perspective.
- Flight-plan enrichment is wired behind config only and stays off by default,
  because it adds coverage limits and quota cost.
- Without a configured `AERODATABOX_API_KEY`, you do **not** have real
  flight-number lookup yet.
- The current live route endpoint still analyzes airport-to-airport geometry,
  not a validated provider route track.
