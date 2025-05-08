import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Durata della cache in ms (5 minuti)
const CACHE_TIME = 5 * 60 * 1000;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  // Aggiunta di un timeout per evitare richieste che rimangono bloccate
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15 secondi di timeout
  
  // Debug
  console.log("API Request:", url);
  
  // Assicuriamoci che le headers siano impostate correttamente
  const headers = {
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers || {})
  };
  
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers,
    body: options?.body,
    credentials: "include",
    signal: controller.signal,
    ...options
  });
  
  clearTimeout(id);
  await throwIfResNotOk(res);
  
  // Parse JSON and return the data directly
  const data = await res.json();
  console.log("API Response data:", data);
  return data;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Aggiunta di un timeout per evitare richieste che rimangono bloccate
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15 secondi di timeout
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        signal: controller.signal,
      });
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
  
      await throwIfResNotOk(res);
      return await res.json();
    } finally {
      clearTimeout(id);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minuto di validità cache prima che diventi stale
      gcTime: CACHE_TIME, // 5 minuti di caching (in TanStack v5 gcTime sostituisce cacheTime)
      retry: 1, // Un retry in caso di errore
      retryDelay: 1000, // Ritardo di 1 secondo prima del retry
    },
    mutations: {
      retry: 1, // Un retry in caso di errore
      retryDelay: 1000, // Ritardo di 1 secondo prima del retry
    },
  },
});
