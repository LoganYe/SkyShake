import { describe, expect, test } from 'vitest';

import type { FlightDataPayload } from '../src/contracts.js';
import { FlightOptionsService } from '../src/services/flight-options.js';

describe('FlightOptionsService', () => {
  test('caches successful route-and-time searches and returns cache metadata', async () => {
    let now = Date.UTC(2026, 3, 22, 18, 0, 0);
    let calls = 0;

    const service = new FlightOptionsService(
      'aerodatabox',
      {
        async lookupFlight() {
          throw new Error('unused');
        },
        async searchFlightsByRoute() {
          calls += 1;
          return [
            {
              ...sampleFlight(),
              flightNumber: calls == 1 ? 'UA857' : 'UA858',
            },
          ];
        },
      },
      { now: () => now },
    );

    const first = await service.searchFlights('SFO', 'JFK', '2026-04-22T12:00');
    const second = await service.searchFlights('sfo', 'jfk', '2026-04-22T12:00');

    now += 61_000;
    const third = await service.searchFlights('SFO', 'JFK', '2026-04-22T12:00');

    expect(calls).toBe(2);
    expect(first.meta.source).toBe('live');
    expect(second.meta.source).toBe('cache');
    expect(second.meta.cachedAt).toBe(first.meta.cachedAt);
    expect(first.flights[0]?.flightNumber).toBe('UA857');
    expect(third.flights[0]?.flightNumber).toBe('UA858');
  });

  test('deduplicates in-flight route-and-time searches', async () => {
    let resolveSearch: ((value: FlightDataPayload[]) => void) | null = null;
    let calls = 0;

    const service = new FlightOptionsService('aerodatabox', {
      async lookupFlight() {
        throw new Error('unused');
      },
      async searchFlightsByRoute() {
        calls += 1;
        return await new Promise<FlightDataPayload[]>((resolve) => {
          resolveSearch = resolve;
        });
      },
    });

    const first = service.searchFlights('SFO', 'JFK', '2026-04-22T12:00');
    const second = service.searchFlights('sfo', 'jfk', '2026-04-22T12:00');

    expect(calls).toBe(1);

    resolveSearch?.([sampleFlight()]);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.meta.source).toBe('live');
    expect(secondResult.meta.source).toBe('live');
    expect(firstResult.flights[0]?.flightNumber).toBe('UA857');
    expect(secondResult.flights[0]?.flightNumber).toBe('UA857');
  });
});

function sampleFlight(): FlightDataPayload {
  return {
    flightNumber: 'UA857',
    airline: 'United Airlines',
    departure: 'SFO',
    departureAirport: 'San Francisco',
    arrival: 'JFK',
    arrivalAirport: 'New York JFK',
    departureTime: '2026-04-22T19:00:00.000Z',
    arrivalTime: '2026-04-23T01:00:00.000Z',
    aircraft: 'Boeing 777-300ER',
    status: 'Scheduled',
    latitude: null,
    longitude: null,
    altitude: null,
    velocity: null,
    isMockData: false,
    error: null,
  };
}
