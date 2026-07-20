import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { ZodError } from 'zod';

import { lookupAirport } from './airport-catalog.js';
import {
  createFlightDataProvider,
  type FlightDataProvider,
} from './clients/flight-lookup-provider.js';
import { OpenMeteoClient } from './clients/open-meteo-client.js';
import { readConfig, type BackendConfig } from './config.js';
import {
  flightOptionsQuerySchema,
  flightLookupQuerySchema,
  appAttestRegistrationSchema,
  routeAnalysisAirportRequestSchema,
  routeAnalysisRequestSchema,
  type RouteAnalysisRequest,
} from './contracts.js';
import { ApiError, UpstreamTimeoutError } from './errors.js';
import { createLandingPage } from './landing-page.js';
import { FlightOptionsService } from './services/flight-options.js';
import { analyzeRouteWithWeather, type WeatherProvider } from './services/turbulence.js';
import { FlightLookupService } from './services/flight-lookup.js';
import {
  MemoryCacheStoreFactory,
  RedisCacheStoreFactory,
} from './services/cache-store.js';
import {
  AppleAppAttestAuthenticator,
  RedisAppAttestRecordStore,
  type AppAttestAuthenticator,
} from './services/app-attest.js';

interface BuildAppDependencies {
  weatherProvider?: WeatherProvider;
  flightDataProvider?: FlightDataProvider;
  flightLookupService?: FlightLookupService;
  flightOptionsService?: FlightOptionsService;
  appAttestAuthenticator?: AppAttestAuthenticator;
}

