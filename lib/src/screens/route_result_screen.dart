import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../repositories/tracking_repository.dart';
import '../widgets/flight_summary_card.dart';
import '../widgets/mobile_content_view.dart';
import '../widgets/route_analysis_card.dart';
import '../widgets/route_map_card.dart';
import '../widgets/turbulence_summary_card.dart';

class RouteResultScreen extends StatelessWidget {
  const RouteResultScreen({
    super.key,
    required this.result,
    this.sourceFlightNumber,
  });

  final RouteAnalysisResult result;
  final String? sourceFlightNumber;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
      child: Scaffold(
        appBar: AppBar(title: const Text('Route result')),
        body: MobileContentView(
          title: 'Route result',
          subtitle:
              'SkyShake sends the route to the backend and returns a weather-backed estimate. This is guidance, not operational truth.',
          children: [
            if (sourceFlightNumber != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Text(
                    'This route was prefilled from flight $sourceFlightNumber.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ),
            FlightSummaryCard(
              flightData: result.flightData,
              headerLabel: 'Route estimate',
              supportingText: result.notice,
            ),
            TurbulenceSummaryCard(report: result.report),
            RouteMapCard(flightData: result.flightData, report: result.report),
            RouteAnalysisCard(report: result.report),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Edit route'),
            ),
          ],
        ),
      ),
    );
  }
}
