import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../core/brand.dart';
import 'flight_tab_screen.dart';
import 'route_tab_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _selectedIndex = 0;

  void _switchToRouteTab() {
    setState(() {
      _selectedIndex = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
      child: Scaffold(
        appBar: AppBar(
          titleSpacing: 18,
          title: const Text(Brand.name),
        ),
        body: IndexedStack(
          index: _selectedIndex,
          children: [
            FlightTabScreen(
              key: const Key('flight-tab-screen'),
              onUseRoute: _switchToRouteTab,
            ),
            const RouteTabScreen(key: Key('route-tab-screen')),
          ],
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.flight_takeoff_outlined),
                selectedIcon: Icon(Icons.flight_takeoff),
                label: 'Flight',
              ),
              NavigationDestination(
                icon: Icon(Icons.route_outlined),
                selectedIcon: Icon(Icons.route),
                label: 'Route',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
