import { RateLimitError, UpstreamServiceError } from '../errors.js';
import type { WeatherProvider, WeatherSnapshot } from '../services/turbulence.js';

interface FetchLike {
  (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
}

interface CacheEntry {
  snapshot: WeatherSnapshot;
  expiresAtMs: number;
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class OpenMeteoClient implements WeatherProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<WeatherSnapshot>>();

  async fetchSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
    const cacheKey = buildCacheKey(latitude, longitude);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now()) {
      return { ...cached.snapshot };
    }

    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight) {
      return { ...(await inFlight) };
    }

    const request = this.fetchFreshSnapshot(latitude, longitude, cacheKey);
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
  ): Promise<WeatherSnapshot> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toFixed(4));
    url.searchParams.set('longitude', longitude.toFixed(4));
    url.searchParams.set(
      'current',
      'temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover',
    );
    url.searchParams.set('hourly', 'wind_speed_80m,wind_speed_120m');
    url.searchParams.set('forecast_days', '1');
    url.searchParams.set('timezone', 'UTC');

    const response = await this.fetchImpl(url, {
      headers: { Accept: 'application/json' },
    });

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

    const payload = await response.json();
    const current = isRecord(payload.current) ? payload.current : {};
    const hourly = isRecord(payload.hourly) ? payload.hourly : {};

    const windSpeed = toNumber(current.wind_speed_10m);
    const windGusts = toNumber(current.wind_gusts_10m);
    const temperature = toNumber(current.temperature_2m);
    const cloudCover = toNumber(current.cloud_cover);
    const upperWind80 = firstNumeric(hourly.wind_speed_80m);
    const upperWind120 = firstNumeric(hourly.wind_speed_120m);

    if (
      windSpeed == null ||
      windGusts == null ||
      temperature == null ||
      cloudCover == null ||
      upperWind80 == null ||
      upperWind120 == null
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
      windShear: Math.abs(upperWind120 - upperWind80),
      temperature,
      cloudCover,
      upperWind80,
      upperWind120,
    };

    this.cache.set(cacheKey, {
      snapshot,
      expiresAtMs: Date.now() + DEFAULT_CACHE_TTL_MS,
    });

    return snapshot;
  }
}

function buildCacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
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

function firstNumeric(value: unknown) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = toNumber(entry);
      if (parsed != null) {
        return parsed;
      }
    }
    return null;
  }
  return toNumber(value);
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
