enum TurbulenceLabel { smooth, moderate, severe }

extension TurbulenceLabelX on TurbulenceLabel {
  String get displayName {
    switch (this) {
      case TurbulenceLabel.smooth:
        return 'Smooth';
      case TurbulenceLabel.moderate:
        return 'Moderate';
      case TurbulenceLabel.severe:
        return 'Severe';
    }
  }

  String get severityToken {
    switch (this) {
      case TurbulenceLabel.smooth:
        return 'low';
      case TurbulenceLabel.moderate:
        return 'moderate';
      case TurbulenceLabel.severe:
        return 'high';
    }
  }

  static TurbulenceLabel fromString(String value) {
    switch (value.trim().toLowerCase()) {
      case 'smooth':
        return TurbulenceLabel.smooth;
      case 'moderate':
        return TurbulenceLabel.moderate;
      case 'severe':
        return TurbulenceLabel.severe;
      default:
        throw FormatException('Unsupported turbulence label: $value');
    }
  }

  static TurbulenceLabel fromScore(double score) {
    if (score < 0.3) {
      return TurbulenceLabel.smooth;
    }
    if (score < 0.6) {
      return TurbulenceLabel.moderate;
    }
    return TurbulenceLabel.severe;
  }
}

double? _toDouble(dynamic value) {
  if (value == null) {
    return null;
  }
  if (value is num) {
    return value.toDouble();
  }
  return double.tryParse(value.toString());
}

int _toInt(dynamic value, {int fallback = 0}) {
  if (value is int) {
    return value;
  }
  if (value is num) {
    return value.toInt();
  }
  return int.tryParse(value.toString()) ?? fallback;
}

DateTime? _toDateTime(dynamic value) {
  if (value == null) {
    return null;
  }

  return DateTime.tryParse(value.toString());
}

List<String> _toStringList(dynamic value) {
  if (value is List) {
    return value
        .map((entry) => entry?.toString())
        .whereType<String>()
        .map((entry) => entry.trim())
        .where((entry) => entry.isNotEmpty)
        .toList(growable: false);
  }

  return const <String>[];
}

class FlightData {
  const FlightData({
    required this.flightNumber,
    required this.airline,
    required this.departure,
    required this.departureAirport,
    required this.arrival,
    required this.arrivalAirport,
    required this.departureTime,
    required this.arrivalTime,
    required this.aircraft,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.altitude,
    required this.velocity,
    required this.isMockData,
    required this.error,
  });

  factory FlightData.fromJson(Map<String, dynamic> json) {
    return FlightData(
      flightNumber: json['flightNumber']?.toString() ?? 'Unknown',
      airline: json['airline']?.toString() ?? 'Unknown',
      departure: json['departure']?.toString() ?? 'N/A',
      departureAirport: json['departureAirport']?.toString(),
      arrival: json['arrival']?.toString() ?? 'N/A',
      arrivalAirport: json['arrivalAirport']?.toString(),
      departureTime: _toDateTime(json['departureTime']),
      arrivalTime: _toDateTime(json['arrivalTime']),
      aircraft: json['aircraft']?.toString() ?? 'Unknown',
      status: json['status']?.toString() ?? 'scheduled',
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      altitude: _toDouble(json['altitude']),
      velocity: _toDouble(json['velocity']),
      isMockData: json['isMockData'] == true,
      error: json['error']?.toString(),
    );
  }

  final String flightNumber;
  final String airline;
  final String departure;
  final String? departureAirport;
  final String arrival;
  final String? arrivalAirport;
  final DateTime? departureTime;
  final DateTime? arrivalTime;
  final String aircraft;
  final String status;
  final double? latitude;
  final double? longitude;
  final double? altitude;
  final double? velocity;
  final bool isMockData;
  final String? error;

  bool get isUnavailable =>
      status.toLowerCase() == 'not found' ||
      departure.toUpperCase() == 'N/A' ||
      arrival.toUpperCase() == 'N/A';

  bool get hasLocation => latitude != null && longitude != null;

  Map<String, dynamic> toJson() {
    return {
      'flightNumber': flightNumber,
      'airline': airline,
      'departure': departure,
      'departureAirport': departureAirport,
      'arrival': arrival,
      'arrivalAirport': arrivalAirport,
      'departureTime': departureTime?.toIso8601String(),
      'arrivalTime': arrivalTime?.toIso8601String(),
      'aircraft': aircraft,
      'status': status,
      'latitude': latitude,
      'longitude': longitude,
      'altitude': altitude,
      'velocity': velocity,
      'isMockData': isMockData,
      'error': error,
    };
  }
}

enum FlightLookupSource { live, cache }

extension FlightLookupSourceX on FlightLookupSource {
  String get displayName {
    switch (this) {
      case FlightLookupSource.live:
        return 'Live';
      case FlightLookupSource.cache:
        return 'Cache';
    }
  }

  static FlightLookupSource fromString(String value) {
    switch (value.trim().toLowerCase()) {
      case 'live':
        return FlightLookupSource.live;
      case 'cache':
        return FlightLookupSource.cache;
      default:
        throw FormatException('Unsupported flight lookup source: $value');
    }
  }
}

class FlightLookupMetadata {
  const FlightLookupMetadata({
    required this.provider,
    required this.source,
    required this.partial,
    required this.missingFields,
    required this.cachedAt,
    required this.expiresAt,
  });

