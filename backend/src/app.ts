import Fastify from 'fastify';
import { ZodError } from 'zod';

import { AviationStackClient } from './clients/aviationstack-client.js';
import { OpenMeteoClient } from './clients/open-meteo-client.js';
import { readConfig, type BackendConfig } from './config.js';
import {
  flightLookupQuerySchema,
  routeAnalysisRequestSchema,
} from './contracts.js';
import { ApiError } from './errors.js';
import { analyzeRouteWithWeather, type WeatherProvider } from './services/turbulence.js';

interface BuildAppDependencies {
  weatherProvider?: WeatherProvider;
  aviationStackClient?: AviationStackClient;
}

export function buildApp(
  config: BackendConfig = readConfig(),
  dependencies: BuildAppDependencies = {},
) {
  const app = Fastify({ logger: false });
  const openMeteoClient =
    dependencies.weatherProvider ?? new OpenMeteoClient();
  const aviationStackClient =
    dependencies.aviationStackClient ?? new AviationStackClient(config);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      return reply.status(400).send({
        error: firstIssue?.message ?? 'Request validation failed.',
      });
    }

    if (hasValidation(error)) {
      return reply.status(400).send({ error: error.message });
    }

    return reply.status(500).send({ error: 'Unexpected server error.' });
  });

  app.get('/healthz', async () => {
    return {
      ok: true,
      flightProvider: config.flightProvider,
      flightProviderConfigured:
        config.flightProvider === 'aviationstack'
          ? Boolean(config.aviationStackAccessKey)
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
    const result = await aviationStackClient.lookupFlight(
      query.flightNumber,
      query.flightDate,
    );

    if (!result) {
      return {
        flightNumber: query.flightNumber.toUpperCase(),
        notFound: true,
      };
    }

    return {
      flight: result,
      notFound: false,
    };
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
