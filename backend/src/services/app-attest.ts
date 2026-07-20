import { createHash, randomBytes } from 'node:crypto';

import { verifyAssertion, verifyAttestation } from 'node-app-attest';
import type { Redis } from 'ioredis';

import { ApiError } from '../errors.js';

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const CHALLENGE_PREFIX = 'skyshake:app-attest:v1:challenge:';
const KEY_PREFIX = 'skyshake:app-attest:v1:key:';

export interface AppAttestRegistration {
  challenge: string;
  keyId: string;
  attestation: string;
}

export interface AppAttestRequestAssertion {
  challenge: string;
  keyId: string;
  assertion: string;
  method: string;
  path: string;
  query: unknown;
  body: unknown;
}

export interface AppAttestAuthenticator {
  issueChallenge(): Promise<{ challenge: string; expiresInSeconds: number }>;
  register(input: AppAttestRegistration): Promise<void>;
  authenticate(input: AppAttestRequestAssertion): Promise<{ keyId: string }>;
}

interface AppAttestIdentity {
  teamId: string;
  bundleId: string;
  allowDevelopmentEnvironment: boolean;
}

interface AttestedKeyRecord {
  publicKey: string;
  signCount: number;
  environment: string;
}

export interface AppAttestRecordStore {
  storeChallenge(challenge: string, ttlMs: number): Promise<boolean>;
  consumeChallenge(challenge: string): Promise<boolean>;
  readKey(keyId: string): Promise<AttestedKeyRecord | null>;
  createKey(keyId: string, record: AttestedKeyRecord): Promise<boolean>;
  updateSignCount(
    keyId: string,
    expectedSignCount: number,
    nextSignCount: number,
  ): Promise<boolean>;
}

export interface AppAttestCryptography {
  verifyAttestation(input: {
    attestation: Buffer;
    challenge: string;
    keyId: string;
    bundleIdentifier: string;
    teamIdentifier: string;
    allowDevelopmentEnvironment: boolean;
  }): { keyId: string; publicKey: string; environment: string };
  verifyAssertion(input: {
    assertion: Buffer;
    payload: string;
    publicKey: string;
    bundleIdentifier: string;
    teamIdentifier: string;
    signCount: number;
  }): { signCount: number };
}

const nodeAppAttestCryptography: AppAttestCryptography = {
  verifyAttestation,
  verifyAssertion,
};

export class AppleAppAttestAuthenticator implements AppAttestAuthenticator {
  constructor(
    private readonly identity: AppAttestIdentity,
    private readonly store: AppAttestRecordStore,
    private readonly cryptography: AppAttestCryptography =
      nodeAppAttestCryptography,
  ) {}

  async issueChallenge() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const challenge = randomBytes(32).toString('base64url');
      if (await this.store.storeChallenge(challenge, CHALLENGE_TTL_MS)) {
        return {
          challenge,
          expiresInSeconds: CHALLENGE_TTL_MS / 1_000,
        };
      }
    }
    throw new Error('Could not allocate a unique App Attest challenge.');
  }

  async register(input: AppAttestRegistration) {
    validateKeyId(input.keyId);
    await this.requireFreshChallenge(input.challenge);
    const attestation = decodeBase64(input.attestation, 32_000);

    let verified: ReturnType<AppAttestCryptography['verifyAttestation']>;
    try {
      verified = this.cryptography.verifyAttestation({
        attestation,
        challenge: input.challenge,
        keyId: input.keyId,
        bundleIdentifier: this.identity.bundleId,
        teamIdentifier: this.identity.teamId,
        allowDevelopmentEnvironment:
          this.identity.allowDevelopmentEnvironment,
      });
    } catch {
      throw invalidAttestation();
    }

    if (verified.keyId !== input.keyId) {
      throw invalidAttestation();
    }
    this.requireAllowedEnvironment(verified.environment);

    const record: AttestedKeyRecord = {
      publicKey: verified.publicKey,
      signCount: 0,
      environment: verified.environment,
    };
    if (await this.store.createKey(input.keyId, record)) {
      return;
    }

    const existing = await this.store.readKey(input.keyId);
    if (existing?.publicKey !== record.publicKey) {
      throw invalidAttestation();
    }
  }

  async authenticate(input: AppAttestRequestAssertion) {
    validateKeyId(input.keyId);
    await this.requireFreshChallenge(input.challenge);
    const assertion = decodeBase64(input.assertion, 8_000);
    const payload = buildAppAttestPayload(input);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const record = await this.store.readKey(input.keyId);
      if (record == null) {
        throw invalidAttestation();
      }
      this.requireAllowedEnvironment(record.environment);

      let nextSignCount: number;
      try {
        nextSignCount = this.cryptography.verifyAssertion({
          assertion,
          payload,
          publicKey: record.publicKey,
          bundleIdentifier: this.identity.bundleId,
          teamIdentifier: this.identity.teamId,
          signCount: record.signCount,
        }).signCount;
      } catch {
        throw invalidAttestation();
      }
      if (
        !Number.isSafeInteger(nextSignCount) ||
        nextSignCount <= record.signCount
      ) {
        throw invalidAttestation();
      }

      if (
        await this.store.updateSignCount(
          input.keyId,
          record.signCount,
          nextSignCount,
        )
      ) {
        return { keyId: input.keyId };
      }
    }

    throw invalidAttestation();
  }

  private async requireFreshChallenge(challenge: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
      throw invalidAttestation();
    }
    if (!(await this.store.consumeChallenge(challenge))) {
      throw invalidAttestation();
    }
  }

  private requireAllowedEnvironment(environment: string) {
    if (
      environment !== 'production' &&
      !(
        environment === 'development' &&
        this.identity.allowDevelopmentEnvironment
      )
    ) {
      throw invalidAttestation();
    }
  }
}

