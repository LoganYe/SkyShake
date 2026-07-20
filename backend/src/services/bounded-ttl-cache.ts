export interface ExpiringCacheEntry {
  expiresAtMs: number;
}

export const DEFAULT_MAX_CACHE_ENTRIES = 1_000;

export class BoundedTtlCache<TEntry extends ExpiringCacheEntry> {
  constructor(
    private readonly maxEntries: number = DEFAULT_MAX_CACHE_ENTRIES,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError('maxEntries must be a positive integer.');
    }
  }

  private readonly entries = new Map<string, TEntry>();

  get(key: string, nowMs: number) {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAtMs <= nowMs) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, entry: TEntry) {
    this.entries.delete(key);
    this.entries.set(key, entry);

    while (this.entries.size > this.maxEntries) {
      const leastRecentlyUsedKey = this.entries.keys().next().value;
      if (leastRecentlyUsedKey == null) {
        return;
      }
      this.entries.delete(leastRecentlyUsedKey);
    }
  }
}
