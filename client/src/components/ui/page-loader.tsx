import React from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  visible?: boolean;
}

export function PageLoader({ visible = true }: PageLoaderProps) {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center rounded-xl bg-white dark:bg-gray-800 p-8 shadow-xl">
        <Loader2 className="h-20 w-20 animate-spin text-primary" />
        <p className="mt-4 text-lg font-bold text-primary">Caricamento in corso...</p>
      </div>
    </div>
  );
}