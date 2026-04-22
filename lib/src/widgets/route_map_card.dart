import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../core/airport_catalog.dart';
import '../core/brand.dart';
import '../core/app_theme.dart';
import '../core/route_map_geometry.dart';
import '../models/flight_models.dart';

class RouteMapCard extends StatelessWidget {
  const RouteMapCard({
    super.key,
    required this.flightData,
    required this.report,
  });

  final FlightData flightData;
  final TurbulenceReport report;

  @override
  Widget build(BuildContext context) {
    final departure = AirportCatalog.lookup(flightData.departure);
    final arrival = AirportCatalog.lookup(flightData.arrival);
    final showBaseTiles = _shouldRenderBaseTiles();

    if (departure == null || arrival == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Map unavailable because one or both airport codes are missing from the local airport catalog.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      );
    }

    final routePoints =
        report.waypoints.isNotEmpty
            ? report.waypoints
                .map(
                  (waypoint) => LatLng(waypoint.latitude, waypoint.longitude),
                )
                .toList(growable: false)
            : <LatLng>[
              LatLng(departure.latitude, departure.longitude),
              LatLng(arrival.latitude, arrival.longitude),
            ];
    final mapLayout = buildRouteMapLayout(routePoints);
    final departurePoint = alignPointToReferenceWorld(
      LatLng(departure.latitude, departure.longitude),
      mapLayout.referenceLongitude,
    );
    final arrivalPoint = alignPointToReferenceWorld(
      LatLng(arrival.latitude, arrival.longitude),
      mapLayout.referenceLongitude,
    );
    final waypointPoints = report.waypoints
        .map(
          (waypoint) => alignPointToReferenceWorld(
            LatLng(waypoint.latitude, waypoint.longitude),
            mapLayout.referenceLongitude,
          ),
        )
        .toList(growable: false);

    final markers = <Marker>[
      Marker(
        point: departurePoint,
        width: 84,
        height: 34,
        child: _AirportMarker(code: departure.code, color: AppTheme.sky),
      ),
      Marker(
        point: arrivalPoint,
        width: 84,
        height: 34,
        child: _AirportMarker(code: arrival.code, color: Colors.white),
      ),
      if (_shouldShowLivePositionMarker())
        Marker(
          point: alignPointToReferenceWorld(
            LatLng(flightData.latitude!, flightData.longitude!),
            mapLayout.referenceLongitude,
          ),
          width: 40,
          height: 40,
          child: const Icon(Icons.airplanemode_active, color: AppTheme.sky),
        ),
      ...waypointPoints.asMap().entries.map(
        (entry) => Marker(
          point: entry.value,
          width: 18,
          height: 18,
          child: _TurbulencePoint(
            color: switch (report.waypoints[entry.key].label) {
              TurbulenceLabel.smooth => AppTheme.smooth,
              TurbulenceLabel.moderate => AppTheme.moderate,
              TurbulenceLabel.severe => AppTheme.severe,
            },
          ),
        ),
      ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.map_outlined),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Route map',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: SizedBox(
                height: 340,
                child: FlutterMap(
                  options: MapOptions(
                    initialCenter: mapLayout.center,
                    initialZoom: mapLayout.zoom,
                    initialCameraFit:
                        mapLayout.routePolyline.length >= 2
                            ? CameraFit.coordinates(
                              coordinates: mapLayout.routePolyline,
                              padding: const EdgeInsets.all(32),
                              maxZoom: 5.4,
                              minZoom: 1.4,
                            )
                            : null,
                    interactionOptions: const InteractionOptions(
                      flags:
                          InteractiveFlag.drag |
                          InteractiveFlag.pinchZoom |
                          InteractiveFlag.doubleTapZoom,
                    ),
                  ),
                  children: [
                    if (showBaseTiles)
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: Brand.bundleId,
                      )
                    else
                      const ColoredBox(color: AppTheme.surfaceAlt),
                    PolylineLayer(
                      polylines:
                          mapLayout.routePolyline.length >= 2
                              ? <Polyline>[
                                Polyline(
                                  points: mapLayout.routePolyline,
                                  strokeWidth: 4,
                                  color: AppTheme.sky.withValues(alpha: 0.8),
                                ),
                              ]
                              : const <Polyline>[],
                    ),
                    MarkerLayer(markers: markers),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _shouldShowLivePositionMarker() {
    if (flightData.latitude == null || flightData.longitude == null) {
      return false;
    }

    final normalizedStatus = flightData.status.toLowerCase();
    return !normalizedStatus.contains('estimate');
  }

  bool _shouldRenderBaseTiles() {
    final bindingName = WidgetsBinding.instance.runtimeType.toString();
    return !bindingName.contains('TestWidgetsFlutterBinding') &&
        !bindingName.contains('AutomatedTestWidgetsFlutterBinding');
  }
}

class _AirportMarker extends StatelessWidget {
  const _AirportMarker({required this.code, required this.color});

  final String code;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppTheme.surfaceAlt.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.6)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.place, size: 16, color: color),
              const SizedBox(width: 6),
              Text(code),
            ],
          ),
        ),
      ),
    );
  }
}

class _TurbulencePoint extends StatelessWidget {
  const _TurbulencePoint({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: 0.85),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8)),
      ),
    );
  }
}
