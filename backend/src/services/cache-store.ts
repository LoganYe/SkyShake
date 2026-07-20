import {
  BoundedTtlCache,
  DEFAULT_MAX_CACHE_ENTRIES,
  type ExpiringCacheEntry,
} from './bounded-ttl-cache.js';

export interface CacheStore<TEntry extends ExpiringCacheEntry> {
  get(key: string, nowMs: number): Promise<TEntry | null>;
  set(key: string, entry: TEntry, ttlMs: number): Promise<void>;
}

export interface CacheStoreFactory {
  create<TEntry extends ExpiringCacheEntry>(namespace: string): CacheStore<TEntry>;
}

export class MemoryCacheStoreFactory implements CacheStoreFactory {
  constructor(
    private readonly maxEntries: number = DEFAULT_MAX_CACHE_ENTRIES,
  ) {}

  create<TEntry extends ExpiringCacheEntry>() {
    return new MemoryCacheStore<TEntry>(this.maxEntries);
  }
}

export interface RedisJsonClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    expiryMode: 'PX',
    ttlMs: number,
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export class RedisCacheStoreFactory implements CacheStoreFactory {
  constructor(
    private readonly redis: RedisJsonClient,
    private readonly prefix = 'skyshake:cache:v1:',
  ) {}

  create<TEntry extends ExpiringCacheEntry>(namespace: string) {
    return new RedisCacheStore<TEntry>(this.redis, `${this.prefix}${namespace}:`);
  }
}

class MemoryCacheStore<TEntry extends ExpiringCacheEntry>
  implements CacheStore<TEntry>
{
  constructor(maxEntries: number) {
    this.cache = new BoundedTtlCache<TEntry>(maxEntries);
  }

  private readonly cache: BoundedTtlCache<TEntry>;

  async get(key: string, nowMs: number) {
    return this.cache.get(key, nowMs);
  }

  async set(key: string, entry: TEntry) {
    this.cache.set(key, entry);
  }
}

class RedisCacheStore<TEntry extends ExpiringCacheEntry>
  implements CacheStore<TEntry>
{
  constructor(
    private readonly redis: RedisJsonClient,
    private readonly prefix: string,
  ) {}

  async get(key: string, nowMs: number) {
    const redisKey = this.prefix + key;
    const rawValue = await this.redis.get(redisKey);
    if (rawValue == null) {
      return null;
    }

    let value: unknown;
    try {
      value = JSON.parse(rawValue) as unknown;
    } catch {
      await this.redis.del(redisKey);
      return null;
    }

    if (!isExpiringCacheEntry(value) || value.expiresAtMs <= nowMs) {
      await this.redis.del(redisKey);
      return null;
    }

    return value as TEntry;
  }

  async set(key: string, entry: TEntry, ttlMs: number) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      return;
    }
    await this.redis.set(
      this.prefix + key,
      JSON.stringify(entry),
      'PX',
      Math.ceil(ttlMs),
    );
  }
}

function isExpiringCacheEntry(value: unknown): value is ExpiringCacheEntry {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const expiresAtMs = (value as { expiresAtMs?: unknown }).expiresAtMs;
  return typeof expiresAtMs === 'number' && Number.isFinite(expiresAtMs);
}
