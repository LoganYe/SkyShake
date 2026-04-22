import 'package:flutter/widgets.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'repositories/backend_tracking_repository.dart';

void runSkyShake(AppConfig config) {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    SkyShakeApp(config: config, repository: BackendTrackingRepository(config)),
  );
}
