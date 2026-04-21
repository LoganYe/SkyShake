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

abstract interface class TrackingRepository {
  Future<RouteAnalysisResult> analyzeRoute(RouteQuery query);
}

class TrackingException implements Exception {
  const TrackingException(this.message);

  final String message;

  @override
  String toString() => message;
}
