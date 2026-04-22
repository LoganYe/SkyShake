import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/app_theme.dart';
import '../models/flight_models.dart';
import 'flight_summary_card.dart';

class FlightLookupResultCard extends StatelessWidget {
  const FlightLookupResultCard({
    super.key,
    required this.result,
    required this.canUseRoute,
    required this.onUseRoute,
    this.routePrefillMessage,
  });

  final FlightLookupResult result;
  final bool canUseRoute;
  final VoidCallback? onUseRoute;
  final String? routePrefillMessage;

  @override
  Widget build(BuildContext context) {
    if (result.notFound || result.flight == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'No matching flight found',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'SkyShake did not get a provider match for ${result.flightNumber}${_dateSuffix(result.flightDate)}.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _buildChips(result.metadata),
              ),
            ],
          ),
        ),
      );
    }

    final flight = result.flight!;
    final supportingText =
        'Provider-backed lookup via ${result.metadata.provider}. '
        '${result.metadata.source == FlightLookupSource.cache ? 'Served from local cache.' : 'Fresh backend response.'}';

    return FlightSummaryCard(
      flightData: flight,
      headerLabel: 'Flight lookup',
      supportingText: supportingText,
      diagnosticChips: _buildChips(result.metadata),
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (result.metadata.partial) ...[
            _InlineNotice(
              icon: Icons.info_outline,
              message:
                  'Provider returned partial data: ${_humanizeMissingFields(result.metadata.missingFields)}.',
            ),
            const SizedBox(height: 12),
          ],
          if (!flight.hasLocation) ...[
            const _InlineNotice(
              icon: Icons.location_off,
              message:
                  'Live aircraft position was not available for this lookup.',
            ),
            const SizedBox(height: 12),
          ],
          if (canUseRoute && onUseRoute != null)
            FilledButton.icon(
              key: const Key('use-flight-route-button'),
              onPressed: onUseRoute,
              icon: const Icon(Icons.call_split),
              label: const Text('Use this route'),
            )
          else if (routePrefillMessage != null)
            _InlineNotice(
              icon: Icons.info_outline,
              message: routePrefillMessage!,
            ),
        ],
      ),
    );
  }

  List<Widget> _buildChips(FlightLookupMetadata metadata) {
    return [
      _LookupChip(icon: Icons.storage_rounded, label: metadata.provider),
      _LookupChip(
        icon:
            metadata.source == FlightLookupSource.cache
                ? Icons.inventory_2_outlined
                : Icons.bolt,
        label:
            metadata.source == FlightLookupSource.cache ? 'Cache hit' : 'Live',
      ),
      if (metadata.partial)
        const _LookupChip(icon: Icons.info_outline, label: 'Partial data'),
      if (metadata.source == FlightLookupSource.cache &&
          metadata.expiresAt != null)
        _LookupChip(
          icon: Icons.schedule,
          label:
              'Expires ${DateFormat('HH:mm').format(metadata.expiresAt!.toLocal())}',
        ),
    ];
  }

  String _dateSuffix(DateTime? date) {
    if (date == null) {
      return '';
    }

    return ' on ${DateFormat('MMM d, y').format(date.toLocal())}';
  }

  String _humanizeMissingFields(List<String> missingFields) {
    const labels = {
      'airline': 'airline',
      'departureCode': 'departure code',
      'departureAirport': 'departure airport',
      'arrivalCode': 'arrival code',
      'arrivalAirport': 'arrival airport',
      'departureTime': 'departure time',
      'arrivalTime': 'arrival time',
      'aircraft': 'aircraft',
      'status': 'status',
      'location': 'live position',
    };

    final readable = missingFields
        .map((field) => labels[field] ?? field)
        .toList(growable: false);
    return readable.join(', ');
  }
}

class _LookupChip extends StatelessWidget {
  const _LookupChip({required this.icon, required this.label});

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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppTheme.warning),
        const SizedBox(width: 10),
        Expanded(
          child: Text(message, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ],
    );
  }
}
