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
    // Prepara il sistema prompt per OpenAI
    const systemPrompt = `
      Sei un assistente specializzato nell'analizzare query di ricerca per un sistema di gestione dei servizi e manutenzione per la segreteria ELIS.
      Il tuo compito è estrarre parametri di ricerca dalla richiesta in linguaggio naturale.
      
      Le informazioni sui servizi includono:
      - Tipo di servizio: "siglatura", "happy_hour", "riparazione"
      - Stato pagamento: "paid" (pagato), "unpaid" (in attesa)
      - Date nel formato YYYY-MM-DD
      - Sigla utente (identificativo dell'utente)
      - Importo (in Euro)
      
      Le informazioni sulle richieste di manutenzione includono:
      - Stato: "pending", "in_progress", "completed"
      - Priorità: "low", "medium", "high", "urgent"
      - Numero della stanza
      
      Rispondi con un oggetto JSON contenente:
      1. "naturalLanguageResponse": una risposta concisa che riassume come hai interpretato la query
      2. "searchParams": un oggetto con i parametri di ricerca estratti (solo quelli menzionati nella query)
    `;

    // La richiesta all'API di OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    // Estrai la risposta
    const result = JSON.parse(response.choices[0].message.content);
    
    // Restituisci il risultato
    return {
      naturalLanguageResponse: result.naturalLanguageResponse,
      searchParams: result.searchParams || {}
    };
  } catch (error) {
    console.error("Errore durante l'analisi della query:", error);
    throw error;
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
    // Ottieni l'embedding della query
    const queryEmbedding = await generateEmbedding(query);
    
    // Analizza la query per comprendere la richiesta
    const analysis = await analyzeSearchQuery(query);
    
    // Ottieni servizi e richieste di manutenzione dal database
    const servicesResponse = await storage.getServices({
      page: 1,
      pageSize: 100,
      ...analysis.searchParams
    });
    
    const maintenanceResponse = await storage.getMaintenanceRequests({
      page: 1,
      pageSize: 100,
      ...analysis.searchParams
    });
    
    // Combina i risultati per la ricerca semantica
    const services = servicesResponse.services;
    const maintenanceRequests = maintenanceResponse.requests;
    
    // Risultati di ricerca
    const serviceResults: SearchResult[] = await Promise.all(
      services.map(async (service) => {
        const context = generateServiceContext(service);
        const embedding = await generateEmbedding(context);
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        return {
          type: 'service',
          item: service,
          matchScore: similarity,
          highlight: context.substring(0, 150) + '...'
        };
      })
    );
    
    const maintenanceResults: SearchResult[] = await Promise.all(
      maintenanceRequests.map(async (request) => {
        const context = generateMaintenanceContext(request);
        const embedding = await generateEmbedding(context);
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        return {
          type: 'maintenance',
          item: request,
          matchScore: similarity,
          highlight: context.substring(0, 150) + '...'
        };
      })
    );
    
    // Combina e ordina i risultati per rilevanza
    const allResults = [...serviceResults, ...maintenanceResults]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
    
    // Genera una spiegazione dei risultati
    let explanation = "";
    if (allResults.length === 0) {
      explanation = "Nessun risultato trovato per la tua ricerca. Prova con termini più generali o controlla eventuali errori di battitura.";
    } else {
      explanation = `Ho trovato ${allResults.length} risultati corrispondenti alla tua ricerca.`;
      
      if (analysis.searchParams.serviceType) {
        explanation += ` Filtrati per tipo di servizio "${analysis.searchParams.serviceType}".`;
      }
      
      if (analysis.searchParams.paymentStatus) {
        explanation += ` Filtrati per stato di pagamento "${analysis.searchParams.paymentStatus === 'paid' ? 'pagato' : 'non pagato'}".`;
      }
      
      if (analysis.searchParams.dateFrom || analysis.searchParams.dateTo) {
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
    throw error;
  }
}