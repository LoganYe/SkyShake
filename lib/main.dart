import 'package:flutter/widgets.dart';

import 'src/app.dart';
import 'src/core/app_config.dart';
import 'src/repositories/backend_tracking_repository.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final config = AppConfig.fromEnvironment();

  runApp(SkyShakeApp(repository: BackendTrackingRepository(config)));
}
