import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const Success = () => {
  const navigate = useNavigate();
  const { checkSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status immediately
    checkSubscription();
    
    // Redirect to home after 5 seconds
    const timeout = setTimeout(() => {
      navigate('/');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate, checkSubscription]);

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-green-500/10 p-4 rounded-full">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Premium!</h1>
          <p className="text-muted-foreground">
            Your subscription has been activated successfully. You now have unlimited access to turbulence tracking and flight alerts.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 justify-center text-sm">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-medium">Unlimited turbulence checks</span>
          </div>
          <div className="flex items-center gap-2 justify-center text-sm">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-medium">Real-time flight alerts</span>
          </div>
          <div className="flex items-center gap-2 justify-center text-sm">
            <Cloud className="w-4 h-4 text-primary" />
            <span className="font-medium">Priority support</span>
          </div>
        </div>

        <Button onClick={() => navigate('/')} className="w-full" size="lg">
          Start Tracking Flights
        </Button>

        <p className="text-xs text-muted-foreground">
          Redirecting to dashboard in 5 seconds...
        </p>
      </div>
    </div>
  );
};

export default Success;
