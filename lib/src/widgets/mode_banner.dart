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
                    'Live now',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Airport-to-airport route analysis pulls live weather '
                    'server-side. If upstream data fails, SkyShake shows the '
                    'failure instead of inventing fallback data.',
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Also live',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Flight-number lookup now runs through the backend and '
                    'AeroDataBox. Some flights still come back with partial '
                    'schedule-only data or no live position.',
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
