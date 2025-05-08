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
import { getMaintenanceRequestsCSV } from "./services/googleSheets";

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
      
      // Recupera i dati dal foglio Google
      const csvData = await getMaintenanceRequestsCSV();
      
      // Importa i dati nel sistema
      if (!csvData) {
        return res.status(400).json({ message: "No data found in Google Sheet" });
      }
      
      const result = await storage.importMaintenanceRequestsFromCSV(csvData);
      
      res.status(200).json({
        message: "Maintenance requests synchronized successfully",
        imported: result.success,
        failed: result.failed,
        total: result.success + result.failed
      });
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
