import 'package:flutter/material.dart';

import 'core/app_theme.dart';
import 'repositories/tracking_repository.dart';
import 'screens/home_screen.dart';

class SkyShakeApp extends StatelessWidget {
  const SkyShakeApp({super.key, required this.repository});

  final TrackingRepository repository;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SkyShake',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme(),
      home: HomeScreen(repository: repository),
    );
  }
}
