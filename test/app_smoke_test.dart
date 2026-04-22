import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:skyshake/src/app.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('renders the landing page and live preview shell', (
    tester,
  ) async {
    await tester.pumpWidget(SkyShakeApp(repository: _StubTrackingRepository()));
    await tester.pumpAndSettle();

    expect(find.text('SkyShake'), findsWidgets);
    expect(find.text('Check a route before the cabin does.'), findsOneWidget);
    expect(find.text('Try the live preview'), findsOneWidget);
    expect(find.text('Reality Check'), findsOneWidget);
  });

  testWidgets('shows route analysis results after a successful query', (
    tester,
  ) async {
    await tester.pumpWidget(
      SkyShakeApp(repository: _SuccessfulTrackingRepository()),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Run check'));
    await tester.tap(find.text('Run check'));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('SFO-JFK'), findsOneWidget);
    expect(find.text('SkyShake route estimate'), findsOneWidget);
    expect(find.text('Moderate'), findsWidgets);
    expect(find.text('Route map'), findsOneWidget);
  });
}

class _StubTrackingRepository implements TrackingRepository {
  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) {
    throw UnimplementedError('Not used in this smoke test.');
  }
}

class _SuccessfulTrackingRepository implements TrackingRepository {
  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) async {
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
            latitude: 40.2,
            longitude: -105.0,
            turbulenceScore: 0.48,
            label: TurbulenceLabel.moderate,
            windSpeed: 61,
            windGusts: 82,
            windShear: 16,
            temperature: 3,
            cloudCover: 63,
            cape: 420,
            edr: 0.34,
          ),
          TurbulenceWaypoint(
            waypoint: 2,
            latitude: 40.6413,
            longitude: -73.7781,
            turbulenceScore: 0.33,
            label: TurbulenceLabel.moderate,
            windSpeed: 47,
            windGusts: 63,
            windShear: 10,
            temperature: 9,
            cloudCover: 41,
            cape: 90,
            edr: 0.21,
          ),
        ],
      ),
    );
  }
}
