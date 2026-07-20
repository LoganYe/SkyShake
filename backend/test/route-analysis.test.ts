import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { RateLimitError } from '../src/errors.js';
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

describe('route analysis endpoint', () => {
  test('answers browser CORS preflight requests for route analysis', async () => {
    const app = buildApp(noFlightProviderConfig);

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/route-analysis',
      headers: {
        origin: 'http://127.0.0.1:8080',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:8080',
    );
    expect(response.headers['access-control-allow-methods']).toContain('POST');

    await app.close();
  });

  test('allows configured browser origins and omits CORS headers for others', async () => {
    const app = buildApp({
      ...noFlightProviderConfig,
      corsAllowedOrigins: ['https://app.skyshake.example'],
    });

    const allowedResponse = await app.inject({
      method: 'OPTIONS',
      url: '/v1/route-analysis',
      headers: {
        origin: 'https://app.skyshake.example',
        'access-control-request-method': 'POST',
      },
    });
    const deniedResponse = await app.inject({
      method: 'OPTIONS',
      url: '/v1/route-analysis',
      headers: {
        origin: 'https://untrusted.example',
        'access-control-request-method': 'POST',
      },
    });

    expect(allowedResponse.headers['access-control-allow-origin']).toBe(
      'https://app.skyshake.example',
    );
    expect(deniedResponse.headers['access-control-allow-origin']).toBeUndefined();

    await app.close();
  });

  test('returns validated analysis payloads', async () => {
    const requestedForecastTimes: Date[] = [];
    const requestedAltitudes: number[] = [];
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot(_latitude, _longitude, options) {
        if (options?.forecastTime != null) {
          requestedForecastTimes.push(options.forecastTime);
        }
        if (options?.cruiseAltitudeFeet != null) {
          requestedAltitudes.push(options.cruiseAltitudeFeet);
        }
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
      url: '/v1/route-analysis',
      payload: {
        departure: {
          code: 'SFO',
          name: 'San Francisco International',
          latitude: 37.6213,
          longitude: -122.379,
        },
        arrival: {
          code: 'JFK',
          name: 'John F. Kennedy International',
          latitude: 40.6413,
          longitude: -73.7781,
        },
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.flightData.departure).toBe('SFO');
    expect(body.report.totalWaypoints).toBeGreaterThanOrEqual(7);
    expect(body.report.overallScore).toBeGreaterThan(0);
    expect(body.flightData.isMockData).toBe(false);
    expect(body.model).toEqual({
      name: 'weather-proxy',
      version: 2,
      operationalUse: false,
    });
    expect(body.report.waypoints[0]).not.toHaveProperty('edr');
    expect(requestedForecastTimes).toHaveLength(body.report.totalWaypoints);
    expect(requestedForecastTimes.at(-1)?.getTime()).toBeGreaterThan(
      requestedForecastTimes[0]?.getTime() ?? Number.POSITIVE_INFINITY,
    );
    expect(new Set(requestedAltitudes)).toEqual(new Set([39_000]));

    await app.close();
  });

  test('uses server catalog coordinates for raw compatibility requests', async () => {
    const requestedCoordinates: Array<{
      latitude: number;
      longitude: number;
    }> = [];
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot(latitude, longitude) {
        requestedCoordinates.push({ latitude, longitude });
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
      url: '/v1/route-analysis',
      payload: {
        departure: {
          code: 'SFO',
          name: 'Spoofed departure',
          latitude: 0,
          longitude: 0,
        },
        arrival: {
          code: 'JFK',
          name: 'Spoofed arrival',
          latitude: 1,
          longitude: 1,
        },
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().flightData.departureAirport).toBe(
      'San Francisco International',
    );
    expect(requestedCoordinates[0]?.latitude).toBeCloseTo(37.6213, 6);
    expect(requestedCoordinates[0]?.longitude).toBeCloseTo(-122.379, 6);

    await app.close();
  });

  test('returns 400 for invalid request payloads', async () => {
    const app = buildApp(noFlightProviderConfig);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis',
      payload: {
        departureIata: 'SFO',
        arrivalIata: 'JFK',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'Invalid input: expected object, received undefined',
      code: 'invalid_request',
    });

    await app.close();
  });

  test('returns retryable provider errors when live weather data is rate limited', async () => {
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot() {
        throw new RateLimitError('Live weather data is temporarily rate limited.', {
          provider: 'open-meteo',
          retryAfterSeconds: 11,
        });
      },
    };

    const app = buildApp(noFlightProviderConfig, { weatherProvider });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis',
      payload: {
        departure: {
          code: 'SFO',
          name: 'San Francisco International',
          latitude: 37.6213,
          longitude: -122.379,
        },
        arrival: {
          code: 'JFK',
          name: 'John F. Kennedy International',
          latitude: 40.6413,
          longitude: -73.7781,
        },
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['retry-after']).toBe('11');
    expect(response.json()).toEqual({
      error: 'Live weather data is temporarily rate limited.',
      code: 'provider_rate_limited',
      provider: 'open-meteo',
      retryable: true,
      retryAfterSeconds: 11,
    });

    await app.close();
  });

  test('rate limits provider-backed routes with the shared API budget', async () => {
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
    const app = buildApp(
      {
        ...noFlightProviderConfig,
        providerRateLimit: { max: 2, timeWindowMs: 60_000 },
      },
      { weatherProvider },
    );
    const request = {
      method: 'POST' as const,
      url: '/v1/route-analysis/airports',
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    };

    expect((await app.inject(request)).statusCode).toBe(200);
    expect((await app.inject(request)).statusCode).toBe(200);

    const limitedResponse = await app.inject(request);
    expect(limitedResponse.statusCode).toBe(429);
    expect(limitedResponse.headers['retry-after']).toBeDefined();
    expect(limitedResponse.json()).toEqual({
      error: 'Too many provider-backed requests.',
      code: 'rate_limit_exceeded',
      retryable: true,
      retryAfterSeconds: expect.any(Number),
    });

    await app.close();
  });

  test('returns a retryable error when total route analysis exceeds its deadline', async () => {
    let calls = 0;
    let abortedCalls = 0;
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot(_latitude, _longitude, options) {
        calls += 1;
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => {
              abortedCalls += 1;
              reject(options.signal?.reason);
            },
            { once: true },
          );
        });
      },
    };
    const app = buildApp(
      {
        ...noFlightProviderConfig,
        routeAnalysisTimeoutMs: 5,
      },
      { weatherProvider },
    );

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    });

    expect(response.statusCode).toBe(504);
    expect(response.json()).toEqual({
      error: 'Route analysis timed out.',
      code: 'route_analysis_timeout',
      provider: 'open-meteo',
      retryable: true,
    });
    expect(calls).toBe(3);
    expect(abortedCalls).toBe(3);

    await app.close();
  });
});
