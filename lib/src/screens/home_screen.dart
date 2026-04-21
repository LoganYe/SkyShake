import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../core/brand.dart';
import '../repositories/tracking_repository.dart';
import '../widgets/flight_summary_card.dart';
import '../widgets/mode_banner.dart';
import '../widgets/route_analysis_card.dart';
import '../widgets/route_map_card.dart';
import '../widgets/search_panel.dart';
import '../widgets/turbulence_summary_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.repository});

  final TrackingRepository repository;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _departureController = TextEditingController(text: 'SFO');
  final _arrivalController = TextEditingController(text: 'JFK');
  final _aircraftController = TextEditingController(text: 'Boeing 787-9');

  RouteAnalysisResult? _analysis;
  String? _errorMessage;
  bool _isAnalyzing = false;

  @override
  void dispose() {
    _departureController.dispose();
    _arrivalController.dispose();
    _aircraftController.dispose();
    super.dispose();
  }

  Future<void> _handleAnalyze() async {
    FocusScope.of(context).unfocus();

    setState(() {
      _isAnalyzing = true;
      _errorMessage = null;
    });

    try {
      final analysis = await widget.repository.analyzeRoute(
        RouteQuery(
          departureCode: _departureController.text,
          arrivalCode: _arrivalController.text,
          aircraftType: _aircraftController.text,
        ),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _analysis = analysis;
      });

      if (analysis.report.overallScore >= 0.6) {
        _showMessage('Severe turbulence is possible on this route estimate.');
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _errorMessage = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isAnalyzing = false);
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final analysis = _analysis;
    final flightData = analysis?.flightData;
    final report = analysis?.report;

    return Container(
      decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
      child: Scaffold(
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1080),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Wrap(
                          spacing: 20,
                          runSpacing: 20,
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            SizedBox(
                              width: 520,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    height: 52,
                                    width: 52,
                                    decoration: BoxDecoration(
                                      color: AppTheme.sky.withValues(
                                        alpha: 0.16,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: const Icon(
                                      Icons.air,
                                      color: AppTheme.sky,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    Brand.name,
                                    style: theme.textTheme.headlineMedium,
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Route turbulence analysis through a '
                                    'separate backend.',
                                    style: theme.textTheme.bodyLarge?.copyWith(
                                      color: Colors.white.withValues(
                                        alpha: 0.72,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'This build keeps the Flutter app thin. '
                                    'Real weather requests now happen server-side, '
                                    'and live flight lookup remains blocked until '
                                    'a provider key is configured on the backend.',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                            _StatPill(
                              icon: Icons.map_outlined,
                              label: 'Architecture',
                              value: 'Separate frontend/backend',
                            ),
                            _StatPill(
                              icon: Icons.public,
                              label: 'Live weather',
                              value: 'Server-side Open-Meteo',
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const ModeBanner(),
                    const SizedBox(height: 20),
                    SearchPanel(
                      departureController: _departureController,
                      arrivalController: _arrivalController,
                      aircraftController: _aircraftController,
                      isLoading: _isAnalyzing,
                      onSearch: _handleAnalyze,
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 20),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Text(
                            _errorMessage!,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: AppTheme.severe,
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (analysis != null &&
                        flightData != null &&
                        report != null) ...[
                      const SizedBox(height: 20),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Text(
                            analysis.notice,
                            style: theme.textTheme.bodyLarge,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      FlightSummaryCard(flightData: flightData),
                      const SizedBox(height: 20),
                      TurbulenceSummaryCard(report: report),
                      const SizedBox(height: 20),
                      RouteMapCard(flightData: flightData, report: report),
                      const SizedBox(height: 20),
                      RouteAnalysisCard(report: report),
                    ] else ...[
                      const SizedBox(height: 20),
                      const _EmptyStateCard(),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: AppTheme.sky),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 4),
                Text(value, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyStateCard extends StatelessWidget {
  const _EmptyStateCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'What this app can actually do',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Text(
              'SkyShake now sends airport-to-airport requests to a backend that '
              'fetches live weather and scores turbulence server-side. Try routes '
              'like SFO to JFK, LHR to FRA, or HND to SYD.',
            ),
            const SizedBox(height: 20),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: const [
                _RouteChip(label: 'SFO -> JFK'),
                _RouteChip(label: 'LAX -> SEA'),
                _RouteChip(label: 'LHR -> FRA'),
                _RouteChip(label: 'HND -> SYD'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _RouteChip extends StatelessWidget {
  const _RouteChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.line),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Text(label),
      ),
    );
  }
}
