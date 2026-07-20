import { describe, expect, test } from 'vitest';

import { readConfig } from '../src/config.js';

describe('readConfig', () => {
  test('uses provider-neutral defaults', () => {
    const config = readConfig({});

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(8787);
    expect(config.runtimeEnvironment).toBe('development');
    expect(config.redisUrl).toBeNull();
    expect(config.appAttest).toEqual({
      mode: 'disabled',
      teamId: null,
      bundleId: null,
      allowDevelopmentEnvironment: true,
    });
    expect(config.logLevel).toBe('info');
    expect(config.trustProxyHops).toBe(0);
    expect(config.corsAllowedOrigins).toEqual([]);
    expect(config.providerRateLimit).toEqual({
      max: 30,
      timeWindowMs: 60_000,
    });
    expect(config.routeAnalysisTimeoutMs).toBe(18_000);
    expect(config.appStoreUrl).toBeNull();
    expect(config.flightProvider).toBe('none');
    expect(config.aeroDataBox.marketplace).toBe('rapidapi');
    expect(config.aeroDataBox.apiKey).toBeNull();
    expect(config.aeroDataBox.enableFlightPlan).toBe(false);
  });

  test('parses landing-page and AeroDataBox env vars without guessing boolean flags', () => {
    const config = readConfig({
      HOST: '0.0.0.0',
      PORT: '9000',
      NODE_ENV: 'production',
      REDIS_URL: 'rediss://cache.skyshake.example:6380/0',
      APPLE_TEAM_ID: '595KFFGG66',
      IOS_BUNDLE_ID: 'com.skyshake.app',
      APP_ATTEST_ALLOW_DEVELOPMENT: 'false',
      LOG_LEVEL: 'warn',
      TRUST_PROXY_HOPS: '1',
      CORS_ALLOWED_ORIGINS:
        'https://app.skyshake.example, https://admin.skyshake.example/path',
      PROVIDER_RATE_LIMIT_MAX: '45',
      PROVIDER_RATE_LIMIT_WINDOW_MS: '120000',
      ROUTE_ANALYSIS_TIMEOUT_MS: '15000',
      APP_STORE_URL: 'https://apps.apple.com/us/app/skyshake/id123456789',
      FLIGHT_PROVIDER: 'aerodatabox',
      AERODATABOX_MARKETPLACE: 'apimarket',
      AERODATABOX_API_KEY: 'demo-key',
      AERODATABOX_HOST: 'custom-host.example.com',
      AERODATABOX_ENABLE_FLIGHT_PLAN: 'true',
    });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(9000);
    expect(config.runtimeEnvironment).toBe('production');
    expect(config.redisUrl).toBe('rediss://cache.skyshake.example:6380/0');
    expect(config.appAttest).toEqual({
      mode: 'required',
      teamId: '595KFFGG66',
      bundleId: 'com.skyshake.app',
      allowDevelopmentEnvironment: false,
    });
    expect(config.logLevel).toBe('warn');
    expect(config.trustProxyHops).toBe(1);
    expect(config.corsAllowedOrigins).toEqual([
      'https://app.skyshake.example',
      'https://admin.skyshake.example',
    ]);
    expect(config.providerRateLimit).toEqual({
      max: 45,
      timeWindowMs: 120_000,
    });
    expect(config.routeAnalysisTimeoutMs).toBe(15_000);
    expect(config.appStoreUrl).toBe(
      'https://apps.apple.com/us/app/skyshake/id123456789',
    );
    expect(config.flightProvider).toBe('aerodatabox');
    expect(config.aeroDataBox.marketplace).toBe('apimarket');
    expect(config.aeroDataBox.apiKey).toBe('demo-key');
    expect(config.aeroDataBox.host).toBe('custom-host.example.com');
    expect(config.aeroDataBox.enableFlightPlan).toBe(true);
  });

  test('rejects invalid boolean-like values for flight-plan flag', () => {
    expect(() =>
      readConfig({
        AERODATABOX_ENABLE_FLIGHT_PLAN: 'sometimes',
      }),
    ).toThrow(/AERODATABOX_ENABLE_FLIGHT_PLAN/);
  });

  test('rejects invalid app store urls', () => {
    expect(() =>
      readConfig({
        APP_STORE_URL: 'not-a-url',
      }),
    ).toThrow(/APP_STORE_URL/);
  });

  test('rejects invalid CORS origins', () => {
    expect(() =>
      readConfig({
        CORS_ALLOWED_ORIGINS: 'https://app.skyshake.example, not-a-url',
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  test('requires shared Redis state in production', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow(/REDIS_URL/);
  });

  test('requires App Attest identity configuration in production', () => {
    expect(() =>
      readConfig({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://127.0.0.1:6379',
      }),
    ).toThrow(/APPLE_TEAM_ID and IOS_BUNDLE_ID/);
  });

  test('does not permit development attestations in production', () => {
    expect(() =>
      readConfig({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://127.0.0.1:6379',
        APPLE_TEAM_ID: '595KFFGG66',
        IOS_BUNDLE_ID: 'com.skyshake.app',
        APP_ATTEST_ALLOW_DEVELOPMENT: 'true',
      }),
    ).toThrow(/must be false/);
  });

  test('rejects non-Redis shared-state URLs', () => {
    expect(() =>
      readConfig({ REDIS_URL: 'https://cache.skyshake.example' }),
    ).toThrow(/redis or rediss/);
  });
});
