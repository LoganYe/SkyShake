import { Redis } from 'ioredis';
import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { FlightDataProvider } from '../src/clients/flight-lookup-provider.js';
import type { BackendConfig } from '../src/config.js';
import type { WeatherProvider } from '../src/services/turbulence.js';
import { RedisCacheStoreFactory } from '../src/services/cache-store.js';
import { FlightLookupService } from '../src/services/flight-lookup.js';
import {
  AppleAppAttestAuthenticator,
  RedisAppAttestRecordStore,
  type AppAttestCryptography,
} from '../src/services/app-attest.js';

const redisUrl = process.env.REDIS_TEST_URL;

describe.skipIf(redisUrl == null)('Redis multi-instance integration', () => {
  test('shares rate-limit counters and completed provider cache entries', async () => {
    if (redisUrl == null) {
      throw new Error('REDIS_TEST_URL is required for this integration test.');
    }

    const administrator = new Redis(redisUrl);
    let firstApp: ReturnType<typeof buildApp> | null = null;
    let secondApp: ReturnType<typeof buildApp> | null = null;
    let firstRedis: Redis | null = null;
    let secondRedis: Redis | null = null;

    try {
      await administrator.flushdb();

      const weatherProvider: WeatherProvider = {
        async fetchSnapshot() {
          return {
            windSpeed: 58,
            windGusts: 78,
            windShear: 14,
            temperature: 5,
            cloudCover: 61,
            cape: 420,
            cruiseWindSpeed: 82,
          };
        },
      };
      const config = redisConfig(redisUrl);
      firstApp = buildApp(config, { weatherProvider });
      secondApp = buildApp(config, { weatherProvider });
      await Promise.all([firstApp.ready(), secondApp.ready()]);
      const request = {
        method: 'POST' as const,
        url: '/v1/route-analysis/airports',
        payload: {
          departureCode: 'SFO',
          arrivalCode: 'JFK',
          aircraftType: 'Boeing 787-9',
        },
      };

      expect((await firstApp.inject(request)).statusCode).toBe(200);
      expect((await secondApp.inject(request)).statusCode).toBe(200);
      expect((await firstApp.inject(request)).statusCode).toBe(429);

      let providerCalls = 0;
      const provider: FlightDataProvider = {
        async lookupFlight() {
          providerCalls += 1;
          return null;
        },
        async searchFlightsByRoute() {
          return [];
        },
      };
      firstRedis = new Redis(redisUrl);
      secondRedis = new Redis(redisUrl);
      const firstService = new FlightLookupService('aerodatabox', provider, {
        cacheStoreFactory: new RedisCacheStoreFactory(firstRedis),
      });
      const secondService = new FlightLookupService('aerodatabox', provider, {
        cacheStoreFactory: new RedisCacheStoreFactory(secondRedis),
      });

      expect((await firstService.lookupFlight('UA857')).meta.source).toBe('live');
      expect((await secondService.lookupFlight('UA857')).meta.source).toBe('cache');
      expect(providerCalls).toBe(1);

      const verifiedSignCounts: number[] = [];
      const cryptography: AppAttestCryptography = {
        verifyAttestation(input) {
          return {
            keyId: input.keyId,
            publicKey: 'integration-public-key',
            environment: 'development',
          };
        },
        verifyAssertion(input) {
          verifiedSignCounts.push(input.signCount);
          return { signCount: input.signCount + 1 };
        },
      };
      const authenticator = new AppleAppAttestAuthenticator(
        {
          teamId: '595KFFGG66',
          bundleId: 'com.skyshake.app',
          allowDevelopmentEnvironment: true,
        },
        new RedisAppAttestRecordStore(firstRedis),
        cryptography,
      );
      const integrationKeyId = Buffer.alloc(32, 3).toString('base64');
      const registrationChallenge = await authenticator.issueChallenge();
      await authenticator.register({
        challenge: registrationChallenge.challenge,
        keyId: integrationKeyId,
        attestation: Buffer.from('attestation').toString('base64'),
      });
      for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
        const challenge = await authenticator.issueChallenge();
        await authenticator.authenticate({
          challenge: challenge.challenge,
          keyId: integrationKeyId,
          assertion: Buffer.from('assertion').toString('base64'),
          method: 'GET',
          path: '/v1/flights/search',
          query: { flightNumber: 'UA857' },
          body: null,
        });
      }
      expect(verifiedSignCounts).toEqual([0, 1]);
    } finally {
      await Promise.allSettled([
        firstApp?.close(),
        secondApp?.close(),
        firstRedis?.quit(),
        secondRedis?.quit(),
        administrator.quit(),
      ]);
    }
  });
});

function redisConfig(url: string): BackendConfig {
  return {
    host: '127.0.0.1',
    port: 8787,
    runtimeEnvironment: 'test',
    redisUrl: url,
    appAttest: {
      mode: 'disabled',
      teamId: null,
      bundleId: null,
      allowDevelopmentEnvironment: true,
    },
    logLevel: 'silent',
    trustProxyHops: 0,
    corsAllowedOrigins: [],
    providerRateLimit: { max: 2, timeWindowMs: 60_000 },
    routeAnalysisTimeoutMs: 18_000,
    appStoreUrl: null,
    flightProvider: 'none',
    aeroDataBox: {
      marketplace: 'rapidapi',
      apiKey: null,
      host: null,
      enableFlightPlan: false,
    },
  };
}
