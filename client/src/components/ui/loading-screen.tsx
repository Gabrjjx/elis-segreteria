import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  fullScreen?: boolean;
  className?: string;
  text?: string;
}

export function LoadingScreen({ 
  fullScreen = false, 
  className, 
  text = "Caricamento..."
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      fullScreen ? "fixed inset-0 bg-background/90 backdrop-blur-sm z-50" : "w-full p-8",
      className
    )}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}