export function buildApp(
  config: BackendConfig = readConfig(),
  dependencies: BuildAppDependencies = {},
) {
  if (config.runtimeEnvironment === 'production' && config.redisUrl == null) {
    throw new Error('Production requires REDIS_URL for shared runtime state.');
  }

  const app = Fastify({
    logger:
      config.logLevel === 'silent'
        ? false
        : {
            level: config.logLevel,
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers.x-skyshake-assertion',
              'req.headers.x-skyshake-challenge',
              'req.headers.x-skyshake-key-id',
            ],
          },
    trustProxy: config.trustProxyHops === 0 ? false : config.trustProxyHops,
  });
  const redis = config.redisUrl == null ? null : createRedisClient(config.redisUrl);
  const cacheStoreFactory =
    redis == null
      ? new MemoryCacheStoreFactory()
      : new RedisCacheStoreFactory(redis);
  const appAttestAuthenticator = buildAppAttestAuthenticator(
    config,
    redis,
    dependencies.appAttestAuthenticator,
  );

  if (redis != null) {
    redis.on('error', (error: Error) => {
      app.log.error({ err: error }, 'Redis connection error');
    });
    app.addHook('onReady', async () => {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      await redis.ping();
    });
    app.addHook('onClose', async () => {
      if (redis.status !== 'end') {
        await redis.quit();
      }
    });
  }

  void app.register(cors, {
    origin: buildCorsOriginValidator(config.corsAllowedOrigins),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type'],
    maxAge: 600,
  });
  void app.register(rateLimit, {
    global: true,
    max: config.providerRateLimit.max,
    timeWindow: config.providerRateLimit.timeWindowMs,
    redis: redis ?? undefined,
    nameSpace: 'skyshake:rate-limit:v1:',
    skipOnError: false,
    allowList: (request) => request.method === 'OPTIONS',
    errorResponseBuilder: (_request, context) =>
      new ApiError(429, 'Too many provider-backed requests.', {
        code: 'rate_limit_exceeded',
        retryable: true,
        retryAfterSeconds: Math.max(1, Math.ceil(context.ttl / 1_000)),
      }),
  });
  const openMeteoClient =
    dependencies.weatherProvider ??
    new OpenMeteoClient(fetch, { cacheStoreFactory });
  const flightDataProvider =
    dependencies.flightDataProvider ?? createFlightDataProvider(config);
  const flightLookupService =
    dependencies.flightLookupService ??
    new FlightLookupService(config.flightProvider, flightDataProvider, {
      cacheStoreFactory,
    });
  const flightOptionsService =
    dependencies.flightOptionsService ??
    new FlightOptionsService(config.flightProvider, flightDataProvider, {
      cacheStoreFactory,
    });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer')
      .header('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
      .header('X-Frame-Options', 'DENY');
    return payload;
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      if (error.statusCode >= 500) {
        request.log.warn(
          {
            statusCode: error.statusCode,
            code: error.code,
            provider: error.provider ?? undefined,
          },
          'Request failed',
        );
      }

      if (error.retryAfterSeconds != null) {
        reply.header('Retry-After', String(error.retryAfterSeconds));
      }

      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        provider: error.provider ?? undefined,
        retryable: error.retryable || undefined,
        retryAfterSeconds: error.retryAfterSeconds ?? undefined,
      });
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return reply.status(400).send({
        error: firstIssue?.message ?? 'Request validation failed.',
        code: 'invalid_request',
      });
    }

    if (hasValidation(error)) {
      return reply.status(400).send({
        error: error.message,
        code: 'invalid_request',
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');

    return reply.status(500).send({
      error: 'Unexpected server error.',
      code: 'internal_error',
    });
  });

  app.get('/', { config: { rateLimit: false } }, async (_request, reply) => {
    const page = createLandingPage({
      appStoreUrl: config.appStoreUrl,
    });
    return reply
      .header('Content-Security-Policy', page.contentSecurityPolicy)
      .header('Cache-Control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(page.html);
  });

  app.get('/healthz', { config: { rateLimit: false } }, async () => {
    return {
      ok: true,
      runtimeState: redis == null ? 'process-memory' : 'redis',
      appAttestRequired: appAttestAuthenticator != null,
      flightProvider: config.flightProvider,
      flightProviderConfigured:
        config.flightProvider === 'aerodatabox'
          ? Boolean(config.aeroDataBox.apiKey)
          : false,
      flightProviderMarketplace:
        config.flightProvider === 'aerodatabox'
          ? config.aeroDataBox.marketplace
          : null,
      flightPlanEnabled:
        config.flightProvider === 'aerodatabox'
          ? config.aeroDataBox.enableFlightPlan
          : false,
      weatherProvider: 'open-meteo',
    };
  });

  if (appAttestAuthenticator != null) {
    app.get('/v1/attestation/challenge', async (_request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return appAttestAuthenticator.issueChallenge();
    });

    app.post('/v1/attestation/register', async (request) => {
      const payload = appAttestRegistrationSchema.parse(request.body);
      await appAttestAuthenticator.register(payload);
      return { registered: true };
    });
  }

  app.post('/v1/public/route-analysis/airports', async (request) => {
    const payload = routeAnalysisAirportRequestSchema.parse(request.body);
    return analyzeRouteWithDeadline(
      resolveRouteAnalysisRequest(
        payload.departureCode,
        payload.arrivalCode,
        payload.aircraftType,
      ),
      openMeteoClient,
      config.routeAnalysisTimeoutMs,
    );
  });

  void app.register(async function providerRoutes(providerApp) {
    if (appAttestAuthenticator != null) {
      providerApp.addHook('preHandler', async (request) => {
        const keyId = readSingleHeader(request.headers['x-skyshake-key-id']);
        const challenge = readSingleHeader(
          request.headers['x-skyshake-challenge'],
        );
        const assertion = readSingleHeader(
          request.headers['x-skyshake-assertion'],
        );
        if (keyId == null || challenge == null || assertion == null) {
          throw new ApiError(401, 'App attestation is required.', {
            code: 'app_attestation_required',
          });
        }
        await appAttestAuthenticator.authenticate({
          keyId,
          challenge,
          assertion,
          method: request.method,
          path:
            request.routeOptions.url ??
            new URL(request.url, 'http://localhost').pathname,
          query: request.query,
          body: request.body,
        });
      });
    }

    providerApp.post('/v1/route-analysis', async (request) => {
      const payload = routeAnalysisRequestSchema.parse(request.body);
      return analyzeRouteWithDeadline(
        resolveRouteAnalysisRequest(
          payload.departure.code,
          payload.arrival.code,
          payload.aircraftType,
        ),
        openMeteoClient,
        config.routeAnalysisTimeoutMs,
      );
    });

    providerApp.post('/v1/route-analysis/airports', async (request) => {
      const payload = routeAnalysisAirportRequestSchema.parse(request.body);
      return analyzeRouteWithDeadline(
        resolveRouteAnalysisRequest(
          payload.departureCode,
          payload.arrivalCode,
          payload.aircraftType,
        ),
        openMeteoClient,
        config.routeAnalysisTimeoutMs,
      );
    });

    providerApp.get('/v1/flights/search', async (request) => {
      const query = flightLookupQuerySchema.parse(request.query);
      return flightLookupService.lookupFlight(
        query.flightNumber,
        query.flightDate,
        query.flightTime,
      );
    });

    providerApp.get('/v1/flights/options', async (request) => {
      const query = flightOptionsQuerySchema.parse(request.query);
      return flightOptionsService.searchFlights(
        query.departureCode,
        query.arrivalCode,
        query.departureLocal,
      );
    });
  });

  return app;
}

function createRedisClient(redisUrl: string) {
  return new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 5_000,
    commandTimeout: 3_000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
  });
}

