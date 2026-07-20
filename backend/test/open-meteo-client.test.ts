import { describe, expect, test, vi } from 'vitest';

import { RateLimitError } from '../src/errors.js';
import { OpenMeteoClient } from '../src/clients/open-meteo-client.js';

const forecastNowMs = Date.parse('2026-07-20T00:20:00Z');

function validWeatherPayload() {
  return {
    hourly: {
      time: ['2026-07-20T00:00', '2026-07-20T01:00'],
      temperature_2m: [12, 15],
      wind_speed_10m: [41, 44],
      wind_gusts_10m: [58, 63],
      cloud_cover: [36, 48],
      cape: [120, 700],
      wind_speed_300hPa: [50, 55],
      wind_direction_300hPa: [0, 0],
      wind_speed_250hPa: [60, 60],
      wind_direction_250hPa: [0, 0],
      wind_speed_200hPa: [80, 100],
      wind_direction_200hPa: [0, 0],
    },
  };
}

describe('OpenMeteoClient', () => {
  test('caches identical coordinate lookups for a short TTL', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(validWeatherPayload()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new OpenMeteoClient(fetchImpl, {
      now: () => forecastNowMs,
    });

    const first = await client.fetchSnapshot(37.6213, -122.3790);
    const second = await client.fetchSnapshot(37.6213, -122.3790);

    expect(first).toEqual(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('reuses in-flight requests for identical coordinates', async () => {
    let resolveFetch: ((response: Response) => void) | null = null;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const client = new OpenMeteoClient(fetchImpl, {
      now: () => forecastNowMs,
    });

    const first = client.fetchSnapshot(37.6213, -122.3790);
    const second = client.fetchSnapshot(37.6213, -122.3790);

    await Promise.resolve();
    resolveFetch?.(
      new Response(JSON.stringify(validWeatherPayload()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(first).resolves.toEqual(await second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('selects the forecast hour and pressure band nearest the route point', async () => {
    let requestedUrl: URL | null = null;
    const client = new OpenMeteoClient(async (input) => {
      requestedUrl = new URL(input.toString());
      return new Response(JSON.stringify(validWeatherPayload()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const snapshot = await client.fetchSnapshot(37.6213, -122.3790, {
      forecastTime: new Date('2026-07-20T01:20:00Z'),
      cruiseAltitudeFeet: 36_000,
    });

    expect(snapshot).toMatchObject({
      windSpeed: 44,
      windGusts: 63,
      temperature: 15,
      cloudCover: 48,
      cape: 700,
      cruiseWindSpeed: 80,
      windShear: 40,
    });
    expect(requestedUrl?.searchParams.has('current')).toBe(false);
    expect(requestedUrl?.searchParams.get('hourly')).toContain(
      'wind_speed_200hPa',
    );
    expect(requestedUrl?.searchParams.get('forecast_days')).toBe('2');
  });

  test('cancels the active weather fetch when the route signal aborts', async () => {
    const controller = new AbortController();
    const cancellation = new Error('route deadline reached');
    let providerSignal: AbortSignal | null = null;
    const client = new OpenMeteoClient(async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        providerSignal = init?.signal ?? null;
        init?.signal?.addEventListener(
          'abort',
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
    );

    const request = client.fetchSnapshot(37.6213, -122.3790, {
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort(cancellation);

    await expect(request).rejects.toBe(cancellation);
    expect(providerSignal?.aborted).toBe(true);
  });

  test('maps Open-Meteo 429 responses to retryable rate-limit errors', async () => {
    const client = new OpenMeteoClient(async () =>
      new Response('', {
        status: 429,
        headers: { 'retry-after': '9' },
      }),
    );

    await expect(client.fetchSnapshot(37.6213, -122.3790)).rejects.toMatchObject<
      Partial<RateLimitError>
    >({
      name: 'RateLimitError',
      code: 'provider_rate_limited',
      provider: 'open-meteo',
      retryable: true,
      retryAfterSeconds: 9,
    });
  });

  test('maps malformed success payloads to provider errors', async () => {
    const client = new OpenMeteoClient(async () =>
      new Response('{not-json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(client.fetchSnapshot(37.6213, -122.3790)).rejects.toMatchObject({
      statusCode: 502,
      code: 'provider_payload_invalid',
      provider: 'open-meteo',
    });
  });
});
