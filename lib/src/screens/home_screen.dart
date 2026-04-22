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
  final _previewKey = GlobalKey();

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

  Future<void> _scrollToPreview() async {
    final targetContext = _previewKey.currentContext;
    if (targetContext == null) {
      return;
    }

    await Scrollable.ensureVisible(
      targetContext,
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOutCubic,
      alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart,
    );
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
    final analysis = _analysis;
    final flightData = analysis?.flightData;
    final report = analysis?.report;

    return LayoutBuilder(
      builder: (context, viewport) {
        final compactHero = viewport.maxWidth < 940;
        final horizontalPadding =
            viewport.maxWidth >= 1160
                ? 28.0
                : viewport.maxWidth >= 840
                ? 22.0
                : 16.0;

        return Container(
          decoration: const BoxDecoration(
            gradient: AppTheme.backgroundGradient,
          ),
          child: Scaffold(
            body: Stack(
              children: [
                const Positioned.fill(child: _AtmosphereBackdrop()),
                SafeArea(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 1120),
                      child: SingleChildScrollView(
                        padding: EdgeInsets.fromLTRB(
                          horizontalPadding,
                          24,
                          horizontalPadding,
                          32,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _TopBar(onPreview: _scrollToPreview),
                            const SizedBox(height: 20),
                            _HeroPanel(
                              compact: compactHero,
                              onPreview: _scrollToPreview,
                            ),
                            const SizedBox(height: 24),
                            SearchPanel(
                              key: _previewKey,
                              departureController: _departureController,
                              arrivalController: _arrivalController,
                              aircraftController: _aircraftController,
                              isLoading: _isAnalyzing,
                              onSearch: _handleAnalyze,
                            ),
                            if (_errorMessage != null) ...[
                              const SizedBox(height: 16),
                              _ErrorCard(message: _errorMessage!),
                            ],
                            if (analysis != null &&
                                flightData != null &&
                                report != null) ...[
                              const SizedBox(height: 16),
                              _RouteNoteCard(notice: analysis.notice),
                              const SizedBox(height: 16),
                              FlightSummaryCard(flightData: flightData),
                              const SizedBox(height: 16),
                              TurbulenceSummaryCard(report: report),
                              const SizedBox(height: 16),
                              RouteMapCard(
                                flightData: flightData,
                                report: report,
                              ),
                              const SizedBox(height: 16),
                              RouteAnalysisCard(report: report),
                            ] else ...[
                              const SizedBox(height: 16),
                              const _EmptyStateCard(),
                            ],
                            const SizedBox(height: 24),
                            const _RealitySection(),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onPreview});

  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const _BrandBadge(),
        const Spacer(),
        FilledButton.icon(
          onPressed: onPreview,
          icon: const Icon(Icons.flight_takeoff),
          label: const Text('Try Live Preview'),
        ),
      ],
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({required this.compact, required this.onPreview});

  final bool compact;
  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final copy = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SoftPill(
          icon: Icons.radar_outlined,
          label: 'SkyShake mobile app',
        ),
        const SizedBox(height: 18),
        Text(
          'Check a route before the cabin does.',
          style: theme.textTheme.displayMedium?.copyWith(
            fontSize: compact ? 46 : 64,
          ),
        ),
        const SizedBox(height: 14),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 540),
          child: Text(
            'SkyShake helps flyers preview where a route may get rough. '
            'Run a route, get a score, and see the roughest segments without '
            'digging through generic weather screens.',
            style: theme.textTheme.bodyLarge?.copyWith(
              fontSize: compact ? 18 : 19,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ),
        const SizedBox(height: 20),
        const Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _HeroTag(label: 'Live weather'),
            _HeroTag(label: 'Route score'),
            _HeroTag(label: 'Segment warnings'),
          ],
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: onPreview,
          icon: const Icon(Icons.search),
          label: const Text('Run A Route'),
        ),
        const SizedBox(height: 14),
        Text(
          'Route preview is live now. Flight-number lookup is not.',
          style: theme.textTheme.bodySmall?.copyWith(
            color: Colors.white.withValues(alpha: 0.7),
          ),
        ),
      ],
    );

    final mockup = const _HeroPhoneMockup();

    return ClipRRect(
      borderRadius: BorderRadius.circular(36),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.surfaceAlt.withValues(alpha: 0.96),
              const Color(0xFF0A1E36).withValues(alpha: 0.94),
              const Color(0xFF10284A).withValues(alpha: 0.96),
            ],
          ),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -120,
              left: -40,
              child: _GlowOrb(
                size: 280,
                colors: [
                  AppTheme.signal.withValues(alpha: 0.22),
                  AppTheme.signal.withValues(alpha: 0.0),
                ],
              ),
            ),
            Positioned(
              right: -100,
              bottom: -120,
              child: _GlowOrb(
                size: 320,
                colors: [
                  AppTheme.sky.withValues(alpha: 0.18),
                  AppTheme.sky.withValues(alpha: 0.0),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.all(compact ? 24 : 30),
              child:
                  compact
                      ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [copy, const SizedBox(height: 24), mockup],
                      )
                      : Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(flex: 11, child: copy),
                          const SizedBox(width: 24),
                          const Expanded(flex: 8, child: _HeroPhoneMockup()),
                        ],
                      ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RealitySection extends StatelessWidget {
  const _RealitySection();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Reality Check', style: theme.textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(
          'The page is shorter on purpose. Say what SkyShake does, let people try it, and be explicit about the limits.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: Colors.white.withValues(alpha: 0.72),
          ),
        ),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            final stacked = constraints.maxWidth < 860;

            if (stacked) {
              return const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [ModeBanner(), SizedBox(height: 16), _BoundaryCard()],
              );
            }

            return const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: ModeBanner()),
                SizedBox(width: 16),
                Expanded(child: _BoundaryCard()),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _AtmosphereBackdrop extends StatelessWidget {
  const _AtmosphereBackdrop();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          Positioned(
            top: -140,
            left: -120,
            child: _GlowOrb(
              size: 420,
              colors: [
                AppTheme.signal.withValues(alpha: 0.14),
                AppTheme.signal.withValues(alpha: 0.0),
              ],
            ),
          ),
          Positioned(
            right: -140,
            top: 40,
            child: _GlowOrb(
              size: 360,
              colors: [
                AppTheme.sky.withValues(alpha: 0.16),
                AppTheme.sky.withValues(alpha: 0.0),
              ],
            ),
          ),
          Positioned(
            bottom: -200,
            left: 40,
            child: _GlowOrb(
              size: 460,
              colors: [
                const Color(0xFF173E68).withValues(alpha: 0.22),
                const Color(0xFF173E68).withValues(alpha: 0.0),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.colors});

  final double size;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(colors: colors),
      ),
      child: SizedBox(width: size, height: size),
    );
  }
}

