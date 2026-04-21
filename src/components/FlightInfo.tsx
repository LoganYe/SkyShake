import { Calendar, Clock, Plane } from "lucide-react";

interface FlightInfoProps {
  flightData?: {
    flightNumber: string;
    airline: string;
    departure: string;
    departureAirport?: string;
    arrival: string;
    arrivalAirport?: string;
    departureTime: string;
    arrivalTime: string;
    aircraft: string;
    status: string;
    isMockData?: boolean;
    error?: string;
  };
}

export const FlightInfo = ({ flightData }: FlightInfoProps) => {
  if (!flightData) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = () => {
    const departure = new Date(flightData.departureTime);
    const arrival = new Date(flightData.arrivalTime);
    const durationMs = arrival.getTime() - departure.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground">{flightData.flightNumber}</h3>
          <p className="text-sm text-muted-foreground">{flightData.airline}</p>
          {flightData.isMockData && flightData.error && (
            <p className="text-xs text-warning mt-1">{flightData.error}</p>
          )}
          {flightData.isMockData && !flightData.error && (
            <p className="text-xs text-muted-foreground mt-1">Demo data - real flight data unavailable</p>
          )}
        </div>
        <div className="bg-primary/10 p-3 rounded-lg">
          <Plane className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Departure</p>
            <p className="text-lg font-semibold text-foreground">{flightData.departure}</p>
            <p className="text-xs text-muted-foreground">
              {flightData.departureAirport || formatTime(flightData.departureTime)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Arrival</p>
            <p className="text-lg font-semibold text-foreground">{flightData.arrival}</p>
            <p className="text-xs text-muted-foreground">
              {flightData.arrivalAirport || formatTime(flightData.arrivalTime)}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Departure:</span>
            <span className="text-foreground font-medium">{formatDate(flightData.departureTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Duration:</span>
            <span className="text-foreground font-medium">{calculateDuration()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Aircraft:</span>
            <span className="text-foreground font-medium">{flightData.aircraft}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
