import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'app_shell.dart';
import 'landing_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return const LandingScreen();
    }

    return const AppShell();
  }
}