class _BrandBadge extends StatelessWidget {
  const _BrandBadge();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.signalSoft, AppTheme.signal],
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: AppTheme.signal.withValues(alpha: 0.2),
            blurRadius: 28,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const _BrandMark(size: 24, color: AppTheme.ink),
            const SizedBox(width: 10),
            Text(
              Brand.name,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: AppTheme.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _BrandMarkPainter(color)),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  const _BrandMarkPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke =
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = size.width * 0.12
          ..strokeCap = StrokeCap.round
          ..color = color;
    final dot = Paint()..color = color;

    final upper =
        Path()
          ..moveTo(size.width * 0.16, size.height * 0.42)
          ..cubicTo(
            size.width * 0.36,
            size.height * 0.12,
            size.width * 0.56,
            size.height * 0.14,
            size.width * 0.84,
            size.height * 0.34,
          );

    final lower =
        Path()
          ..moveTo(size.width * 0.16, size.height * 0.7)
          ..cubicTo(
            size.width * 0.38,
            size.height * 0.42,
            size.width * 0.58,
            size.height * 0.46,
            size.width * 0.86,
            size.height * 0.62,
          );

    canvas.drawPath(upper, stroke);
    canvas.drawPath(lower, stroke);
    canvas.drawCircle(
      Offset(size.width * 0.28, size.height * 0.18),
      size.width * 0.08,
      dot,
    );
  }

  @override
  bool shouldRepaint(covariant _BrandMarkPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}

