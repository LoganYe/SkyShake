import 'package:flutter/material.dart';

import '../core/app_theme.dart';

class ModeBanner extends StatelessWidget {
  const ModeBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.warning_amber_rounded, color: AppTheme.warning),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'This build requires a separate backend.',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Route turbulence requests are sent to the SkyShake backend. '
                    'Live weather is fetched server-side, and flight-number '
                    'lookup only works after a real provider key is configured.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
