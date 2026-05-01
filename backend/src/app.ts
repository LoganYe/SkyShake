import cors from '@fastify/cors';
import Fastify from 'fastify';
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
  routeAnalysisAirportRequestSchema,
  routeAnalysisRequestSchema,
} from './contracts.js';
import { ApiError } from './errors.js';
import { renderLandingPage } from './landing-page.js';
import { FlightOptionsService } from './services/flight-options.js';
import { analyzeRouteWithWeather, type WeatherProvider } from './services/turbulence.js';
import { FlightLookupService } from './services/flight-lookup.js';

interface BuildAppDependencies {
  weatherProvider?: WeatherProvider;
  flightDataProvider?: FlightDataProvider;
  flightLookupService?: FlightLookupService;
  flightOptionsService?: FlightOptionsService;
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
  const flightDataProvider =
    dependencies.flightDataProvider ?? createFlightDataProvider(config);
  const flightLookupService =
    dependencies.flightLookupService ??
    new FlightLookupService(config.flightProvider, flightDataProvider);
  const flightOptionsService =
    dependencies.flightOptionsService ??
    new FlightOptionsService(config.flightProvider, flightDataProvider);

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

  app.get('/', async (_request, reply) => {
    return reply
      .type('text/html; charset=utf-8')
      .send(
        renderLandingPage({
          appStoreUrl: config.appStoreUrl,
        }),
      );
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

  app.post('/v1/route-analysis/airports', async (request) => {
    const payload = routeAnalysisAirportRequestSchema.parse(request.body);
    const departureCode = payload.departureCode.trim().toUpperCase();
    const arrivalCode = payload.arrivalCode.trim().toUpperCase();

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

    return analyzeRouteWithWeather(
      {
        departure: {
          code: departure.code,
          name: departure.name,
          latitude: departure.latitude,
          longitude: departure.longitude,
        },
        arrival: {
          code: arrival.code,
          name: arrival.name,
          latitude: arrival.latitude,
          longitude: arrival.longitude,
        },
        aircraftType:
          payload.aircraftType == null || payload.aircraftType.trim().length === 0
            ? 'Boeing 737 MAX 8'
            : payload.aircraftType.trim(),
      },
      openMeteoClient,
    );
  });

  app.get('/v1/flights/search', async (request) => {
    const query = flightLookupQuerySchema.parse(request.query);
    return flightLookupService.lookupFlight(
      query.flightNumber,
      query.flightDate,
      query.flightTime,
    );
  });

  app.get('/v1/flights/options', async (request) => {
    const query = flightOptionsQuerySchema.parse(request.query);
    return flightOptionsService.searchFlights(
      query.departureCode,
      query.arrivalCode,
      query.departureLocal,
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
