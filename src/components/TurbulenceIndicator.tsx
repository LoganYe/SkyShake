import { Cloud, AlertTriangle, CheckCircle } from "lucide-react";

interface TurbulenceIndicatorProps {
  score: number;
  label: "Smooth" | "Moderate" | "Severe";
  windSpeed?: number;
  windGusts?: number;
}

export const TurbulenceIndicator = ({ 
  score, 
  label, 
  windSpeed, 
  windGusts 
}: TurbulenceIndicatorProps) => {
  const getGradient = () => {
    if (score < 0.3) return "bg-gradient-success";
    if (score < 0.6) return "bg-gradient-to-r from-warning to-warning/80";
    return "bg-gradient-danger";
  };

  const getIcon = () => {
    if (score < 0.3) return <CheckCircle className="w-6 h-6 text-success" />;
    if (score < 0.6) return <Cloud className="w-6 h-6 text-warning" />;
    return <AlertTriangle className="w-6 h-6 text-destructive" />;
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{label}</h3>
            <p className="text-sm text-muted-foreground">Turbulence Risk</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-foreground">
          {Math.round(score * 100)}%
        </div>
      </div>
      
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full ${getGradient()} transition-all duration-500`}
          style={{ width: `${score * 100}%` }}
        />
      </div>

      {(windSpeed !== undefined || windGusts !== undefined) && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {windSpeed !== undefined && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">Wind Speed</p>
              <p className="text-foreground font-medium">{windSpeed.toFixed(1)} km/h</p>
            </div>
          )}
          {windGusts !== undefined && (
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">Wind Gusts</p>
              <p className="text-foreground font-medium">{windGusts.toFixed(1)} km/h</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