export class RedisAppAttestRecordStore implements AppAttestRecordStore {
  constructor(private readonly redis: Redis) {}

  async storeChallenge(challenge: string, ttlMs: number) {
    return (
      (await this.redis.set(
        CHALLENGE_PREFIX + challenge,
        '1',
        'PX',
        ttlMs,
        'NX',
      )) === 'OK'
    );
  }

  async consumeChallenge(challenge: string) {
    return (await this.redis.getdel(CHALLENGE_PREFIX + challenge)) != null;
  }

  async readKey(keyId: string) {
    const record = await this.redis.hgetall(keyFor(keyId));
    if (Object.keys(record).length === 0) {
      return null;
    }
    const signCount = Number(record.signCount);
    if (
      typeof record.publicKey !== 'string' ||
      !Number.isSafeInteger(signCount) ||
      signCount < 0 ||
      typeof record.environment !== 'string'
    ) {
      throw new Error('Stored App Attest key record is invalid.');
    }
    return {
      publicKey: record.publicKey,
      signCount,
      environment: record.environment,
    };
  }

  async createKey(keyId: string, record: AttestedKeyRecord) {
    const result = await this.redis.eval(
      `
        if redis.call('EXISTS', KEYS[1]) == 1 then
          return 0
        end
        redis.call('HSET', KEYS[1],
          'publicKey', ARGV[1],
          'signCount', ARGV[2],
          'environment', ARGV[3])
        return 1
      `,
      1,
      keyFor(keyId),
      record.publicKey,
      String(record.signCount),
      record.environment,
    );
    return result === 1;
  }

  async updateSignCount(
    keyId: string,
    expectedSignCount: number,
    nextSignCount: number,
  ) {
    const result = await this.redis.eval(
      `
        if redis.call('HGET', KEYS[1], 'signCount') ~= ARGV[1] then
          return 0
        end
        redis.call('HSET', KEYS[1], 'signCount', ARGV[2])
        return 1
      `,
      1,
      keyFor(keyId),
      String(expectedSignCount),
      String(nextSignCount),
    );
    return result === 1;
  }
}

export function buildAppAttestPayload(input: {
  challenge: string;
  method: string;
  path: string;
  query: unknown;
  body: unknown;
}) {
  return JSON.stringify(
    canonicalize({
      body: input.body ?? null,
      challenge: input.challenge,
      method: input.method.toUpperCase(),
      path: input.path,
      query: input.query ?? null,
      version: 1,
    }),
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value != null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        )
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function decodeBase64(value: string, maxBytes: number) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw invalidAttestation();
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 0 || decoded.length > maxBytes) {
    throw invalidAttestation();
  }
  return decoded;
}

function validateKeyId(keyId: string) {
  const decoded = decodeBase64(keyId, 64);
  if (decoded.length !== 32) {
    throw invalidAttestation();
  }
}

function keyFor(keyId: string) {
  const digest = createHash('sha256').update(keyId).digest('hex');
  return KEY_PREFIX + digest;
}

function invalidAttestation() {
  return new ApiError(401, 'App attestation failed.', {
    code: 'app_attestation_invalid',
    retryable: false,
  });
}
