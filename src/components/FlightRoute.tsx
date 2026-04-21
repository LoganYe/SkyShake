import { MapPin, Plane } from "lucide-react";

import type { TurbulenceWaypoint } from "@/types/flight";

interface FlightRouteProps {
  waypoints?: TurbulenceWaypoint[];
  departure?: string;
  arrival?: string;
}

export const FlightRoute = ({ waypoints, departure = "DEP", arrival = "ARR" }: FlightRouteProps) => {
  if (!waypoints || waypoints.length === 0) {
    return null;
  }

  // Group waypoints for display (show start, mid, end + high turbulence points)
  const significantWaypoints = [
    waypoints[0],
    ...waypoints.filter(w => w.turbulenceScore >= 0.5).slice(0, 3),
    waypoints[Math.floor(waypoints.length / 2)],
    waypoints[waypoints.length - 1]
  ].filter((w, i, arr) => arr.findIndex(x => x.waypoint === w.waypoint) === i)
   .sort((a, b) => a.waypoint - b.waypoint);

  const getSegmentColor = (score: number) => {
    if (score < 0.3) return "bg-success";
    if (score < 0.6) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <Plane className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Flight Path Analysis</h3>
        <span className="text-xs text-muted-foreground ml-auto">{waypoints.length} waypoints analyzed</span>
      </div>

      <div className="space-y-4">
        {significantWaypoints.map((waypoint, index) => {
          const isFirst = waypoint.waypoint === 0;
          const isLast = waypoint.waypoint === waypoints.length - 1;
          const name = isFirst ? departure : isLast ? arrival : `WP ${waypoint.waypoint}`;
          
          return (
            <div key={waypoint.waypoint} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <MapPin className="w-4 h-4 text-primary" />
                {index < significantWaypoints.length - 1 && (
                  <div className={`w-0.5 h-12 ${getSegmentColor(waypoint.turbulenceScore)} my-1`} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      waypoint.turbulenceScore < 0.3 ? 'text-success' :
                      waypoint.turbulenceScore < 0.6 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {waypoint.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(waypoint.turbulenceScore * 100)}%
                    </span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <div>Wind: {Math.round(waypoint.windSpeed)} km/h, Gusts: {Math.round(waypoint.windGusts)} km/h</div>
                  <div>Shear: {waypoint.windShear.toFixed(2)} km/h/40m, Temp: {Math.round(waypoint.temperature)}°C</div>
                  {waypoint.cape > 0 && <div>CAPE: {Math.round(waypoint.cape)} J/kg</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
