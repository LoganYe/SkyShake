import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { FlightDataProvider } from '../src/clients/flight-lookup-provider.js';
import { RateLimitError } from '../src/errors.js';

describe('flight search endpoint', () => {
  test('fails honestly when the provider is configured but missing an API key', async () => {
    const app = buildApp({
      host: '127.0.0.1',
      port: 8787,
      flightProvider: 'aerodatabox',
      aeroDataBox: {
        marketplace: 'rapidapi',
        apiKey: null,
        host: null,
        enableFlightPlan: false,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toContain('AERODATABOX_API_KEY');
    expect(response.json().code).toBe('configuration_error');

    await app.close();
  });

  test('returns 400 for invalid flight-search queries', async () => {
    const app = buildApp(disabledFlightConfig());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_request');

    await app.close();
  });

  test('returns an honest notFound payload when the provider has no result', async () => {
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        return null;
      },
      async searchFlightsByRoute() {
        return [];
      },
    };

    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      flight: null,
      flightNumber: 'UA857',
      flightDate: null,
      flightTime: null,
      meta: {
        provider: 'none',
        source: 'live',
        partial: false,
        missingFields: [],
        cachedAt: expect.any(String),
        expiresAt: expect.any(String),
      },
      notFound: true,
    });

    await app.close();
  });

  test('adds CORS headers to browser flight lookup responses', async () => {
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        return null;
      },
      async searchFlightsByRoute() {
        return [];
      },
    };
    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
      headers: {
        origin: 'http://127.0.0.1:8080',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:8080',
    );

    await app.close();
  });

  test('returns cache metadata and avoids duplicate upstream calls for repeated searches', async () => {
    let calls = 0;
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        calls += 1;
        return {
          flightNumber: 'UA857',
          airline: 'United Airlines',
          departure: 'SFO',
          departureAirport: 'San Francisco',
          arrival: 'PVG',
          arrivalAirport: 'Shanghai Pudong',
          departureTime: '2026-04-21T20:01:00.000Z',
          arrivalTime: '2026-04-22T09:25:00.000Z',
          aircraft: 'Boeing 777-300',
          status: 'EnRoute',
          latitude: null,
          longitude: null,
          altitude: null,
          velocity: null,
          isMockData: false,
          error: null,
        };
      },
      async searchFlightsByRoute() {
        return [];
      },
    };
    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const first = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857&flightDate=2026-04-21',
    });
    const second = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=ua%20857&flightDate=2026-04-21',
    });

    expect(calls).toBe(1);
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().meta.source).toBe('live');
    expect(second.json().meta.source).toBe('cache');
    expect(second.json().meta.partial).toBe(true);

    await app.close();
  });

  test('surfaces rate-limit errors as retryable 503 responses', async () => {
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        throw new RateLimitError('AeroDataBox rate limit exceeded.', {
          provider: 'aerodatabox',
          retryAfterSeconds: 7,
        });
      },
      async searchFlightsByRoute() {
        return [];
      },
    };
    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers['retry-after']).toBe('7');
    expect(response.json()).toEqual({
      error: 'AeroDataBox rate limit exceeded.',
      code: 'provider_rate_limited',
      provider: 'aerodatabox',
      retryable: true,
      retryAfterSeconds: 7,
    });

    await app.close();
  });

  test('accepts an optional flight time and preserves it in the response', async () => {
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        return {
          flightNumber: 'UA857',
          airline: 'United Airlines',
          departure: 'SFO',
          departureAirport: 'San Francisco',
          arrival: 'JFK',
          arrivalAirport: 'John F. Kennedy International',
          departureTime: '2026-04-22T19:05:00.000Z',
          arrivalTime: '2026-04-23T01:10:00.000Z',
          aircraft: 'Boeing 777-300ER',
          status: 'Scheduled',
          latitude: null,
          longitude: null,
          altitude: null,
          velocity: null,
          isMockData: false,
          error: null,
        };
      },
      async searchFlightsByRoute() {
        return [];
      },
    };
    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857&flightDate=2026-04-22&flightTime=12:05',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().flightTime).toBe('12:05');

    await app.close();
  });
});

function disabledFlightConfig() {
  return {
    host: '127.0.0.1',
    port: 8787,
    flightProvider: 'none' as const,
    aeroDataBox: {
      marketplace: 'rapidapi' as const,
      apiKey: null,
      host: null,
      enableFlightPlan: false,
    },
  };
}
