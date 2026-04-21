import { describe, expect, test } from 'vitest';

import { AviationStackClient } from '../src/clients/aviationstack-client.js';

describe('AviationStackClient', () => {
  test('normalizes a successful provider response', async () => {
    let requestedUrl: URL | null = null;

    const client = new AviationStackClient(
      {
        host: '127.0.0.1',
        port: 8787,
        flightProvider: 'aviationstack',
        aviationStackAccessKey: 'test-key',
      },
      async (input) => {
        requestedUrl = input instanceof URL ? input : new URL(String(input));
        return new Response(
          JSON.stringify({
            data: [
              {
                flight_status: 'active',
                departure: {
                  airport: 'San Francisco International Airport',
                  iata: 'SFO',
                  scheduled: '2026-04-21T17:00:00+00:00',
                },
                arrival: {
                  airport: 'John F. Kennedy International Airport',
                  iata: 'JFK',
                  estimated: '2026-04-21T23:20:00+00:00',
                },
                airline: {
                  name: 'United Airlines',
                  iata: 'UA',
                },
                flight: {
                  number: '857',
                  iata: 'UA857',
                  icao: 'UAL857',
                },
                aircraft: {
                  icao: 'B77W',
                  iata: 'B773',
                },
                live: {
                  latitude: 41.2,
                  longitude: -109.8,
                  altitude: 35000,
                  speed_horizontal: 840,
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    );

    const flight = await client.lookupFlight('ua857', '2026-04-21');

    expect(requestedUrl?.host).toBe('api.aviationstack.com');
    expect(requestedUrl?.searchParams.get('flight_iata')).toBe('UA857');
    expect(requestedUrl?.searchParams.get('flight_date')).toBe('2026-04-21');
    expect(flight?.flightNumber).toBe('UA857');
    expect(flight?.airline).toBe('United Airlines');
    expect(flight?.departure).toBe('SFO');
    expect(flight?.arrival).toBe('JFK');
    expect(flight?.aircraft).toBe('B77W');
    expect(flight?.latitude).toBe(41.2);
    expect(flight?.velocity).toBe(840);
    expect(flight?.isMockData).toBe(false);
  });
});
