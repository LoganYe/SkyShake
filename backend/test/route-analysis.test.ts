import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { WeatherProvider } from '../src/services/turbulence.js';

const noFlightProviderConfig = {
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

  test('returns validated analysis payloads', async () => {
    const weatherProvider: WeatherProvider = {
      async fetchSnapshot() {
        return {
          windSpeed: 58,
          windGusts: 78,
          windShear: 14,
          temperature: 5,
          cloudCover: 61,
          upperWind80: 66,
          upperWind120: 82,
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
});
