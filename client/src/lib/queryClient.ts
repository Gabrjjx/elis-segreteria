import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Durata della cache in ms (5 minuti)
const CACHE_TIME = 5 * 60 * 1000;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Prova a leggere il corpo come JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorJson = await res.clone().json();
        console.error("API Error (JSON):", errorJson);
        throw new Error(`${res.status}: ${JSON.stringify(errorJson)}`);
      } else {
        // Fallback a testo normale
        const text = await res.text();
        console.error("API Error (Text):", text || res.statusText);
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (parseError) {
      // Se non riusciamo a fare il parsing, utilizza lo statusText
      console.error("API Error (Parse failed):", parseError);
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  // Aggiunta di un timeout per evitare richieste che rimangono bloccate
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15 secondi di timeout
  
  // Debug
  console.log(`API Request: ${method} ${endpoint}`, data);
  
  try {
    // Creare le opzioni per la richiesta
    const options: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: "include",
      signal: controller.signal
    };
    
    // Aggiungi il corpo solo per metodi diversi da GET
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }
    
    const res = await fetch(endpoint, options);
    
    clearTimeout(id);
    await throwIfResNotOk(res);
    
    // Parse JSON and return the data directly
    const responseData = await res.json();
    console.log("API Response data:", responseData);
    return responseData;
  } catch (error) {
    console.error(`API Error in ${method} ${endpoint}:`, error);
    throw error;
  } finally {
    clearTimeout(id);
  }
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
