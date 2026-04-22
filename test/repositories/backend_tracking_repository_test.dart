import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/core/app_config.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/backend_api_client.dart';
import 'package:skyshake/src/repositories/backend_tracking_repository.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';

void main() {
  const config = AppConfig(
    environment: AppEnvironment.development,
    backendBaseUrl: 'http://127.0.0.1:8787',
  );

  group('BackendTrackingRepository', () {
    test(
      'posts route analysis requests to the backend and parses the response',
      () async {
        late String requestedPath;
        late Object? requestedBody;

        final repository = BackendTrackingRepository(
          config,
          client: _FakeBackendApiClient(
            onPost: (path, {body}) async {
              requestedPath = path;
              requestedBody = body;
              return ApiPayloadResponse(
                statusCode: 200,
                payload: {
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
                },
              );
            },
          ),
        );

        final result = await repository.analyzeRoute(
          const RouteQuery(
            departureCode: 'SFO',
            arrivalCode: 'JFK',
            aircraftType: 'Boeing 787-9',
          ),
        );

        expect(requestedPath, '/v1/route-analysis');
        expect(requestedBody, isA<Map<String, dynamic>>());
        expect(
          (requestedBody as Map<String, dynamic>)['departure']['code'],
          'SFO',
        );
        expect(
          (requestedBody as Map<String, dynamic>)['arrival']['code'],
          'JFK',
        );
        expect(result.flightData.isMockData, isFalse);
        expect(result.report.totalWaypoints, 2);
        expect(result.notice, 'Live backend estimate.');
      },
    );

    test('surfaces backend errors instead of falling back locally', () async {
      final repository = BackendTrackingRepository(
        config,
        client: _FakeBackendApiClient(
          onPost:
              (_, {body}) async => const ApiPayloadResponse(
                statusCode: 502,
                payload: {'error': 'Open-Meteo request failed with HTTP 502.'},
              ),
        ),
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
          config,
          client: _FakeBackendApiClient(
            onPost:
                (_, {body}) async =>
                    throw const TrackingException(
                      'Could not reach the backend at http://127.0.0.1:8787. Make sure the backend service is running.',
                      code: 'backend_unreachable',
                      retryable: true,
                    ),
          ),
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
        late String requestedPath;
        late Map<String, dynamic>? requestedQueryParameters;

        final repository = BackendTrackingRepository(
          config,
          client: _FakeBackendApiClient(
            onGet: (path, {queryParameters}) async {
              requestedPath = path;
              requestedQueryParameters = queryParameters;
              return ApiPayloadResponse(
                statusCode: 200,
                payload: {
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
                },
              );
            },
          ),
        );

        final result = await repository.lookupFlight(
          FlightLookupQuery(
            flightNumber: 'UA857',
            flightDate: DateTime.utc(2026, 4, 21),
          ),
        );

        expect(requestedPath, '/v1/flights/search');
        expect(requestedQueryParameters, {
          'flightNumber': 'UA857',
          'flightDate': '2026-04-21',
        });
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
        config,
        client: _FakeBackendApiClient(
          onGet:
              (_, {queryParameters}) async => const ApiPayloadResponse(
                statusCode: 503,
                payload: {
                  'error': 'AeroDataBox rate limit exceeded.',
                  'code': 'provider_rate_limited',
                  'provider': 'aerodatabox',
                  'retryable': true,
                  'retryAfterSeconds': 7,
                },
              ),
        ),
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
          config,
          client: _FakeBackendApiClient(
            onGet:
                (_, {queryParameters}) async =>
                    throw const TrackingException(
                      'Could not reach the backend at http://127.0.0.1:8787. Make sure the backend service is running.',
                      code: 'backend_unreachable',
                      retryable: true,
                    ),
          ),
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
        config,
        client: _FakeBackendApiClient(
          onGet:
              (_, {queryParameters}) async => const ApiPayloadResponse(
                statusCode: 200,
                payload: {
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
                },
              ),
        ),
      );

      final result = await repository.lookupFlight(
        const FlightLookupQuery(flightNumber: 'ZZ0000'),
      );

      expect(result.notFound, isTrue);
      expect(result.flight, isNull);
      expect(result.metadata.provider, 'aerodatabox');
      expect(result.metadata.source, FlightLookupSource.live);
    });
  });
}

class _FakeBackendApiClient implements BackendApiClient {
  _FakeBackendApiClient({this.onGet, this.onPost});

  final Future<ApiPayloadResponse> Function(
    String path, {
    Map<String, dynamic>? queryParameters,
  })?
  onGet;

  final Future<ApiPayloadResponse> Function(String path, {Object? body})?
  onPost;

  @override
  Future<ApiPayloadResponse> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) {
    final handler = onGet;
    if (handler == null) {
      throw UnimplementedError('getJson was not configured for this test.');
    }

    return handler(path, queryParameters: queryParameters);
  }

  @override
  Future<ApiPayloadResponse> postJson(String path, {Object? body}) {
    final handler = onPost;
    if (handler == null) {
      throw UnimplementedError('postJson was not configured for this test.');
    }

    return handler(path, body: body);
  }
}
