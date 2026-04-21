import { z } from 'zod';

export const airportPointSchema = z.object({
  code: z.string().trim().min(3).max(4),
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const routeAnalysisRequestSchema = z.object({
  departure: airportPointSchema,
  arrival: airportPointSchema,
  aircraftType: z.string().trim().min(1),
});

export type RouteAnalysisRequest = z.infer<typeof routeAnalysisRequestSchema>;

export interface FlightDataPayload {
  flightNumber: string;
  airline: string;
  departure: string;
  departureAirport: string | null;
  arrival: string;
  arrivalAirport: string | null;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  velocity: number | null;
  isMockData: boolean;
  error: string | null;
}

export interface TurbulenceWaypointPayload {
  waypoint: number;
  latitude: number;
  longitude: number;
  turbulenceScore: number;
  label: 'Smooth' | 'Moderate' | 'Severe';
  windSpeed: number;
  windGusts: number;
  windShear: number;
  temperature: number;
  cloudCover: number;
  cape: number;
  edr: number;
}

export interface TurbulenceReportPayload {
  overallScore: number;
  averageScore: number;
  overallLabel: 'Smooth' | 'Moderate' | 'Severe';
  waypoints: TurbulenceWaypointPayload[];
  totalWaypoints: number;
}

export interface RouteAnalysisResponsePayload {
  notice: string;
  flightData: FlightDataPayload;
  report: TurbulenceReportPayload;
}

export const flightLookupQuerySchema = z.object({
  flightNumber: z.string().trim().min(2),
  flightDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type FlightLookupQuery = z.infer<typeof flightLookupQuerySchema>;
