import { describe, expect, test } from 'vitest';

import { BoundedTtlCache } from '../src/services/bounded-ttl-cache.js';

describe('BoundedTtlCache', () => {
  test('evicts the least recently used entry when it reaches capacity', () => {
    const cache = new BoundedTtlCache<{ value: string; expiresAtMs: number }>(2);
    cache.set('first', { value: 'first', expiresAtMs: 100 });
    cache.set('second', { value: 'second', expiresAtMs: 100 });

    expect(cache.get('first', 0)?.value).toBe('first');
    cache.set('third', { value: 'third', expiresAtMs: 100 });

    expect(cache.get('second', 0)).toBeNull();
    expect(cache.get('first', 0)?.value).toBe('first');
    expect(cache.get('third', 0)?.value).toBe('third');
  });

  test('deletes expired entries on access', () => {
    const cache = new BoundedTtlCache<{ value: string; expiresAtMs: number }>();
    cache.set('expired', { value: 'expired', expiresAtMs: 10 });

    expect(cache.get('expired', 10)).toBeNull();
    expect(cache.get('expired', 0)).toBeNull();
  });

  test('rejects invalid capacities', () => {
    expect(() => new BoundedTtlCache(0)).toThrow(/positive integer/i);
  });
});
