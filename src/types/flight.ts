export type AppMode = "live" | "mock";

export type TurbulenceLabel = "Smooth" | "Moderate" | "Severe";

export type TurbulenceSeverity = "low" | "moderate" | "high";

export interface AirportCoordinates {
  lat: number;
  lon: number;
}

export interface FlightData {
  flightNumber: string;
  airline: string;
  departure: string;
  departureAirport?: string;
  arrival: string;
  arrivalAirport?: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  altitude?: number | null;
  velocity?: number | null;
  isMockData: boolean;
  error?: string;
}

export interface TurbulenceWaypoint {
  waypoint: number;
  latitude: number;
  longitude: number;
  turbulenceScore: number;
  label: TurbulenceLabel;
  windSpeed: number;
  windGusts: number;
  windShear: number;
  temperature: number;
  cloudCover: number;
  cape: number;
  edr: number;
}

export interface TurbulenceReport {
  overallScore: number;
  averageScore: number;
  overallLabel: TurbulenceLabel;
  waypoints: TurbulenceWaypoint[];
  totalWaypoints: number;
}

export interface SubscriptionStatus {
  subscribed: boolean;
  free_quota_remaining: number;
  subscription_status: string;
  subscription_end?: string | null;
}
