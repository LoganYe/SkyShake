import type { FlightDataProvider } from '../clients/flight-lookup-provider.js';
import type {
  FlightDataPayload,
  FlightLookupMetadataPayload,
  FlightLookupResponsePayload,
} from '../contracts.js';

const DEFAULT_SUCCESS_TTL_MS = 60_000;
const DEFAULT_NOT_FOUND_TTL_MS = 30_000;

interface CacheEntry {
  flightNumber: string;
  flightDate: string | null;
  flightTime: string | null;
  flight: FlightDataPayload | null;
  notFound: boolean;
  partial: boolean;
  missingFields: string[];
  cachedAtMs: number;
  expiresAtMs: number;
}

interface FlightLookupServiceOptions {
  now?: () => number;
  successTtlMs?: number;
  notFoundTtlMs?: number;
}

export class FlightLookupService {
  constructor(
    private readonly providerName: string,
    private readonly provider: FlightDataProvider,
    options: FlightLookupServiceOptions = {},
  ) {
    this._now = options.now ?? Date.now;
    this.successTtlMs = options.successTtlMs ?? DEFAULT_SUCCESS_TTL_MS;
    this.notFoundTtlMs = options.notFoundTtlMs ?? DEFAULT_NOT_FOUND_TTL_MS;
  }

  private readonly _now: () => number;
  private readonly successTtlMs: number;
  private readonly notFoundTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<FlightLookupResponsePayload>>();

  async lookupFlight(
    flightNumber: string,
    flightDate?: string,
    flightTime?: string,
  ): Promise<FlightLookupResponsePayload> {
    const normalizedFlightNumber = normalizeLookupValue(flightNumber);
    const normalizedFlightDate = normalizeFlightDate(flightDate);
    const normalizedFlightTime = normalizeFlightTime(flightTime);
    const cacheKey = buildCacheKey(
      normalizedFlightNumber,
      normalizedFlightDate,
      normalizedFlightTime,
    );
    const cachedEntry = this.readCache(cacheKey);

    if (cachedEntry) {
      return buildResponse(cachedEntry, this.providerName, 'cache');
    }

    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight) {
      return cloneResponse(await inFlight);
    }

    const request = this.lookupAndCache(
      cacheKey,
      normalizedFlightNumber,
      normalizedFlightDate,
      normalizedFlightTime,
    );
    this.inFlight.set(cacheKey, request);

    try {
      return cloneResponse(await request);
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async lookupAndCache(
    cacheKey: string,
    flightNumber: string,
    flightDate: string | null,
    flightTime: string | null,
  ) {
    const flight = await this.provider.lookupFlight(
      flightNumber,
      flightDate ?? undefined,
      flightTime ?? undefined,
    );
    const missingFields = flight ? detectMissingFields(flight) : [];
    const now = this._now();
    const ttlMs = flight ? this.successTtlMs : this.notFoundTtlMs;
    const entry: CacheEntry = {
      flightNumber,
      flightDate,
      flightTime,
      flight,
      notFound: flight == null,
      partial: missingFields.length > 0,
      missingFields,
      cachedAtMs: now,
      expiresAtMs: now + ttlMs,
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

function buildCacheKey(
  flightNumber: string,
  flightDate: string | null,
  flightTime: string | null,
) {
  return `${flightNumber}::${flightDate ?? 'none'}::${flightTime ?? 'any'}`;
}

function normalizeLookupValue(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

function normalizeFlightDate(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeFlightTime(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function detectMissingFields(flight: FlightDataPayload) {
  const missingFields: string[] = [];

  if (isUnavailableText(flight.airline, 'Unknown airline')) {
    missingFields.push('airline');
  }

  if (isUnavailableText(flight.departure, 'N/A')) {
    missingFields.push('departureCode');
  }

  if (flight.departureAirport == null) {
    missingFields.push('departureAirport');
  }

  if (isUnavailableText(flight.arrival, 'N/A')) {
    missingFields.push('arrivalCode');
  }

  if (flight.arrivalAirport == null) {
    missingFields.push('arrivalAirport');
  }

  if (flight.departureTime == null) {
    missingFields.push('departureTime');
  }

  if (flight.arrivalTime == null) {
    missingFields.push('arrivalTime');
  }

  if (isUnavailableText(flight.aircraft, 'Unknown aircraft')) {
    missingFields.push('aircraft');
  }

  if (isUnavailableText(flight.status, 'Unknown')) {
    missingFields.push('status');
  }

  if (flight.latitude == null || flight.longitude == null) {
    missingFields.push('location');
  }

  return missingFields;
}

function isUnavailableText(value: string, placeholder: string) {
  return (
    value.trim().length === 0 ||
    value.trim().toLowerCase() === placeholder.toLowerCase()
  );
}

function buildResponse(
  entry: CacheEntry,
  providerName: string,
  source: FlightLookupMetadataPayload['source'],
): FlightLookupResponsePayload {
  return {
    flightNumber: entry.flightNumber,
    flightDate: entry.flightDate,
    flightTime: entry.flightTime,
    flight: entry.flight ? { ...entry.flight } : null,
    notFound: entry.notFound,
    meta: {
      provider: providerName,
      source,
      partial: entry.partial,
      missingFields: [...entry.missingFields],
      cachedAt: new Date(entry.cachedAtMs).toISOString(),
      expiresAt: new Date(entry.expiresAtMs).toISOString(),
    },
  };
}

function cloneResponse(
  response: FlightLookupResponsePayload,
): FlightLookupResponsePayload {
  return {
    flightNumber: response.flightNumber,
    flightDate: response.flightDate,
    flightTime: response.flightTime,
    flight: response.flight ? { ...response.flight } : null,
    notFound: response.notFound,
    meta: {
      provider: response.meta.provider,
      source: response.meta.source,
      partial: response.meta.partial,
      missingFields: [...response.meta.missingFields],
      cachedAt: response.meta.cachedAt,
      expiresAt: response.meta.expiresAt,
    },
  };
}
