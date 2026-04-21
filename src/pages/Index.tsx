import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FlightSearch } from "@/components/FlightSearch";
import { FlightInfo } from "@/components/FlightInfo";
import { TurbulenceIndicator } from "@/components/TurbulenceIndicator";
import { FlightMap } from "@/components/FlightMap";
import { FlightRoute } from "@/components/FlightRoute";
import { PaywallModal } from "@/components/PaywallModal";
import { RuntimeModeNotice } from "@/components/debug/RuntimeModeNotice";
import { Cloud, LogOut, Crown } from "lucide-react";
import { BRAND } from "@/config/brand";
import { getAirportCoords } from "@/data/airports";
import { getTurbulenceSeverity } from "@/lib/turbulence";
import { useAuth } from "@/hooks/useAuth";
import { useFlightTracking } from "@/hooks/useFlightTracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const { user, loading, signOut, isMockAuth } = useAuth();
  const {
    flightData,
    turbulenceData,
    isSearching,
    showPaywall,
    setShowPaywall,
    searchFlight,
    handleUpgrade,
    subscribed,
    free_quota_remaining,
    manageSubscription,
  } = useFlightTracking();
  const navigate = useNavigate();
  const departureCoords = flightData ? getAirportCoords(flightData.departure) : null;
  const arrivalCoords = flightData ? getAirportCoords(flightData.arrival) : null;

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user && !isMockAuth) {
      navigate("/auth");
    }
  }, [isMockAuth, loading, navigate, user]);

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
    <div className="min-h-screen bg-gradient-sky">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Cloud className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{BRAND.name}</h1>
                <p className="text-xs text-muted-foreground">{BRAND.tagline}</p>
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
              {isMockAuth ? (
                <Badge variant="secondary" className="text-xs">
                  Local Debug Session
                </Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <RuntimeModeNotice />

        {/* Search Section */}
        <FlightSearch isLoading={isSearching} onSearch={searchFlight} />

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

            {departureCoords && arrivalCoords ? (
              <FlightMap
                departure={{
                  ...departureCoords,
                  code: flightData.departure,
                }}
                arrival={{
                  ...arrivalCoords,
                  code: flightData.arrival,
                }}
                currentPosition={
                  flightData.latitude !== null && flightData.longitude !== null
                    ? { lat: flightData.latitude, lon: flightData.longitude }
                    : undefined
                }
                turbulenceData={turbulenceData?.waypoints?.map((waypoint) => ({
                  lat: waypoint.latitude,
                  lon: waypoint.longitude,
                  severity: getTurbulenceSeverity(waypoint.label),
                }))}
              />
            ) : (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
                Route map is unavailable because one or both airport codes are missing from the local coordinate dataset.
              </div>
            )}
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
