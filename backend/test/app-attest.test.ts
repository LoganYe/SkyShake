import { describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import type { BackendConfig } from '../src/config.js';
import {
  AppleAppAttestAuthenticator,
  buildAppAttestPayload,
  type AppAttestCryptography,
  type AppAttestRecordStore,
} from '../src/services/app-attest.js';
import type { WeatherProvider } from '../src/services/turbulence.js';

describe('AppleAppAttestAuthenticator', () => {
  test('uses the same canonical request representation as the Flutter client', () => {
    expect(
      buildAppAttestPayload({
        challenge: 'challenge',
        method: 'post',
        path: '/v1/route-analysis/airports',
        query: {},
        body: { departureCode: 'SFO', arrivalCode: 'JFK' },
      }),
    ).toBe(
      '{"body":{"arrivalCode":"JFK","departureCode":"SFO"},' +
        '"challenge":"challenge","method":"POST",' +
        '"path":"/v1/route-analysis/airports","query":{},"version":1}',
    );
  });

  test('registers a key, binds an assertion to the request, and rejects challenge replay', async () => {
    const keyId = Buffer.alloc(32, 1).toString('base64');
    const store = new FakeAppAttestStore();
    let assertionPayload: string | null = null;
    const cryptography: AppAttestCryptography = {
      verifyAttestation(input) {
        expect(input.bundleIdentifier).toBe('com.skyshake.app');
        expect(input.teamIdentifier).toBe('595KFFGG66');
        return {
          keyId: input.keyId,
          publicKey: 'test-public-key',
          environment: 'development',
        };
      },
      verifyAssertion(input) {
        assertionPayload = input.payload;
        return { signCount: input.signCount + 1 };
      },
    };
    const authenticator = new AppleAppAttestAuthenticator(
      {
        teamId: '595KFFGG66',
        bundleId: 'com.skyshake.app',
        allowDevelopmentEnvironment: true,
      },
      store,
      cryptography,
    );
    const registrationChallenge = await authenticator.issueChallenge();

    await authenticator.register({
      challenge: registrationChallenge.challenge,
      keyId,
      attestation: Buffer.from('attestation').toString('base64'),
    });
    await expect(
      authenticator.register({
        challenge: registrationChallenge.challenge,
        keyId,
        attestation: Buffer.from('attestation').toString('base64'),
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'app_attestation_invalid',
    });

    const requestChallenge = await authenticator.issueChallenge();
    const request = {
      challenge: requestChallenge.challenge,
      keyId,
      assertion: Buffer.from('assertion').toString('base64'),
      method: 'post',
      path: '/v1/route-analysis/airports',
      query: {},
      body: { departureCode: 'SFO', arrivalCode: 'JFK' },
    };
    await expect(authenticator.authenticate(request)).resolves.toEqual({
      keyId,
    });
    expect(assertionPayload).toBe(buildAppAttestPayload(request));
    expect(store.keys.get(keyId)?.signCount).toBe(1);
    await expect(authenticator.authenticate(request)).rejects.toMatchObject({
      statusCode: 401,
      code: 'app_attestation_invalid',
    });
  });

  test('rejects a previously stored development key when production policy is active', async () => {
    const keyId = Buffer.alloc(32, 2).toString('base64');
    const store = new FakeAppAttestStore();
    store.keys.set(keyId, {
      publicKey: 'test-public-key',
      signCount: 0,
      environment: 'development',
    });
    const authenticator = new AppleAppAttestAuthenticator(
      {
        teamId: '595KFFGG66',
        bundleId: 'com.skyshake.app',
        allowDevelopmentEnvironment: false,
      },
      store,
      {
        verifyAttestation() {
          throw new Error('unused');
        },
        verifyAssertion() {
          return { signCount: 1 };
        },
      },
    );
    const challenge = await authenticator.issueChallenge();

    await expect(
      authenticator.authenticate({
        challenge: challenge.challenge,
        keyId,
        assertion: Buffer.from('assertion').toString('base64'),
        method: 'GET',
        path: '/v1/flights/search',
        query: { flightNumber: 'UA857' },
        body: null,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'app_attestation_invalid',
    });
  });
});

describe('protected provider routes', () => {
  test('requires App Attest headers while leaving the landing demo route public', async () => {
    const authenticatedRequests: string[] = [];
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
    const app = buildApp(appAttestTestConfig(), {
      weatherProvider,
      appAttestAuthenticator: {
        async issueChallenge() {
          return { challenge: 'challenge', expiresInSeconds: 120 };
        },
        async register() {},
        async authenticate(input) {
          authenticatedRequests.push(input.path);
          return { keyId: input.keyId };
        },
      },
    });

    const challengeResponse = await app.inject({
      method: 'GET',
      url: '/v1/attestation/challenge',
    });
    expect(challengeResponse.statusCode).toBe(200);
    expect(challengeResponse.headers['cache-control']).toBe('no-store');

    const protectedResponse = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    });
    expect(protectedResponse.statusCode).toBe(401);
    expect(protectedResponse.json().code).toBe('app_attestation_required');

    const authenticatedResponse = await app.inject({
      method: 'POST',
      url: '/v1/route-analysis/airports',
      headers: {
        'x-skyshake-key-id': 'key',
        'x-skyshake-challenge': 'challenge',
        'x-skyshake-assertion': 'assertion',
      },
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    });
    expect(authenticatedResponse.statusCode).toBe(200);
    expect(authenticatedRequests).toEqual(['/v1/route-analysis/airports']);

    const publicResponse = await app.inject({
      method: 'POST',
      url: '/v1/public/route-analysis/airports',
      payload: {
        departureCode: 'SFO',
        arrivalCode: 'JFK',
        aircraftType: 'Boeing 787-9',
      },
    });
    expect(publicResponse.statusCode).toBe(200);

    await app.close();
  });
});

class FakeAppAttestStore implements AppAttestRecordStore {
  readonly challenges = new Set<string>();
  readonly keys = new Map<
    string,
    { publicKey: string; signCount: number; environment: string }
  >();

  async storeChallenge(challenge: string) {
    if (this.challenges.has(challenge)) {
      return false;
    }
    this.challenges.add(challenge);
    return true;
  }

  async consumeChallenge(challenge: string) {
    return this.challenges.delete(challenge);
  }

  async readKey(keyId: string) {
    return this.keys.get(keyId) ?? null;
  }

  async createKey(
    keyId: string,
    record: { publicKey: string; signCount: number; environment: string },
  ) {
    if (this.keys.has(keyId)) {
      return false;
    }
    this.keys.set(keyId, { ...record });
    return true;
  }

  async updateSignCount(
    keyId: string,
    expectedSignCount: number,
    nextSignCount: number,
  ) {
    const record = this.keys.get(keyId);
    if (record == null || record.signCount !== expectedSignCount) {
      return false;
    }
    record.signCount = nextSignCount;
    return true;
  }
}

function appAttestTestConfig(): BackendConfig {
  return {
    host: '127.0.0.1',
    port: 8787,
    runtimeEnvironment: 'test',
    redisUrl: null,
    appAttest: {
      mode: 'required',
      teamId: '595KFFGG66',
      bundleId: 'com.skyshake.app',
      allowDevelopmentEnvironment: true,
    },
    logLevel: 'silent',
    trustProxyHops: 0,
    corsAllowedOrigins: [],
    providerRateLimit: { max: 30, timeWindowMs: 60_000 },
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
