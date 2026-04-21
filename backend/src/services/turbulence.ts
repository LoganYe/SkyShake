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
  upperWind80: number;
  upperWind120: number;
}

export interface WeatherProvider {
  fetchSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot>;
}

export async function analyzeRouteWithWeather(
  request: RouteAnalysisRequest,
  weatherProvider: WeatherProvider,
): Promise<RouteAnalysisResponsePayload> {
  const distance = distanceKm(request);
  const points = createGreatCirclePoints(request, segmentCount(distance));
  const departureTime = new Date(Date.now() + 45 * 60 * 1000);
  const arrivalTime = new Date(
    departureTime.getTime() +
      estimateDurationMinutes(distance, request.aircraftType) * 60 * 1000,
  );

  const weatherSamples = await Promise.all(
    points.map((point) => weatherProvider.fetchSnapshot(point.latitude, point.longitude)),
  );

  const waypoints: TurbulenceWaypointPayload[] = points.map((point, index) => {
    const weather = weatherSamples[index];
    const score = scoreTurbulence(weather, request.aircraftType, index);
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
      cape: estimateCape(weather),
      edr: clamp(score * 0.72, 0.05, 0.7),
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
    altitude: cruiseAltitudeFor(request.aircraftType),
    velocity: cruiseSpeedFor(request.aircraftType),
    isMockData: false,
    error: null,
  };

  return {
    notice:
      'Server-side route estimate using live public weather data. Flight schedule ' +
      'validation is separate from this endpoint and is not inferred here.',
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
  waypointIndex: number,
) {
  const gustFactor = normalize(weather.windGusts - weather.windSpeed, 0, 40);
  const shearFactor = normalize(weather.windShear, 0, 30);
  const upperWindFactor = normalize(weather.upperWind120, 30, 140);
  const cloudFactor = normalize(weather.cloudCover, 15, 100);
  const convectiveFactor = normalize(estimateCape(weather), 0, 1800);
  const variabilityFactor =
    Math.sin(waypointIndex * 0.7 + weather.temperature * 0.09) * 0.08;
  const aircraftFactor = aircraftSensitivity(aircraftType);

  return clamp(
    0.1 +
      gustFactor * 0.22 +
      shearFactor * 0.24 +
      upperWindFactor * 0.18 +
      cloudFactor * 0.1 +
      convectiveFactor * 0.08 +
      Math.abs(variabilityFactor) +
      aircraftFactor,
    0.06,
    0.92,
  );
}

export function estimateCape(weather: WeatherSnapshot) {
  const convectiveIndex =
    Math.max(0, weather.temperature - 2) * 12 +
    Math.max(0, weather.cloudCover - 45) * 6 +
    Math.max(0, weather.windGusts - 45) * 10;
  return clamp(convectiveIndex, 0, 2200);
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
