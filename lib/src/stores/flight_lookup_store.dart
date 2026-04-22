import 'package:flutter/material.dart';

import '../models/flight_models.dart';
import '../repositories/tracking_repository.dart';

class FlightLookupStore extends ChangeNotifier {
  FlightLookupStore(this._repository);

  final TrackingRepository _repository;
  final TextEditingController flightNumberController = TextEditingController(
    text: 'UA857',
  );

  DateTime? selectedDate = DateUtils.dateOnly(DateTime.now());
  FlightLookupResult? result;
  TrackingException? error;
  bool isLoading = false;

  Future<void> lookupFlight() async {
    FocusManager.instance.primaryFocus?.unfocus();

    isLoading = true;
    result = null;
    error = null;
    notifyListeners();

    try {
      result = await _repository.lookupFlight(
        FlightLookupQuery(
          flightNumber: flightNumberController.text,
          flightDate: selectedDate,
        ),
      );
    } on TrackingException catch (trackingError) {
      error = trackingError;
    } catch (unknownError) {
      error = TrackingException(unknownError.toString());
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void setSelectedDate(DateTime? value) {
    selectedDate = value == null ? null : DateUtils.dateOnly(value);
    notifyListeners();
  }

  void clearDate() {
    selectedDate = null;
    notifyListeners();
  }

  @override
  void dispose() {
    flightNumberController.dispose();
    super.dispose();
  }
}
