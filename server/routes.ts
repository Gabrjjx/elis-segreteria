import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
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
import { getMaintenanceRequestsCSV, readGoogleSheet, isSheetLoaded, findRequestRowInGoogleSheet, updateGoogleSheetStatus } from "./services/googleSheets";
import { 
  hasOAuth2Credentials, 
  hasValidToken, 
  getAuthorizationUrl, 
  getTokenFromCode,
  verifyToken,
  startDeviceFlow,
  checkDeviceFlowStatus
} from "./services/googleAuth";

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
      console.log("Ricevuti dati per aggiornamento servizio:", JSON.stringify(req.body, null, 2));
      
      const id = parseInt(req.params.id);
      console.log("ID servizio da aggiornare:", id);
      
      // Verifica specifica per il campo date
      if (req.body.date) {
        console.log("Formato data ricevuto:", req.body.date, "tipo:", typeof req.body.date);
        try {
          const testDate = new Date(req.body.date);
          console.log("Data convertita:", testDate, "valida:", !isNaN(testDate.getTime()));
        } catch (dateError) {
          console.error("Errore durante la conversione della data:", dateError);
        }
      }
      
      try {
        // Prima di validare, facciamo una copia dell'oggetto per evitare modifiche indesiderate
        const dataToValidate = { ...req.body };
        console.log("Dati da validare:", JSON.stringify(dataToValidate, null, 2));
        
        try {
          // Prima proviamo lo schema completo per vedere se genera errori
          insertServiceSchema.parse(dataToValidate);
          console.log("Schema completo valido");
        } catch (fullSchemaError) {
          console.log("Schema completo non valido, dettaglio:", fullSchemaError);
        }
        
        // Ora proviamo con lo schema parziale per l'aggiornamento
        const updates = insertServiceSchema.partial().parse(dataToValidate);
        console.log("Dati validati con successo (schema parziale):", JSON.stringify(updates, null, 2));
        
        const updatedService = await storage.updateService(id, updates);
        
        if (!updatedService) {
          return res.status(404).json({ message: "Service not found" });
        }
        
        console.log("Servizio aggiornato con successo:", updatedService);
        res.json(updatedService);
      } catch (validationError) {
        console.error("Errore di validazione:", validationError);
        if (validationError instanceof ZodError) {
          const formattedError = fromZodError(validationError);
          console.error("Dettaglio errore Zod:", formattedError.message);
          
          // Log dettagliato per errori Zod
          validationError.errors.forEach((err, index) => {
            console.error(`Errore #${index + 1}:`, {
              path: err.path,
              message: err.message,
              code: err.code,
              expected: err.expected,
              received: err.received
            });
          });
          
          res.status(400).json({ 
            message: formattedError.message,
            errors: validationError.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          });
        } else {
          throw validationError; // Rilancia per gestirlo nel catch esterno
        }
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento del servizio:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        details: error instanceof Error ? error.message : String(error) 
      });
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
  app.get("/api/dashboard/metrics", async (req: Request, res: Response) => {
    try {
      // Ottieni i parametri di filtro per le date se presenti
      const filterParams: { startDate?: Date, endDate?: Date } = {};
      
      if (req.query.startDate) {
        try {
          filterParams.startDate = new Date(req.query.startDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di inizio:", e);
        }
      }
      
      if (req.query.endDate) {
        try {
          filterParams.endDate = new Date(req.query.endDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di fine:", e);
        }
      }
      
      const metrics = await storage.getServiceMetrics(filterParams);
      res.json(metrics);
    } catch (error) {
      console.error("Errore durante il recupero delle metriche:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Pending payments
  app.get("/api/dashboard/pending-payments", async (req: Request, res: Response) => {
    try {
      // Ottieni i parametri di filtro per le date se presenti
      const filterParams: { startDate?: Date, endDate?: Date } = {};
      
      if (req.query.startDate) {
        try {
          filterParams.startDate = new Date(req.query.startDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di inizio:", e);
        }
      }
      
      if (req.query.endDate) {
        try {
          filterParams.endDate = new Date(req.query.endDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di fine:", e);
        }
      }
      
      const pendingPayments = await storage.getPendingPayments(filterParams);
      res.json(pendingPayments);
    } catch (error) {
      console.error("Errore durante il recupero dei pagamenti pendenti:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recent services
  app.get("/api/dashboard/recent-services", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      
      // Ottieni i parametri di filtro per le date se presenti
      const filterParams: { startDate?: Date, endDate?: Date } = {};
      
      if (req.query.startDate) {
        try {
          filterParams.startDate = new Date(req.query.startDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di inizio:", e);
        }
      }
      
      if (req.query.endDate) {
        try {
          filterParams.endDate = new Date(req.query.endDate as string);
        } catch (e) {
          console.error("Errore nella conversione della data di fine:", e);
        }
      }
      
      const recentServices = await storage.getRecentServices(limit, filterParams);
      res.json(recentServices);
    } catch (error) {
      console.error("Errore durante il recupero dei servizi recenti:", error);
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
      
      // Otteniamo prima i dettagli della richiesta originale per la sincronizzazione
      const originalRequest = await storage.getMaintenanceRequest(id);
      if (!originalRequest) {
        return res.status(404).json({ message: "Maintenance request not found" });
      }
      
      // Add completedAt date if completing the request
      const updates: any = { status };
      if (status === MaintenanceRequestStatus.COMPLETED) {
        updates.completedAt = new Date();
      }
      
      const updatedRequest = await storage.updateMaintenanceRequest(id, updates);
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Failed to update maintenance request" });
      }
      
      // Se la richiesta è stata marcata come completata, proviamo ad aggiornare anche il foglio Google
      let googleSheetUpdate = { success: false, message: "No update attempted" };
      
      if (status === MaintenanceRequestStatus.COMPLETED) {
        try {
          // Verifichiamo prima se il foglio Google è già stato caricato
          if (!isSheetLoaded()) {
            console.log("Foglio Google non ancora caricato, lo carico prima di procedere");
            await getMaintenanceRequestsCSV();
          }
          
          // Utilizziamo l'import già esistente invece di require
          const { findRequestRowInGoogleSheet, updateGoogleSheetStatus } = await import('./services/googleSheets');
          
          // Cerchiamo la riga corrispondente nel foglio Google
          const timestamp = new Date(originalRequest.timestamp);
          const richiedente = originalRequest.requesterName;
          const stanza = originalRequest.roomNumber;
          
          console.log(`Cerco nel foglio Google la richiesta di: ${richiedente}, stanza: ${stanza}, data: ${timestamp}`);
          const rowIndex = await findRequestRowInGoogleSheet(timestamp, richiedente, stanza);
          
          if (rowIndex >= 0) {
            // Richiesta trovata, aggiorniamo lo stato
            console.log(`Trovata richiesta nel foglio Google alla riga ${rowIndex + 1}, aggiorno stato a "risolto"`);
            const updated = await updateGoogleSheetStatus(rowIndex, "risolto");
            
            googleSheetUpdate = {
              success: updated,
              message: updated 
                ? `Aggiornato stato a "risolto" nella riga ${rowIndex + 1} del foglio Google` 
                : `Impossibile aggiornare lo stato nel foglio Google alla riga ${rowIndex + 1}`
            };
          } else {
            googleSheetUpdate = {
              success: false,
              message: "Richiesta non trovata nel foglio Google"
            };
          }
        } catch (googleError) {
          console.error("Errore durante l'aggiornamento del foglio Google:", googleError);
          googleSheetUpdate = {
            success: false,
            message: `Errore durante l'aggiornamento: ${googleError instanceof Error ? googleError.message : "Errore sconosciuto"}`
          };
        }
      }
      
      res.json({
        ...updatedRequest,
        googleSheetSync: googleSheetUpdate
      });
    } catch (error) {
      console.error("Error updating maintenance request status:", error);
      res.status(500).json({ 
        message: "Error updating status", 
        error: error instanceof Error ? error.message : "Internal server error" 
      });
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
  
  // === Google OAuth2 Authentication routes ===

  // Get OAuth2 status
  app.get("/api/google/auth/status", async (_req: Request, res: Response) => {
    try {
      // Log diretto delle variabili d'ambiente per debug
      console.log("DEBUG OAuth2 credentials check:");
      console.log("GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
      console.log("GOOGLE_CLIENT_SECRET exists:", !!process.env.GOOGLE_CLIENT_SECRET);
      
      const hasCredentials = hasOAuth2Credentials();
      console.log("hasOAuth2Credentials() returned:", hasCredentials);
      
      const status = {
        hasCredentials: hasCredentials,
        hasValidToken: false
      };
      
      if (status.hasCredentials) {
        try {
          status.hasValidToken = await verifyToken();
          console.log("verifyToken() returned:", status.hasValidToken);
        } catch (error) {
          console.log("Errore nella verifica del token:", error);
        }
      }
      
      console.log("Returning status:", status);
      res.json(status);
    } catch (error) {
      console.error("Error checking OAuth2 status:", error);
      res.status(500).json({ message: "Error checking OAuth2 status" });
    }
  });
  
  // Get OAuth2 authorization URL
  app.get("/api/google/auth/url", async (_req: Request, res: Response) => {
    try {
      if (!hasOAuth2Credentials()) {
        return res.status(400).json({
          message: "Google OAuth2 credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        });
      }
      
      const authUrl = getAuthorizationUrl();
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({ message: "Error generating auth URL" });
    }
  });
  
  // Start Device Flow (nuovo metodo di autenticazione, più semplice)
  app.post("/api/google/auth/device", async (_req: Request, res: Response) => {
    try {
      if (!hasOAuth2Credentials()) {
        return res.status(400).json({
          message: "Google OAuth2 credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        });
      }
      
      const deviceCodeInfo = await startDeviceFlow();
      console.log("Device Flow avviato con successo:", deviceCodeInfo);
      res.json({
        user_code: deviceCodeInfo.user_code,
        verification_url: deviceCodeInfo.verification_url,
        expires_in: deviceCodeInfo.expires_in,
        interval: deviceCodeInfo.interval
      });
    } catch (error) {
      console.error("Error starting Device Flow:", error);
      res.status(500).json({ 
        message: "Error starting Device Flow", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Check Device Flow status
  app.get("/api/google/auth/device/status", async (_req: Request, res: Response) => {
    try {
      const status = await checkDeviceFlowStatus();
      console.log("Device Flow status check:", status);
      res.json(status);
    } catch (error) {
      console.error("Error checking Device Flow status:", error);
      res.status(500).json({ 
        message: "Error checking Device Flow status", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Exchange OAuth2 code for token
  app.post("/api/google/auth/token", async (req: Request, res: Response) => {
    try {
      if (!req.body.code) {
        return res.status(400).json({ message: "Authorization code is required" });
      }
      
      if (!hasOAuth2Credentials()) {
        return res.status(400).json({
          message: "Google OAuth2 credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        });
      }
      
      const token = await getTokenFromCode(req.body.code);
      res.json({ success: true, message: "OAuth2 token obtained successfully" });
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      res.status(500).json({ 
        message: "Error exchanging code for token", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // OAuth2 callback handler
  app.get("/oauth2callback", async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.status(400).send(`
          <html>
            <head><title>Errore di autenticazione</title></head>
            <body>
              <h1>Errore di autenticazione</h1>
              <p>Codice di autorizzazione mancante.</p>
              <p><a href="/">Torna all'applicazione</a></p>
            </body>
          </html>
        `);
      }
      
      try {
        console.log("Codice di autorizzazione ricevuto:", code ? `${code.substring(0, 10)}...` : 'mancante');
        // Otteniamo il token e lo salviamo
        const token = await getTokenFromCode(code);
        console.log("Token ottenuto:", token ? "presente" : "non presente");
        
        // Verifichiamo se il token è stato salvato correttamente
        const tokenPath = "./google-token.json";
        const tokenSaved = fs.existsSync(tokenPath);
        console.log(`Verifica file token in ${tokenPath}:`, tokenSaved ? "presente" : "non presente");
        
        if (!tokenSaved && token) {
          // Tenta di salvare manualmente il token
          try {
            console.log("Tentativo di salvataggio manuale del token...");
            fs.writeFileSync(tokenPath, JSON.stringify(token), { mode: 0o600 });
            console.log("Token salvato manualmente con successo");
          } catch (saveError) {
            console.error("Errore nel salvataggio manuale del token:", saveError);
          }
        }
        
        // Verifica la validità del token
        const isValid = await verifyToken();
        console.log("Verifica validità token:", isValid ? "valido" : "non valido");
        
        // Reindirizza alla pagina di autenticazione Google con un messaggio di successo
        res.send(`
          <html>
            <head>
              <title>Autenticazione completata</title>
              <script>
                window.onload = function() {
                  window.location.href = '/google-auth?success=true';
                }
              </script>
            </head>
            <body>
              <h1>Autenticazione completata con successo!</h1>
              <p>Reindirizzamento in corso...</p>
              <p>Dettagli:</p>
              <ul>
                <li>Token salvato: ${tokenSaved ? "✓" : "✗"}</li>
                <li>Token valido: ${isValid ? "✓" : "✗"}</li>
              </ul>
              <p>Se non vieni reindirizzato automaticamente, <a href="/google-auth?success=true">clicca qui</a>.</p>
            </body>
          </html>
        `);
      } catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).send(`
          <html>
            <head><title>Errore di autenticazione</title></head>
            <body>
              <h1>Errore durante l'autenticazione</h1>
              <p>${error instanceof Error ? error.message : "Errore sconosciuto"}</p>
              <p><a href="/google-auth">Torna alla pagina di autenticazione</a></p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("OAuth callback general error:", error);
      res.status(500).send("Errore durante il callback OAuth2.");
    }
  });

  // Synchronize maintenance requests from Google Sheets
  // Sincronizzare lo stato delle richieste di manutenzione verso Google Sheets
  app.post("/api/google/sheets/sync-status", async (_req: Request, res: Response) => {
    try {
      // Verifica che l'autenticazione OAuth2 sia configurata
      if (!hasOAuth2Credentials()) {
        return res.status(400).json({
          message: "Google OAuth2 credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        });
      }

      if (!await verifyToken()) {
        return res.status(401).json({
          message: "Google OAuth2 token is invalid or missing. Please authenticate first."
        });
      }

      if (!process.env.GOOGLE_SHEET_ID) {
        return res.status(400).json({
          message: "Google Sheet ID is missing. Please check your environment configuration."
        });
      }

      console.log("Sincronizzazione stati verso Google Sheets avviata");

      // Ottiene tutte le richieste completate o rifiutate che potrebbero dover essere aggiornate su Google Sheets
      const maintenanceRequests = await storage.getMaintenanceRequests({
        status: "all", // Recupera tutte per filtrare manualmente
        priority: "all",
        page: 1,
        limit: 1000, // Un limite ragionevolmente alto
        query: ""
      });

      // Filtra solo le richieste completate o rifiutate
      const completedRequests = maintenanceRequests.requests.filter(req => 
        req.status === "completed" || req.status === "rejected"
      );

      console.log(`Trovate ${completedRequests.length} richieste completate/rifiutate da sincronizzare`);

      let updated = 0;
      let failed = 0;

      // Per ogni richiesta completata, trova la riga corrispondente nel foglio Google e aggiorna lo stato
      for (const request of completedRequests) {
        try {
          // Cerca la richiesta nel foglio Google usando timestamp e richiedente
          const timestamp = new Date(request.timestamp);
          const rowIndex = await findRequestRowInGoogleSheet(
            timestamp,
            request.requesterName,
            request.roomNumber
          );

          if (rowIndex >= 0) {
            // Aggiorna lo stato nel foglio Google
            const success = await updateGoogleSheetStatus(rowIndex, "risolto");
            if (success) {
              updated++;
              console.log(`✓ Aggiornata richiesta ID ${request.id} nella riga ${rowIndex} del foglio Google (stato: risolto)`);
            } else {
              failed++;
              console.log(`✗ Impossibile aggiornare richiesta ID ${request.id} nella riga ${rowIndex} del foglio Google`);
            }
          } else {
            failed++;
            console.log(`✗ Richiesta ID ${request.id} non trovata nel foglio Google`);
          }
        } catch (error) {
          failed++;
          console.error(`Errore nell'aggiornamento della richiesta ID ${request.id}:`, error);
        }
      }

      res.json({
        message: "Synchronization completed",
        total: completedRequests.length,
        updated,
        failed
      });
    } catch (error) {
      console.error("Error syncing status to Google Sheets:", error);
      res.status(500).json({ 
        message: "Error syncing status to Google Sheets",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/maintenance/sync-google-sheets", async (_req: Request, res: Response) => {
    try {
      // Controlla che le chiavi API Google siano configurate
      if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_SHEET_ID) {
        return res.status(400).json({
          message: "Google API key and/or Sheet ID is missing. Please check your environment configuration."
        });
      }
      
      console.log("Sincronizzazione Google Sheets avviata");
      
      // Prima verifichiamo se i dati del foglio sono già caricati in memoria
      let data;
      if (isSheetLoaded()) {
        console.log("Foglio Google già caricato in memoria, utilizzo dati esistenti");
      } else {
        console.log("Foglio Google non ancora caricato, caricamento in corso...");
      }
      
      // Importa direttamente dal foglio Google Sheet
      try {
        // Leggi i dati dal foglio Google
        data = await readGoogleSheet();
        
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
        
        // Verifica intestazione colonna stato (colonna A)
        const statusHeader = data[0] && data[0][0] ? String(data[0][0]).toLowerCase() : '';
        const isStatusColumn = statusHeader === 'risolto' || statusHeader.includes('stato');
        
        if (isStatusColumn) {
          console.log(`✓ Rilevata colonna di stato "${data[0][0]}" nella prima colonna (A)`);
          
          // Verifichiamo le prime 5 righe per debug
          let risolteCount = 0;
          let pendingCount = 0;
          for (let i = 1; i < Math.min(data.length, 6); i++) {
            if (data[i] && data[i][0]) {
              const statusValue = String(data[i][0]).toLowerCase().trim();
              if (statusValue === 'risolto') {
                risolteCount++;
                console.log(`  • Riga ${i} ha stato "risolto" (valore: "${data[i][0]}")`);
              } else {
                pendingCount++;
                console.log(`  • Riga ${i} NON ha stato "risolto" (valore: "${data[i][0] || '<vuoto>'}")`);
              }
            }
          }
          console.log(`Analisi prime 5 righe: ${risolteCount} risolte, ${pendingCount} non risolte o in corso`);
        } else {
          console.log(`! Nessuna colonna di stato rilevata. Prima colonna ha intestazione: "${data[0][0] || '<vuota>'}"`);
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
            
            // Verifica se la richiesta è stata risolta (colonna A)
            let isRisolto = false;
            if (isStatusColumn && row[0] && typeof row[0] === 'string' && String(row[0]).toLowerCase().trim() === 'risolto') {
              isRisolto = true;
              console.log(`Riga ${i} è marcata come RISOLTA nel foglio, stato: "${row[0]}"`);
            }
            
            // Crea la richiesta di manutenzione se la stanza non è vuota e non è risolta
            if (stanza && stanza !== "N/D") {
              // Creiamo un identificatore univoco per questa richiesta combinando alcuni campi
              const uniqueId = `${richiedente}_${stanza}_${timestamp.toISOString()}`;
              const hashId = Buffer.from(uniqueId).toString('base64').substring(0, 15);
              
              // Prima cerchiamo se esiste già una richiesta simile per evitare duplicati
              const existingRequests = await storage.getMaintenanceRequests({
                query: stanza,
                status: "all",
                priority: "all",
                page: 1,
                limit: 10
              });
              
              // Verifichiamo se c'è una richiesta simile controllando data, stanza e richiedente
              let isExisting = false;
              if (existingRequests && existingRequests.requests) {
                for (const existing of existingRequests.requests) {
                  // Confronta i campi principali
                  const sameRoom = existing.roomNumber === stanza;
                  const sameRequester = existing.requesterName === richiedente;
                  
                  // Confronta le date con un margine di 1 giorno
                  const existingDate = new Date(existing.timestamp);
                  const timeDiff = Math.abs(timestamp.getTime() - existingDate.getTime());
                  const daysDiff = timeDiff / (1000 * 3600 * 24);
                  const closeDate = daysDiff < 1; // Meno di un giorno di differenza
                  
                  if (sameRoom && sameRequester && closeDate) {
                    console.log(`Riga ${i} è un duplicato (richiesta già esistente con ID ${existing.id})`);
                    isExisting = true;
                    break;
                  }
                }
              }
              
              // Determiniamo lo stato in base alla colonna A
              let maintenanceStatus = MaintenanceRequestStatus.PENDING; // Default è pending
              
              // Se la colonna A è "risolto", lo stato diventa "completato"
              if (row[0] && String(row[0]).toLowerCase().trim() === 'risolto') {
                  maintenanceStatus = MaintenanceRequestStatus.COMPLETED;
                  console.log(`Riga ${i}: Stato nel foglio = COMPLETATO, colonna A contiene: "${row[0]}"`);
              } else {
                  console.log(`Riga ${i}: Stato nel foglio = IN ATTESA, colonna A contiene: "${row[0] || '<vuoto>'}"`);
              }
              
              // Se è un duplicato, controlliamo se è cambiato lo stato
              if (isExisting) {
                // Troviamo la richiesta esistente
                let existingRequest = null;
                for (const existing of existingRequests.requests) {
                  const sameRoom = existing.roomNumber === stanza;
                  const sameRequester = existing.requesterName === richiedente;
                  
                  // Confronta le date con un margine di 1 giorno
                  const existingDate = new Date(existing.timestamp);
                  const timeDiff = Math.abs(timestamp.getTime() - existingDate.getTime());
                  const daysDiff = timeDiff / (1000 * 3600 * 24);
                  const closeDate = daysDiff < 1;
                  
                  if (sameRoom && sameRequester && closeDate) {
                    existingRequest = existing;
                    break;
                  }
                }
                
                if (existingRequest && existingRequest.status !== maintenanceStatus) {
                  // Lo stato è cambiato, aggiorniamo la richiesta
                  console.log(`Riga ${i}: Aggiornamento stato da ${existingRequest.status} a ${maintenanceStatus} per richiesta ID ${existingRequest.id}`);
                  
                  await storage.updateMaintenanceRequest(existingRequest.id, {
                    status: maintenanceStatus as MaintenanceRequestStatusValue,
                    notes: `${existingRequest.notes}\n\nAggiornamento automatico: Stato cambiato da "${existingRequest.status}" a "${maintenanceStatus}" il ${new Date().toLocaleString()}`
                  });
                  
                  success++;
                  console.log(`Riga ${i}: Richiesta ID ${existingRequest.id} aggiornata con successo`);
                } else {
                  console.log(`Riga ${i}: Richiesta già esistente e stato non cambiato, nessun aggiornamento necessario`);
                  failed++;
                }
              } else {
                // Nuova richiesta da creare
                
                // Creiamo la richiesta con lo stato determinato
                await storage.createMaintenanceRequest({
                  requesterName: richiedente,
                  requesterEmail: "segreteria@elis.org",
                  roomNumber: stanza,
                  requestType: "Manutenzione",
                  description: descrizione,
                  location: stanza,
                  status: maintenanceStatus as MaintenanceRequestStatusValue, // Cast per evitare errori LSP
                  priority: priorita,
                  notes: `Importato dal foglio Google
Data: ${infoIdx >= 0 && infoIdx < row.length ? row[infoIdx] : "N/D"}
Ubicazione specifica: ${ubicazione}
Dettagli del difetto: ${dettagli}
Stato originale: ${row[0] ? `"${row[0]}"` : "Non specificato"}
RifID: ${hashId}`
                });
                success++;
                console.log(`Riga ${i} importata con successo [ID: ${hashId}]`);
              }
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
