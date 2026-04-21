import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/flight_models.dart';

class FlightSummaryCard extends StatelessWidget {
  const FlightSummaryCard({super.key, required this.flightData});

  final FlightData flightData;

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, y');
    final timeFormat = DateFormat('HH:mm');
    final duration = flightData.arrivalTime.difference(
      flightData.departureTime,
    );
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);

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
                      Text(
                        flightData.flightNumber,
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        flightData.airline,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
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
                        '${flightData.departureAirport ?? flightData.departure} · ${timeFormat.format(flightData.departureTime)}',
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
                        '${flightData.arrivalAirport ?? flightData.arrival} · ${timeFormat.format(flightData.arrivalTime)}',
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
                  label: dateFormat.format(flightData.departureTime),
                ),
                _MetaPill(icon: Icons.schedule, label: '${hours}h ${minutes}m'),
                _MetaPill(
                  icon: Icons.precision_manufacturing,
                  label: flightData.aircraft,
                ),
              ],
            ),
          ],
        ),
      ),
    );
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
