import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { FlightDataProvider } from '../src/clients/flight-lookup-provider.js';

describe('flight options endpoint', () => {
  test('returns 400 for invalid route-and-time queries', async () => {
    const app = buildApp(disabledFlightConfig());

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/options?departureCode=SFO&arrivalCode=JFK',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('invalid_request');

    await app.close();
  });

  test('returns candidate flights for a route-and-time search', async () => {
    const flightDataProvider: FlightDataProvider = {
      async lookupFlight() {
        return null;
      },
      async searchFlightsByRoute() {
        return [
          {
            flightNumber: 'UA857',
            airline: 'United Airlines',
            departure: 'SFO',
            departureAirport: null,
            arrival: 'JFK',
            arrivalAirport: 'John F. Kennedy International',
            departureTime: '2026-04-22T19:00:00.000Z',
            arrivalTime: '2026-04-23T01:05:00.000Z',
            aircraft: 'Boeing 777-300ER',
            status: 'Scheduled',
            latitude: null,
            longitude: null,
            altitude: null,
            velocity: null,
            isMockData: false,
            error: null,
          },
        ];
      },
    };

    const app = buildApp(disabledFlightConfig(), { flightDataProvider });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/options?departureCode=SFO&arrivalCode=JFK&departureLocal=2026-04-22T12:00',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      departureCode: 'SFO',
      arrivalCode: 'JFK',
      departureLocal: '2026-04-22T12:00',
      flights: [
        {
          flightNumber: 'UA857',
          airline: 'United Airlines',
          departure: 'SFO',
          departureAirport: null,
          arrival: 'JFK',
          arrivalAirport: 'John F. Kennedy International',
          departureTime: '2026-04-22T19:00:00.000Z',
          arrivalTime: '2026-04-23T01:05:00.000Z',
          aircraft: 'Boeing 777-300ER',
          status: 'Scheduled',
          latitude: null,
          longitude: null,
          altitude: null,
          velocity: null,
          isMockData: false,
          error: null,
        },
      ],
      notFound: false,
      meta: {
        provider: 'none',
        source: 'live',
        cachedAt: expect.any(String),
        expiresAt: expect.any(String),
        timeWindowStart: '2026-04-22T09:00',
        timeWindowEnd: '2026-04-22T15:00',
      },
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
