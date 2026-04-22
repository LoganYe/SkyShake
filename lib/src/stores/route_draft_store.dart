import 'package:flutter/material.dart';

import '../models/flight_models.dart';
import '../repositories/tracking_repository.dart';

class RouteDraftStore extends ChangeNotifier {
  RouteDraftStore()
    : departureController = TextEditingController(text: 'SFO'),
      arrivalController = TextEditingController(text: 'JFK'),
      aircraftController = TextEditingController(text: 'Boeing 787-9');

  final TextEditingController departureController;
  final TextEditingController arrivalController;
  final TextEditingController aircraftController;

  String? sourceFlightNumber;

  RouteQuery toRouteQuery() {
    return RouteQuery(
      departureCode: departureController.text,
      arrivalCode: arrivalController.text,
      aircraftType: aircraftController.text,
    );
  }

  void prefillFromFlight(FlightData flight) {
    departureController.text = flight.departure.trim().toUpperCase();
    arrivalController.text = flight.arrival.trim().toUpperCase();
    if (flight.aircraft.trim().isNotEmpty &&
        !flight.aircraft.toLowerCase().startsWith('unknown')) {
      aircraftController.text = flight.aircraft.trim();
    }
    sourceFlightNumber = flight.flightNumber;
    notifyListeners();
  }

  void clearSourceFlight() {
    sourceFlightNumber = null;
    notifyListeners();
  }

  @override
  void dispose() {
    departureController.dispose();
    arrivalController.dispose();
    aircraftController.dispose();
    super.dispose();
  }
}
