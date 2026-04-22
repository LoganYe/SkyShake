import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:skyshake/src/core/app_config.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/backend_tracking_repository.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';

void main() {
  group('BackendTrackingRepository', () {
    test(
      'posts route analysis requests to the backend and parses the response',
      () async {
        late Uri requestedUri;
        late Map<String, dynamic> requestedBody;

        final repository = BackendTrackingRepository(
          const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
          client: MockClient((request) async {
            requestedUri = request.url;
            requestedBody = jsonDecode(request.body) as Map<String, dynamic>;
            return http.Response(
              jsonEncode({
                'notice': 'Live backend estimate.',
                'flightData': {
                  'flightNumber': 'SFO-JFK',
                  'airline': 'SkyShake live weather route analysis',
                  'departure': 'SFO',
                  'departureAirport': 'San Francisco International',
                  'arrival': 'JFK',
                  'arrivalAirport': 'John F. Kennedy International',
                  'departureTime': '2026-04-21T17:00:00Z',
                  'arrivalTime': '2026-04-22T00:00:00Z',
                  'aircraft': 'Boeing 787-9',
                  'status': 'live weather estimate',
                  'latitude': 39.1,
                  'longitude': -98.0,
                  'altitude': 39000,
                  'velocity': 905,
                  'isMockData': false,
                  'error': null,
                },
                'report': {
                  'overallScore': 0.52,
                  'averageScore': 0.37,
                  'overallLabel': 'Moderate',
                  'totalWaypoints': 2,
                  'waypoints': [
                    {
                      'waypoint': 0,
                      'latitude': 37.6213,
                      'longitude': -122.3790,
                      'turbulenceScore': 0.31,
                      'label': 'Moderate',
                      'windSpeed': 55,
                      'windGusts': 70,
                      'windShear': 11,
                      'temperature': 8,
                      'cloudCover': 42,
                      'cape': 120,
                      'edr': 0.22,
                    },
                    {
                      'waypoint': 1,
                      'latitude': 40.6413,
                      'longitude': -73.7781,
                      'turbulenceScore': 0.52,
                      'label': 'Moderate',
                      'windSpeed': 63,
                      'windGusts': 85,
                      'windShear': 15,
                      'temperature': 3,
                      'cloudCover': 61,
                      'cape': 380,
                      'edr': 0.37,
                    },
                  ],
                },
              }),
              200,
              headers: const {'content-type': 'application/json'},
            );
          }),
        );

        final result = await repository.analyzeRoute(
          const RouteQuery(
            departureCode: 'SFO',
            arrivalCode: 'JFK',
            aircraftType: 'Boeing 787-9',
          ),
        );

        expect(
          requestedUri.toString(),
          'http://127.0.0.1:8787/v1/route-analysis',
        );
        expect(requestedBody['departure']['code'], 'SFO');
        expect(requestedBody['arrival']['code'], 'JFK');
        expect(result.flightData.isMockData, isFalse);
        expect(result.report.totalWaypoints, 2);
        expect(result.notice, 'Live backend estimate.');
      },
    );

    test('surfaces backend errors instead of falling back locally', () async {
      final repository = BackendTrackingRepository(
        const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
        client: MockClient((request) async {
          return http.Response(
            jsonEncode({'error': 'Open-Meteo request failed with HTTP 502.'}),
            502,
            headers: const {'content-type': 'application/json'},
          );
        }),
      );

      expect(
        () => repository.analyzeRoute(
          const RouteQuery(
            departureCode: 'SFO',
            arrivalCode: 'JFK',
            aircraftType: 'Boeing 787-9',
          ),
        ),
        throwsA(
          isA<TrackingException>().having(
            (error) => error.message,
            'message',
            contains('Open-Meteo request failed'),
          ),
        ),
      );
    });

    test(
      'turns route-analysis transport failures into actionable messages',
      () async {
        final repository = BackendTrackingRepository(
          const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
          client: MockClient((request) async {
            throw http.ClientException('Failed to fetch', request.url);
          }),
        );

        expect(
          () => repository.analyzeRoute(
            const RouteQuery(
              departureCode: 'SFO',
              arrivalCode: 'JFK',
              aircraftType: 'Boeing 787-9',
            ),
          ),
          throwsA(
            isA<TrackingException>()
                .having((error) => error.code, 'code', 'backend_unreachable')
                .having((error) => error.retryable, 'retryable', isTrue)
                .having(
                  (error) => error.message,
                  'message',
                  contains('Could not reach the backend'),
                ),
          ),
        );
      },
    );

    test(
      'gets flight lookup data from the backend and parses diagnostics',
      () async {
        late Uri requestedUri;

        final repository = BackendTrackingRepository(
          const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
          client: MockClient((request) async {
            requestedUri = request.url;
            return http.Response(
              jsonEncode({
                'flightNumber': 'UA857',
                'flightDate': '2026-04-21',
                'flight': {
                  'flightNumber': 'UA857',
                  'airline': 'United Airlines',
                  'departure': 'SFO',
                  'departureAirport': 'San Francisco',
                  'arrival': 'PVG',
                  'arrivalAirport': 'Shanghai Pudong',
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
              }),
              200,
              headers: const {'content-type': 'application/json'},
            );
          }),
        );

        final result = await repository.lookupFlight(
          FlightLookupQuery(
            flightNumber: 'UA857',
            flightDate: DateTime.utc(2026, 4, 21),
          ),
        );

        expect(
          requestedUri.toString(),
          'http://127.0.0.1:8787/v1/flights/search?flightNumber=UA857&flightDate=2026-04-21',
        );
        expect(result.notFound, isFalse);
        expect(result.flight?.flightNumber, 'UA857');
        expect(result.metadata.provider, 'aerodatabox');
        expect(result.metadata.source, FlightLookupSource.cache);
        expect(result.metadata.partial, isTrue);
        expect(result.metadata.missingFields, ['location']);
      },
    );

    test('surfaces structured retryable flight lookup errors', () async {
      final repository = BackendTrackingRepository(
        const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
        client: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'error': 'AeroDataBox rate limit exceeded.',
              'code': 'provider_rate_limited',
              'provider': 'aerodatabox',
              'retryable': true,
              'retryAfterSeconds': 7,
            }),
            503,
            headers: const {'content-type': 'application/json'},
          );
        }),
      );

      expect(
        () => repository.lookupFlight(
          const FlightLookupQuery(flightNumber: 'UA857'),
        ),
        throwsA(
          isA<TrackingException>()
              .having((error) => error.code, 'code', 'provider_rate_limited')
              .having((error) => error.provider, 'provider', 'aerodatabox')
              .having((error) => error.retryable, 'retryable', isTrue)
              .having(
                (error) => error.retryAfterSeconds,
                'retryAfterSeconds',
                7,
              ),
        ),
      );
    });

    test(
      'turns flight-lookup transport failures into actionable messages',
      () async {
        final repository = BackendTrackingRepository(
          const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
          client: MockClient((request) async {
            throw http.ClientException('Failed to fetch', request.url);
          }),
        );

        expect(
          () => repository.lookupFlight(
            const FlightLookupQuery(flightNumber: 'UA857'),
          ),
          throwsA(
            isA<TrackingException>()
                .having((error) => error.code, 'code', 'backend_unreachable')
                .having((error) => error.retryable, 'retryable', isTrue)
                .having(
                  (error) => error.message,
                  'message',
                  contains('backend service is running'),
                ),
          ),
        );
      },
    );

    test('parses a no-result flight lookup response honestly', () async {
      final repository = BackendTrackingRepository(
        const AppConfig(backendBaseUrl: 'http://127.0.0.1:8787'),
        client: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'flightNumber': 'ZZ0000',
              'flightDate': null,
              'flight': null,
              'notFound': true,
              'meta': {
                'provider': 'aerodatabox',
                'source': 'live',
                'partial': false,
                'missingFields': [],
                'cachedAt': '2026-04-21T20:02:00Z',
                'expiresAt': '2026-04-21T20:02:30Z',
              },
            }),
            200,
            headers: const {'content-type': 'application/json'},
          );
        }),
      );

      final result = await repository.lookupFlight(
        const FlightLookupQuery(flightNumber: 'ZZ0000'),
      );

      expect(result.notFound, isTrue);
      expect(result.flight, isNull);
      expect(result.metadata.partial, isFalse);
    });
  });
}