class _SoftPill extends StatelessWidget {
  const _SoftPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: AppTheme.signalSoft),
            const SizedBox(width: 8),
            Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroTag extends StatelessWidget {
  const _HeroTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.white.withValues(alpha: 0.86),
          ),
        ),
      ),
    );
  }
}

class _HeroPhoneMockup extends StatelessWidget {
  const _HeroPhoneMockup();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AspectRatio(
      aspectRatio: 0.7,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFF03070F),
          borderRadius: BorderRadius.circular(38),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.28),
              blurRadius: 30,
              offset: const Offset(0, 18),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    const Color(0xFF11160F),
                    const Color(0xFF0A2137),
                    const Color(0xFF163B62),
                  ],
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: -60,
                    left: -20,
                    child: _GlowOrb(
                      size: 180,
                      colors: [
                        AppTheme.signal.withValues(alpha: 0.24),
                        AppTheme.signal.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              '09:41',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Spacer(),
                            const Icon(
                              Icons.signal_cellular_alt,
                              size: 18,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.wifi_rounded,
                              size: 18,
                              color: Colors.white,
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.signalSoft, AppTheme.signal],
                            ),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const _BrandMark(size: 16, color: AppTheme.ink),
                                const SizedBox(width: 8),
                                Text(
                                  Brand.name,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    color: AppTheme.ink,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          'SFO to JFK',
                          style: theme.textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Moderate air ahead over the Rockies.',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: Colors.white.withValues(alpha: 0.76),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Row(
                          children: [
                            Expanded(
                              child: _MockMetricCard(
                                label: 'Outlook',
                                value: 'Moderate',
                                accent: AppTheme.moderate,
                              ),
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: _MockMetricCard(
                                label: 'Segments',
                                value: '3 rough',
                                accent: AppTheme.sky,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const _MockSegmentCard(),
                        const Spacer(),
                        DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.signalSoft, AppTheme.signal],
                            ),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: Text(
                                'View briefing',
                                style: theme.textTheme.titleMedium?.copyWith(
                                  color: AppTheme.ink,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MockMetricCard extends StatelessWidget {
  const _MockMetricCard({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: accent.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Icon(Icons.circle, size: 10, color: accent),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _MockSegmentCard extends StatelessWidget {
  const _MockSegmentCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Roughest segment',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Mid-route winds and gusts climb sharply near waypoint 6.',
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _BoundaryCard extends StatelessWidget {
  const _BoundaryCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Current boundaries',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            const _BoundaryRow(
              title: 'No live flight-number lookup',
              body:
                  'That path exists in the backend, but it should stay out of the hero until a real provider key is configured.',
            ),
            const SizedBox(height: 12),
            const _BoundaryRow(
              title: 'No promise of a smooth ride',
              body:
                  'SkyShake models route turbulence. It does not guarantee what the cabin will feel like on a specific flight.',
            ),
          ],
        ),
      ),
    );
  }
}

class _BoundaryRow extends StatelessWidget {
  const _BoundaryRow({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 4),
        Text(body, style: Theme.of(context).textTheme.bodyMedium),
      ],
    );
  }
}

class _RouteNoteCard extends StatelessWidget {
  const _RouteNoteCard({required this.notice});

  final String notice;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: AppTheme.signal.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Padding(
                padding: EdgeInsets.all(10),
                child: Icon(
                  Icons.campaign_outlined,
                  color: AppTheme.signalSoft,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(notice, style: Theme.of(context).textTheme.bodyLarge),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline, color: AppTheme.severe),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: AppTheme.severe),
              ),
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
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('What you will get', style: theme.textTheme.headlineSmall),
            const SizedBox(height: 10),
            Text(
              'A route score, a map, and the roughest segments. Start with a familiar airport pair.',
              style: theme.textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            const Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
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
