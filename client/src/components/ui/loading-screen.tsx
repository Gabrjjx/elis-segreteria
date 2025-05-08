import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-primary-foreground animate-pulse" />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}