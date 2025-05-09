import React from "react";
import { HammerSickle } from "./hammer-sickle";

interface PageLoaderProps {
  visible?: boolean;
}

export function PageLoader({ visible = true }: PageLoaderProps) {
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <div className="animate-spin">
          <HammerSickle width={80} height={80} />
        </div>
        <p className="mt-4 text-lg font-bold text-primary">Caricamento in corso...</p>
      </div>
    </div>
  );
}