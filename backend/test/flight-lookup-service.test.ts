import { describe, expect, test } from 'vitest';

import type { FlightLookupProvider } from '../src/clients/flight-lookup-provider.js';
import { RateLimitError } from '../src/errors.js';
import type { FlightDataPayload } from '../src/contracts.js';
import { FlightLookupService } from '../src/services/flight-lookup.js';

describe('FlightLookupService', () => {
  test('caches successful lookups and refreshes them after the success TTL', async () => {
    let now = Date.UTC(2026, 3, 21, 18, 0, 0);
    let calls = 0;

    const service = new FlightLookupService(
      'aerodatabox',
      {
        async lookupFlight() {
          calls += 1;
          return {
            ...sampleFlight(),
            status: calls == 1 ? 'EnRoute' : 'Arrived',
          };
        },
      },
      { now: () => now },
    );

    const first = await service.lookupFlight('ua 857', '2026-04-21');
    const second = await service.lookupFlight('UA857', '2026-04-21');

    now += 61_000;
    const third = await service.lookupFlight('UA857', '2026-04-21');

    expect(calls).toBe(2);
    expect(first.meta.source).toBe('live');
    expect(second.meta.source).toBe('cache');
    expect(second.meta.cachedAt).toBe(first.meta.cachedAt);
    expect(second.meta.expiresAt).toBe(first.meta.expiresAt);
    expect(second.flight?.status).toBe('EnRoute');
    expect(third.meta.source).toBe('live');
    expect(third.flight?.status).toBe('Arrived');
  });

  test('caches notFound responses with a shorter TTL', async () => {
    let now = Date.UTC(2026, 3, 21, 18, 0, 0);
    let calls = 0;

    const service = new FlightLookupService(
      'aerodatabox',
      {
        async lookupFlight() {
          calls += 1;
          return null;
        },
      },
      { now: () => now },
    );

    const first = await service.lookupFlight('ZZ0000', '2026-04-21');
    const second = await service.lookupFlight('ZZ0000', '2026-04-21');

    now += 31_000;
    const third = await service.lookupFlight('ZZ0000', '2026-04-21');

    expect(calls).toBe(2);
    expect(first.notFound).toBe(true);
    expect(first.meta.source).toBe('live');
    expect(second.meta.source).toBe('cache');
    expect(third.meta.source).toBe('live');
  });

  test('deduplicates in-flight lookups for the same normalized query', async () => {
    let resolveLookup: ((value: FlightDataPayload | null) => void) | null = null;
    let calls = 0;

    const service = new FlightLookupService('aerodatabox', {
      async lookupFlight() {
        calls += 1;
        return await new Promise<FlightDataPayload | null>((resolve) => {
          resolveLookup = resolve;
        });
      },
    });

    const firstRequest = service.lookupFlight('UA857', '2026-04-21');
    const secondRequest = service.lookupFlight('ua 857', '2026-04-21');

    expect(calls).toBe(1);

    resolveLookup?.(sampleFlight());
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.flight?.flightNumber).toBe('UA857');
    expect(second.flight?.flightNumber).toBe('UA857');
    expect(first.meta.source).toBe('live');
    expect(second.meta.source).toBe('live');
  });

  test('does not cache provider errors', async () => {
    let calls = 0;

    const service = new FlightLookupService('aerodatabox', {
      async lookupFlight() {
        calls += 1;
        throw new RateLimitError('AeroDataBox rate limit exceeded.', {
          provider: 'aerodatabox',
          retryAfterSeconds: 2,
        });
      },
    });

    await expect(service.lookupFlight('UA857', '2026-04-21')).rejects.toThrow(
      /rate limit exceeded/i,
    );
    await expect(service.lookupFlight('UA857', '2026-04-21')).rejects.toThrow(
      /rate limit exceeded/i,
    );

    expect(calls).toBe(2);
  });
});

function sampleFlight(): FlightDataPayload {
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
}
