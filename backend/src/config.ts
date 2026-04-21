import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  FLIGHT_PROVIDER: z.enum(['none', 'aviationstack']).default('none'),
  AVIATIONSTACK_ACCESS_KEY: z.string().trim().optional(),
});

export type BackendConfig = ReturnType<typeof readConfig>;

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    flightProvider: parsed.FLIGHT_PROVIDER,
    aviationStackAccessKey: parsed.AVIATIONSTACK_ACCESS_KEY || null,
  };
}
