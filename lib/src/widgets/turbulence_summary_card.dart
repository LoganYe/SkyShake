import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../models/flight_models.dart';

class TurbulenceSummaryCard extends StatelessWidget {
  const TurbulenceSummaryCard({super.key, required this.report});

  final TurbulenceReport report;

  @override
  Widget build(BuildContext context) {
    final color = switch (report.overallLabel) {
      TurbulenceLabel.smooth => AppTheme.smooth,
      TurbulenceLabel.moderate => AppTheme.moderate,
      TurbulenceLabel.severe => AppTheme.severe,
    };
    final waypoints = report.waypoints;
    final averageWindSpeed =
        waypoints.isEmpty
            ? 0.0
            : waypoints
                    .map((waypoint) => waypoint.windSpeed)
                    .reduce((sum, value) => sum + value) /
                waypoints.length;
    final peakGust =
        waypoints.isEmpty
            ? 0.0
            : waypoints
                .map((waypoint) => waypoint.windGusts)
                .reduce((left, right) => left > right ? left : right);
    final averageShear =
        waypoints.isEmpty
            ? 0.0
            : waypoints
                    .map((waypoint) => waypoint.windShear)
                    .reduce((sum, value) => sum + value) /
                waypoints.length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  report.overallLabel == TurbulenceLabel.severe
                      ? Icons.warning_amber_rounded
                      : report.overallLabel == TurbulenceLabel.moderate
                      ? Icons.cloud_queue
                      : Icons.check_circle_outline,
                  color: color,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.overallLabel.displayName,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Text('Overall turbulence outlook'),
                    ],
                  ),
                ),
                Text(
                  '${(report.overallScore * 100).round()}%',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ],
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: report.overallScore.clamp(0, 1),
                minHeight: 10,
                color: color,
                backgroundColor: Colors.white.withValues(alpha: 0.1),
              ),
            ),
            if (waypoints.isNotEmpty) ...[
              const SizedBox(height: 18),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _MetricCard(
                    label: 'Average wind',
                    value: '${averageWindSpeed.toStringAsFixed(1)} km/h',
                  ),
                  _MetricCard(
                    label: 'Peak gusts',
                    value: '${peakGust.toStringAsFixed(1)} km/h',
                  ),
                  _MetricCard(
                    label: 'Average shear',
                    value: '${averageShear.toStringAsFixed(1)} km/h',
                  ),
                  _MetricCard(
                    label: 'Average score',
                    value: '${(report.averageScore * 100).round()}%',
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}
