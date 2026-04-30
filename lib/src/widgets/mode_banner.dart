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
            const Icon(Icons.radar_outlined, color: AppTheme.warning),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Live on this page',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Airport-to-airport route analysis calls the backend and scores the route from live weather data at each waypoint.',
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Also in the app shell',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Flight-number lookup is available in the app shell when the environment has a valid provider key. If that upstream path fails, SkyShake shows the failure instead of fabricating fallback data.',
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
