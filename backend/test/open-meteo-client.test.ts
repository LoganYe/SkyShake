import { describe, expect, test, vi } from 'vitest';

import { RateLimitError } from '../src/errors.js';
import { OpenMeteoClient } from '../src/clients/open-meteo-client.js';

describe('OpenMeteoClient', () => {
  test('caches identical coordinate lookups for a short TTL', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          current: {
            temperature_2m: 12,
            wind_speed_10m: 41,
            wind_gusts_10m: 58,
            cloud_cover: 36,
          },
          hourly: {
            wind_speed_80m: [57],
            wind_speed_120m: [69],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    const client = new OpenMeteoClient(fetchImpl);

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
    const client = new OpenMeteoClient(fetchImpl);

    const first = client.fetchSnapshot(37.6213, -122.3790);
    const second = client.fetchSnapshot(37.6213, -122.3790);

    resolveFetch?.(
      new Response(
        JSON.stringify({
          current: {
            temperature_2m: 12,
            wind_speed_10m: 41,
            wind_gusts_10m: 58,
            cloud_cover: 36,
          },
          hourly: {
            wind_speed_80m: [57],
            wind_speed_120m: [69],
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    await expect(first).resolves.toEqual(await second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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
});
