import { useState } from "react";
import { Search, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FlightSearchProps {
  isLoading?: boolean;
  onSearch: (flightNumber: string) => Promise<void> | void;
}

export const FlightSearch = ({ isLoading = false, onSearch }: FlightSearchProps) => {
  const [flightNumber, setFlightNumber] = useState("");
  const { toast } = useToast();

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!flightNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a flight number",
        variant: "destructive",
      });
      return;
    }

    await onSearch(flightNumber.trim());
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <form className="bg-card rounded-xl p-6 shadow-2xl border border-border" onSubmit={handleSearch}>
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
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoading ? "Searching..." : "Check Turbulence"}
          </Button>
        </div>
      </form>
    </div>
  );
};
