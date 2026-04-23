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

    test('does not invent schedule timestamps when the backend omits them', () {
      final flight = FlightData.fromJson({
        'flightNumber': 'UA857',
        'airline': 'United Airlines',
        'departure': 'SFO',
        'arrival': 'JFK',
        'aircraft': 'Boeing 777-300ER',
        'status': 'Expected',
        'isMockData': false,
      });

      expect(flight.departureTime, isNull);
      expect(flight.arrivalTime, isNull);
      expect(flight.toJson()['departureTime'], isNull);
      expect(flight.toJson()['arrivalTime'], isNull);
    });
  });

  group('FlightLookupResult', () {
    test('parses flight lookup payloads with diagnostics metadata', () {
      final result = FlightLookupResult.fromJson({
        'flightNumber': 'UA857',
        'flightDate': '2026-04-21',
        'flightTime': '12:05',
        'flight': {
          'flightNumber': 'UA857',
          'airline': 'United Airlines',
          'departure': 'SFO',
          'departureAirport': 'San Francisco International Airport',
          'arrival': 'PVG',
          'arrivalAirport': 'Shanghai Pudong International Airport',
          'departureTime': '2026-04-21T20:01:00Z',
          'arrivalTime': '2026-04-22T09:25:00Z',
          'aircraft': 'Boeing 777-300',
          'status': 'EnRoute',
          'latitude': null,
          'longitude': null,
          'altitude': null,
          'velocity': null,
          'isMockData': false,
          'error': null,
        },
        'notFound': false,
        'meta': {
          'provider': 'aerodatabox',
          'source': 'cache',
          'partial': true,
          'missingFields': ['location'],
          'cachedAt': '2026-04-21T20:02:00Z',
          'expiresAt': '2026-04-21T20:03:00Z',
        },
      });

      expect(result.flightNumber, 'UA857');
      expect(result.flightDate, DateTime.parse('2026-04-21'));
      expect(result.flightTime, '12:05');
      expect(result.flight?.status, 'EnRoute');
      expect(result.metadata.provider, 'aerodatabox');
      expect(result.metadata.source, FlightLookupSource.cache);
      expect(result.metadata.partial, isTrue);
      expect(result.metadata.missingFields, ['location']);
    });

    test('keeps honest no-result responses without inventing a flight', () {
      final result = FlightLookupResult.fromJson({
        'flightNumber': 'ZZ0000',
        'flightDate': null,
        'flight': null,
        'notFound': true,
        'meta': {
          'provider': 'aerodatabox',
          'source': 'live',
          'partial': false,
          'missingFields': [],
          'cachedAt': null,
          'expiresAt': null,
        },
      });

      expect(result.notFound, isTrue);
      expect(result.flight, isNull);
      expect(result.hasFlight, isFalse);
    });
  });

  group('FlightOptionsResult', () {
    test('parses route-based flight choices and metadata', () {
      final result = FlightOptionsResult.fromJson({
        'departureCode': 'SFO',
        'arrivalCode': 'JFK',
        'departureLocal': '2026-04-22T12:00',
        'flights': [
          {
            'flightNumber': 'UA857',
            'airline': 'United Airlines',
            'departure': 'SFO',
            'departureAirport': 'San Francisco International Airport',
            'arrival': 'JFK',
            'arrivalAirport': 'John F. Kennedy International Airport',
            'departureTime': '2026-04-22T19:00:00Z',
            'arrivalTime': '2026-04-23T01:10:00Z',
            'aircraft': 'Boeing 777-300ER',
            'status': 'Scheduled',
            'latitude': null,
            'longitude': null,
            'altitude': null,
            'velocity': null,
            'isMockData': false,
            'error': null,
          },
        ],
        'notFound': false,
        'meta': {
          'provider': 'aerodatabox',
          'source': 'cache',
          'cachedAt': '2026-04-22T19:01:00Z',
          'expiresAt': '2026-04-22T19:02:00Z',
          'timeWindowStart': '2026-04-22T09:00',
          'timeWindowEnd': '2026-04-22T15:00',
        },
      });

      expect(result.departureCode, 'SFO');
      expect(result.arrivalCode, 'JFK');
      expect(result.flights, hasLength(1));
      expect(result.flights.first.flightNumber, 'UA857');
      expect(result.metadata.source, FlightLookupSource.cache);
      expect(result.metadata.timeWindowStart, DateTime.parse('2026-04-22T09:00'));
      expect(result.metadata.timeWindowEnd, DateTime.parse('2026-04-22T15:00'));
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
