import 'package:intl/intl.dart';

import '../core/airport_catalog.dart';
import '../core/app_config.dart';
import '../models/flight_models.dart';
import 'backend_api_client.dart';
import 'tracking_repository.dart';

class BackendTrackingRepository implements TrackingRepository {
  BackendTrackingRepository(this.config, {BackendApiClient? client})
    : _client = client ?? DioBackendApiClient(config);

  final AppConfig config;
  final BackendApiClient _client;

  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) async {
    final departure = AirportCatalog.lookup(query.departureCode);
    final arrival = AirportCatalog.lookup(query.arrivalCode);

    if (departure == null || arrival == null) {
      throw const TrackingException(
        'Unsupported airport code. SkyShake only accepts airports from the bundled catalog.',
        code: 'unsupported_airport',
      );
    }

    final response = await _client.postJson(
      '/v1/route-analysis',
      body: {
        'departure': {
          'code': departure.code,
          'name': departure.name,
          'latitude': departure.latitude,
          'longitude': departure.longitude,
        },
        'arrival': {
          'code': arrival.code,
          'name': arrival.name,
          'latitude': arrival.latitude,
          'longitude': arrival.longitude,
        },
        'aircraftType':
            query.aircraftType.trim().isEmpty
                ? 'Boeing 737 MAX 8'
                : query.aircraftType.trim(),
      },
    );

    if (response.statusCode != 200) {
      throw _buildTrackingException(response.payload, response.statusCode);
    }

    final flightDataPayload = _expectJsonMap(
      response.payload['flightData'],
      'flightData',
    );
    final reportPayload = _expectJsonMap(response.payload['report'], 'report');

    return RouteAnalysisResult(
      notice:
          response.payload['notice']?.toString() ??
          'Live backend estimate completed without additional notice.',
      flightData: FlightData.fromJson(flightDataPayload),
      report: TurbulenceReport.fromJson(reportPayload),
    );
  }

  @override
  Future<FlightLookupResult> lookupFlight(FlightLookupQuery query) async {
    final normalizedFlightNumber = query.flightNumber.trim();
    if (normalizedFlightNumber.length < 2) {
      throw const TrackingException(
        'Enter a flight number with at least two characters.',
        code: 'invalid_request',
      );
    }

    final response = await _client.getJson(
      '/v1/flights/search',
      queryParameters: {
        'flightNumber': normalizedFlightNumber,
        if (query.flightDate != null)
          'flightDate': DateFormat('yyyy-MM-dd').format(query.flightDate!),
        if (query.flightTime != null && query.flightTime!.trim().isNotEmpty)
          'flightTime': query.flightTime!.trim(),
      },
    );

    if (response.statusCode != 200) {
      throw _buildTrackingException(response.payload, response.statusCode);
    }

    return FlightLookupResult.fromJson(response.payload);
  }

  @override
  Future<FlightOptionsResult> searchFlightsForRoute(
    FlightOptionsQuery query,
  ) async {
    final departureCode = query.departureCode.trim().toUpperCase();
    final arrivalCode = query.arrivalCode.trim().toUpperCase();

    if (AirportCatalog.lookup(departureCode) == null ||
        AirportCatalog.lookup(arrivalCode) == null) {
      throw const TrackingException(
        'Unsupported airport code. SkyShake only accepts airports from the bundled catalog.',
        code: 'invalid_request',
      );
    }

    final response = await _client.getJson(
      '/v1/flights/options',
      queryParameters: {
        'departureCode': departureCode,
        'arrivalCode': arrivalCode,
        'departureLocal': DateFormat(
          'yyyy-MM-ddTHH:mm',
        ).format(query.departureLocal),
      },
    );

    if (response.statusCode != 200) {
      throw _buildTrackingException(response.payload, response.statusCode);
    }

    return FlightOptionsResult.fromJson(response.payload);
  }

  Map<String, dynamic> _expectJsonMap(dynamic value, String fieldName) {
    if (value is Map<String, dynamic>) {
      return value;
    }
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    throw TrackingException(
      'Backend response omitted required "$fieldName" data.',
      code: 'invalid_backend_payload',
    );
  }

  TrackingException _buildTrackingException(
    Map<String, dynamic> payload,
    int statusCode,
  ) {
    return TrackingException(
      payload['error']?.toString() ??
          'Backend request failed with HTTP $statusCode.',
      code: payload['code']?.toString(),
      provider: payload['provider']?.toString(),
      retryable: payload['retryable'] == true,
      retryAfterSeconds: _toRetryAfter(payload['retryAfterSeconds']),
    );
  }

  int? _toRetryAfter(dynamic value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    return int.tryParse(value?.toString() ?? '');
  }
}
