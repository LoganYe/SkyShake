import cors from '@fastify/cors';
import Fastify from 'fastify';
import { ZodError } from 'zod';

import {
  createFlightLookupProvider,
  type FlightLookupProvider,
} from './clients/flight-lookup-provider.js';
import { OpenMeteoClient } from './clients/open-meteo-client.js';
import { readConfig, type BackendConfig } from './config.js';
import {
  flightLookupQuerySchema,
  routeAnalysisRequestSchema,
} from './contracts.js';
import { ApiError } from './errors.js';
import { analyzeRouteWithWeather, type WeatherProvider } from './services/turbulence.js';
import { FlightLookupService } from './services/flight-lookup.js';

interface BuildAppDependencies {
  weatherProvider?: WeatherProvider;
  flightLookupProvider?: FlightLookupProvider;
  flightLookupService?: FlightLookupService;
}

export function buildApp(
  config: BackendConfig = readConfig(),
  dependencies: BuildAppDependencies = {},
) {
  const app = Fastify({ logger: false });
  void app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type'],
    maxAge: 600,
  });
  const openMeteoClient =
    dependencies.weatherProvider ?? new OpenMeteoClient();
  const flightLookupProvider =
    dependencies.flightLookupProvider ?? createFlightLookupProvider(config);
  const flightLookupService =
    dependencies.flightLookupService ??
    new FlightLookupService(config.flightProvider, flightLookupProvider);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
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

    return reply.status(500).send({
      error: 'Unexpected server error.',
      code: 'internal_error',
    });
  });

  app.get('/healthz', async () => {
    return {
      ok: true,
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

  app.post('/v1/route-analysis', async (request) => {
    const payload = routeAnalysisRequestSchema.parse(request.body);
    return analyzeRouteWithWeather(payload, openMeteoClient);
  });

  app.get('/v1/flights/search', async (request) => {
    const query = flightLookupQuerySchema.parse(request.query);
    return flightLookupService.lookupFlight(
      query.flightNumber,
      query.flightDate,
    );
  });

  return app;
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
