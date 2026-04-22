import 'package:flutter/material.dart';

class SearchPanel extends StatelessWidget {
  const SearchPanel({
    super.key,
    required this.departureController,
    required this.arrivalController,
    required this.aircraftController,
    required this.isLoading,
    required this.onSearch,
  });

  final TextEditingController departureController;
  final TextEditingController arrivalController;
  final TextEditingController aircraftController;
  final bool isLoading;
  final Future<void> Function() onSearch;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Analyze a route',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Enter two IATA codes and an aircraft type. SkyShake sends the '
              'route to the backend and returns a score, map, and segment notes.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                SizedBox(
                  width: 180,
                  child: TextField(
                    key: const Key('route-departure-field'),
                    controller: departureController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Route departure',
                      hintText: 'SFO',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                SizedBox(
                  width: 180,
                  child: TextField(
                    key: const Key('route-arrival-field'),
                    controller: arrivalController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Route arrival',
                      hintText: 'JFK',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                SizedBox(
                  width: 280,
                  child: TextField(
                    key: const Key('route-aircraft-field'),
                    controller: aircraftController,
                    decoration: const InputDecoration(
                      labelText: 'Route aircraft',
                      hintText: 'Boeing 787-9',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                FilledButton(
                  key: const Key('route-analysis-submit'),
                  onPressed: isLoading ? null : onSearch,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      isLoading
                          ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                          : const Icon(Icons.search),
                      const SizedBox(width: 8),
                      Text(isLoading ? 'Running' : 'Run check'),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
