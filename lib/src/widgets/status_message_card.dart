import 'package:flutter/material.dart';

import '../core/app_theme.dart';

class StatusMessageCard extends StatelessWidget {
  const StatusMessageCard({
    super.key,
    required this.message,
    this.icon = Icons.info_outline,
    this.color = AppTheme.warning,
  });

  final String message;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
