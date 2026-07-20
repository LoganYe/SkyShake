import 'dotenv/config';

import { z } from 'zod';

export type FlightProvider = 'none' | 'aerodatabox';
export type AeroDataBoxMarketplace = 'rapidapi' | 'apimarket';
export type RuntimeEnvironment = 'development' | 'test' | 'production';
export type AppAttestMode = 'disabled' | 'required';
export type LogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

export interface BackendConfig {
  host: string;
  port: number;
  runtimeEnvironment: RuntimeEnvironment;
  redisUrl: string | null;
  appAttest: {
    mode: AppAttestMode;
    teamId: string | null;
    bundleId: string | null;
    allowDevelopmentEnvironment: boolean;
  };
  logLevel: LogLevel;
  trustProxyHops: number;
  corsAllowedOrigins: string[];
  providerRateLimit: {
    max: number;
    timeWindowMs: number;
  };
  routeAnalysisTimeoutMs: number;
  appStoreUrl: string | null;
  flightProvider: FlightProvider;
  aeroDataBox: {
    marketplace: AeroDataBoxMarketplace;
    apiKey: string | null;
    host: string | null;
    enableFlightPlan: boolean;
  };
}

export type FlightProviderConfig = Pick<
  BackendConfig,
  'flightProvider' | 'aeroDataBox'
>;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  CORS_ALLOWED_ORIGINS: z.string().trim().optional(),
  PROVIDER_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .default(30),
  PROVIDER_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .default(60_000),
  ROUTE_ANALYSIS_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(18_000),
  REDIS_URL: z.string().trim().optional(),
  APP_ATTEST_MODE: z.enum(['disabled', 'required']).optional(),
  APPLE_TEAM_ID: z.string().trim().optional(),
  IOS_BUNDLE_ID: z.string().trim().optional(),
  APP_ATTEST_ALLOW_DEVELOPMENT: z.string().trim().optional(),
  APP_STORE_URL: z.string().trim().optional(),
  FLIGHT_PROVIDER: z.enum(['none', 'aerodatabox']).default('none'),
  AERODATABOX_MARKETPLACE: z.enum(['rapidapi', 'apimarket']).default('rapidapi'),
  AERODATABOX_API_KEY: z.string().trim().optional(),
  AERODATABOX_HOST: z.string().trim().optional(),
  AERODATABOX_ENABLE_FLIGHT_PLAN: z.string().trim().optional(),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);
  const redisUrl = parseOptionalRedisUrl(parsed.REDIS_URL);
  const appAttestMode =
    parsed.APP_ATTEST_MODE ??
    (parsed.NODE_ENV === 'production' ? 'required' : 'disabled');
  const allowDevelopmentEnvironment = parseBooleanEnv(
    parsed.APP_ATTEST_ALLOW_DEVELOPMENT,
    parsed.NODE_ENV !== 'production',
  );

  if (parsed.NODE_ENV === 'production' && redisUrl == null) {
    throw new Error('REDIS_URL is required when NODE_ENV=production.');
  }
  if (parsed.NODE_ENV === 'production' && appAttestMode !== 'required') {
    throw new Error('APP_ATTEST_MODE must be required when NODE_ENV=production.');
  }
  if (
    appAttestMode === 'required' &&
    (!parsed.APPLE_TEAM_ID || !parsed.IOS_BUNDLE_ID)
  ) {
    throw new Error(
      'APPLE_TEAM_ID and IOS_BUNDLE_ID are required when App Attest is enabled.',
    );
  }
  if (parsed.NODE_ENV === 'production' && allowDevelopmentEnvironment) {
    throw new Error(
      'APP_ATTEST_ALLOW_DEVELOPMENT must be false in production.',
    );
  }

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    runtimeEnvironment: parsed.NODE_ENV,
    redisUrl,
    appAttest: {
      mode: appAttestMode,
      teamId: parsed.APPLE_TEAM_ID || null,
      bundleId: parsed.IOS_BUNDLE_ID || null,
      allowDevelopmentEnvironment,
    },
    logLevel: parsed.LOG_LEVEL,
    trustProxyHops: parsed.TRUST_PROXY_HOPS,
    corsAllowedOrigins: parseAllowedOrigins(parsed.CORS_ALLOWED_ORIGINS),
    providerRateLimit: {
      max: parsed.PROVIDER_RATE_LIMIT_MAX,
      timeWindowMs: parsed.PROVIDER_RATE_LIMIT_WINDOW_MS,
    },
    routeAnalysisTimeoutMs: parsed.ROUTE_ANALYSIS_TIMEOUT_MS,
    appStoreUrl: parseOptionalUrlEnv('APP_STORE_URL', parsed.APP_STORE_URL),
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

function parseOptionalRedisUrl(value: string | undefined) {
  if (value == null || value.trim().length === 0) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error('Expected REDIS_URL to be a valid redis or rediss URL.');
  }

  if (parsedUrl.protocol !== 'redis:' && parsedUrl.protocol !== 'rediss:') {
    throw new Error(
      `Expected REDIS_URL to use redis or rediss, received "${parsedUrl.protocol}".`,
    );
  }

  return parsedUrl.toString();
}

function parseAllowedOrigins(value: string | undefined) {
  if (value == null || value.trim().length === 0) {
    return [];
  }

  return [...new Set(value.split(',').map((origin) => parseOrigin(origin)))];
}

function parseOrigin(value: string) {
  const normalized = value.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error(
      `Expected CORS_ALLOWED_ORIGINS to contain absolute URLs, received "${normalized}".`,
    );
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error(
      `Expected CORS_ALLOWED_ORIGINS to use http or https, received "${parsedUrl.protocol}".`,
    );
  }

  return parsedUrl.origin;
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

function parseOptionalUrlEnv(name: string, value: string | undefined) {
  if (value == null || value.trim().length === 0) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`Expected ${name} to be a valid absolute URL, received "${value}".`);
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error(
      `Expected ${name} to use http or https, received "${parsedUrl.protocol}".`,
    );
  }

  return parsedUrl.toString();
}