  factory FlightLookupMetadata.fromJson(Map<String, dynamic> json) {
    return FlightLookupMetadata(
      provider: json['provider']?.toString() ?? 'unknown',
      source: FlightLookupSourceX.fromString(
        json['source']?.toString() ?? 'live',
      ),
      partial: json['partial'] == true,
      missingFields: _toStringList(json['missingFields']),
      cachedAt: _toDateTime(json['cachedAt']),
      expiresAt: _toDateTime(json['expiresAt']),
    );
  }

  final String provider;
  final FlightLookupSource source;
  final bool partial;
  final List<String> missingFields;
  final DateTime? cachedAt;
  final DateTime? expiresAt;

  Map<String, dynamic> toJson() {
    return {
      'provider': provider,
      'source': source.name,
      'partial': partial,
      'missingFields': missingFields,
      'cachedAt': cachedAt?.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }
}

class FlightLookupResult {
  const FlightLookupResult({
    required this.flightNumber,
    required this.flightDate,
    required this.flight,
    required this.notFound,
    required this.metadata,
  });

  factory FlightLookupResult.fromJson(Map<String, dynamic> json) {
    final rawFlight = json['flight'];
    Map<String, dynamic>? flightPayload;
    if (rawFlight is Map<String, dynamic>) {
      flightPayload = rawFlight;
    } else if (rawFlight is Map) {
      flightPayload = Map<String, dynamic>.from(rawFlight);
    }

    return FlightLookupResult(
      flightNumber: json['flightNumber']?.toString() ?? 'Unknown',
      flightDate: _toDateTime(json['flightDate']),
      flight: flightPayload == null ? null : FlightData.fromJson(flightPayload),
      notFound: json['notFound'] == true,
      metadata: FlightLookupMetadata.fromJson(
        Map<String, dynamic>.from(
          (json['meta'] as Map?) ?? const <String, dynamic>{},
        ),
      ),
    );
  }

  final String flightNumber;
  final DateTime? flightDate;
  final FlightData? flight;
  final bool notFound;
  final FlightLookupMetadata metadata;

  bool get hasFlight => flight != null;

  Map<String, dynamic> toJson() {
    return {
      'flightNumber': flightNumber,
      'flightDate': flightDate?.toIso8601String(),
      'flight': flight?.toJson(),
      'notFound': notFound,
      'meta': metadata.toJson(),
    };
  }
}

class TurbulenceWaypoint {
  const TurbulenceWaypoint({
    required this.waypoint,
    required this.latitude,
    required this.longitude,
    required this.turbulenceScore,
    required this.label,
    required this.windSpeed,
    required this.windGusts,
    required this.windShear,
    required this.temperature,
    required this.cloudCover,
    required this.cape,
    required this.edr,
  });

  factory TurbulenceWaypoint.fromJson(Map<String, dynamic> json) {
    return TurbulenceWaypoint(
      waypoint: _toInt(json['waypoint']),
      latitude: _toDouble(json['latitude']) ?? 0,
      longitude: _toDouble(json['longitude']) ?? 0,
      turbulenceScore: _toDouble(json['turbulenceScore']) ?? 0,
      label: TurbulenceLabelX.fromString(json['label']?.toString() ?? 'Smooth'),
      windSpeed: _toDouble(json['windSpeed']) ?? 0,
      windGusts: _toDouble(json['windGusts']) ?? 0,
      windShear: _toDouble(json['windShear']) ?? 0,
      temperature: _toDouble(json['temperature']) ?? 0,
      cloudCover: _toDouble(json['cloudCover']) ?? 0,
      cape: _toDouble(json['cape']) ?? 0,
      edr: _toDouble(json['edr']) ?? 0,
    );
  }

  final int waypoint;
  final double latitude;
  final double longitude;
  final double turbulenceScore;
  final TurbulenceLabel label;
  final double windSpeed;
  final double windGusts;
  final double windShear;
  final double temperature;
  final double cloudCover;
  final double cape;
  final double edr;

  Map<String, dynamic> toJson() {
    return {
      'waypoint': waypoint,
      'latitude': latitude,
      'longitude': longitude,
      'turbulenceScore': turbulenceScore,
      'label': label.displayName,
      'windSpeed': windSpeed,
      'windGusts': windGusts,
      'windShear': windShear,
      'temperature': temperature,
      'cloudCover': cloudCover,
      'cape': cape,
      'edr': edr,
    };
  }
}

class TurbulenceReport {
  const TurbulenceReport({
    required this.overallScore,
    required this.averageScore,
    required this.overallLabel,
    required this.waypoints,
    required this.totalWaypoints,
  });

  factory TurbulenceReport.fromJson(Map<String, dynamic> json) {
    final rawWaypoints = (json['waypoints'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map(
          (waypoint) =>
              TurbulenceWaypoint.fromJson(Map<String, dynamic>.from(waypoint)),
        )
        .toList(growable: false);

    return TurbulenceReport(
      overallScore: _toDouble(json['overallScore']) ?? 0,
      averageScore: _toDouble(json['averageScore']) ?? 0,
      overallLabel: TurbulenceLabelX.fromString(
        json['overallLabel']?.toString() ?? 'Smooth',
      ),
      waypoints: rawWaypoints,
      totalWaypoints: _toInt(
        json['totalWaypoints'],
        fallback: rawWaypoints.length,
      ),
    );
  }

  final double overallScore;
  final double averageScore;
  final TurbulenceLabel overallLabel;
  final List<TurbulenceWaypoint> waypoints;
  final int totalWaypoints;

  Map<String, dynamic> toJson() {
    return {
      'overallScore': overallScore,
      'averageScore': averageScore,
      'overallLabel': overallLabel.displayName,
      'waypoints': waypoints.map((waypoint) => waypoint.toJson()).toList(),
      'totalWaypoints': totalWaypoints,
    };
  }
}
