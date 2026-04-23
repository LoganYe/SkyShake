import '../models/flight_models.dart';

class RouteQuery {
  const RouteQuery({
    required this.departureCode,
    required this.arrivalCode,
    required this.aircraftType,
  });

  final String departureCode;
  final String arrivalCode;
  final String aircraftType;
}

class RouteAnalysisResult {
  const RouteAnalysisResult({
    required this.flightData,
    required this.report,
    required this.notice,
  });

  final FlightData flightData;
  final TurbulenceReport report;
  final String notice;
}

class FlightLookupQuery {
  const FlightLookupQuery({
    required this.flightNumber,
    this.flightDate,
    this.flightTime,
  });

  final String flightNumber;
  final DateTime? flightDate;
  final String? flightTime;
}

class FlightOptionsQuery {
  const FlightOptionsQuery({
    required this.departureCode,
    required this.arrivalCode,
    required this.departureLocal,
  });

  final String departureCode;
  final String arrivalCode;
  final DateTime departureLocal;
}

abstract interface class TrackingRepository {
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query);
  Future<FlightLookupResult> lookupFlight(FlightLookupQuery query);
  Future<FlightOptionsResult> searchFlightsForRoute(FlightOptionsQuery query);
}

class TrackingException implements Exception {
  const TrackingException(
    this.message, {
    this.code,
    this.provider,
    this.retryable = false,
    this.retryAfterSeconds,
  });

  final String message;
  final String? code;
  final String? provider;
  final bool retryable;
  final int? retryAfterSeconds;

  @override
  String toString() => message;
}
