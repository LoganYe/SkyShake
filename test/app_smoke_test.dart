import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:skyshake/src/app.dart';
import 'package:skyshake/src/core/app_config.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('renders the iOS-first tab shell and switches tabs', (
    tester,
  ) async {
    await tester.pumpWidget(
      _buildTestApp(repository: _FakeTrackingRepository()),
    );
    await tester.pumpAndSettle();

    expect(find.text('SkyShake'), findsOneWidget);
    expect(find.text('Find a flight'), findsWidgets);
    expect(find.text('Route'), findsOneWidget);

    await tester.tap(find.text('Route'));
    await tester.pumpAndSettle();

    expect(find.text('Check a route'), findsWidgets);
    expect(find.byKey(const Key('route-tab-screen')), findsOneWidget);
  });

  testWidgets('shows route analysis results after a successful query', (
    tester,
  ) async {
    await tester.pumpWidget(
      _buildTestApp(
        repository: _FakeTrackingRepository(
          analyzeRouteHandler: (_) async => _sampleRouteAnalysis(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Route'));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('route-analysis-submit')));
    await tester.tap(find.byKey(const Key('route-analysis-submit')));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Route result'), findsWidgets);
    expect(find.text('Route estimate'), findsOneWidget);
    expect(find.text('Route map'), findsOneWidget);
  });

  testWidgets('shows a flight lookup result and prefills the route form', (
    tester,
  ) async {
    await tester.pumpWidget(
      _buildTestApp(
        repository: _FakeTrackingRepository(
          lookupFlightHandler: (_) async => _sampleFlightLookup(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('flight-number-field')),
      'AS331',
    );
    await _scrollTo(tester, find.byKey(const Key('flight-lookup-submit')));
    await tester.tap(find.byKey(const Key('flight-lookup-submit')));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('AS331'), findsWidgets);
    await _scrollTo(tester, find.byKey(const Key('use-flight-route-button')));
    expect(find.byKey(const Key('use-flight-route-button')), findsOneWidget);

    await tester.tap(find.byKey(const Key('use-flight-route-button')));
    await tester.pumpAndSettle();

    final departureField = tester.widget<TextField>(
      find.byKey(const Key('route-departure-field')),
    );
    final arrivalField = tester.widget<TextField>(
      find.byKey(const Key('route-arrival-field')),
    );
    final aircraftField = tester.widget<TextField>(
      find.byKey(const Key('route-aircraft-field')),
    );

    expect(departureField.controller?.text, 'LAX');
    expect(arrivalField.controller?.text, 'SEA');
    expect(aircraftField.controller?.text, 'Boeing 737 MAX 9');
    expect(find.textContaining('Prefilled from AS331.'), findsOneWidget);
  });

  testWidgets('shows a no-result state for unmatched flight lookups', (
    tester,
  ) async {
    await tester.pumpWidget(
      _buildTestApp(
        repository: _FakeTrackingRepository(
          lookupFlightHandler:
              (_) async => const FlightLookupResult(
                flightNumber: 'ZZ0000',
                flightDate: null,
                flightTime: null,
                flight: null,
                notFound: true,
                metadata: FlightLookupMetadata(
                  provider: 'aerodatabox',
                  source: FlightLookupSource.live,
                  partial: false,
                  missingFields: <String>[],
                  cachedAt: null,
                  expiresAt: null,
                ),
              ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('flight-number-field')),
      'ZZ0000',
    );
    await _scrollTo(tester, find.byKey(const Key('flight-lookup-submit')));
    await tester.tap(find.byKey(const Key('flight-lookup-submit')));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('No matching flight found'), findsOneWidget);
    expect(find.textContaining('ZZ0000'), findsWidgets);
  });

  testWidgets('shows retryable provider failures without fabricating data', (
    tester,
  ) async {
    await tester.pumpWidget(
      _buildTestApp(
        repository: _FakeTrackingRepository(
          lookupFlightHandler: (_) async {
            throw const TrackingException(
              'AeroDataBox rate limit exceeded.',
              code: 'provider_rate_limited',
              provider: 'aerodatabox',
              retryable: true,
              retryAfterSeconds: 7,
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    await _scrollTo(tester, find.byKey(const Key('flight-lookup-submit')));
    await tester.tap(find.byKey(const Key('flight-lookup-submit')));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(
      find.textContaining(
        'AeroDataBox rate limit exceeded. Try again in about 7s.',
      ),
      findsOneWidget,
    );
    expect(find.byKey(const Key('use-flight-route-button')), findsNothing);
  });
}

Future<void> _scrollTo(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    180,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

Widget _buildTestApp({required TrackingRepository repository}) {
  return SkyShakeApp(
    repository: repository,
    config: const AppConfig(
      environment: AppEnvironment.development,
      backendBaseUrl: 'http://127.0.0.1:8787',
    ),
  );
}

class _FakeTrackingRepository implements TrackingRepository {
  _FakeTrackingRepository({this.analyzeRouteHandler, this.lookupFlightHandler});

  final Future<RouteAnalysisResult> Function(RouteQuery query)?
  analyzeRouteHandler;
  final Future<FlightLookupResult> Function(FlightLookupQuery query)?
  lookupFlightHandler;

  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) {
    final handler = analyzeRouteHandler;
    if (handler == null) {
      throw UnimplementedError(
        'analyzeRoute was not configured for this test.',
      );
    }

    return handler(query);
  }

  @override
  Future<FlightLookupResult> lookupFlight(FlightLookupQuery query) {
    final handler = lookupFlightHandler;
    if (handler == null) {
      throw UnimplementedError(
        'lookupFlight was not configured for this test.',
      );
    }

    return handler(query);
  }

  @override
  Future<FlightOptionsResult> searchFlightsForRoute(FlightOptionsQuery query) {
    throw UnimplementedError(
      'searchFlightsForRoute was not configured for this test.',
    );
  }
}

RouteAnalysisResult _sampleRouteAnalysis() {
  return RouteAnalysisResult(
    notice: 'Server-side route estimate for smoke-test coverage.',
    flightData: FlightData(
      flightNumber: 'SFO-JFK',
      airline: 'SkyShake route estimate',
      departure: 'SFO',
      departureAirport: 'San Francisco International',
      arrival: 'JFK',
      arrivalAirport: 'John F. Kennedy International',
      departureTime: DateTime.utc(2026, 4, 21, 17),
      arrivalTime: DateTime.utc(2026, 4, 22, 0),
      aircraft: 'Boeing 787-9',
      status: 'estimate',
      latitude: 39.1,
      longitude: -98.0,
      altitude: 39000,
      velocity: 905,
      isMockData: false,
      error: null,
    ),
    report: const TurbulenceReport(
      overallScore: 0.48,
      averageScore: 0.38,
      overallLabel: TurbulenceLabel.moderate,
      totalWaypoints: 3,
      waypoints: [
        TurbulenceWaypoint(
          waypoint: 0,
          latitude: 37.6213,
          longitude: -122.3790,
          turbulenceScore: 0.24,
          label: TurbulenceLabel.smooth,
          windSpeed: 42,
          windGusts: 55,
          windShear: 8,
          temperature: 11,
          cloudCover: 26,
          cape: 20,
          edr: 0.12,
        ),
        TurbulenceWaypoint(
          waypoint: 1,
          latitude: 39.8617,
          longitude: -98.0,
          turbulenceScore: 0.54,
          label: TurbulenceLabel.moderate,
          windSpeed: 63,
          windGusts: 82,
          windShear: 15,
          temperature: 4,
          cloudCover: 58,
          cape: 240,
          edr: 0.31,
        ),
        TurbulenceWaypoint(
          waypoint: 2,
          latitude: 40.6413,
          longitude: -73.7781,
          turbulenceScore: 0.41,
          label: TurbulenceLabel.moderate,
          windSpeed: 58,
          windGusts: 71,
          windShear: 11,
          temperature: 7,
          cloudCover: 47,
          cape: 110,
          edr: 0.24,
        ),
      ],
    ),
  );
}

FlightLookupResult _sampleFlightLookup() {
  return FlightLookupResult(
    flightNumber: 'AS331',
    flightDate: DateTime.utc(2026, 4, 21),
    flightTime: null,
    notFound: false,
    flight: FlightData(
      flightNumber: 'AS331',
      airline: 'Alaska Airlines',
      departure: 'LAX',
      departureAirport: 'Los Angeles International',
      arrival: 'SEA',
      arrivalAirport: 'Seattle-Tacoma International',
      departureTime: DateTime.utc(2026, 4, 21, 16, 15),
      arrivalTime: DateTime.utc(2026, 4, 21, 18, 53),
      aircraft: 'Boeing 737 MAX 9',
      status: 'EnRoute',
      latitude: null,
      longitude: null,
      altitude: null,
      velocity: null,
      isMockData: false,
      error: null,
    ),
    metadata: const FlightLookupMetadata(
      provider: 'aerodatabox',
      source: FlightLookupSource.live,
      partial: true,
      missingFields: ['location'],
      cachedAt: null,
      expiresAt: null,
    ),
  );
}
