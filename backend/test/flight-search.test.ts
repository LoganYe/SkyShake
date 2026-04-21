import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';

describe('flight search endpoint', () => {
  test('fails honestly when the provider is not configured', async () => {
    const app = buildApp({
      host: '127.0.0.1',
      port: 8787,
      flightProvider: 'aviationstack',
      aviationStackAccessKey: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/flights/search?flightNumber=UA857',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toContain('AVIATIONSTACK_ACCESS_KEY');

    await app.close();
  });
});
