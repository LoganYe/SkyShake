import { UpstreamServiceError } from '../errors.js';
import type { WeatherProvider, WeatherSnapshot } from '../services/turbulence.js';

interface FetchLike {
  (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
}

export class OpenMeteoClient implements WeatherProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async fetchSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
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

    if (!response.ok) {
      throw new UpstreamServiceError(
        `Open-Meteo request failed with HTTP ${response.status}.`,
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
        'Open-Meteo response was missing one or more required fields.',
      );
    }

    return {
      windSpeed,
      windGusts,
      windShear: Math.abs(upperWind120 - upperWind80),
      temperature,
      cloudCover,
      upperWind80,
      upperWind120,
    };
  }
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
