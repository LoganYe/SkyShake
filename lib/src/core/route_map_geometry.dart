import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

class RouteMapLayout {
  const RouteMapLayout({
    required this.center,
    required this.zoom,
    required this.routePolyline,
    required this.referenceLongitude,
  });

  final LatLng center;
  final double zoom;
  final List<LatLng> routePolyline;
  final double referenceLongitude;
}

RouteMapLayout buildRouteMapLayout(List<LatLng> points) {
  final routePoints = points.toList(growable: false);
  if (routePoints.isEmpty) {
    return const RouteMapLayout(
      center: LatLng(0, 0),
      zoom: 1.8,
      routePolyline: <LatLng>[],
      referenceLongitude: 0,
    );
  }

  final unwrappedRoute = unwrapRoutePoints(routePoints);

  if (unwrappedRoute.length == 1) {
    return RouteMapLayout(
      center: unwrappedRoute.first,
      zoom: 5.2,
      routePolyline: unwrappedRoute,
      referenceLongitude: unwrappedRoute.first.longitude,
    );
  }

  final latitudes = unwrappedRoute.map((point) => point.latitude).toList();
  final longitudes = unwrappedRoute.map((point) => point.longitude).toList();
  final centerLatitude = (_min(latitudes) + _max(latitudes)) / 2;
  final centerLongitude = (_min(longitudes) + _max(longitudes)) / 2;
  final zoom = _estimateZoom(
    latSpan: _span(latitudes),
    longitudeSpan: _span(longitudes),
  );

  return RouteMapLayout(
    center: LatLng(centerLatitude, centerLongitude),
    zoom: zoom,
    routePolyline: unwrappedRoute,
    referenceLongitude: centerLongitude,
  );
}

List<LatLng> unwrapRoutePoints(List<LatLng> points) {
  if (points.length < 2) {
    return points.toList(growable: false);
  }

  final unwrapped = <LatLng>[points.first];

  for (var index = 1; index < points.length; index += 1) {
    final current = points[index];
    final previousLongitude = unwrapped.last.longitude;
    final adjustedLongitude = _shiftLongitudeNearReference(
      current.longitude,
      previousLongitude,
    );
    unwrapped.add(LatLng(current.latitude, adjustedLongitude));
  }

  return unwrapped;
}

LatLng alignPointToReferenceWorld(LatLng point, double referenceLongitude) {
  return LatLng(
    point.latitude,
    _shiftLongitudeNearReference(point.longitude, referenceLongitude),
  );
}

double _shiftLongitudeNearReference(
  double longitude,
  double referenceLongitude,
) {
  var shiftedLongitude = longitude;

  while (shiftedLongitude - referenceLongitude > 180) {
    shiftedLongitude -= 360;
  }
  while (shiftedLongitude - referenceLongitude < -180) {
    shiftedLongitude += 360;
  }

  return shiftedLongitude;
}

double _estimateZoom({required double latSpan, required double longitudeSpan}) {
  final roughDistance = math.max(latSpan, longitudeSpan);

  if (roughDistance > 150) {
    return 1.4;
  }
  if (roughDistance > 90) {
    return 1.8;
  }
  if (roughDistance > 55) {
    return 2.4;
  }
  if (roughDistance > 30) {
    return 3.0;
  }
  if (roughDistance > 18) {
    return 3.8;
  }
  if (roughDistance > 10) {
    return 4.6;
  }
  return 5.2;
}

double _span(List<double> values) => _max(values) - _min(values);

double _min(List<double> values) => values.reduce(math.min);

double _max(List<double> values) => values.reduce(math.max);
