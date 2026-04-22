import 'package:flutter/material.dart';

class SearchPanel extends StatelessWidget {
  const SearchPanel({
    super.key,
    required this.departureController,
    required this.arrivalController,
    required this.aircraftController,
    required this.isLoading,
    required this.onSearch,
    this.showHeader = true,
  });

  final TextEditingController departureController;
  final TextEditingController arrivalController;
  final TextEditingController aircraftController;
  final bool isLoading;
  final bool showHeader;
  final Future<void> Function() onSearch;

  @override
  Widget build(BuildContext context) {
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
                  Text(
                    'Check a route',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter two airports and an aircraft type.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 20),
                ],
                if (compact) ...[
                  TextField(
                    key: const Key('route-departure-field'),
                    controller: departureController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'From',
                      hintText: 'SFO',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('route-arrival-field'),
                    controller: arrivalController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'To',
                      hintText: 'JFK',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('route-aircraft-field'),
                    controller: aircraftController,
                    decoration: const InputDecoration(
                      labelText: 'Aircraft',
                      hintText: 'Boeing 787-9',
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const Key('route-analysis-submit'),
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
                              : const Icon(Icons.flight_land),
                          const SizedBox(width: 8),
                          Text(
                            isLoading
                                ? 'Running check…'
                                : 'Run turbulence check',
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
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
                            labelText: 'From',
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
                            labelText: 'To',
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
                            labelText: 'Aircraft',
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
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                                : const Icon(Icons.flight_land),
                            const SizedBox(width: 8),
                            Text(
                              isLoading
                                  ? 'Running check…'
                                  : 'Run turbulence check',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                Text(
                  'This uses airport-to-airport weather, not a flown-track truth feed.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
