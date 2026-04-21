import { getAirportCoords } from "@/data/airports";
import { createGreatCirclePoints } from "@/lib/geo";
import { getTurbulenceLabel } from "@/lib/turbulence";
import type { FlightData, TurbulenceReport } from "@/types/flight";

const demoRoutes = [
  { departure: "SFO", arrival: "JFK", airline: "United Airlines", aircraft: "Boeing 777-300ER", durationHours: 5.5 },
  { departure: "LAX", arrival: "SEA", airline: "Alaska Airlines", aircraft: "Boeing 737 MAX 9", durationHours: 2.8 },
  { departure: "ORD", arrival: "DEN", airline: "American Airlines", aircraft: "Airbus A321neo", durationHours: 2.4 },
  { departure: "ATL", arrival: "MIA", airline: "Delta Air Lines", aircraft: "Airbus A320", durationHours: 1.9 },
  { departure: "LHR", arrival: "FRA", airline: "Lufthansa", aircraft: "Airbus A321", durationHours: 1.7 },
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (value: string) =>
  value.split("").reduce((total, character, index) => total + character.charCodeAt(0) * (index + 1), 0);

export const createMockFlightData = (rawFlightNumber: string): FlightData => {
  const flightNumber = rawFlightNumber.trim().toUpperCase() || "SK100";
  const seed = hashString(flightNumber);
  const route = demoRoutes[seed % demoRoutes.length];
  const departureCoords = getAirportCoords(route.departure);
  const arrivalCoords = getAirportCoords(route.arrival);

  if (!departureCoords || !arrivalCoords) {
    throw new Error("Mock route configuration is invalid. Airport coordinates are missing.");
  }

  const departureTime = new Date(Date.now() + 45 * 60 * 1000);
  const arrivalTime = new Date(departureTime.getTime() + route.durationHours * 60 * 60 * 1000);

  return {
    flightNumber,
    airline: route.airline,
    departure: route.departure,
    departureAirport: route.departure,
    arrival: route.arrival,
    arrivalAirport: route.arrival,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    aircraft: route.aircraft,
    status: "scheduled",
    latitude: Number(((departureCoords.lat + arrivalCoords.lat) / 2).toFixed(4)),
    longitude: Number(((departureCoords.lon + arrivalCoords.lon) / 2).toFixed(4)),
    altitude: 35000,
    velocity: 820,
    isMockData: true,
    error: "Mock mode is active. Supabase auth, Stripe checkout, and Edge Functions are bypassed locally.",
  };
};

export const createMockTurbulenceReport = (flightData: FlightData): TurbulenceReport => {
  const departureCoords = getAirportCoords(flightData.departure);
  const arrivalCoords = getAirportCoords(flightData.arrival);

  if (!departureCoords || !arrivalCoords) {
    throw new Error(`Missing airport coordinates for ${flightData.departure} -> ${flightData.arrival}`);
  }

  const seed = hashString(flightData.flightNumber);
  const points = createGreatCirclePoints(departureCoords, arrivalCoords, 15);

  const waypoints = points.map((point, index) => {
    const windBase = 42 + ((seed + index * 7) % 26);
    const gustBoost = 8 + ((seed + index * 11) % 18);
    const score = clamp(
      0.18 +
        Math.abs(Math.sin((seed % 11) * 0.23 + index * 0.52)) * 0.42 +
        ((index + seed) % 5 === 0 ? 0.12 : 0),
      0.08,
      0.86,
    );
    const windShear = clamp(Math.abs(Math.cos(index * 0.45 + seed)) * 0.9, 0.12, 1.2);
    const temperature = 8 + ((seed + index * 9) % 21);
    const cloudCover = 35 + ((seed + index * 13) % 60);
    const cape = score > 0.45 ? 250 + ((seed + index * 31) % 1200) : 0;
    const label = getTurbulenceLabel(score);

    return {
      waypoint: index,
      latitude: Number(point.lat.toFixed(4)),
      longitude: Number(point.lon.toFixed(4)),
      turbulenceScore: Number(score.toFixed(3)),
      label,
      windSpeed: windBase,
      windGusts: windBase + gustBoost,
      windShear: Number(windShear.toFixed(2)),
      temperature,
      cloudCover,
      cape,
      edr: Number(clamp(score * 0.7, 0.06, 0.65).toFixed(2)),
    };
  });

  const overallScore = Math.max(...waypoints.map((waypoint) => waypoint.turbulenceScore));
  const averageScore =
    waypoints.reduce((total, waypoint) => total + waypoint.turbulenceScore, 0) / waypoints.length;

  return {
    overallScore: Number(overallScore.toFixed(3)),
    averageScore: Number(averageScore.toFixed(3)),
    overallLabel: getTurbulenceLabel(overallScore),
    waypoints,
    totalWaypoints: waypoints.length,
  };
};
