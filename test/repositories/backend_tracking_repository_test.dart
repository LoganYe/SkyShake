import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:skyshake/src/core/app_config.dart';
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
  });
}
