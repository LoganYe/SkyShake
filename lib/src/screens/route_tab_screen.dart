import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/app_theme.dart';
import '../repositories/tracking_repository.dart';
import '../stores/route_analysis_store.dart';
import '../stores/route_draft_store.dart';
import '../widgets/mobile_content_view.dart';
import '../widgets/search_panel.dart';
import '../widgets/status_message_card.dart';
import 'route_result_screen.dart';

class RouteTabScreen extends StatelessWidget {
  const RouteTabScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer2<RouteDraftStore, RouteAnalysisStore>(
      builder: (context, draftStore, analysisStore, _) {
        return MobileContentView(
          title: 'Check a route',
          subtitle:
              'Use two airports when you do not have a flight number.',
          children: [
            if (draftStore.sourceFlightNumber != null)
              _RoutePrefillCard(
                flightNumber: draftStore.sourceFlightNumber!,
                onClear: draftStore.clearSourceFlight,
              ),
            SearchPanel(
              departureController: draftStore.departureController,
              arrivalController: draftStore.arrivalController,
              aircraftController: draftStore.aircraftController,
              isLoading: analysisStore.isLoading,
              showHeader: false,
              onSearch: () => _runAnalysis(context, draftStore, analysisStore),
            ),
            if (analysisStore.error != null)
              StatusMessageCard(
                message: _buildRouteErrorMessage(analysisStore.error!),
                icon:
                    analysisStore.error!.retryable
                        ? Icons.cloud_off
                        : Icons.error_outline,
              ),
            if (analysisStore.latestResult != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: AppTheme.smooth,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Last result ready.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        onPressed:
                            () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder:
                                    (_) => RouteResultScreen(
                                      result: analysisStore.latestResult!,
                                      sourceFlightNumber:
                                          draftStore.sourceFlightNumber,
                                    ),
                              ),
                            ),
                        child: const Text('Open result'),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Future<void> _runAnalysis(
    BuildContext context,
    RouteDraftStore draftStore,
    RouteAnalysisStore analysisStore,
  ) async {
    final result = await analysisStore.runAnalysis(draftStore);
    if (result == null || !context.mounted) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder:
            (_) => RouteResultScreen(
              result: result,
              sourceFlightNumber: draftStore.sourceFlightNumber,
            ),
      ),
    );
  }

  String _buildRouteErrorMessage(Object error) {
    if (error is TrackingException &&
        error.retryable &&
        error.retryAfterSeconds != null) {
      return '${error.message} Try again in about ${error.retryAfterSeconds}s.';
    }

    return error.toString();
  }
}

class _RoutePrefillCard extends StatelessWidget {
  const _RoutePrefillCard({required this.flightNumber, required this.onClear});

  final String flightNumber;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.call_split, color: AppTheme.sky),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Prefilled from $flightNumber.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            const SizedBox(width: 12),
            TextButton(onPressed: onClear, child: const Text('Dismiss')),
          ],
        ),
      ),
    );
  }
}
