import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/core/app_config.dart';

void main() {
  group('AppConfig', () {
    test('uses localhost by default in development', () {
      final config = AppConfig.resolve(
        environment: AppEnvironment.development,
        configuredBackendBaseUrl: '',
      );

      expect(config.environment, AppEnvironment.development);
      expect(config.backendBaseUrl, 'http://127.0.0.1:8787');
      expect(config.usesLocalBackend, isTrue);
    });

    test('requires an explicit production backend URL', () {
      expect(
        () => AppConfig.resolve(
          environment: AppEnvironment.production,
          configuredBackendBaseUrl: '',
        ),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('BACKEND_BASE_URL is required'),
          ),
        ),
      );
    });

    test('rejects localhost in production', () {
      expect(
        () => AppConfig.resolve(
          environment: AppEnvironment.production,
          configuredBackendBaseUrl: 'http://127.0.0.1:8787',
        ),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('must not point to localhost'),
          ),
        ),
      );
    });

    test('rejects non-https production backends', () {
      expect(
        () => AppConfig.resolve(
          environment: AppEnvironment.production,
          configuredBackendBaseUrl: 'http://api.skyshake.dev',
        ),
        throwsA(
          isA<StateError>().having(
            (error) => error.message,
            'message',
            contains('must use https'),
          ),
        ),
      );
    });

    test('accepts https production backends', () {
      final config = AppConfig.resolve(
        environment: AppEnvironment.production,
        configuredBackendBaseUrl: 'https://api.skyshake.app/',
      );

      expect(config.environment, AppEnvironment.production);
      expect(config.backendBaseUrl, 'https://api.skyshake.app');
      expect(config.usesLocalBackend, isFalse);
    });
  });
}
