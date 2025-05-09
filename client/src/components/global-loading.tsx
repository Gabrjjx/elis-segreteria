import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { HammerSickle } from "@/components/ui/hammer-sickle";

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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white p-8 rounded-xl shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <HammerSickle width={70} height={70} />
          </div>
          <p className="text-lg font-medium text-primary animate-pulse">Caricamento dati in corso...</p>
        </div>
      </div>
    </div>
  );
}