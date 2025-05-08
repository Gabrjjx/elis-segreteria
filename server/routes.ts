import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServiceSchema, 
  serviceSearchSchema, 
  insertMaintenanceRequestSchema, 
  maintenanceRequestSearchSchema,
  MaintenanceRequestStatus,
  MaintenanceRequestPriority 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getMaintenanceRequestsCSV, readGoogleSheet } from "./services/googleSheets";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Get all services with filtering and pagination
  app.get("/api/services", async (req: Request, res: Response) => {
    try {
      const params = serviceSearchSchema.parse({
        query: req.query.query as string,
        type: req.query.type as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      });
      
      const result = await storage.getServices(params);
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get a specific service by ID
  app.get("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getService(id);
      
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new service
  app.post("/api/services", async (req: Request, res: Response) => {
    try {
      console.log("Received data for service creation:", req.body);
      
      // If "sigla" is empty, reject early
      if (!req.body.sigla || req.body.sigla.trim() === '') {
        return res.status(400).json({ message: "La sigla è obbligatoria" });
      }
      
      // Try to parse the request data through Zod schema
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      
      console.log("Service created successfully:", service);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Validation error:", validationError.message);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Update a service
  app.put("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertServiceSchema.partial().parse(req.body);
      
      const updatedService = await storage.updateService(id, updates);
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete a service
  app.delete("/api/services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteService(id);
      
      if (!success) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (_req: Request, res: Response) => {
    try {
      const metrics = await storage.getServiceMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Pending payments
  app.get("/api/dashboard/pending-payments", async (_req: Request, res: Response) => {
    try {
      const pendingPayments = await storage.getPendingPayments();
      res.json(pendingPayments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recent services
  app.get("/api/dashboard/recent-services", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const recentServices = await storage.getRecentServices(limit);
      res.json(recentServices);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark a service as paid
  app.patch("/api/services/:id/mark-paid", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedService = await storage.updateService(id, { status: "paid" });
      
      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      res.json(updatedService);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // MAINTENANCE REQUESTS API

  // Get all maintenance requests with filtering and pagination
  app.get("/api/maintenance", async (req: Request, res: Response) => {
    try {
      const params = maintenanceRequestSearchSchema.parse({
        query: req.query.query as string,
        status: req.query.status as string,
        priority: req.query.priority as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10
      });
      
      const result = await storage.getMaintenanceRequests(params);
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Get a specific maintenance request by ID
  app.get("/api/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getMaintenanceRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a new maintenance request
  app.post("/api/maintenance", async (req: Request, res: Response) => {
    try {
      console.log("Received data for maintenance request creation:", req.body);
      
      // Try to parse the request data through Zod schema
      const requestData = insertMaintenanceRequestSchema.parse(req.body);
      const maintenanceRequest = await storage.createMaintenanceRequest(requestData);
      
      console.log("Maintenance request created successfully:", maintenanceRequest);
      res.status(201).json(maintenanceRequest);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        console.error("Validation error:", validationError.message);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Update a maintenance request
  app.put("/api/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertMaintenanceRequestSchema.partial().parse(req.body);
      
      const updatedRequest = await storage.updateMaintenanceRequest(id, updates);
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Delete a maintenance request
  app.delete("/api/maintenance/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMaintenanceRequest(id);
      
      if (!success) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Maintenance metrics
  app.get("/api/maintenance/dashboard/metrics", async (_req: Request, res: Response) => {
    try {
      const metrics = await storage.getMaintenanceMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Pending maintenance requests
  app.get("/api/maintenance/dashboard/pending", async (_req: Request, res: Response) => {
    try {
      const pendingRequests = await storage.getPendingMaintenanceRequests();
      res.json(pendingRequests);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recent maintenance requests
  app.get("/api/maintenance/dashboard/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const recentRequests = await storage.getRecentMaintenanceRequests(limit);
      res.json(recentRequests);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Import maintenance requests from CSV
  app.post("/api/maintenance/import", async (req: Request, res: Response) => {
    try {
      if (!req.body.csvData) {
        return res.status(400).json({ message: "CSV data is required" });
      }
      
      const result = await storage.importMaintenanceRequestsFromCSV(req.body.csvData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error importing maintenance requests:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Change status of a maintenance request
  app.patch("/api/maintenance/:id/status", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.body.status || !Object.values(MaintenanceRequestStatus).includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const status = req.body.status as typeof MaintenanceRequestStatus[keyof typeof MaintenanceRequestStatus];
      
      // Add completedAt date if completing the request
      const updates: any = { status };
      if (status === MaintenanceRequestStatus.COMPLETED) {
        updates.completedAt = new Date();
      }
      
      const updatedRequest = await storage.updateMaintenanceRequest(id, updates);
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change priority of a maintenance request
  app.patch("/api/maintenance/:id/priority", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.body.priority || !Object.values(MaintenanceRequestPriority).includes(req.body.priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }
      
      const priority = req.body.priority as typeof MaintenanceRequestPriority[keyof typeof MaintenanceRequestPriority];
      
      const updatedRequest = await storage.updateMaintenanceRequest(id, { priority });
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Synchronize maintenance requests from Google Sheets
  app.post("/api/maintenance/sync-google-sheets", async (_req: Request, res: Response) => {
    try {
      // Controlla che le chiavi API Google siano configurate
      if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SHEET_ID) {
        return res.status(400).json({
          message: "Google API key and/or Sheet ID is missing. Please check your environment configuration."
        });
      }
      
      console.log("Sincronizzazione Google Sheets avviata");
      
      // Importa direttamente dal foglio Google Sheet, senza passare per il CSV
      try {
        // Leggi i dati dal foglio Google
        const data = await readGoogleSheet();
        
        if (!data || data.length < 2) {
          console.log("Dati insufficienti nel foglio Google");
          return res.status(400).json({ message: "Insufficient data in Google Sheet" });
        }
        
        // Log informazioni sul foglio
        console.log("FOGLIO RICEVUTO:");
        console.log("Prima riga (intestazioni):", JSON.stringify(data[0]));
        console.log("Seconda riga (primo record):", JSON.stringify(data[1]));
        console.log("Terza riga (secondo record):", JSON.stringify(data[2]));
        
        // Identifica le colonne importanti
        let headerRow = data[0] || [];
        
        let siglaIdx = -1;    // Per il "Richiedente"
        let luogoIdx = -1;    // Per la "Stanza" 
        let infoIdx = -1;     // Per il "Timestamp"
        let ubicazioneIdx = -1;
        let dettagliIdx = -1;
        let prioritaIdx = -1;
        
        // Cerca le colonne in base ai nomi
        console.log("Analisi intestazioni:");
        for (let i = 0; i < headerRow.length; i++) {
          const header = String(headerRow[i] || '').toLowerCase();
          console.log(`Colonna ${i}: "${headerRow[i]}" (${header})`);
          
          if (header.includes('sigla')) {
            siglaIdx = i;
            console.log(`-> Trovata colonna SIGLA all'indice ${i}`);
          }
          else if (header.includes('luogo') && !header.includes('ubicazione')) {
            luogoIdx = i;
            console.log(`-> Trovata colonna LUOGO all'indice ${i}`);
          }
          else if (header.includes('informazioni') || header.includes('cronologiche')) {
            infoIdx = i;
            console.log(`-> Trovata colonna INFORMAZIONI CRONOLOGICHE all'indice ${i}`);
          }
          else if (header.includes('ubicazione') || header.includes('specifica')) {
            ubicazioneIdx = i;
            console.log(`-> Trovata colonna UBICAZIONE all'indice ${i}`);
          }
          else if (header.includes('dettagli') || header.includes('difetto')) {
            dettagliIdx = i;
            console.log(`-> Trovata colonna DETTAGLI DIFETTO all'indice ${i}`);
          }
          else if (header.includes('priorità')) {
            prioritaIdx = i;
            console.log(`-> Trovata colonna PRIORITÀ all'indice ${i}`);
          }
        }
        
        // Assegna indici di default se non trovati (basandoci sulla struttura osservata)
        if (siglaIdx === -1 && data[0].length > 2) siglaIdx = 2;    // Terza colonna
        if (luogoIdx === -1 && data[0].length > 3) luogoIdx = 3;    // Quarta colonna
        if (infoIdx === -1 && data[0].length > 1) infoIdx = 1;      // Seconda colonna
        if (ubicazioneIdx === -1 && data[0].length > 4) ubicazioneIdx = 4;  // Quinta colonna
        if (dettagliIdx === -1 && data[0].length > 5) dettagliIdx = 5;    // Sesta colonna
        if (prioritaIdx === -1 && data[0].length > 6) prioritaIdx = 6;    // Settima colonna
        
        console.log(`Indici finali: Sigla=${siglaIdx}, Luogo=${luogoIdx}, Info=${infoIdx}, Ubicazione=${ubicazioneIdx}, Dettagli=${dettagliIdx}, Priorità=${prioritaIdx}`);
        
        // Verifica colonna stato (risolto/segnalato)
        const hasStatusColumn = data[1] && data[1][0] && typeof data[1][0] === 'string' && 
            (data[1][0].toLowerCase().includes('risolto') || data[1][0].toLowerCase().includes('segnalato'));
        
        if (hasStatusColumn) {
          console.log("Rilevata colonna di stato risolta/segnalata nel primo campo, la ignoreremo");
        }
        
        let success = 0;
        let failed = 0;
        
        // Importa tutte le righe direttamente nel database
        console.log(`Processando ${data.length-1} righe dal foglio`);
        
        for (let i = 1; i < data.length; i++) {
          try {
            const row = data[i];
            if (!row || row.length < Math.max(siglaIdx, luogoIdx, infoIdx) + 1) {
              console.log(`Riga ${i} troppo corta, saltata`);
              continue;
            }
            
            // Timestamp dalle "Informazioni cronologiche"
            let timestamp = new Date(); // Default è la data corrente
            
            if (infoIdx >= 0 && infoIdx < row.length && row[infoIdx]) {
              // Formato tipico delle date nel foglio: "13/06/2022 16.37.17"
              const rawDate = row[infoIdx];
              
              try {
                // Convertire la data dal formato italiano a un oggetto Date
                const parts = String(rawDate).split(' ');
                if (parts.length >= 1) {
                  const dateParts = parts[0].split('/');
                  if (dateParts.length === 3) {
                    // La data è nel formato GG/MM/AAAA
                    const day = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1; // I mesi in JavaScript sono 0-based
                    const year = parseInt(dateParts[2]);
                    
                    // Creiamo una data di base
                    timestamp = new Date(year, month, day);
                    
                    // Se è presente anche l'ora, la aggiungiamo
                    if (parts.length > 1) {
                      const timeParts = parts[1].replace(/\./g, ':').split(':');
                      if (timeParts.length >= 2) {
                        const hours = parseInt(timeParts[0]);
                        const minutes = parseInt(timeParts[1]);
                        const seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;
                        
                        timestamp.setHours(hours, minutes, seconds);
                      }
                    }
                    
                    // Log per debug
                    if (i <= 5) {
                      console.log(`Convertita data "${rawDate}" in oggetto Date:`, timestamp);
                    }
                  } else {
                    console.log(`Formato data non riconosciuto: ${rawDate}, uso data corrente`);
                  }
                }
              } catch (e) {
                console.error(`Errore parsing data '${rawDate}':`, e);
              }
            }
            
            // Richiedente dalla "Sigla"
            let richiedente = "T00"; // Valore predefinito
            if (siglaIdx >= 0 && siglaIdx < row.length) {
              const rawSigla = row[siglaIdx];
              // Se è un ID Google Forms (numero lungo), generiamo una sigla leggibile
              if (rawSigla && String(rawSigla).length > 8 && !isNaN(Number(rawSigla))) {
                richiedente = "T" + String(i).padStart(2, '0');
                console.log(`Riga ${i}: Sostituita sigla anomala ${rawSigla} con ${richiedente}`);
              } else {
                richiedente = rawSigla || richiedente;
              }
            }
            
            // Stanza dal "Luogo"
            const stanza = luogoIdx >= 0 && luogoIdx < row.length ? row[luogoIdx] || "N/D" : "N/D";
            
            // Dettagli per la descrizione
            const ubicazione = ubicazioneIdx >= 0 && ubicazioneIdx < row.length ? row[ubicazioneIdx] || "" : "";
            const dettagli = dettagliIdx >= 0 && dettagliIdx < row.length ? row[dettagliIdx] || "" : "";
            
            // Combiniamo la descrizione ma manteniamo le informazioni originali separate
            const descrizioneBase = dettagli || "Manutenzione richiesta";
            const descrizione = descrizioneBase;
            
            // Priorità 
            let priorita = MaintenanceRequestPriority.MEDIUM; // Default
            if (prioritaIdx >= 0 && prioritaIdx < row.length && row[prioritaIdx]) {
              const priorityVal = row[prioritaIdx];
              if (typeof priorityVal === 'number' || !isNaN(Number(priorityVal))) {
                const numPriority = Number(priorityVal);
                if (numPriority === 1) priorita = MaintenanceRequestPriority.LOW;
                else if (numPriority === 3) priorita = MaintenanceRequestPriority.HIGH;
                else if (numPriority === 4) priorita = MaintenanceRequestPriority.URGENT;
              } else if (typeof priorityVal === 'string') {
                const lowerPriority = priorityVal.toLowerCase();
                if (lowerPriority.includes('bassa') || lowerPriority.includes('low')) {
                  priorita = MaintenanceRequestPriority.LOW;
                } else if (lowerPriority.includes('alta') || lowerPriority.includes('high')) {
                  priorita = MaintenanceRequestPriority.HIGH;
                } else if (lowerPriority.includes('urgente') || lowerPriority.includes('urgent')) {
                  priorita = MaintenanceRequestPriority.URGENT;
                }
              }
            }
            
            // Log dei primi 5 record per verifica
            if (i <= 5) {
              console.log(`Riga ${i} - Richiedente: "${richiedente}", Stanza: "${stanza}", Data: "${timestamp}", Priorità: "${priorita}"`);
            }
            
            // Crea la richiesta di manutenzione se la stanza non è vuota
            if (stanza && stanza !== "N/D") {
              await storage.createMaintenanceRequest({
                requesterName: richiedente,
                requesterEmail: "segreteria@elis.org",
                roomNumber: stanza,
                requestType: "Manutenzione",
                description: descrizione,
                location: stanza,
                status: MaintenanceRequestStatus.PENDING,
                priority: priorita,
                notes: `Importato dal foglio Google
Data: ${infoIdx >= 0 && infoIdx < row.length ? row[infoIdx] : "N/D"}
Ubicazione specifica: ${ubicazione}
Dettagli del difetto: ${dettagli}`
              });
              success++;
            } else {
              console.log(`Riga ${i} saltata perché la stanza/luogo è vuoto`);
              failed++;
            }
          } catch (error) {
            console.error(`Errore nell'importazione della riga ${i}:`, error);
            failed++;
          }
        }
        
        console.log(`Importate ${success} righe con successo, ${failed} fallite`);
        
        res.status(200).json({
          message: "Maintenance requests synchronized successfully",
          imported: success,
          failed: failed,
          total: success + failed
        });
      } catch (error: any) {
        console.error("Error during Google Sheets synchronization:", error);
        return res.status(500).json({
          message: "Error during Google Sheets synchronization",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error synchronizing from Google Sheets:", error);
      res.status(500).json({ 
        message: "Error synchronizing from Google Sheets", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
