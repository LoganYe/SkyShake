import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { WeatherProvider } from '../src/services/turbulence.js';

const noFlightProviderConfig = {
  host: '127.0.0.1',
  port: 8787,
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
    expect(response.body).toContain('/v1/route-analysis/airports');
    expect(response.body).toContain('https://apps.apple.com/us/search?term=SkyShake');

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
          upperWind80: 66,
          upperWind120: 82,
        };
      },
    };
    const app = buildApp(noFlightProviderConfig, { weatherProvider });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
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
