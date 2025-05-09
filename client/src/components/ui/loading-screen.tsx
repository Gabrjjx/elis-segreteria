import React from 'react';
import { cn } from '@/lib/utils';
import { HammerSickle } from './hammer-sickle';

interface LoadingScreenProps {
  fullScreen?: boolean;
  className?: string;
  text?: string;
}

export function LoadingScreen({ 
  fullScreen = false, 
  className = '',
  text = 'Caricamento...' 
}: LoadingScreenProps) {
  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-4',
    fullScreen ? 'fixed inset-0 z-50 bg-background' : 'h-full w-full min-h-[200px]',
    className
  );

  return (
    <div className={containerClasses}>
      <div className="relative animate-spin">
        <HammerSickle width={60} height={60} className="text-primary" />
      </div>
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}