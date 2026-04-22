import { describe, expect, test } from 'vitest';

import { AeroDataBoxClient } from '../src/clients/aerodatabox-client.js';
import { ConfigurationError, UpstreamServiceError } from '../src/errors.js';

describe('AeroDataBoxClient', () => {
  test('normalizes a successful RapidAPI flight lookup and ranks candidates deterministically', async () => {
    let requestedUrl: URL | null = null;
    let requestedHeaders: Headers | null = null;

    const client = new AeroDataBoxClient(
      {
        host: '127.0.0.1',
        port: 8787,
        flightProvider: 'aerodatabox',
        aeroDataBox: {
          marketplace: 'rapidapi',
          apiKey: 'rapid-key',
          host: null,
          enableFlightPlan: false,
        },
      },
      async (input, init) => {
        requestedUrl = input instanceof URL ? input : new URL(String(input));
        requestedHeaders = new Headers(init?.headers);

        return new Response(
          JSON.stringify([
            {
              number: 'UA 857',
              status: 'Canceled',
              codeshareStatus: 'IsCodeshared',
              isCargo: false,
              lastUpdatedUtc: '2026-04-21T18:00:00Z',
              departure: {
                airport: {
                  iata: 'SFO',
                  icao: 'KSFO',
                  name: 'San Francisco International Airport',
                },
                scheduledTime: {
                  utc: '2026-04-21T17:00:00Z',
                  local: '2026-04-21T10:00:00-07:00',
                },
                quality: ['Basic'],
              },
              arrival: {
                airport: {
                  iata: 'JFK',
                  icao: 'KJFK',
                  name: 'John F. Kennedy International Airport',
                },
                scheduledTime: {
                  utc: '2026-04-21T23:10:00Z',
                  local: '2026-04-21T19:10:00-04:00',
                },
                quality: ['Basic'],
              },
              airline: {
                name: 'United Airlines',
                iata: 'UA',
              },
              aircraft: {
                model: 'Boeing 777-300ER',
                reg: 'N2747U',
              },
            },
            {
              number: 'UA857',
              status: 'EnRoute',
              codeshareStatus: 'IsOperator',
              isCargo: false,
              lastUpdatedUtc: '2026-04-21T18:20:00Z',
              departure: {
                airport: {
                  iata: 'SFO',
                  icao: 'KSFO',
                  name: 'San Francisco International Airport',
                },
                scheduledTime: {
                  utc: '2026-04-21 17:00Z',
                  local: '2026-04-21T10:00:00-07:00',
                },
                revisedTime: {
                  utc: '2026-04-21 17:12Z',
                  local: '2026-04-21T10:12:00-07:00',
                },
                quality: ['Basic', 'Live'],
              },
              arrival: {
                airport: {
                  iata: 'JFK',
                  icao: 'KJFK',
                  name: 'John F. Kennedy International Airport',
                },
                revisedTime: {
                  utc: '2026-04-21 23:25Z',
                  local: '2026-04-21T19:25:00-04:00',
                },
                quality: ['Basic', 'Live'],
              },
              airline: {
                name: 'United Airlines',
                iata: 'UA',
              },
              aircraft: {
                model: 'Boeing 777-300ER',
                reg: 'N2747U',
              },
              location: {
                lat: 41.2,
                lon: -109.8,
                altitude: {
                  feet: 35100,
                },
                groundSpeed: {
                  kmPerHour: 902,
                },
                pressure: {
                  hPa: 1013.2,
                },
                pressureAltitude: {
                  feet: 34800,
                },
                trueTrack: {
                  degree: 86,
                },
                reportedAtUtc: '2026-04-21T18:19:00Z',
              },
            },
          ]),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    );

    const flight = await client.lookupFlight('ua 857', '2026-04-21');

    expect(requestedUrl?.host).toBe('aerodatabox.p.rapidapi.com');
    expect(requestedUrl?.pathname).toBe('/flights/Number/UA857/2026-04-21');
    expect(requestedUrl?.searchParams.get('dateLocalRole')).toBe('Both');
    expect(requestedUrl?.searchParams.get('withLocation')).toBe('true');
    expect(requestedUrl?.searchParams.get('withFlightPlan')).toBe('false');
    expect(requestedHeaders?.get('X-RapidAPI-Key')).toBe('rapid-key');
    expect(requestedHeaders?.get('X-RapidAPI-Host')).toBe('aerodatabox.p.rapidapi.com');
    expect(flight?.flightNumber).toBe('UA857');
    expect(flight?.airline).toBe('United Airlines');
    expect(flight?.departure).toBe('SFO');
    expect(flight?.arrival).toBe('JFK');
    expect(flight?.departureTime).toBe('2026-04-21T17:12:00.000Z');
    expect(flight?.arrivalTime).toBe('2026-04-21T23:25:00.000Z');
    expect(flight?.aircraft).toBe('Boeing 777-300ER');
    expect(flight?.latitude).toBe(41.2);
    expect(flight?.altitude).toBe(35100);
    expect(flight?.velocity).toBe(902);
    expect(flight?.status).toBe('EnRoute');
    expect(flight?.isMockData).toBe(false);
  });

  test('returns null when the provider has no matching flight data', async () => {
    const client = new AeroDataBoxClient(
      configuredBackend(),
      async () => new Response(null, { status: 204 }),
    );

    await expect(client.lookupFlight('UA857')).resolves.toBeNull();
  });

  test('treats explicit not-found responses as empty results', async () => {
    const client = new AeroDataBoxClient(
      configuredBackend(),
      async () =>
        new Response(JSON.stringify({ message: 'Flight not found.' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(client.lookupFlight('UA857')).resolves.toBeNull();
  });

  test('fails loudly when the API key is missing', async () => {
    const client = new AeroDataBoxClient({
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

    await expect(client.lookupFlight('UA857')).rejects.toBeInstanceOf(
      ConfigurationError,
    );
  });

  test('maps authentication failures without hiding the upstream message', async () => {
    const client = new AeroDataBoxClient(
      configuredBackend(),
      async () =>
        new Response(JSON.stringify({ message: 'Invalid API key.' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(client.lookupFlight('UA857')).rejects.toThrow(
      /AeroDataBox authentication failed.*Invalid API key/i,
    );
  });

  test('maps upstream rate limits explicitly', async () => {
    const client = new AeroDataBoxClient(
      configuredBackend(),
      async () =>
        new Response(JSON.stringify({ message: 'Too many requests.' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(client.lookupFlight('UA857')).rejects.toThrow(
      /rate limit exceeded/i,
    );
  });

  test('rejects malformed success payloads', async () => {
    const client = new AeroDataBoxClient(
      configuredBackend(),
      async () =>
        new Response(JSON.stringify({ unexpected: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(client.lookupFlight('UA857')).rejects.toBeInstanceOf(
      UpstreamServiceError,
    );
  });
});

function configuredBackend() {
  return {
    host: '127.0.0.1',
    port: 8787,
    flightProvider: 'aerodatabox' as const,
    aeroDataBox: {
      marketplace: 'rapidapi' as const,
      apiKey: 'rapid-key',
      host: null,
      enableFlightPlan: false,
    },
  };
}
