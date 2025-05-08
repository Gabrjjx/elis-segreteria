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
  const typeMap: Record<string, string> = {
    "siglatura": "Servizio di siglatura capi",
    "happy_hour": "Consumazione Happy Hour",
    "riparazione": "Servizio di riparazione"
  };
  
  const statusMap: Record<string, string> = {
    "paid": "Pagato",
    "unpaid": "Non pagato"
  };
  
  return `
    Sigla: ${service.sigla}
    Tipo: ${typeMap[service.type] || service.type}
    Data: ${new Date(service.date).toLocaleDateString('it-IT')}
    Numero pezzi: ${service.pieces}
    Importo: €${service.amount.toFixed(2)}
    Stato pagamento: ${statusMap[service.status] || service.status}
    Note: ${service.notes || ""}
  `.trim();
}

/**
 * Genera un contesto per una richiesta di manutenzione che può essere utilizzato per la ricerca semantica
 */
function generateMaintenanceContext(request: MaintenanceRequest): string {
  const priorityMap: Record<string, string> = {
    "low": "Bassa priorità",
    "medium": "Media priorità",
    "high": "Alta priorità",
    "urgent": "Urgente"
  };
  
  const statusMap: Record<string, string> = {
    "pending": "In attesa",
    "in_progress": "In corso",
    "completed": "Completata",
    "cancelled": "Annullata"
  };
  
  return `
    Richiedente: ${request.requesterName}
    Stanza: ${request.roomNumber}
    Tipo: ${request.requestType}
    Descrizione: ${request.description}
    Priorità: ${priorityMap[request.priority] || request.priority}
    Stato: ${statusMap[request.status] || request.status}
    Data richiesta: ${new Date(request.requestDate).toLocaleDateString('it-IT')}
    ${request.notes ? `Note: ${request.notes}` : ""}
  `.trim();
}

/**
 * Analizza la query naturale dell'utente tramite l'AI per estrarre parametri di ricerca
 */
