import { describe, expect, test } from 'vitest';

import {
  fetchProviderResponse,
  type FetchLike,
} from '../src/clients/provider-request.js';

describe('fetchProviderResponse', () => {
  test('returns the response and consumes its body within the request boundary', async () => {
    const result = await fetchProviderResponse(
      async () => new Response('{"ok":true}', { status: 200 }),
      new URL('https://provider.example.test/data'),
      { headers: { Accept: 'application/json' } },
      { provider: 'example', displayName: 'Example' },
    );

    expect(result.response.status).toBe(200);
    expect(result.bodyText).toBe('{"ok":true}');
  });

  test('maps transport failures to retryable provider errors', async () => {
    await expect(
      fetchProviderResponse(
        async () => {
          throw new TypeError('fetch failed');
        },
        new URL('https://provider.example.test/data'),
        {},
        { provider: 'example', displayName: 'Example' },
      ),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'provider_unreachable',
      provider: 'example',
      retryable: true,
    });
  });

  test('aborts stalled requests and maps them to retryable timeout errors', async () => {
    const stalledFetch: FetchLike = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(init.signal?.reason),
          { once: true },
        );
      });

    await expect(
      fetchProviderResponse(
        stalledFetch,
        new URL('https://provider.example.test/data'),
        {},
        { provider: 'example', displayName: 'Example', timeoutMs: 5 },
      ),
    ).rejects.toMatchObject({
      statusCode: 504,
      code: 'provider_timeout',
      provider: 'example',
      retryable: true,
    });
  });

  test('propagates caller cancellation into an active provider request', async () => {
    const controller = new AbortController();
    const cancellation = new Error('route deadline reached');
    let providerSignal: AbortSignal | null = null;
    const stalledFetch: FetchLike = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        providerSignal = init?.signal ?? null;
        init?.signal?.addEventListener(
          'abort',
          () => reject(init.signal?.reason),
          { once: true },
        );
      });

    const request = fetchProviderResponse(
      stalledFetch,
      new URL('https://provider.example.test/data'),
      {},
      {
        provider: 'example',
        displayName: 'Example',
        signal: controller.signal,
      },
    );
    controller.abort(cancellation);

    await expect(request).rejects.toBe(cancellation);
    expect(providerSignal?.aborted).toBe(true);
  });
});
