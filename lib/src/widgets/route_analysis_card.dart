import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../models/flight_models.dart';

class RouteAnalysisCard extends StatelessWidget {
  const RouteAnalysisCard({super.key, required this.report});

  final TurbulenceReport report;

  @override
  Widget build(BuildContext context) {
    final waypoints = _significantWaypoints(report.waypoints);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.timeline),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Route analysis',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                Text('${report.totalWaypoints} waypoints analysed'),
              ],
            ),
            const SizedBox(height: 20),
            for (final waypoint in waypoints) ...[
              _WaypointTile(waypoint: waypoint),
              if (waypoint != waypoints.last) const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }

  List<TurbulenceWaypoint> _significantWaypoints(
    List<TurbulenceWaypoint> waypoints,
  ) {
    if (waypoints.isEmpty) {
      return const [];
    }

    final candidates = <TurbulenceWaypoint>[
      waypoints.first,
      ...waypoints.where((waypoint) => waypoint.turbulenceScore >= 0.5).take(3),
      waypoints[waypoints.length ~/ 2],
      waypoints.last,
    ];

    final seen = <int>{};
    return candidates.where((waypoint) => seen.add(waypoint.waypoint)).toList()
      ..sort((a, b) => a.waypoint.compareTo(b.waypoint));
  }
}

class _WaypointTile extends StatelessWidget {
  const _WaypointTile({required this.waypoint});

  final TurbulenceWaypoint waypoint;

  @override
  Widget build(BuildContext context) {
    final color = switch (waypoint.label) {
      TurbulenceLabel.smooth => AppTheme.smooth,
      TurbulenceLabel.moderate => AppTheme.moderate,
      TurbulenceLabel.severe => AppTheme.severe,
    };

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.only(top: 6),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      waypoint.waypoint == 0
                          ? 'Departure segment'
                          : 'Waypoint ${waypoint.waypoint}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Text(
                    waypoint.label.displayName,
                    style: TextStyle(color: color),
                  ),
                  const SizedBox(width: 8),
                  Text('${(waypoint.turbulenceScore * 100).round()}%'),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Wind ${waypoint.windSpeed.round()} km/h · Gusts ${waypoint.windGusts.round()} km/h · Shear delta ${waypoint.windShear.toStringAsFixed(1)} km/h',
              ),
              const SizedBox(height: 4),
              Text(
                'Temp ${waypoint.temperature.round()}°C · CAPE ${waypoint.cape.round()} J/kg · EDR ${waypoint.edr.toStringAsFixed(2)}',
              ),
            ],
          ),
        ),
      ],
    );
  }
}
