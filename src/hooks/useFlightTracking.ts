import { useState } from "react";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { fetchFlightData, fetchTurbulenceReport } from "@/services/tracking";
import type { FlightData, TurbulenceReport } from "@/types/flight";

export const useFlightTracking = () => {
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [turbulenceData, setTurbulenceData] = useState<TurbulenceReport | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const { sendTurbulenceAlert } = usePushNotifications();
  const { toast } = useToast();
  const subscription = useSubscription();

  const searchFlight = async (flightNumber: string) => {
    setIsSearching(true);

    try {
      const nextFlightData = await fetchFlightData(flightNumber);
      setFlightData(nextFlightData);

      const isUnavailableFlight =
        nextFlightData.status === "not found" ||
        nextFlightData.departure === "N/A" ||
        nextFlightData.arrival === "N/A";

      if (isUnavailableFlight) {
        setTurbulenceData(null);
        toast({
          title: "Flight unavailable",
          description: nextFlightData.error ?? `No live schedule data was found for ${nextFlightData.flightNumber}.`,
          variant: "destructive",
        });
        return;
      }

      const hasAccess = await subscription.decrementQuota();

      if (!hasAccess) {
        setShowPaywall(true);
        return;
      }

      const nextTurbulenceData = await fetchTurbulenceReport(nextFlightData);
      setTurbulenceData(nextTurbulenceData);

      toast({
        title: "Flight loaded",
        description: `Loaded turbulence outlook for ${nextFlightData.flightNumber}.`,
      });

      if (nextTurbulenceData.overallScore >= 0.6) {
        await sendTurbulenceAlert(nextFlightData.flightNumber, nextTurbulenceData.overallLabel);
        toast({
          title: "Turbulence alert",
          description: `${nextTurbulenceData.overallLabel} turbulence expected on ${nextFlightData.flightNumber}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load flight data.";
      setTurbulenceData(null);
      toast({
        title: "Search failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      await subscription.createCheckout();
      setShowPaywall(false);
      await subscription.checkSubscription();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start checkout process.";
      toast({
        title: "Upgrade failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return {
    flightData,
    turbulenceData,
    isSearching,
    showPaywall,
    setShowPaywall,
    searchFlight,
    handleUpgrade,
    ...subscription,
  };
};
