import 'dotenv/config';

import { z } from 'zod';

export type FlightProvider = 'none' | 'aerodatabox';
export type AeroDataBoxMarketplace = 'rapidapi' | 'apimarket';

export interface BackendConfig {
  host: string;
  port: number;
  flightProvider: FlightProvider;
  aeroDataBox: {
    marketplace: AeroDataBoxMarketplace;
    apiKey: string | null;
    host: string | null;
    enableFlightPlan: boolean;
  };
}

const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  FLIGHT_PROVIDER: z.enum(['none', 'aerodatabox']).default('none'),
  AERODATABOX_MARKETPLACE: z.enum(['rapidapi', 'apimarket']).default('rapidapi'),
  AERODATABOX_API_KEY: z.string().trim().optional(),
  AERODATABOX_HOST: z.string().trim().optional(),
  AERODATABOX_ENABLE_FLIGHT_PLAN: z.string().trim().optional(),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    flightProvider: parsed.FLIGHT_PROVIDER,
    aeroDataBox: {
      marketplace: parsed.AERODATABOX_MARKETPLACE,
      apiKey: parsed.AERODATABOX_API_KEY || null,
      host: parsed.AERODATABOX_HOST || null,
      enableFlightPlan: parseBooleanEnv(
        parsed.AERODATABOX_ENABLE_FLIGHT_PLAN,
        false,
      ),
    },
  };
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null || value.trim().length == 0) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      throw new Error(
        `Expected a boolean-like value for AERODATABOX_ENABLE_FLIGHT_PLAN, received "${value}".`,
      );
  }
}
