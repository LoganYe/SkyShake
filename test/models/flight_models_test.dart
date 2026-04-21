import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/models/flight_models.dart';

void main() {
  group('TurbulenceLabelX', () {
    test('derives labels from score thresholds', () {
      expect(TurbulenceLabelX.fromScore(0.2), TurbulenceLabel.smooth);
      expect(TurbulenceLabelX.fromScore(0.45), TurbulenceLabel.moderate);
      expect(TurbulenceLabelX.fromScore(0.72), TurbulenceLabel.severe);
    });
  });

  group('FlightData', () {
    test('parses backend payloads and preserves optional values', () {
      final flight = FlightData.fromJson({
        'flightNumber': 'UA857',
        'airline': 'United Airlines',
        'departure': 'SFO',
        'departureAirport': 'San Francisco International Airport',
        'arrival': 'JFK',
        'arrivalAirport': 'John F. Kennedy International Airport',
        'departureTime': '2026-04-21T17:00:00Z',
        'arrivalTime': '2026-04-21T23:15:00Z',
        'aircraft': 'Boeing 777-300ER',
        'status': 'scheduled',
        'latitude': 40.1,
        'longitude': '-73.7',
        'altitude': 35000,
        'velocity': '845',
        'isMockData': false,
      });

      expect(flight.flightNumber, 'UA857');
      expect(flight.departureAirport, 'San Francisco International Airport');
      expect(flight.longitude, closeTo(-73.7, 0.0001));
      expect(flight.velocity, closeTo(845, 0.0001));
      expect(flight.isUnavailable, isFalse);
      expect(flight.toJson()['flightNumber'], 'UA857');
    });
  });

  group('TurbulenceReport', () {
    test('parses waypoints and total fallback correctly', () {
      final report = TurbulenceReport.fromJson({
        'overallScore': '0.64',
        'averageScore': 0.42,
        'overallLabel': 'Severe',
        'waypoints': [
          {
            'waypoint': 0,
            'latitude': 37.6,
            'longitude': -122.3,
            'turbulenceScore': 0.22,
            'label': 'Smooth',
            'windSpeed': 52,
            'windGusts': 68,
            'windShear': 0.35,
            'temperature': 11,
            'cloudCover': 42,
            'cape': 0,
            'edr': 0.14,
          },
          {
            'waypoint': 1,
            'latitude': 41.0,
            'longitude': -110.0,
            'turbulenceScore': 0.64,
            'label': 'Severe',
            'windSpeed': 80,
            'windGusts': 95,
            'windShear': 0.88,
            'temperature': 6,
            'cloudCover': 65,
            'cape': 450,
            'edr': 0.48,
          },
        ],
      });

      expect(report.overallLabel, TurbulenceLabel.severe);
      expect(report.waypoints, hasLength(2));
      expect(report.totalWaypoints, 2);
      expect(report.waypoints.last.label, TurbulenceLabel.severe);
    });
  });
}
