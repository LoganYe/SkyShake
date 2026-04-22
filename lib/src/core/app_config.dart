enum AppEnvironment { development, production }

class AppConfig {
  const AppConfig({required this.environment, required this.backendBaseUrl});

  final AppEnvironment environment;
  final String backendBaseUrl;

  bool get isDevelopment => environment == AppEnvironment.development;

  String get environmentLabel =>
      isDevelopment ? 'Dev local backend' : 'Production backend';

  bool get usesLocalBackend {
    final uri = Uri.parse(backendBaseUrl);
    return uri.host == '127.0.0.1' || uri.host == 'localhost';
  }

  static AppConfig developmentFromEnvironment() {
    return resolve(
      environment: AppEnvironment.development,
      configuredBackendBaseUrl: const String.fromEnvironment(
        'BACKEND_BASE_URL',
        defaultValue: 'http://127.0.0.1:8787',
      ),
    );
  }

  static AppConfig productionFromEnvironment() {
    return resolve(
      environment: AppEnvironment.production,
      configuredBackendBaseUrl: const String.fromEnvironment(
        'BACKEND_BASE_URL',
        defaultValue: '',
      ),
    );
  }

  static AppConfig resolve({
    required AppEnvironment environment,
    required String configuredBackendBaseUrl,
  }) {
    final normalizedValue = configuredBackendBaseUrl.trim();
    if (normalizedValue.isEmpty) {
      if (environment == AppEnvironment.development) {
        return const AppConfig(
          environment: AppEnvironment.development,
          backendBaseUrl: 'http://127.0.0.1:8787',
        );
      }

      throw StateError(
        'BACKEND_BASE_URL is required for the production mobile app.',
      );
    }

    final parsedUri = Uri.tryParse(normalizedValue);
    if (parsedUri == null ||
        !parsedUri.hasScheme ||
        parsedUri.host.trim().isEmpty ||
        (parsedUri.scheme != 'http' && parsedUri.scheme != 'https')) {
      throw StateError(
        'BACKEND_BASE_URL must be a valid absolute http(s) URL. Received: "$normalizedValue".',
      );
    }

    final normalizedBackendBaseUrl =
        parsedUri
            .replace(path: parsedUri.path.replaceAll(RegExp(r'/$'), ''))
            .toString();

    if (environment == AppEnvironment.production) {
      final isLoopback =
          parsedUri.host == '127.0.0.1' || parsedUri.host == 'localhost';
      if (isLoopback) {
        throw StateError(
          'Production BACKEND_BASE_URL must not point to localhost or 127.0.0.1.',
        );
      }
      if (parsedUri.scheme != 'https') {
        throw StateError('Production BACKEND_BASE_URL must use https.');
      }
    }

    return AppConfig(
      environment: environment,
      backendBaseUrl: normalizedBackendBaseUrl,
    );
  }
}
