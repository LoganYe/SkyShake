# SkyShake

SkyShake now uses a separate Flutter frontend and backend service.

That split is intentional. Live third-party requests no longer happen directly in the app, because that design breaks down as soon as a provider needs secrets, rate limits, billing controls, or request normalization.

## Current Stack

- Frontend: Flutter + Dart
- Backend: Node.js + TypeScript + Fastify
- Weather provider: Open-Meteo, fetched server-side
- Flight provider: AeroDataBox via RapidAPI by default
- Map rendering: `flutter_map` + OpenStreetMap tiles

## What Is Truly Live Right Now

- Route turbulence analysis by airport pair is live, because the backend fetches real Open-Meteo weather data for each waypoint.
- Flight-number lookup is implemented as a backend endpoint backed by AeroDataBox. It is only live when `FLIGHT_PROVIDER=aerodatabox` and `AERODATABOX_API_KEY` are configured.
- There is no silent mock fallback in the backend path. If the upstream call fails, SkyShake returns an error instead of inventing data.
- Live location and schedule fields are still provider-dependent. Some flights return schedule-only data or partial airport timing data.

## Repo Layout

- `lib/`: Flutter frontend
- `backend/`: Node/TypeScript backend service
- `test/`: Flutter tests
- `web/`: Flutter web shell

## Local Debug

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

5. Run the Flutter app against the backend:

```bash
flutter run -d chrome --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
```

## Validation

Frontend:

```bash
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
flutter build web --release --dart-define=BACKEND_BASE_URL=http://127.0.0.1:8787
```

Backend:

```bash
cd backend
npm test
npm run build
```

## Critical Notes

- “Real data” still does **not** mean “ground truth turbulence.” The weather is real; the turbulence score is still SkyShake’s model.
- AeroDataBox is used here as a cost-sensitive provider, not as an operational aviation-grade source of truth.
- Flight-plan enrichment is wired behind config only and stays off by default, because it adds coverage limits and quota cost.
- Without a configured `AERODATABOX_API_KEY`, you do **not** have real flight-number lookup yet.
- The current live route endpoint still analyzes airport-to-airport geometry, not a validated provider route track.
