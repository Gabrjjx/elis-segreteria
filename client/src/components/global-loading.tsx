import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function GlobalLoading() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isVisible, setIsVisible] = useState(false);
  
  // Aggiungiamo un delay per evitare flash di loading su operazioni veloci
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isFetching || isMutating) {
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 500); // Mostra il loading solo se l'operazione dura più di 500ms
    } else {
      setIsVisible(false);
    }
    
    return () => {
      clearTimeout(timeout);
    };
  }, [isFetching, isMutating]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg flex items-center space-x-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-primary">Caricamento...</p>
      </div>
    </div>
  );
}