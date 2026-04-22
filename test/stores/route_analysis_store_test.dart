import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';
import 'package:skyshake/src/stores/route_analysis_store.dart';
import 'package:skyshake/src/stores/route_draft_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('RouteAnalysisStore', () {
    test('stores successful route analysis results', () async {
      final store = RouteAnalysisStore(
        _FakeTrackingRepository(
          analyzeRouteHandler: (_) async => _sampleRouteAnalysis(),
        ),
      );
      final draft = RouteDraftStore();

      final result = await store.runAnalysis(draft);

      expect(result, isNotNull);
      expect(store.error, isNull);
      expect(store.latestResult?.flightData.flightNumber, 'SFO-JFK');
      draft.dispose();
      store.dispose();
    });

    test('stores route analysis errors', () async {
      final store = RouteAnalysisStore(
        _FakeTrackingRepository(
          analyzeRouteHandler: (_) async {
            throw const TrackingException(
              'Open-Meteo request failed with HTTP 502.',
              code: 'weather_upstream_failed',
            );
          },
        ),
      );
      final draft = RouteDraftStore();

      final result = await store.runAnalysis(draft);

      expect(result, isNull);
      expect(store.latestResult, isNull);
      expect(store.error?.code, 'weather_upstream_failed');
      draft.dispose();
      store.dispose();
    });
  });
}

class _FakeTrackingRepository implements TrackingRepository {
  _FakeTrackingRepository({required this.analyzeRouteHandler});

  final Future<RouteAnalysisResult> Function(RouteQuery query)?
  analyzeRouteHandler;

  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) {
    final handler = analyzeRouteHandler;
    if (handler == null) {
      throw UnimplementedError('analyzeRoute was not configured.');
    }
    return handler(query);
  }

  @override
  Future<FlightLookupResult> lookupFlight(FlightLookupQuery query) {
    throw UnimplementedError('lookupFlight was not configured.');
  }

  @override
  Future<FlightOptionsResult> searchFlightsForRoute(FlightOptionsQuery query) {
    throw UnimplementedError('searchFlightsForRoute was not configured.');
  }
}

RouteAnalysisResult _sampleRouteAnalysis() {
  return RouteAnalysisResult(
    notice: 'Server-side route estimate for store coverage.',
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
      totalWaypoints: 1,
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
      ],
    ),
  );
}
