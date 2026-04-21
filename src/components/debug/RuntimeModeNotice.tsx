import { AlertTriangle, Wrench } from "lucide-react";

import { runtimeConfig } from "@/config/runtime";

export const RuntimeModeNotice = () => {
  if (!runtimeConfig.usingMockBackend && !runtimeConfig.liveModeRequestedWithoutConfig) {
    return null;
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-warning/20 p-2">
          {runtimeConfig.liveModeRequestedWithoutConfig ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Wrench className="h-4 w-4 text-warning" />
          )}
        </div>
        <div className="space-y-1">
          <p className="font-medium">
            {runtimeConfig.liveModeRequestedWithoutConfig
              ? "Live mode was requested, but required Supabase env vars are missing."
              : "SkyShake is running in local mock mode."}
          </p>
          <p className="text-muted-foreground">
            Local debugging is available without Supabase or Stripe. To switch to live mode, set{" "}
            <code className="font-mono text-foreground">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</code>, then
            restart the dev server.
          </p>
        </div>
      </div>
    </div>
  );
};
