import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FlightSearch } from "@/components/FlightSearch";
import { FlightInfo } from "@/components/FlightInfo";
import { TurbulenceIndicator } from "@/components/TurbulenceIndicator";
import { FlightMap } from "@/components/FlightMap";
import { FlightRoute } from "@/components/FlightRoute";
import { PaywallModal } from "@/components/PaywallModal";
import { Cloud, LogOut, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import { getAirportCoords } from "@/data/airports";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [flightData, setFlightData] = useState<any>(null);
  const [turbulenceData, setTurbulenceData] = useState<any>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { sendTurbulenceAlert } = usePushNotifications();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const { subscribed, free_quota_remaining, decrementQuota, createCheckout, checkSubscription, manageSubscription } = useSubscription();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSearchComplete = async (data: any) => {
    // Check quota before proceeding
    const hasAccess = await decrementQuota();
    
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }

    setFlightData(data);
    
    // Get departure and arrival coordinates
    const departureCoords = getAirportCoords(data.departure);
    const arrivalCoords = getAirportCoords(data.arrival);

    try {
      const { data: turbData, error } = await supabase.functions.invoke('get-turbulence-data', {
        body: { 
          departureLat: departureCoords.lat,
          departureLon: departureCoords.lon,
          arrivalLat: arrivalCoords.lat,
          arrivalLon: arrivalCoords.lon,
          aircraftType: data.aircraft || 'A320'
        },
      });

      if (error) throw error;

      setTurbulenceData(turbData);

      // Send alert if turbulence is severe
      if (turbData.overallScore >= 0.6) {
        await sendTurbulenceAlert(data.flightNumber, turbData.overallLabel);
        toast({
          title: "Turbulence Alert",
          description: `${turbData.overallLabel} turbulence expected on ${data.flightNumber}`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error fetching turbulence data:", error);
    }
  };

  const handleUpgrade = async () => {
    try {
      await createCheckout();
      setShowPaywall(false);
      
      // Refresh subscription status after a delay
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sky flex items-center justify-center">
        <div className="text-center">
          <Cloud className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-sky">\n      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Cloud className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Turbulence Tracker</h1>
                <p className="text-xs text-muted-foreground">Real-time flight turbulence predictions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {subscribed ? (
                <>
                  <Badge variant="default" className="bg-gradient-primary">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                  <Button variant="outline" size="sm" onClick={manageSubscription}>
                    Manage Subscription
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="text-xs">
                    {free_quota_remaining} free check{free_quota_remaining !== 1 ? 's' : ''} left
                  </Badge>
                  <Button variant="default" size="sm" onClick={handleUpgrade}>
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Search Section */}
        <FlightSearch onSearchComplete={handleSearchComplete} />

        {/* Results Section - shown after search */}
        {flightData && (
          <div className="space-y-4">
            <FlightInfo flightData={flightData} />
            
            {turbulenceData && (
              <TurbulenceIndicator 
                score={turbulenceData.overallScore} 
                label={turbulenceData.overallLabel}
                windSpeed={turbulenceData.waypoints?.[0]?.windSpeed}
                windGusts={turbulenceData.waypoints?.[0]?.windGusts}
              />
            )}
            
            
            <FlightRoute 
              waypoints={turbulenceData?.waypoints}
              departure={flightData.departure}
              arrival={flightData.arrival}
            />

            <FlightMap
              departure={{
                ...getAirportCoords(flightData.departure),
                code: flightData.departure
              }}
              arrival={{
                ...getAirportCoords(flightData.arrival),
                code: flightData.arrival
              }}
              currentPosition={
                flightData.latitude && flightData.longitude
                  ? { lat: flightData.latitude, lon: flightData.longitude }
                  : undefined
              }
              turbulenceData={turbulenceData?.waypoints?.map((w: any) => ({
                lat: w.latitude,
                lon: w.longitude,
                severity: w.label.toLowerCase()
              }))}
            />
          </div>
        )}

        {/* Info Footer */}
        <div className="bg-card/50 rounded-xl p-4 border border-border/50">
          <p className="text-xs text-center text-muted-foreground">
            Advanced turbulence predictions using EDR, wind shear, CAPE analysis across {turbulenceData?.totalWaypoints || 15} waypoints. 
            Powered by Open-Meteo weather data and AeroDataBox flight tracking. Always follow crew instructions during your flight.
          </p>
        </div>
      </div>

      <PaywallModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};

export default Index;
