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
              'Enter two IATA airport codes from the bundled catalog and an '
              'aircraft type. SkyShake sends the route to the backend for live '
              'weather analysis. This panel still does not do flight-number lookup.',
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
                    controller: departureController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Departure',
                      hintText: 'SFO',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                SizedBox(
                  width: 180,
                  child: TextField(
                    controller: arrivalController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Arrival',
                      hintText: 'JFK',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                SizedBox(
                  width: 280,
                  child: TextField(
                    controller: aircraftController,
                    decoration: const InputDecoration(
                      labelText: 'Aircraft',
                      hintText: 'Boeing 787-9',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                FilledButton.icon(
                  onPressed: isLoading ? null : onSearch,
                  icon:
                      isLoading
                          ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                          : const Icon(Icons.search),
                  label: Text(isLoading ? 'Analyzing' : 'Check turbulence'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
