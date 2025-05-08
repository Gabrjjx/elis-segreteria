import OpenAI from "openai";
import { Service, MaintenanceRequest } from "@shared/schema";
import { storage } from "../storage";

// Inizializza il client OpenAI con la chiave API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interfaccia per i risultati della ricerca
export interface SearchResult {
  type: 'service' | 'maintenance';
  item: Service | MaintenanceRequest;
  matchScore: number;
  highlight?: string;
}

/**
 * Genera embedding per una query di ricerca utilizzando OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Errore nella generazione dell'embedding:", error);
    throw error;
  }
}

/**
 * Calcola la similarità del coseno tra due vettori di embedding
 */
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("I vettori devono avere la stessa dimensione");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Genera un contesto per un servizio che può essere utilizzato per la ricerca semantica
 */
function generateServiceContext(service: Service): string {
  const serviceType = service.type === 'siglatura' ? 'siglatura' : 
                      service.type === 'happy_hour' ? 'happy hour' : 
                      'riparazione';
  
  const paymentStatus = service.status === 'paid' ? 'pagato' : 'in attesa di pagamento';
  
  return `Servizio di ${serviceType} per ${service.sigla} del ${new Date(service.date).toLocaleDateString('it-IT')}. 
          Importo: ${service.amount} euro, stato pagamento: ${paymentStatus}.
          ${service.notes ? 'Note: ' + service.notes : ''}`;
}

/**
 * Genera un contesto per una richiesta di manutenzione che può essere utilizzato per la ricerca semantica
 */
function generateMaintenanceContext(request: MaintenanceRequest): string {
  return `Richiesta di manutenzione per la stanza ${request.roomNumber} richiesta da ${request.requesterName} 
          il ${new Date(request.requestDate).toLocaleDateString('it-IT')}. 
          Priorità: ${request.priority}, stato: ${request.status}. 
          Descrizione: ${request.description}`;
}

/**
 * Analizza la query naturale dell'utente tramite l'AI per estrarre parametri di ricerca
 * Implementazione semplificata che non utilizza OpenAI in caso di errori di quota
 */
export async function analyzeSearchQuery(query: string): Promise<{
  naturalLanguageResponse: string,
  searchParams: {
    serviceType?: string,
    dateFrom?: string,
    dateTo?: string,
    paymentStatus?: string,
    sigla?: string,
    minAmount?: number,
    maxAmount?: number,
    maintenanceStatus?: string,
    roomNumber?: string,
    priority?: string
  }
}> {
  try {
    // Implementazione semplificata che non usa OpenAI
    let searchParams: any = {};
    
    // Analisi basica basata su parole chiave
    const lowerQuery = query.toLowerCase();
    
    // Ricerca per tipo di servizio
    if (lowerQuery.includes('siglatura')) {
      searchParams.type = 'siglatura';
    } else if (lowerQuery.includes('happy hour') || lowerQuery.includes('happy_hour')) {
      searchParams.type = 'happy_hour';
    } else if (lowerQuery.includes('riparazione') || lowerQuery.includes('riparazioni')) {
      searchParams.type = 'riparazione';
    }
    
    // Ricerca per stato pagamento
    if (lowerQuery.includes('non pagat') || lowerQuery.includes('in attesa') || lowerQuery.includes('unpaid') || 
      (lowerQuery.includes('pagament') && lowerQuery.includes('attesa'))) {
      searchParams.status = 'unpaid';
    } else if (lowerQuery.includes('pagat') || lowerQuery.includes('paid')) {
      searchParams.status = 'paid';
    }
    
    // Estrazione date (implementazione semplificata)
    if (lowerQuery.includes('maggio')) {
      const today = new Date();
      searchParams.dateFrom = new Date(today.getFullYear(), 4, 1).toISOString(); // Maggio è mese 4 (zero-based)
      searchParams.dateTo = new Date(today.getFullYear(), 4, 31).toISOString();
    }
    
    // Costruisci una risposta naturale in base ai parametri rilevati
    let naturalLanguageResponse = "Sto cercando ";
    
    if (searchParams.type) {
      const tipoServizio = searchParams.type === 'siglatura' ? 'servizi di siglatura' : 
                         searchParams.type === 'happy_hour' ? 'consumazioni happy hour' : 
                         'servizi di riparazione';
      naturalLanguageResponse += tipoServizio;
    } else {
      naturalLanguageResponse += "tutti i servizi";
    }
    
    if (searchParams.status) {
      naturalLanguageResponse += searchParams.status === 'paid' ? ' pagati' : ' non pagati';
    }
    
    if (searchParams.dateFrom && searchParams.dateTo) {
      naturalLanguageResponse += " nel mese di maggio";
    }
    
    naturalLanguageResponse += ".";
    
    if (Object.keys(searchParams).length === 0) {
      naturalLanguageResponse = "Non sono riuscito a capire esattamente cosa stai cercando. Mostro risultati generici.";
    }
    
    return {
      naturalLanguageResponse,
      searchParams
    };
  } catch (error) {
    console.error("Errore durante l'analisi della query:", error);
    // Restituisci una risposta generica in caso di errore
    return {
      naturalLanguageResponse: "Non sono riuscito a interpretare la tua richiesta. Prova a essere più specifico.",
      searchParams: {}
    };
  }
}

/**
 * Esegue una ricerca intelligente tra servizi e richieste di manutenzione
 */
