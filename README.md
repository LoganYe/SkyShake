# SkyShake

SkyShake is now an iOS-first Flutter app backed by a separate Node/Fastify API.

That split is intentional. The mobile app does not talk directly to third-party
flight providers, because that design falls apart as soon as a provider needs
secrets, rate limits, billing controls, or request normalization.

## Current Stack

- Frontend: Flutter + Dart
- Mobile app shell: Flutter Material 3 with a two-tab iOS-first layout
- App state: `provider`
- Network client: `dio`
- Backend: Node.js + TypeScript + Fastify
- Weather provider: Open-Meteo, fetched server-side
- Flight provider: AeroDataBox via RapidAPI by default
- Map rendering: `flutter_map` + OpenStreetMap tiles

## What Is Truly Live Right Now

- Route turbulence analysis by airport pair is live, because the backend fetches
  real Open-Meteo weather data for each waypoint.
- Flight-number lookup is exposed in the Flutter UI and backed by
  `GET /v1/flights/search` on the backend. It is only live when
  `FLIGHT_PROVIDER=aerodatabox` and `AERODATABOX_API_KEY` are configured.
- There is no silent mock fallback in the backend path. If the upstream call
  fails, SkyShake returns an error instead of inventing data.
- Live location and schedule fields are still provider-dependent. Some flights
  return schedule-only data or partial airport timing data.
- Repeated identical flight lookups are cached in-memory inside the backend process:
  - successful results: 60 seconds
  - not-found results: 30 seconds
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
- `backend/`: Node/TypeScript backend service
- `test/`: Flutter tests
- `web/`: Flutter web shell

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
FLIGHT_PROVIDER=aerodatabox
AERODATABOX_MARKETPLACE=rapidapi
AERODATABOX_API_KEY=your-key-here
AERODATABOX_ENABLE_FLIGHT_PLAN=false
```

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
```

## Critical Notes

- “Real data” still does **not** mean “ground truth turbulence.” The weather is
  real; the turbulence score is still SkyShake’s model.
- AeroDataBox is used here as a cost-sensitive provider, not as an operational
  aviation-grade source of truth.
- AeroDataBox responses can be partial. Missing live position, incomplete
  timing, or schedule-only payloads are expected failure modes, not rare edge
  cases.
- The backend cache is local to a single process. It reduces duplicate upstream
  calls and rate-limit pressure, but it is not a shared or durable cache.
- Flutter web local debugging depends on the backend staying reachable from the
  browser. A dead local API process and missing CORS headers fail in nearly the
  same way from the frontend’s perspective.
- Flight-plan enrichment is wired behind config only and stays off by default,
  because it adds coverage limits and quota cost.
- Without a configured `AERODATABOX_API_KEY`, you do **not** have real
  flight-number lookup yet.
- The current live route endpoint still analyzes airport-to-airport geometry,
  not a validated provider route track.
