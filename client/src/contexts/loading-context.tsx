import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTimeoutId, setLoadingTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startLoading = () => {
    if (loadingTimeoutId) {
      clearTimeout(loadingTimeoutId);
      setLoadingTimeoutId(null);
    }
    setIsLoading(true);
  };

  const stopLoading = () => {
    // Aggiungiamo un piccolo delay per evitare flickering
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    
    setLoadingTimeoutId(timeoutId);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}