# SkyShake

SkyShake now uses a separate Flutter frontend and backend service.

That split is intentional. Live third-party requests no longer happen directly in the app, because that design breaks down as soon as a provider needs secrets, rate limits, billing controls, or request normalization.

## Current Stack

- Frontend: Flutter + Dart
- Backend: Node.js + TypeScript + Fastify
- Weather provider: Open-Meteo, fetched server-side
- Flight provider: Aviationstack adapter, disabled until a real access key is configured
- Map rendering: `flutter_map` + OpenStreetMap tiles

## What Is Truly Live Right Now

- Route turbulence analysis by airport pair is live, because the backend fetches real Open-Meteo weather data for each waypoint.
- Flight-number lookup is implemented as a backend endpoint, but it is **not operational until** `AVIATIONSTACK_ACCESS_KEY` is configured.
- There is no silent mock fallback in the backend path. If the upstream call fails, SkyShake returns an error instead of inventing data.

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
- Without a paid or configured flight-data provider key, you do **not** have real flight-number lookup yet.
- The current live route endpoint still analyzes airport-to-airport geometry, not a validated provider route track.
