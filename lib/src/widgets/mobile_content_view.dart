import 'package:flutter/material.dart';

class MobileContentView extends StatelessWidget {
  const MobileContentView({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final safePadding = MediaQuery.paddingOf(context);
        final horizontalPadding = constraints.maxWidth >= 820 ? 28.0 : 18.0;

        return ListView(
          padding: EdgeInsets.fromLTRB(
            horizontalPadding,
            16,
            horizontalPadding,
            132 + safePadding.bottom,
          ),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 760),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 18),
                    ..._spacedChildren(),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  List<Widget> _spacedChildren() {
    final items = <Widget>[];
    for (var index = 0; index < children.length; index += 1) {
      items.add(children[index]);
      if (index < children.length - 1) {
        items.add(const SizedBox(height: 16));
      }
    }
    return items;
  }
}
