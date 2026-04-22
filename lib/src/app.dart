import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/app_config.dart';
import 'core/app_theme.dart';
import 'repositories/tracking_repository.dart';
import 'screens/home_screen.dart';
import 'stores/flight_lookup_store.dart';
import 'stores/route_analysis_store.dart';
import 'stores/route_draft_store.dart';

class SkyShakeApp extends StatelessWidget {
  const SkyShakeApp({
    super.key,
    required this.repository,
    required this.config,
  });

  final TrackingRepository repository;
  final AppConfig config;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AppConfig>.value(value: config),
        Provider<TrackingRepository>.value(value: repository),
        ChangeNotifierProvider<FlightLookupStore>(
          create: (_) => FlightLookupStore(repository),
        ),
        ChangeNotifierProvider<RouteDraftStore>(
          create: (_) => RouteDraftStore(),
        ),
        ChangeNotifierProvider<RouteAnalysisStore>(
          create: (_) => RouteAnalysisStore(repository),
        ),
      ],
      child: MaterialApp(
        title: 'SkyShake',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme(),
        home: const HomeScreen(),
      ),
    );
  }
}
