import type { AppMode } from "@/types/flight";

const MOCK_SUPABASE_URL = "https://mock-project.supabase.co";
const MOCK_SUPABASE_PUBLISHABLE_KEY = "mock-publishable-key";

const readEnv = (value?: string) => value?.trim() || undefined;

const requestedMode = readEnv(import.meta.env.VITE_APP_MODE)?.toLowerCase();
const supabaseUrl = readEnv(import.meta.env.VITE_SUPABASE_URL);
const supabasePublishableKey = readEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);
const appMode: AppMode =
  requestedMode === "mock" || !hasSupabaseConfig
    ? "mock"
    : requestedMode === "live" || hasSupabaseConfig
      ? "live"
      : "mock";

export const runtimeConfig = {
  appMode,
  hasSupabaseConfig,
  supabaseUrl: supabaseUrl ?? MOCK_SUPABASE_URL,
  supabasePublishableKey: supabasePublishableKey ?? MOCK_SUPABASE_PUBLISHABLE_KEY,
  usingMockBackend: appMode === "mock",
  liveModeRequestedWithoutConfig: requestedMode === "live" && !hasSupabaseConfig,
} as const;

export const isMockMode = runtimeConfig.usingMockBackend;
