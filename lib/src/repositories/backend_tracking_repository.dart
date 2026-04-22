import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import '../core/airport_catalog.dart';
import '../core/app_config.dart';
import '../models/flight_models.dart';
import 'tracking_repository.dart';

class BackendTrackingRepository implements TrackingRepository {
  BackendTrackingRepository(this.config, {http.Client? client})
    : _client = client ?? http.Client();

  final AppConfig config;
  final http.Client _client;

  @override
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query) async {
    final departure = AirportCatalog.lookup(query.departureCode);
    final arrival = AirportCatalog.lookup(query.arrivalCode);

    if (departure == null || arrival == null) {
      throw const TrackingException(
        'Unsupported airport code. SkyShake only accepts airports from the bundled catalog.',
      );
    }

    final uri = Uri.parse('${config.backendBaseUrl}/v1/route-analysis');
    final response = await _sendRequest(
      uri,
      () => _client.post(
        uri,
        headers: const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
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
        }),
      ),
    );

    final payload = _decodeJsonMap(response.body);

    if (response.statusCode != 200) {
      throw _buildTrackingException(payload, response.statusCode);
    }

    final flightDataPayload = _expectJsonMap(
      payload['flightData'],
      'flightData',
    );
    final reportPayload = _expectJsonMap(payload['report'], 'report');

    return RouteAnalysisResult(
      notice:
          payload['notice']?.toString() ??
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

    final uri = Uri.parse('${config.backendBaseUrl}/v1/flights/search').replace(
      queryParameters: {
        'flightNumber': normalizedFlightNumber,
        if (query.flightDate != null)
          'flightDate': DateFormat('yyyy-MM-dd').format(query.flightDate!),
      },
    );
    final response = await _sendRequest(
      uri,
      () => _client.get(uri, headers: const {'Accept': 'application/json'}),
    );
    final payload = _decodeJsonMap(response.body);

    if (response.statusCode != 200) {
      throw _buildTrackingException(payload, response.statusCode);
    }

    return FlightLookupResult.fromJson(payload);
  }

  Map<String, dynamic> _decodeJsonMap(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const TrackingException(
        'Backend returned an invalid JSON document.',
      );
    }
    return decoded;
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

  Future<http.Response> _sendRequest(
    Uri uri,
    Future<http.Response> Function() operation,
  ) async {
    try {
      return await operation();
    } on http.ClientException {
      throw TrackingException(
        _buildUnreachableMessage(),
        code: 'backend_unreachable',
        retryable: true,
      );
    }
  }

  String _buildUnreachableMessage() {
    final baseMessage =
        'Could not reach the backend at ${config.backendBaseUrl}. Make sure the backend service is running.';

    if (kIsWeb) {
      return '$baseMessage If you are using Flutter web, the backend must also allow cross-origin requests.';
    }

    return baseMessage;
  }
}
