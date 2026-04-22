import 'package:flutter/material.dart';

import '../repositories/tracking_repository.dart';
import 'route_draft_store.dart';

class RouteAnalysisStore extends ChangeNotifier {
  RouteAnalysisStore(this._repository);

  final TrackingRepository _repository;

  RouteAnalysisResult? latestResult;
  TrackingException? error;
  bool isLoading = false;

  Future<RouteAnalysisResult?> runAnalysis(RouteDraftStore draft) async {
    FocusManager.instance.primaryFocus?.unfocus();

    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final result = await _repository.analyzeRoute(draft.toRouteQuery());
      latestResult = result;
      return result;
    } on TrackingException catch (trackingError) {
      error = trackingError;
      return null;
    } catch (unknownError) {
      error = TrackingException(unknownError.toString());
      return null;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void clearResult() {
    latestResult = null;
    error = null;
    notifyListeners();
  }
}
