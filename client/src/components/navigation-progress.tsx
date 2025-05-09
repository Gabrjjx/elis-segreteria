import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { HammerSickle } from "@/components/ui/hammer-sickle";

const NavigationProgress = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [location] = useLocation();
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;
    
    const startProgress = () => {
      setVisible(true);
      setProgress(0);
      
      // Simulate progress incrementing to 80% quickly
      interval = setInterval(() => {
        setProgress(prevProgress => {
          if (prevProgress >= 80) {
            clearInterval(interval);
            return prevProgress;
          }
          return prevProgress + (80 - prevProgress) * 0.2;
        });
      }, 100);
      
      // After navigation is complete, finish to 100%
      timeout = setTimeout(() => {
        setProgress(100);
        // Hide the progress bar after completion
        setTimeout(() => {
          setVisible(false);
        }, 200);
      }, 500);
    };
    
    startProgress();
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [location]);
  
  if (!visible && progress === 0) return null;
  
  return (
    <>
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 h-1.5 bg-primary z-50 transition-opacity duration-200",
          progress === 100 ? "opacity-0" : "opacity-100"
        )}
        style={{ width: `${progress}%`, transition: "width 0.2s ease-in-out" }}
      />
      
      {/* Icona falce e martello che si muove con la barra di progresso */}
      <div 
        className={cn(
          "fixed top-1 z-50 transition-opacity duration-200",
          progress === 100 ? "opacity-0" : "opacity-100"
        )}
        style={{ 
          left: `${progress}%`, 
          transform: "translateX(-50%)", 
          transition: "left 0.2s ease-in-out" 
        }}
      >
        <HammerSickle width={16} height={16} />
      </div>
    </>
  );
};

export default NavigationProgress;