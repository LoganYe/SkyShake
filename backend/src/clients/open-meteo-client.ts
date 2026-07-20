import { RateLimitError, UpstreamServiceError } from '../errors.js';
import {
  DEFAULT_MAX_CACHE_ENTRIES,
} from '../services/bounded-ttl-cache.js';
import {
  MemoryCacheStoreFactory,
  type CacheStore,
  type CacheStoreFactory,
} from '../services/cache-store.js';
import type {
  WeatherProvider,
  WeatherRequestOptions,
  WeatherSnapshot,
} from '../services/turbulence.js';
import {
  fetchProviderResponse,
  type FetchLike,
} from './provider-request.js';

interface CacheEntry {
  snapshot: WeatherSnapshot;
  expiresAtMs: number;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

interface OpenMeteoClientOptions {
  now?: () => number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  cacheStoreFactory?: CacheStoreFactory;
}

export class OpenMeteoClient implements WeatherProvider {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    options: OpenMeteoClientOptions = {},
  ) {
    this._now = options.now ?? Date.now;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    const cacheStoreFactory =
      options.cacheStoreFactory ??
      new MemoryCacheStoreFactory(
        options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES,
      );
    this.cache = cacheStoreFactory.create<CacheEntry>('open-meteo');
  }

  private readonly _now: () => number;
  private readonly cacheTtlMs: number;
  private readonly cache: CacheStore<CacheEntry>;
  private readonly inFlight = new Map<string, Promise<WeatherSnapshot>>();

  async fetchSnapshot(
    latitude: number,
    longitude: number,
    options: WeatherRequestOptions = {},
  ): Promise<WeatherSnapshot> {
    const forecastTime = options.forecastTime ?? new Date(this._now());
    const cruiseAltitudeFeet = options.cruiseAltitudeFeet ?? 36_000;
    const cacheKey = buildCacheKey(
      latitude,
      longitude,
      forecastTime,
      cruiseAltitudeFeet,
    );
    const cached = await this.cache.get(cacheKey, this._now());
    if (cached) {
      return { ...cached.snapshot };
    }

    if (options.signal != null) {
      return this.fetchFreshSnapshot(
        latitude,
        longitude,
        cacheKey,
        forecastTime,
        cruiseAltitudeFeet,
        options.signal,
      );
    }

    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight) {
      return { ...(await inFlight) };
    }

    const request = this.fetchFreshSnapshot(
      latitude,
      longitude,
      cacheKey,
      forecastTime,
      cruiseAltitudeFeet,
    );
    this.inFlight.set(cacheKey, request);

    try {
      return { ...(await request) };
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async fetchFreshSnapshot(
    latitude: number,
    longitude: number,
    cacheKey: string,
    forecastTime: Date,
    cruiseAltitudeFeet: number,
    signal?: AbortSignal,
  ): Promise<WeatherSnapshot> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toFixed(4));
    url.searchParams.set('longitude', longitude.toFixed(4));
    url.searchParams.set(
      'hourly',
      [
        'temperature_2m',
        'wind_speed_10m',
        'wind_gusts_10m',
        'cloud_cover',
        'cape',
        'wind_speed_300hPa',
        'wind_direction_300hPa',
        'wind_speed_250hPa',
        'wind_direction_250hPa',
        'wind_speed_200hPa',
        'wind_direction_200hPa',
      ].join(','),
    );
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('timezone', 'UTC');

    const { response, bodyText } = await fetchProviderResponse(
      this.fetchImpl,
      url,
      { headers: { Accept: 'application/json' } },
      { provider: 'open-meteo', displayName: 'Open-Meteo', signal },
    );

    if (response.status === 429) {
      throw new RateLimitError(
        'Live weather data is temporarily rate limited.',
        {
          provider: 'open-meteo',
          retryAfterSeconds: parseRetryAfterSeconds(
            response.headers.get('retry-after'),
          ),
        },
      );
    }

    if (!response.ok) {
      throw new UpstreamServiceError(
        `Live weather data request failed with HTTP ${response.status}.`,
        {
          code: 'provider_request_failed',
          provider: 'open-meteo',
        },
      );
    }

    const payload = parseJsonPayload(bodyText);
    const hourly = isRecord(payload.hourly) ? payload.hourly : {};
    const forecastIndex = nearestForecastIndex(hourly.time, forecastTime);
    const windSpeed = numericAt(hourly.wind_speed_10m, forecastIndex);
    const windGusts = numericAt(hourly.wind_gusts_10m, forecastIndex);
    const temperature = numericAt(hourly.temperature_2m, forecastIndex);
    const cloudCover = numericAt(hourly.cloud_cover, forecastIndex);
    const cape = numericAt(hourly.cape, forecastIndex);
    const pressureBand = pressureBandFor(cruiseAltitudeFeet);
    const lowerWindSpeed = numericAt(
      hourly[`wind_speed_${pressureBand.lower}hPa`],
      forecastIndex,
    );
    const lowerWindDirection = numericAt(
      hourly[`wind_direction_${pressureBand.lower}hPa`],
      forecastIndex,
    );
    const upperWindSpeed = numericAt(
      hourly[`wind_speed_${pressureBand.upper}hPa`],
      forecastIndex,
    );
    const upperWindDirection = numericAt(
      hourly[`wind_direction_${pressureBand.upper}hPa`],
      forecastIndex,
    );