export async function semanticSearch(query: string, limit: number = 10): Promise<{
  results: SearchResult[],
  explanation: string
}> {
  try {
    // Gestione senza API OpenAI (fallback mode)
    let searchParams: any = {};
    
    // Ricerca basica basata su parole chiave senza usare OpenAI
    const lowerQuery = query.toLowerCase();
    
    // Ricerca per tipo di servizio
    if (lowerQuery.includes('siglatura')) {
      searchParams.type = 'siglatura';
    } else if (lowerQuery.includes('happy hour') || lowerQuery.includes('happy_hour')) {
      searchParams.type = 'happy_hour';
    } else if (lowerQuery.includes('riparazione') || lowerQuery.includes('riparazioni')) {
      searchParams.type = 'riparazione';
    }
    
    // Ricerca per stato pagamento
    if (lowerQuery.includes('non pagat') || lowerQuery.includes('in attesa') || lowerQuery.includes('unpaid') || 
      (lowerQuery.includes('pagament') && lowerQuery.includes('attesa'))) {
      searchParams.status = 'unpaid';
    } else if (lowerQuery.includes('pagat') || lowerQuery.includes('paid')) {
      searchParams.status = 'paid';
    }
    
    // Estrazione date (implementazione semplificata)
    if (lowerQuery.includes('maggio')) {
      const today = new Date();
      searchParams.dateFrom = new Date(today.getFullYear(), 4, 1).toISOString(); // Maggio è mese 4 (zero-based)
      searchParams.dateTo = new Date(today.getFullYear(), 4, 31).toISOString();
    }
    
    // Ottieni servizi e richieste di manutenzione dal database
    console.log("Parametri di ricerca:", searchParams);
    const servicesResponse = await storage.getServices({
      page: 1,
      pageSize: 100,
      ...searchParams
    });
    
    const maintenanceResponse = await storage.getMaintenanceRequests({
      page: 1,
      pageSize: 100,
      ...searchParams
    });
    
    // Combina i risultati per la ricerca
    const services = servicesResponse.services;
    const maintenanceRequests = maintenanceResponse.requests;
    
    // Risultati di ricerca (senza embedding che causano il problema di quota)
    const serviceResults: SearchResult[] = services.map(service => {
      const context = generateServiceContext(service);
      
      // Calcolo di un punteggio di rilevanza semplificato basato sulla corrispondenza di parole chiave
      let matchScore = 0.5; // Punteggio base
      const contextLower = context.toLowerCase();
      
      // Aumenta il punteggio se contiene parole chiave della query
      query.toLowerCase().split(' ').forEach(keyword => {
        if (keyword.length > 3 && contextLower.includes(keyword)) {
          matchScore += 0.1;
        }
      });
      
      // Aggiustamenti per tipo
      if (searchParams.type && service.type === searchParams.type) {
        matchScore += 0.3;
      }
      
      // Aggiustamenti per stato pagamento
      if (searchParams.status && service.status === searchParams.status) {
        matchScore += 0.3;
      }
      
      return {
        type: 'service',
        item: service,
        matchScore: Math.min(matchScore, 1), // Limitato a 1
        highlight: context.substring(0, 150) + '...'
      };
    });
    
    const maintenanceResults: SearchResult[] = maintenanceRequests.map(request => {
      const context = generateMaintenanceContext(request);
      
      // Calcolo di un punteggio di rilevanza semplificato
      let matchScore = 0.5; // Punteggio base
      const contextLower = context.toLowerCase();
      
      // Aumenta il punteggio se contiene parole chiave della query
      query.toLowerCase().split(' ').forEach(keyword => {
        if (keyword.length > 3 && contextLower.includes(keyword)) {
          matchScore += 0.1;
        }
      });
      
      return {
        type: 'maintenance',
        item: request,
        matchScore: Math.min(matchScore, 1), // Limitato a 1
        highlight: context.substring(0, 150) + '...'
      };
    });
    
    // Combina e ordina i risultati per rilevanza
    const allResults = [...serviceResults, ...maintenanceResults]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
    
    // Genera una spiegazione dei risultati
    let explanation = "";
    if (allResults.length === 0) {
      explanation = "Nessun risultato trovato per la tua ricerca. Prova con termini più generali o controlla eventuali errori di battitura.";
    } else {
      explanation = `Trovati ${allResults.length} risultati corrispondenti alla tua ricerca.`;
      
      if (searchParams.type) {
        explanation += ` Filtrati per tipo di servizio "${searchParams.type}".`;
      }
      
      if (searchParams.status) {
        explanation += ` Filtrati per stato di pagamento "${searchParams.status === 'paid' ? 'pagato' : 'non pagato'}".`;
      }
      
      if (searchParams.dateFrom || searchParams.dateTo) {
        explanation += " Filtrati per date specifiche.";
      }
    }
    
    // Restituisci i risultati al client
    return {
      results: allResults,
      explanation
    };
  } catch (error) {
    console.error("Errore durante la ricerca semantica:", error);
    
    // In caso di errore, restituisci una ricerca di base
    try {
      // Ottieni una lista di servizi di base
      const servicesResponse = await storage.getServices({
        page: 1,
        pageSize: limit
      });
      
      const services = servicesResponse.services;
      
      // Crea risultati semplificati
      const simpleResults: SearchResult[] = services.map(service => {
        const context = generateServiceContext(service);
        return {
          type: 'service',
          item: service,
          matchScore: 0.5,
          highlight: context.substring(0, 150) + '...'
        };
      });
      
      return {
        results: simpleResults,
        explanation: "Ricerca semplificata attivata a causa di un errore. Mostrando i servizi più recenti."
      };
    } catch (fallbackError) {
      console.error("Errore anche nella ricerca fallback:", fallbackError);
      return {
        results: [],
        explanation: "Si è verificato un errore durante la ricerca. Riprova più tardi."
      };
    }
  }
}