import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/flight_models.dart';

class FlightSummaryCard extends StatelessWidget {
  const FlightSummaryCard({
    super.key,
    required this.flightData,
    this.headerLabel,
    this.supportingText,
    this.diagnosticChips = const <Widget>[],
    this.footer,
  });

  final FlightData flightData;
  final String? headerLabel;
  final String? supportingText;
  final List<Widget> diagnosticChips;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, y');
    final timeFormat = DateFormat('HH:mm');
    final duration =
        flightData.departureTime != null && flightData.arrivalTime != null
            ? flightData.arrivalTime!.difference(flightData.departureTime!)
            : null;
    final hours = duration?.inHours ?? 0;
    final minutes = duration?.inMinutes.remainder(60) ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (headerLabel != null) ...[
                        Text(
                          headerLabel!,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 6),
                      ],
                      Text(
                        flightData.flightNumber,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        flightData.airline,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      if (supportingText != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          supportingText!,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                      if (flightData.error != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          flightData.error!,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.airplanemode_active),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _AirportBlock(
                    heading: 'Departure',
                    code: flightData.departure,
                    detail:
                        '${flightData.departureAirport ?? flightData.departure} · ${_formatTime(timeFormat, flightData.departureTime)}',
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.arrow_forward),
                ),
                Expanded(
                  child: _AirportBlock(
                    heading: 'Arrival',
                    code: flightData.arrival,
                    detail:
                        '${flightData.arrivalAirport ?? flightData.arrival} · ${_formatTime(timeFormat, flightData.arrivalTime)}',
                    alignEnd: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 18,
              runSpacing: 12,
              children: [
                _MetaPill(
                  icon: Icons.calendar_today,
                  label:
                      flightData.departureTime != null
                          ? dateFormat.format(flightData.departureTime!)
                          : 'Date unavailable',
                ),
                _MetaPill(
                  icon: Icons.schedule,
                  label:
                      duration != null
                          ? '${hours}h ${minutes}m'
                          : 'Duration unavailable',
                ),
                _MetaPill(
                  icon: Icons.precision_manufacturing,
                  label: flightData.aircraft,
                ),
              ],
            ),
            if (diagnosticChips.isNotEmpty) ...[
              const SizedBox(height: 16),
              Wrap(spacing: 10, runSpacing: 10, children: diagnosticChips),
            ],
            if (footer != null) ...[const SizedBox(height: 16), footer!],
          ],
        ),
      ),
    );
  }

  String _formatTime(DateFormat formatter, DateTime? value) {
    return value != null ? formatter.format(value) : '--:--';
  }
}

class _AirportBlock extends StatelessWidget {
  const _AirportBlock({
    required this.heading,
    required this.code,
    required this.detail,
    this.alignEnd = false,
  });

  final String heading;
  final String code;
  final String detail;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(heading, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 4),
        Text(code, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(detail, textAlign: alignEnd ? TextAlign.end : TextAlign.start),
      ],
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}
