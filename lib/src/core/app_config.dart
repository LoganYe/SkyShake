class AppConfig {
  const AppConfig({required this.backendBaseUrl});

  final String backendBaseUrl;

  static AppConfig fromEnvironment() {
    final configured =
        const String.fromEnvironment(
          'BACKEND_BASE_URL',
          defaultValue: 'http://127.0.0.1:8787',
        ).trim();

    return AppConfig(
      backendBaseUrl: configured.isEmpty ? 'http://127.0.0.1:8787' : configured,
    );
  }
}
