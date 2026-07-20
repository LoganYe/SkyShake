import { describe, expect, test } from 'vitest';

import {
  RedisCacheStoreFactory,
  type RedisJsonClient,
} from '../src/services/cache-store.js';

describe('RedisCacheStoreFactory', () => {
  test('shares namespaced JSON entries across store instances with a bounded TTL', async () => {
    const redis = new FakeRedis();
    const first = new RedisCacheStoreFactory(redis).create<TestEntry>('flight');
    const second = new RedisCacheStoreFactory(redis).create<TestEntry>('flight');
    const entry = { value: 'UA857', expiresAtMs: 20_000 };

    await first.set('lookup', entry, 5_000);

    expect(await second.get('lookup', 15_000)).toEqual(entry);
    expect(redis.lastSet).toMatchObject({
      key: 'skyshake:cache:v1:flight:lookup',
      expiryMode: 'PX',
      ttlMs: 5_000,
    });
  });

  test('deletes expired or malformed cache values instead of returning them', async () => {
    const redis = new FakeRedis();
    const cache = new RedisCacheStoreFactory(redis).create<TestEntry>('weather');
    redis.values.set(
      'skyshake:cache:v1:weather:expired',
      JSON.stringify({ value: 'old', expiresAtMs: 10 }),
    );
    redis.values.set('skyshake:cache:v1:weather:malformed', '{bad-json');

    expect(await cache.get('expired', 11)).toBeNull();
    expect(await cache.get('malformed', 0)).toBeNull();
    expect(redis.values.size).toBe(0);
  });
});

interface TestEntry {
  value: string;
  expiresAtMs: number;
}

class FakeRedis implements RedisJsonClient {
  readonly values = new Map<string, string>();
  lastSet: {
    key: string;
    expiryMode: 'PX';
    ttlMs: number;
  } | null = null;

  async get(key: string) {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, expiryMode: 'PX', ttlMs: number) {
    this.values.set(key, value);
    this.lastSet = { key, expiryMode, ttlMs };
  }

  async del(key: string) {
    this.values.delete(key);
  }
}
