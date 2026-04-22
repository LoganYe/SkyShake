import { describe, expect, test } from 'vitest';

import { readConfig } from '../src/config.js';

describe('readConfig', () => {
  test('uses provider-neutral defaults', () => {
    const config = readConfig({});

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(8787);
    expect(config.flightProvider).toBe('none');
    expect(config.aeroDataBox.marketplace).toBe('rapidapi');
    expect(config.aeroDataBox.apiKey).toBeNull();
    expect(config.aeroDataBox.enableFlightPlan).toBe(false);
  });

  test('parses AeroDataBox env vars without guessing boolean flags', () => {
    const config = readConfig({
      HOST: '0.0.0.0',
      PORT: '9000',
      FLIGHT_PROVIDER: 'aerodatabox',
      AERODATABOX_MARKETPLACE: 'apimarket',
      AERODATABOX_API_KEY: 'demo-key',
      AERODATABOX_HOST: 'custom-host.example.com',
      AERODATABOX_ENABLE_FLIGHT_PLAN: 'true',
    });

    expect(config.host).toBe('0.0.0.0');
    expect(config.port).toBe(9000);
    expect(config.flightProvider).toBe('aerodatabox');
    expect(config.aeroDataBox.marketplace).toBe('apimarket');
    expect(config.aeroDataBox.apiKey).toBe('demo-key');
    expect(config.aeroDataBox.host).toBe('custom-host.example.com');
    expect(config.aeroDataBox.enableFlightPlan).toBe(true);
  });

  test('rejects invalid boolean-like values for flight-plan flag', () => {
    expect(() =>
      readConfig({
        AERODATABOX_ENABLE_FLIGHT_PLAN: 'sometimes',
      }),
    ).toThrow(/AERODATABOX_ENABLE_FLIGHT_PLAN/);
  });
});
