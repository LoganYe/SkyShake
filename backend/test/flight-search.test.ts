import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { FlightLookupProvider } from '../src/clients/flight-lookup-provider.js';

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

    await app.close();
  });

  test('returns 400 for invalid flight-search queries', async () => {
    const app = buildApp(disabledFlightConfig());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  test('returns an honest notFound payload when the provider has no result', async () => {
    const flightLookupProvider: FlightLookupProvider = {
      async lookupFlight() {
        return null;
      },
    };

    const app = buildApp(disabledFlightConfig(), { flightLookupProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      flightNumber: 'UA857',
      notFound: true,
    });

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
