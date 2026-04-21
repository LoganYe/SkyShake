import { useState } from "react";
import { Search, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FlightSearchProps {
  onSearchComplete: (data: any) => void;
}

export const FlightSearch = ({ onSearchComplete }: FlightSearchProps) => {
  const [flightNumber, setFlightNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!flightNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a flight number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log("Searching for flight:", flightNumber);
      
      const { data, error } = await supabase.functions.invoke('get-flight-data', {
        body: { flightNumber: flightNumber.trim() },
      });

      if (error) throw error;

      console.log("Flight data received:", data);
      onSearchComplete(data);

      toast({
        title: "Flight Found",
        description: `Loaded data for ${data.flightNumber}`,
      });

    } catch (error) {
      console.error("Error fetching flight data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch flight data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-card rounded-xl p-6 shadow-2xl border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Plane className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Track Your Flight</h2>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter flight number (e.g., UA857)"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
              className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          
          <Button 
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "Searching..." : "Check Turbulence"}
          </Button>
        </div>
      </div>
    </div>
  );
};