export async function analyzeSearchQuery(query: string): Promise<{
  naturalLanguageResponse: string;
  searchParams: {
    serviceType?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentStatus?: string;
    sigla?: string;
    minAmount?: number;
    maxAmount?: number;
    maintenanceStatus?: string;
    roomNumber?: string;
    priority?: string;
  }
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // il modello OpenAI più recente è "gpt-4o", rilasciato a maggio 2024
      messages: [
        {
          role: "system",
          content: `Sei un assistente di ricerca per un'applicazione che gestisce servizi di siglatura, happy hour, riparazioni e richieste di manutenzione. 
          Estrai i parametri di ricerca dalle query in linguaggio naturale dell'utente. 
          Tipi di servizio possibili: siglatura, happy_hour, riparazione.
          Stati di pagamento possibili: paid, unpaid.
          Stati di manutenzione possibili: pending, in_progress, completed, cancelled.
          Priorità possibili: low, medium, high, urgent.
          Rispondi solo con JSON nel formato richiesto.`
        },
        {
          role: "user",
          content: `Analizza questa query di ricerca: "${query}". 
          Estrai i parametri di ricerca e fornisci anche una breve risposta in linguaggio naturale che spieghi cosa stai cercando.
          Rispondi con un JSON in questo formato:
          {
            "naturalLanguageResponse": "Breve spiegazione di ciò che si sta cercando",
            "searchParams": {
              "serviceType": "tipo di servizio se menzionato",
              "dateFrom": "data di inizio in formato ISO se menzionata",
              "dateTo": "data di fine in formato ISO se menzionata",
              "paymentStatus": "stato di pagamento se menzionato",
              "sigla": "sigla se menzionata",
              "minAmount": numero se menzionato,
              "maxAmount": numero se menzionato,
              "maintenanceStatus": "stato manutenzione se menzionato",
              "roomNumber": "numero stanza se menzionato",
              "priority": "priorità se menzionata"
            }
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Errore nell'analisi della query:", error);
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
  results: SearchResult[];
  explanation: string;
}> {
  try {
    // Analizza la query tramite l'AI
    const analysis = await analyzeSearchQuery(query);
    
    // Ottieni i servizi e le richieste di manutenzione
    const { services } = await storage.getServices({ limit: 500 });
    const { requests } = await storage.getMaintenanceRequests({ limit: 500 });
    
    // Filtra i risultati in base ai parametri estratti
    let filteredServices = services;
    let filteredRequests = requests;
    const params = analysis.searchParams;
    
    // Applica filtri ai servizi
    if (params.serviceType) {
      filteredServices = filteredServices.filter(s => s.type === params.serviceType);
    }
    if (params.paymentStatus) {
      filteredServices = filteredServices.filter(s => s.status === params.paymentStatus);
    }
    if (params.sigla) {
      filteredServices = filteredServices.filter(s => s.sigla.toLowerCase().includes(params.sigla.toLowerCase()));
    }
    if (params.dateFrom) {
      const fromDate = new Date(params.dateFrom);
      filteredServices = filteredServices.filter(s => new Date(s.date) >= fromDate);
    }
    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      filteredServices = filteredServices.filter(s => new Date(s.date) <= toDate);
    }
    if (params.minAmount !== undefined) {
      filteredServices = filteredServices.filter(s => s.amount >= params.minAmount!);
    }
    if (params.maxAmount !== undefined) {
      filteredServices = filteredServices.filter(s => s.amount <= params.maxAmount!);
    }
    
    // Applica filtri alle richieste di manutenzione
    if (params.maintenanceStatus) {
      filteredRequests = filteredRequests.filter(r => r.status === params.maintenanceStatus);
    }
    if (params.roomNumber) {
      filteredRequests = filteredRequests.filter(r => r.roomNumber.toString() === params.roomNumber);
    }
    if (params.priority) {
      filteredRequests = filteredRequests.filter(r => r.priority === params.priority);
    }
    if (params.dateFrom) {
      const fromDate = new Date(params.dateFrom);
      filteredRequests = filteredRequests.filter(r => new Date(r.requestDate) >= fromDate);
    }
    if (params.dateTo) {
      const toDate = new Date(params.dateTo);
      filteredRequests = filteredRequests.filter(r => new Date(r.requestDate) <= toDate);
    }
    
    // Se dopo l'applicazione dei filtri non ci sono risultati,
    // effettua una ricerca semantica su tutti i dati usando embeddings
    if (filteredServices.length === 0 && filteredRequests.length === 0) {
      const queryEmbedding = await generateEmbedding(query);
      
      const serviceResults = await Promise.all(services.map(async (service) => {
        const context = generateServiceContext(service);
        const contextEmbedding = await generateEmbedding(context);
        const similarity = cosineSimilarity(queryEmbedding, contextEmbedding);
        
        return {
          type: 'service' as const,
          item: service,
          matchScore: similarity,
          highlight: context
        };
      }));
      
      const maintenanceResults = await Promise.all(requests.map(async (request) => {
        const context = generateMaintenanceContext(request);
        const contextEmbedding = await generateEmbedding(context);
        const similarity = cosineSimilarity(queryEmbedding, contextEmbedding);
        
        return {
          type: 'maintenance' as const,
          item: request,
          matchScore: similarity,
          highlight: context
        };
      }));
      
      // Combina i risultati e ordina per punteggio di similarità
      const allResults = [...serviceResults, ...maintenanceResults]
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
        
      return {
        results: allResults,
        explanation: analysis.naturalLanguageResponse
      };
    }
    
    // Altrimenti, restituisci i risultati filtrati
    const results: SearchResult[] = [
      ...filteredServices.map(service => ({
        type: 'service' as const,
        item: service,
        matchScore: 1,
        highlight: generateServiceContext(service)
      })),
      ...filteredRequests.map(request => ({
        type: 'maintenance' as const,
        item: request,
        matchScore: 1,
        highlight: generateMaintenanceContext(request)
      }))
    ].slice(0, limit);
    
    return {
      results,
      explanation: analysis.naturalLanguageResponse
    };
  } catch (error) {
    console.error("Errore nella ricerca semantica:", error);
    return { 
      results: [],
      explanation: "Si è verificato un errore durante la ricerca. Riprova più tardi."
    };
  }
}