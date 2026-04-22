import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/airport_catalog.dart';
import '../models/flight_models.dart';
import '../repositories/tracking_repository.dart';
import '../stores/flight_lookup_store.dart';
import '../stores/route_analysis_store.dart';
import '../stores/route_draft_store.dart';
import '../widgets/flight_lookup_panel.dart';
import '../widgets/flight_lookup_result_card.dart';
import '../widgets/mobile_content_view.dart';
import '../widgets/status_message_card.dart';

class FlightTabScreen extends StatelessWidget {
  const FlightTabScreen({super.key, required this.onUseRoute});

  final VoidCallback onUseRoute;

  @override
  Widget build(BuildContext context) {
    return Consumer3<FlightLookupStore, RouteDraftStore, RouteAnalysisStore>(
      builder: (context, lookupStore, routeDraftStore, routeAnalysisStore, _) {
        final result = lookupStore.result;
        final flight = result?.flight;
        final canUseRoute = _canUseRoute(flight);

        return MobileContentView(
          title: 'Find a flight',
          subtitle:
              'Look up a real flight number, then use it to start a turbulence check.',
          children: [
            FlightLookupPanel(
              flightNumberController: lookupStore.flightNumberController,
              selectedDate: lookupStore.selectedDate,
              isLoading: lookupStore.isLoading,
              showHeader: false,
              onPickDate: () => _pickFlightDate(context, lookupStore),
              onClearDate: lookupStore.clearDate,
              onSearch: lookupStore.lookupFlight,
            ),
            if (lookupStore.error != null)
              StatusMessageCard(
                message: _buildFlightLookupErrorMessage(lookupStore.error!),
                icon:
                    lookupStore.error!.retryable
                        ? Icons.refresh_rounded
                        : Icons.error_outline,
              ),
            if (result != null)
              FlightLookupResultCard(
                result: result,
                canUseRoute: canUseRoute,
                routePrefillMessage:
                    flight == null ? null : _buildRoutePrefillMessage(flight),
                onUseRoute:
                    canUseRoute
                        ? () {
                          final liveFlight = result.flight;
                          if (liveFlight == null) {
                            return;
                          }

                          routeDraftStore.prefillFromFlight(liveFlight);
                          routeAnalysisStore.clearResult();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Route form updated from the flight lookup.',
                              ),
                            ),
                          );
                          onUseRoute();
                        }
                        : null,
              ),
          ],
        );
      },
    );
  }

  Future<void> _pickFlightDate(
    BuildContext context,
    FlightLookupStore store,
  ) async {
    final today = DateUtils.dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: store.selectedDate ?? today,
      firstDate: DateTime(today.year - 1),
      lastDate: DateTime(today.year + 1),
    );

    if (picked == null || !context.mounted) {
      return;
    }

    store.setSelectedDate(picked);
  }

  bool _canUseRoute(FlightData? flight) {
    if (flight == null) {
      return false;
    }

    return AirportCatalog.lookup(flight.departure.toUpperCase()) != null &&
        AirportCatalog.lookup(flight.arrival.toUpperCase()) != null;
  }

  String _buildRoutePrefillMessage(FlightData flight) {
    final missingCodes = <String>[];
    if (AirportCatalog.lookup(flight.departure.toUpperCase()) == null) {
      missingCodes.add(flight.departure);
    }
    if (AirportCatalog.lookup(flight.arrival.toUpperCase()) == null) {
      missingCodes.add(flight.arrival);
    }

    if (missingCodes.isEmpty) {
      return 'This lookup can fill the route form.';
    }

    return 'Use this route is unavailable because ${missingCodes.join(' / ')} is outside the bundled airport catalog.';
  }

  String _buildFlightLookupErrorMessage(TrackingException error) {
    if (error.retryable && error.retryAfterSeconds != null) {
      return '${error.message} Try again in about ${error.retryAfterSeconds}s.';
    }

    return error.message;
  }
}
