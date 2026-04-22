import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class FlightLookupPanel extends StatelessWidget {
  const FlightLookupPanel({
    super.key,
    required this.flightNumberController,
    required this.selectedDate,
    required this.isLoading,
    required this.onPickDate,
    required this.onClearDate,
    required this.onSearch,
    this.showHeader = true,
  });

  final TextEditingController flightNumberController;
  final DateTime? selectedDate;
  final bool isLoading;
  final bool showHeader;
  final Future<void> Function() onPickDate;
  final VoidCallback onClearDate;
  final Future<void> Function() onSearch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateLabel =
        selectedDate == null
            ? 'Any date'
            : DateFormat('MMM d, y').format(selectedDate!);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 560;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (showHeader) ...[
                  Text('Find a flight', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Text(
                    'Search a real flight number through the backend.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 20),
                ],
                if (compact) ...[
                  TextField(
                    key: const Key('flight-number-field'),
                    controller: flightNumberController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Flight number',
                      hintText: 'UA857',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          key: const Key('flight-date-button'),
                          onPressed: isLoading ? null : () => onPickDate(),
                          icon: const Icon(Icons.event),
                          label: Text(dateLabel),
                        ),
                      ),
                      if (selectedDate != null) ...[
                        const SizedBox(width: 8),
                        TextButton(
                          key: const Key('flight-date-clear'),
                          onPressed: isLoading ? null : onClearDate,
                          child: const Text('Clear'),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const Key('flight-lookup-submit'),
                      onPressed: isLoading ? null : onSearch,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          isLoading
                              ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                              : const Icon(Icons.flight_takeoff),
                          const SizedBox(width: 8),
                          Text(isLoading ? 'Finding flight…' : 'Find flight'),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      SizedBox(
                        width: 220,
                        child: TextField(
                          key: const Key('flight-number-field'),
                          controller: flightNumberController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            labelText: 'Flight number',
                            hintText: 'UA857',
                          ),
                          onSubmitted: (_) => onSearch(),
                        ),
                      ),
                      OutlinedButton.icon(
                        key: const Key('flight-date-button'),
                        onPressed: isLoading ? null : () => onPickDate(),
                        icon: const Icon(Icons.event),
                        label: Text(dateLabel),
                      ),
                      if (selectedDate != null)
                        TextButton(
                          key: const Key('flight-date-clear'),
                          onPressed: isLoading ? null : onClearDate,
                          child: const Text('Clear date'),
                        ),
                      FilledButton(
                        key: const Key('flight-lookup-submit'),
                        onPressed: isLoading ? null : onSearch,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            isLoading
                                ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                                : const Icon(Icons.flight_takeoff),
                            const SizedBox(width: 8),
                            Text(
                              isLoading ? 'Finding flight…' : 'Find flight',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  'Real provider data can still be partial.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
