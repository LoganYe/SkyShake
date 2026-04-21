import { useCallback, useEffect, useState } from "react";

import { isMockMode } from "@/config/runtime";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { SubscriptionStatus } from "@/types/flight";

import { useAuth } from "./useAuth";

const mockCheckoutResponse = {
  url: "mock://checkout",
};

const createInitialSubscriptionStatus = (): SubscriptionStatus => ({
  subscribed: false,
  free_quota_remaining: isMockMode ? 3 : 1,
  subscription_status: "inactive",
  subscription_end: null,
});

type ProfileRecord = Pick<Tables<"profiles">, "free_quota_remaining" | "subscription_status">;

export const useSubscription = () => {
  const { user, isMockAuth } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(createInitialSubscriptionStatus);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscriptionStatus(createInitialSubscriptionStatus());
      setLoading(false);
      return;
    }

    if (isMockAuth) {
      setSubscriptionStatus((currentStatus) => {
        const nextSubscriptionStatus = currentStatus.subscribed ? "active" : "inactive";
        return nextSubscriptionStatus === currentStatus.subscription_status
          ? currentStatus
          : {
              ...currentStatus,
              subscription_status: nextSubscriptionStatus,
            };
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke<SubscriptionStatus>("check-subscription");

      if (error) {
        throw error;
      }

      const nextStatus = {
        subscribed: data?.subscribed ?? false,
        free_quota_remaining: data?.free_quota_remaining ?? 0,
        subscription_status: data?.subscription_status ?? "inactive",
        subscription_end: data?.subscription_end ?? null,
      };

      setSubscriptionStatus(nextStatus);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [isMockAuth, user]);

  useEffect(() => {
    void checkSubscription();

    if (isMockAuth || !user) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkSubscription();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [checkSubscription, isMockAuth, user]);

  const createCheckout = useCallback(async () => {
    if (isMockAuth) {
      setSubscriptionStatus((currentStatus) => ({
        ...currentStatus,
        subscribed: true,
        subscription_status: "active",
        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));
      return mockCheckoutResponse;
    }

    try {
      const { data, error } = await supabase.functions.invoke<{ url?: string }>("create-checkout");

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }

      return data;
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  }, [isMockAuth]);

  const manageSubscription = useCallback(async () => {
    if (isMockAuth) {
      return mockCheckoutResponse;
    }

    try {
      const { data, error } = await supabase.functions.invoke<{ url?: string }>("customer-portal");

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }

      return data;
    } catch (error) {
      console.error("Error opening customer portal:", error);
      throw error;
    }
  }, [isMockAuth]);

  const decrementQuota = useCallback(async () => {
    if (!user) {
      return false;
    }

    if (isMockAuth) {
      if (subscriptionStatus.subscribed) {
        return true;
      }

      if (subscriptionStatus.free_quota_remaining <= 0) {
        return false;
      }

      setSubscriptionStatus((currentStatus) => ({
        ...currentStatus,
        free_quota_remaining: Math.max(0, currentStatus.free_quota_remaining - 1),
      }));
      return true;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("free_quota_remaining, subscription_status")
        .eq("id", user.id)
        .single<ProfileRecord>();

      if (error) {
        throw error;
      }

      if (!profile) {
        throw new Error("Profile not found");
      }

      if (profile.subscription_status === "active") {
        return true;
      }

      const currentQuota = profile.free_quota_remaining ?? 0;
      if (currentQuota <= 0) {
        return false;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ free_quota_remaining: currentQuota - 1 })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      await checkSubscription();
      return true;
    } catch (error) {
      console.error("Error decrementing quota:", error);
      return false;
    }
  }, [checkSubscription, isMockAuth, subscriptionStatus.free_quota_remaining, subscriptionStatus.subscribed, user]);

  return {
    ...subscriptionStatus,
    loading,
    checkSubscription,
    createCheckout,
    decrementQuota,
    manageSubscription,
  };
};
