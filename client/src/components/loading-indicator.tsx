import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { HammerSickle } from "@/components/ui/hammer-sickle";

export function LoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const [location] = useLocation();
  
  // Simulate loading when location changes
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [location]);
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-white/80 py-1 px-3 rounded-full shadow-sm flex items-center gap-2">
        <div className="animate-spin">
          <HammerSickle width={16} height={16} />
        </div>
        <span className="text-xs font-medium">Caricamento</span>
      </div>
    </div>
  );
}