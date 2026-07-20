import type {
  FlightDataPayload,
  RouteAnalysisRequest,
  RouteAnalysisResponsePayload,
  TurbulenceWaypointPayload,
} from '../contracts.js';
import { createGreatCirclePoints, distanceKm, segmentCount } from './route-geometry.js';

export interface WeatherSnapshot {
  windSpeed: number;
  windGusts: number;
  windShear: number;
  temperature: number;
  cloudCover: number;
  cape: number;
  cruiseWindSpeed: number;
}

export interface WeatherProvider {
  fetchSnapshot(
    latitude: number,
    longitude: number,
    options?: WeatherRequestOptions,
  ): Promise<WeatherSnapshot>;
}

export interface WeatherRequestOptions {
  signal?: AbortSignal;
  forecastTime?: Date;
  cruiseAltitudeFeet?: number;
}

interface RouteAnalysisOptions {
  signal?: AbortSignal;
}

export async function analyzeRouteWithWeather(
  request: RouteAnalysisRequest,
  weatherProvider: WeatherProvider,
  options: RouteAnalysisOptions = {},
): Promise<RouteAnalysisResponsePayload> {
  const distance = distanceKm(request);
  const points = createGreatCirclePoints(request, segmentCount(distance));
  const departureTime = new Date(Date.now() + 45 * 60 * 1000);
  const arrivalTime = new Date(
    departureTime.getTime() +
      estimateDurationMinutes(distance, request.aircraftType) * 60 * 1000,
  );
  const cruiseAltitudeFeet = cruiseAltitudeFor(request.aircraftType);

  const weatherSamples = await mapWithConcurrency(
    points,
    3,
    (point, index) =>
      weatherProvider.fetchSnapshot(point.latitude, point.longitude, {
        signal: options.signal,
        forecastTime: interpolateDate(
          departureTime,
          arrivalTime,
          points.length <= 1 ? 0 : index / (points.length - 1),
        ),
        cruiseAltitudeFeet,
      }),
    options.signal,
  );

  const waypoints: TurbulenceWaypointPayload[] = points.map((point, index) => {
    const weather = weatherSamples[index];
    const score = scoreTurbulence(weather, request.aircraftType);
    return {
      waypoint: index,
      latitude: point.latitude,
      longitude: point.longitude,
      turbulenceScore: score,
      label: labelFromScore(score),
      windSpeed: weather.windSpeed,
      windGusts: weather.windGusts,
      windShear: weather.windShear,
      temperature: weather.temperature,
      cloudCover: weather.cloudCover,
      cape: weather.cape,
    };
  });

  const overallScore = waypoints.reduce(
    (max, waypoint) => Math.max(max, waypoint.turbulenceScore),
    0,
  );
  const averageScore =
    waypoints.reduce((sum, waypoint) => sum + waypoint.turbulenceScore, 0) /
    waypoints.length;

  const flightData: FlightDataPayload = {
    flightNumber: `${request.departure.code}-${request.arrival.code}`,
    airline: 'SkyShake live weather route analysis',
    departure: request.departure.code,
    departureAirport: request.departure.name,
    arrival: request.arrival.code,
    arrivalAirport: request.arrival.name,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    aircraft: request.aircraftType,
    status: 'live weather estimate',
    latitude: (request.departure.latitude + request.arrival.latitude) / 2,
    longitude: (request.departure.longitude + request.arrival.longitude) / 2,
    altitude: cruiseAltitudeFeet,
    velocity: cruiseSpeedFor(request.aircraftType),
    isMockData: false,
    error: null,
  };

  return {
    notice:
      'Experimental turbulence-risk screening from time-aligned public surface, ' +
      'convective, and cruise-level wind forecasts. This is not EDR, a ' +
      'flight-specific forecast, or operational aviation guidance.',
    model: {
      name: 'weather-proxy',
      version: 2,
      operationalUse: false,
    },
    flightData,
    report: {
      overallScore,
      averageScore,
      overallLabel: labelFromScore(overallScore),
      waypoints,
      totalWaypoints: waypoints.length,
    },
  };
}

export function scoreTurbulence(
  weather: WeatherSnapshot,
  aircraftType: string,
) {
  const gustFactor = normalize(weather.windGusts - weather.windSpeed, 0, 40);
  const shearFactor = normalize(weather.windShear, 0, 80);
  const cruiseWindFactor = normalize(weather.cruiseWindSpeed, 50, 250);
  const cloudFactor = normalize(weather.cloudCover, 15, 100);
  const convectiveFactor = normalize(weather.cape, 0, 1800);
  const aircraftFactor = aircraftSensitivity(aircraftType);

  return clamp(
    0.08 +
      gustFactor * 0.18 +
      shearFactor * 0.27 +
      cruiseWindFactor * 0.15 +
      cloudFactor * 0.05 +
      convectiveFactor * 0.18 +
      aircraftFactor,
    0.06,
    0.92,
  );
}

function aircraftSensitivity(aircraftType: string) {
  const normalized = aircraftType.toLowerCase();
  if (
    normalized.includes('787') ||
    normalized.includes('a350') ||
    normalized.includes('777')
  ) {
    return 0.01;
  }
  if (
    normalized.includes('a321') ||
    normalized.includes('737') ||
    normalized.includes('320')
  ) {
    return 0.05;
  }
  if (
    normalized.includes('e175') ||
    normalized.includes('e190') ||
    normalized.includes('regional')
  ) {
    return 0.09;
  }
  return 0.04;
}

function estimateDurationMinutes(distance: number, aircraftType: string) {
  const cruiseSpeed = cruiseSpeedFor(aircraftType);
  return Math.max(45, Math.round((distance / cruiseSpeed) * 60) + 35);
}

function cruiseSpeedFor(aircraftType: string) {
  const normalized = aircraftType.toLowerCase();
  if (
    normalized.includes('787') ||
    normalized.includes('777') ||
    normalized.includes('a350')
  ) {
    return 905;
  }
  if (normalized.includes('330') || normalized.includes('767')) {
    return 870;
  }
  if (
    normalized.includes('737') ||
    normalized.includes('320') ||
    normalized.includes('321')
  ) {
    return 820;
  }
  return 790;
}

function cruiseAltitudeFor(aircraftType: string) {
  const normalized = aircraftType.toLowerCase();
  if (
    normalized.includes('787') ||
    normalized.includes('777') ||
    normalized.includes('a350')
  ) {
    return 39000;
  }
  if (
    normalized.includes('737') ||
    normalized.includes('320') ||
    normalized.includes('321')
  ) {
    return 36000;
  }
  return 34000;
}

function labelFromScore(score: number): 'Smooth' | 'Moderate' | 'Severe' {
  if (score < 0.3) {
    return 'Smooth';
  }
  if (score < 0.6) {
    return 'Moderate';
  }
  return 'Severe';
}

function normalize(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function interpolateDate(start: Date, end: Date, fraction: number) {
  return new Date(
    start.getTime() + (end.getTime() - start.getTime()) * fraction,
  );
}

async function mapWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
  signal?: AbortSignal,
) {
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (nextIndex < items.length) {
        if (signal?.aborted) {
          throw signal.reason;
        }

        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }),
  );

  return results;
}