    if (
      windSpeed == null ||
      windGusts == null ||
      temperature == null ||
      cloudCover == null ||
      cape == null ||
      lowerWindSpeed == null ||
      lowerWindDirection == null ||
      upperWindSpeed == null ||
      upperWindDirection == null
    ) {
      throw new UpstreamServiceError(
        'Live weather data returned incomplete fields.',
        {
          code: 'provider_payload_invalid',
          provider: 'open-meteo',
        },
      );
    }

    const snapshot = {
      windSpeed,
      windGusts,
      windShear: vectorDifference(
        lowerWindSpeed,
        lowerWindDirection,
        upperWindSpeed,
        upperWindDirection,
      ),
      temperature,
      cloudCover,
      cape,
      cruiseWindSpeed: (lowerWindSpeed + upperWindSpeed) / 2,
    };

    await this.cache.set(
      cacheKey,
      {
        snapshot,
        expiresAtMs: this._now() + this.cacheTtlMs,
      },
      this.cacheTtlMs,
    );

    return snapshot;
  }
}

function parseJsonPayload(rawText: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(rawText) as unknown;
  } catch {
    throw new UpstreamServiceError(
      'Live weather data returned invalid JSON.',
      {
        code: 'provider_payload_invalid',
        provider: 'open-meteo',
      },
    );
  }

  if (!isRecord(payload)) {
    throw new UpstreamServiceError(
      'Live weather data returned an invalid response.',
      {
        code: 'provider_payload_invalid',
        provider: 'open-meteo',
      },
    );
  }

  return payload;
}

function buildCacheKey(
  latitude: number,
  longitude: number,
  forecastTime: Date,
  cruiseAltitudeFeet: number,
) {
  const roundedHour = new Date(
    Math.round(forecastTime.getTime() / (60 * 60 * 1000)) * 60 * 60 * 1000,
  ).toISOString();
  const band = pressureBandFor(cruiseAltitudeFeet);
  return `${latitude.toFixed(4)},${longitude.toFixed(4)},${roundedHour},${band.lower}-${band.upper}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numericAt(value: unknown, index: number | null) {
  if (index == null || !Array.isArray(value)) {
    return null;
  }
  return toNumber(value[index]);
}

function nearestForecastIndex(value: unknown, forecastTime: Date) {
  if (!Array.isArray(value) || !Number.isFinite(forecastTime.getTime())) {
    return null;
  }

  let nearestIndex: number | null = null;
  let nearestDeltaMs = Number.POSITIVE_INFINITY;
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string') {
      continue;
    }
    const timestamp = Date.parse(entry.endsWith('Z') ? entry : `${entry}Z`);
    const deltaMs = Math.abs(timestamp - forecastTime.getTime());
    if (Number.isFinite(timestamp) && deltaMs < nearestDeltaMs) {
      nearestIndex = index;
      nearestDeltaMs = deltaMs;
    }
  }

  return nearestDeltaMs <= 90 * 60 * 1000 ? nearestIndex : null;
}

function pressureBandFor(cruiseAltitudeFeet: number) {
  return cruiseAltitudeFeet <= 35_000
    ? { lower: 300, upper: 250 }
    : { lower: 250, upper: 200 };
}

function vectorDifference(
  firstSpeed: number,
  firstDirectionDegrees: number,
  secondSpeed: number,
  secondDirectionDegrees: number,
) {
  const firstRadians = (firstDirectionDegrees * Math.PI) / 180;
  const secondRadians = (secondDirectionDegrees * Math.PI) / 180;
  const deltaX =
    secondSpeed * Math.sin(secondRadians) -
    firstSpeed * Math.sin(firstRadians);
  const deltaY =
    secondSpeed * Math.cos(secondRadians) -
    firstSpeed * Math.cos(firstRadians);
  return Math.hypot(deltaX, deltaY);
}

function parseRetryAfterSeconds(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedSeconds = Number(value);
  if (Number.isFinite(parsedSeconds) && parsedSeconds >= 0) {
    return Math.ceil(parsedSeconds);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const deltaMs = parsedDate.getTime() - Date.now();
  if (deltaMs <= 0) {
    return null;
  }

  return Math.ceil(deltaMs / 1000);
}
