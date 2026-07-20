import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { WeatherProvider } from '../src/services/turbulence.js';

const noFlightProviderConfig = {
  host: '127.0.0.1',
  port: 8787,
  runtimeEnvironment: 'test' as const,
  redisUrl: null,
  appAttest: {
    mode: 'disabled' as const,
    teamId: null,
    bundleId: null,
    allowDevelopmentEnvironment: true,
  },
  logLevel: 'silent' as const,
  trustProxyHops: 0,
  corsAllowedOrigins: [],
  providerRateLimit: { max: 30, timeWindowMs: 60_000 },
  routeAnalysisTimeoutMs: 18_000,
  appStoreUrl: null,
  flightProvider: 'none' as const,
  aeroDataBox: {
    marketplace: 'rapidapi' as const,
    apiKey: null,
    host: null,
    enableFlightPlan: false,
  },
};

describe('node landing page', () => {
  test('serves the landing page from the backend root', async () => {
    const app = buildApp(noFlightProviderConfig);

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('SkyShake mobile app');
    expect(response.body).toContain('Download on the App Store');
    expect(response.body).toContain('Try the live route preview');
    expect(response.body).toContain('/v1/public/route-analysis/airports');
    expect(response.body).toContain('https://apps.apple.com/us/search?term=SkyShake');
    const contentSecurityPolicy = response.headers['content-security-policy'];
    expect(contentSecurityPolicy).toContain("default-src 'none'");
    expect(contentSecurityPolicy).toContain("connect-src 'self'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("style-src-attr 'none'");
    expect(contentSecurityPolicy).not.toContain('unsafe-inline');
    expect(contentSecurityPolicy).not.toContain('unsafe-eval');
    const nonce = contentSecurityPolicy?.match(/script-src 'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(response.body).toContain(`<style nonce="${nonce}">`);
    expect(response.body).toContain(`<script nonce="${nonce}">`);
    expect(response.body).not.toContain('innerHTML');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['permissions-policy']).toBe(
      'camera=(), geolocation=(), microphone=()',
    );

    await app.close();
  });

  test('uses a fresh CSP nonce for each landing response', async () => {
    const app = buildApp(noFlightProviderConfig);

    const first = await app.inject({ method: 'GET', url: '/' });
    const second = await app.inject({ method: 'GET', url: '/' });

    expect(first.headers['content-security-policy']).not.toBe(
      second.headers['content-security-policy'],
    );

    await app.close();
  });

  test('uses the configured app store url for the primary CTA', async () => {
    const app = buildApp({
      ...noFlightProviderConfig,
      appStoreUrl: 'https://apps.apple.com/us/app/skyshake/id123456789',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(
      'https://apps.apple.com/us/app/skyshake/id123456789',
    );

    await app.close();
  });

  test('accepts airport-code route analysis requests from the landing page', async () => {
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot() {
        return {
          windSpeed: 58,
          windGusts: 78,
          windShear: 14,
          temperature: 5,
          cloudCover: 61,
          cape: 420,
          cruiseWindSpeed: 82,
        };
      },
    };
    const app = buildApp(noFlightProviderConfig, { weatherProvider });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/route-analysis/airports',
      payload: {
        departureCode: 'sfo',
        arrivalCode: 'jfk',
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.flightData.departure).toBe('SFO');
    expect(body.flightData.arrival).toBe('JFK');
    expect(body.report.totalWaypoints).toBeGreaterThanOrEqual(7);

    await app.close();
  });

  test('rejects identical departure and arrival airports', async () => {
    const app = buildApp(noFlightProviderConfig);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'SFO',
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'Departure and arrival airports must be different.',
      code: 'invalid_request',
    });

    await app.close();
  });

  test('rejects unsupported airport codes with an explicit catalog message', async () => {
    const app = buildApp(noFlightProviderConfig);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
      payload: {
        departureCode: 'ZZZ',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error:
        'Unsupported airport code: ZZZ. This page only accepts airports from the bundled SkyShake catalog.',
      code: 'unsupported_airport',
    });

    await app.close();
  });
});
