import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function MiniLoading() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isFetching || isMutating) {
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 300); // Mostra dopo un piccolo ritardo per evitare flash
    } else {
      setIsVisible(false);
    }
    
    return () => {
      clearTimeout(timeout);
    };
  }, [isFetching, isMutating]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-2 right-2 z-40 pointer-events-none">
      <div className="bg-white/80 dark:bg-gray-800/80 p-1.5 rounded-full shadow-sm flex items-center gap-1.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    </div>
  );
}