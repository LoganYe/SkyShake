import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/models/flight_models.dart';
import 'package:skyshake/src/repositories/tracking_repository.dart';
import 'package:skyshake/src/stores/flight_lookup_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('FlightLookupStore', () {
    test('stores successful flight lookup results', () async {
      final store = FlightLookupStore(
        _FakeTrackingRepository(
          lookupFlightHandler:
              (_) async => FlightLookupResult(
                flightNumber: 'UA857',
                flightDate: DateTime.utc(2026, 4, 21),
                flightTime: null,
                flight: FlightData(
                  flightNumber: 'UA857',
                  airline: 'United Airlines',
                  departure: 'SFO',
                  departureAirport: 'San Francisco International',
                  arrival: 'PVG',
                  arrivalAirport: 'Shanghai Pudong',
                  departureTime: DateTime.utc(2026, 4, 21, 20, 1),
                  arrivalTime: DateTime.utc(2026, 4, 22, 9, 25),
                  aircraft: 'Boeing 777-300',
                  status: 'EnRoute',
                  latitude: null,
                  longitude: null,
                  altitude: null,
                  velocity: null,
                  isMockData: false,
                  error: null,
                ),
                notFound: false,
                metadata: const FlightLookupMetadata(
                  provider: 'aerodatabox',
                  source: FlightLookupSource.live,
                  partial: true,
                  missingFields: ['location'],
                  cachedAt: null,
                  expiresAt: null,
                ),
              ),
        ),
      );

      await store.lookupFlight();

      expect(store.isLoading, isFalse);
      expect(store.error, isNull);
      expect(store.result?.flight?.flightNumber, 'UA857');
      store.dispose();
    });

    test(
      'stores retryable lookup failures without fabricating a result',
      () async {
        final store = FlightLookupStore(
          _FakeTrackingRepository(
            lookupFlightHandler: (_) async {
              throw const TrackingException(
                'AeroDataBox rate limit exceeded.',
                code: 'provider_rate_limited',
                retryable: true,
                retryAfterSeconds: 7,
              );
            },
          ),
        );

        await store.lookupFlight();

        expect(store.result, isNull);
        expect(store.error?.code, 'provider_rate_limited');
        expect(store.error?.retryable, isTrue);
        store.dispose();
      },
    );
  });
}

class _FakeTrackingRepository implements TrackingRepository {
  _FakeTrackingRepository({required this.lookupFlightHandler});

  final Future<FlightLookupResult> Function(FlightLookupQuery query)?
  lookupFlightHandler;

  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) {
    throw UnimplementedError('analyzeRoute was not configured.');
  }

  @override
  Future<FlightLookupResult> lookupFlight(FlightLookupQuery query) {
    final handler = lookupFlightHandler;
    if (handler == null) {
      throw UnimplementedError('lookupFlight was not configured.');
    }
    return handler(query);
  }

  @override
  Future<FlightOptionsResult> searchFlightsForRoute(FlightOptionsQuery query) {
    throw UnimplementedError('searchFlightsForRoute was not configured.');
  }
}
