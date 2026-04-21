import 'dart:convert';

import 'package:http/http.dart' as http;

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
    final response = await _client.post(
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
    );

    final payload = _decodeJsonMap(response.body);

    if (response.statusCode != 200) {
      throw TrackingException(
        payload['error']?.toString() ??
            'Backend request failed with HTTP ${response.statusCode}.',
      );
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
}