function buildAppAttestAuthenticator(
  config: BackendConfig,
  redis: Redis | null,
  provided: AppAttestAuthenticator | undefined,
) {
  if (config.appAttest.mode === 'disabled') {
    return null;
  }
  if (provided != null) {
    return provided;
  }
  if (
    redis == null ||
    config.appAttest.teamId == null ||
    config.appAttest.bundleId == null
  ) {
    throw new Error(
      'Required App Attest authentication needs Redis, APPLE_TEAM_ID, and IOS_BUNDLE_ID.',
    );
  }
  return new AppleAppAttestAuthenticator(
    {
      teamId: config.appAttest.teamId,
      bundleId: config.appAttest.bundleId,
      allowDevelopmentEnvironment:
        config.appAttest.allowDevelopmentEnvironment,
    },
    new RedisAppAttestRecordStore(redis),
  );
}

function readSingleHeader(value: string | string[] | undefined) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function resolveRouteAnalysisRequest(
  departureValue: string,
  arrivalValue: string,
  aircraftType: string | undefined,
): RouteAnalysisRequest {
  const departureCode = departureValue.trim().toUpperCase();
  const arrivalCode = arrivalValue.trim().toUpperCase();

  if (departureCode === arrivalCode) {
    throw new ApiError(400, 'Departure and arrival airports must be different.', {
      code: 'invalid_request',
    });
  }

  const departure = lookupAirport(departureCode);
  const arrival = lookupAirport(arrivalCode);
  const unsupportedCodes = [
    departure == null ? departureCode : null,
    arrival == null ? arrivalCode : null,
  ].filter((value): value is string => value != null);

  if (unsupportedCodes.length > 0) {
    throw new ApiError(
      400,
      `Unsupported airport code: ${unsupportedCodes.join(
        ', ',
      )}. This page only accepts airports from the bundled SkyShake catalog.`,
      {
        code: 'unsupported_airport',
      },
    );
  }

  if (departure == null || arrival == null) {
    throw new ApiError(500, 'Airport catalog lookup failed unexpectedly.', {
      code: 'internal_error',
    });
  }

  return {
    departure: { ...departure },
    arrival: { ...arrival },
    aircraftType:
      aircraftType == null || aircraftType.trim().length === 0
        ? 'Boeing 737 MAX 8'
        : aircraftType.trim(),
  };
}

async function analyzeRouteWithDeadline(
  request: RouteAnalysisRequest,
  weatherProvider: WeatherProvider,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      const error = new UpstreamTimeoutError('Route analysis timed out.', {
        code: 'route_analysis_timeout',
        provider: 'open-meteo',
      });
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      analyzeRouteWithWeather(request, weatherProvider, {
        signal: controller.signal,
      }),
      deadline,
    ]);
  } finally {
    if (timeout != null) {
      clearTimeout(timeout);
    }
  }
}

function buildCorsOriginValidator(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins);

  return (
    origin: string | undefined,
    callback: (error: Error | null, allow: boolean) => void,
  ) => {
    if (
      origin == null ||
      allowed.has(origin) ||
      isLocalDevelopmentOrigin(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === '127.0.0.1' ||
        url.hostname === 'localhost' ||
        url.hostname === '::1')
    );
  } catch {
    return false;
  }
}

function hasValidation(
  error: unknown,
): error is Error & { validation: unknown } {
  return (
    error instanceof Error &&
    typeof error === 'object' &&
    error !== null &&
    'validation' in error
  );
}
