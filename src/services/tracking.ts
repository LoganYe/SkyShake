import { isMockMode } from "@/config/runtime";
import { getAirportCoords } from "@/data/airports";
import { supabase } from "@/integrations/supabase/client";
import { createMockFlightData, createMockTurbulenceReport } from "@/lib/mock-flight-data";
import type { FlightData, TurbulenceReport } from "@/types/flight";

const invokeFunction = async <TResponse>(functionName: string, body: unknown) => {
  const { data, error } = await supabase.functions.invoke<TResponse>(functionName, { body });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`${functionName} returned an empty response`);
  }

  return data;
};

export const fetchFlightData = async (flightNumber: string): Promise<FlightData> => {
  if (isMockMode) {
    return createMockFlightData(flightNumber);
  }

  return invokeFunction<FlightData>("get-flight-data", {
    flightNumber: flightNumber.trim(),
  });
};

export const fetchTurbulenceReport = async (flightData: FlightData): Promise<TurbulenceReport> => {
  if (isMockMode) {
    return createMockTurbulenceReport(flightData);
  }

  const departureCoords = getAirportCoords(flightData.departure);
  const arrivalCoords = getAirportCoords(flightData.arrival);

  if (!departureCoords || !arrivalCoords) {
    throw new Error(
      `Route ${flightData.departure} -> ${flightData.arrival} is not available in the local airport coordinate database.`,
    );
  }

  return invokeFunction<TurbulenceReport>("get-turbulence-data", {
    departureLat: departureCoords.lat,
    departureLon: departureCoords.lon,
    arrivalLat: arrivalCoords.lat,
    arrivalLon: arrivalCoords.lon,
    aircraftType: flightData.aircraft || "A320",
  });
};
