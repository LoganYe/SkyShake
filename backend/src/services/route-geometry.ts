import type { RouteAnalysisRequest } from '../contracts.js';

const EARTH_RADIUS_KM = 6371;

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export function distanceKm(request: RouteAnalysisRequest): number {
  const { departure, arrival } = request;
  const deltaLat = toRadians(arrival.latitude - departure.latitude);
  const deltaLon = toRadians(arrival.longitude - departure.longitude);
  const a =
    Math.pow(Math.sin(deltaLat / 2), 2) +
    Math.cos(toRadians(departure.latitude)) *
      Math.cos(toRadians(arrival.latitude)) *
      Math.pow(Math.sin(deltaLon / 2), 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function segmentCount(distance: number): number {
  if (distance > 9000) {
    return 12;
  }
  if (distance > 5000) {
    return 10;
  }
  if (distance > 2000) {
    return 8;
  }
  return 6;
}

export function createGreatCirclePoints(
  request: RouteAnalysisRequest,
  segments: number,
): RoutePoint[] {
  const lat1Rad = toRadians(request.departure.latitude);
  const lon1Rad = toRadians(request.departure.longitude);
  const lat2Rad = toRadians(request.arrival.latitude);
  const lon2Rad = toRadians(request.arrival.longitude);

  const angularDistance =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1Rad - lat2Rad) / 2), 2) +
          Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *
            Math.pow(Math.sin((lon1Rad - lon2Rad) / 2), 2),
      ),
    );

  if (!Number.isFinite(angularDistance) || angularDistance === 0) {
    return [
      {
        latitude: request.departure.latitude,
        longitude: request.departure.longitude,
      },
      {
        latitude: request.arrival.latitude,
        longitude: request.arrival.longitude,
      },
    ];
  }

  return Array.from({ length: segments + 1 }, (_, index) => {
    const fraction = index / segments;
    const a =
      Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
    const b = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);

    const x =
      a * Math.cos(lat1Rad) * Math.cos(lon1Rad) +
      b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y =
      a * Math.cos(lat1Rad) * Math.sin(lon1Rad) +
      b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

    return {
      latitude: toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
      longitude: toDegrees(Math.atan2(y, x)),
    };
  });
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}
