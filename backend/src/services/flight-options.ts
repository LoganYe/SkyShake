import type { FlightDataProvider } from '../clients/flight-lookup-provider.js';
import type {
  FlightDataPayload,
  FlightOptionsMetadataPayload,
  FlightOptionsResponsePayload,
} from '../contracts.js';

const DEFAULT_OPTIONS_TTL_MS = 60_000;

interface CacheEntry {
  departureCode: string;
  arrivalCode: string;
  departureLocal: string;
  flights: FlightDataPayload[];
  cachedAtMs: number;
  expiresAtMs: number;
  timeWindowStart: string;
  timeWindowEnd: string;
}

interface FlightOptionsServiceOptions {
  now?: () => number;
  ttlMs?: number;
}

export class FlightOptionsService {
  constructor(
    private readonly providerName: string,
    private readonly provider: FlightDataProvider,
    options: FlightOptionsServiceOptions = {},
  ) {
    this._now = options.now ?? Date.now;
    this.ttlMs = options.ttlMs ?? DEFAULT_OPTIONS_TTL_MS;
  }

  private readonly _now: () => number;
  private readonly ttlMs: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<FlightOptionsResponsePayload>>();

  async searchFlights(
    departureCode: string,
    arrivalCode: string,
    departureLocal: string,
  ): Promise<FlightOptionsResponsePayload> {
    const normalizedDeparture = departureCode.trim().toUpperCase();
    const normalizedArrival = arrivalCode.trim().toUpperCase();
    const normalizedLocal = departureLocal.trim();
    const cacheKey = buildCacheKey(
      normalizedDeparture,
      normalizedArrival,
      normalizedLocal,
    );
    const cachedEntry = this.readCache(cacheKey);
    if (cachedEntry) {
      return buildResponse(cachedEntry, this.providerName, 'cache');
    }

    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight) {
      return cloneResponse(await inFlight);
    }

    const request = this.searchAndCache(
      cacheKey,
      normalizedDeparture,
      normalizedArrival,
      normalizedLocal,
    );
    this.inFlight.set(cacheKey, request);

    try {
      return cloneResponse(await request);
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async searchAndCache(
    cacheKey: string,
    departureCode: string,
    arrivalCode: string,
    departureLocal: string,
  ) {
    const flights = await this.provider.searchFlightsByRoute(
      departureCode,
      arrivalCode,
      departureLocal,
    );
    const { fromLocal, toLocal } = buildSearchWindow(departureLocal);
    const now = this._now();
    const entry: CacheEntry = {
      departureCode,
      arrivalCode,
      departureLocal,
      flights: flights.map((flight) => ({ ...flight })),
      cachedAtMs: now,
      expiresAtMs: now + this.ttlMs,
      timeWindowStart: fromLocal,
      timeWindowEnd: toLocal,
    };
    this.cache.set(cacheKey, entry);
    return buildResponse(entry, this.providerName, 'live');
  }

  private readCache(cacheKey: string) {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }
    if (cached.expiresAtMs <= this._now()) {
      this.cache.delete(cacheKey);
      return null;
    }
    return cached;
  }
}

export function buildSearchWindow(departureLocal: string) {
  const base = parseLocalDateTime(departureLocal);
  const from = new Date(base.getTime() - 3 * 60 * 60 * 1000);
  const to = new Date(base.getTime() + 3 * 60 * 60 * 1000);
  return {
    fromLocal: formatLocalDateTime(from),
    toLocal: formatLocalDateTime(to),
  };
}

function parseLocalDateTime(value: string) {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function formatLocalDateTime(value: Date) {
  const year = value.getFullYear().toString().padStart(4, '0');
  const month = (value.getMonth() + 1).toString().padStart(2, '0');
  const day = value.getDate().toString().padStart(2, '0');
  const hour = value.getHours().toString().padStart(2, '0');
  const minute = value.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function buildCacheKey(
  departureCode: string,
  arrivalCode: string,
  departureLocal: string,
) {
  return `${departureCode}::${arrivalCode}::${departureLocal}`;
}

function buildResponse(
  entry: CacheEntry,
  providerName: string,
  source: FlightOptionsMetadataPayload['source'],
): FlightOptionsResponsePayload {
  return {
    departureCode: entry.departureCode,
    arrivalCode: entry.arrivalCode,
    departureLocal: entry.departureLocal,
    flights: entry.flights.map((flight) => ({ ...flight })),
    notFound: entry.flights.length === 0,
    meta: {
      provider: providerName,
      source,
      cachedAt: new Date(entry.cachedAtMs).toISOString(),
      expiresAt: new Date(entry.expiresAtMs).toISOString(),
      timeWindowStart: entry.timeWindowStart,
      timeWindowEnd: entry.timeWindowEnd,
    },
  };
}

function cloneResponse(
  response: FlightOptionsResponsePayload,
): FlightOptionsResponsePayload {
  return {
    departureCode: response.departureCode,
    arrivalCode: response.arrivalCode,
    departureLocal: response.departureLocal,
    flights: response.flights.map((flight) => ({ ...flight })),
    notFound: response.notFound,
    meta: {
      provider: response.meta.provider,
      source: response.meta.source,
      cachedAt: response.meta.cachedAt,
      expiresAt: response.meta.expiresAt,
      timeWindowStart: response.meta.timeWindowStart,
      timeWindowEnd: response.meta.timeWindowEnd,
    },
  };
}
