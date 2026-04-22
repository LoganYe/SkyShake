import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/widgets/route_map_card.dart';

void main() {
  testWidgets('renders transpacific routes in one pacific-centered world copy', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RouteMapCard(
            flightData: FlightData(
              flightNumber: 'UA857',
              airline: 'United Airlines',
              departure: 'SFO',
              departureAirport: 'San Francisco International',
              arrival: 'PVG',
              arrivalAirport: 'Shanghai Pudong International',
              departureTime: DateTime.utc(2026, 4, 21, 20, 1),
              arrivalTime: DateTime.utc(2026, 4, 22, 9, 25),
              aircraft: 'Boeing 777-300',
              status: 'enroute',
              latitude: null,
              longitude: null,
              altitude: null,
              velocity: null,
              isMockData: false,
              error: null,
            ),
            report: const TurbulenceReport(
              overallScore: 0.42,
              averageScore: 0.38,
              overallLabel: TurbulenceLabel.moderate,
              totalWaypoints: 7,
              waypoints: [
                TurbulenceWaypoint(
                  waypoint: 0,
                  latitude: 37.6213,
                  longitude: -122.3790,
                  turbulenceScore: 0.18,
                  label: TurbulenceLabel.smooth,
                  windSpeed: 42,
                  windGusts: 50,
                  windShear: 6,
                  temperature: 12,
                  cloudCover: 24,
                  cape: 0,
                  edr: 0.08,
                ),
                TurbulenceWaypoint(
                  waypoint: 1,
                  latitude: 45.0,
                  longitude: -145.0,
                  turbulenceScore: 0.24,
                  label: TurbulenceLabel.smooth,
                  windSpeed: 48,
                  windGusts: 58,
                  windShear: 8,
                  temperature: 6,
                  cloudCover: 32,
                  cape: 0,
                  edr: 0.12,
                ),
                TurbulenceWaypoint(
                  waypoint: 2,
                  latitude: 52.0,
                  longitude: -170.0,
                  turbulenceScore: 0.39,
                  label: TurbulenceLabel.moderate,
                  windSpeed: 54,
                  windGusts: 66,
                  windShear: 11,
                  temperature: 0,
                  cloudCover: 46,
                  cape: 12,
                  edr: 0.25,
                ),
                TurbulenceWaypoint(
                  waypoint: 3,
                  latitude: 55.0,
                  longitude: 178.0,
                  turbulenceScore: 0.47,
                  label: TurbulenceLabel.moderate,
                  windSpeed: 60,
                  windGusts: 74,
                  windShear: 15,
                  temperature: -4,
                  cloudCover: 61,
                  cape: 28,
                  edr: 0.33,
                ),
                TurbulenceWaypoint(
                  waypoint: 4,
                  latitude: 48.0,
                  longitude: 154.0,
                  turbulenceScore: 0.52,
                  label: TurbulenceLabel.moderate,
                  windSpeed: 65,
                  windGusts: 82,
                  windShear: 18,
                  temperature: -8,
                  cloudCover: 67,
                  cape: 44,
                  edr: 0.37,
                ),
                TurbulenceWaypoint(
                  waypoint: 5,
                  latitude: 38.0,
                  longitude: 130.0,
                  turbulenceScore: 0.61,
                  label: TurbulenceLabel.severe,
                  windSpeed: 71,
                  windGusts: 91,
                  windShear: 20,
                  temperature: -2,
                  cloudCover: 70,
                  cape: 58,
                  edr: 0.44,
                ),
                TurbulenceWaypoint(
                  waypoint: 6,
                  latitude: 31.1443,
                  longitude: 121.8083,
                  turbulenceScore: 0.28,
                  label: TurbulenceLabel.smooth,
                  windSpeed: 46,
                  windGusts: 56,
                  windShear: 9,
                  temperature: 10,
                  cloudCover: 40,
                  cape: 8,
                  edr: 0.16,
                ),
              ],
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    final flutterMap = tester.widget<FlutterMap>(find.byType(FlutterMap));
    expect(flutterMap.options.initialCameraFit, isNotNull);
    expect(flutterMap.options.initialCenter.longitude.abs(), greaterThan(150));

    final polylineLayer = tester.widget<PolylineLayer>(
      find.byType(PolylineLayer),
    );
    final polyline = polylineLayer.polylines.single;
    expect(polyline.points, hasLength(7));
    expect(polyline.points.last.longitude, lessThan(-200));
    for (var index = 1; index < polyline.points.length; index += 1) {
      final longitudeDelta =
          (polyline.points[index].longitude -
                  polyline.points[index - 1].longitude)
              .abs();
      expect(longitudeDelta, lessThanOrEqualTo(180));
    }

    final markerLayer = tester.widget<MarkerLayer>(find.byType(MarkerLayer));
    final markerLongitudes = markerLayer.markers
        .map((marker) => marker.point.longitude)
        .toList(growable: false);

    expect(
      markerLongitudes.any((longitude) => longitude > -140),
      isTrue,
      reason: 'Departure marker should remain near the U.S. west coast copy.',
    );
    expect(
      markerLongitudes.any((longitude) => longitude < -230),
      isTrue,
      reason:
          'Arrival marker should move into the same Pacific world copy as the route.',
    );
  });
}
