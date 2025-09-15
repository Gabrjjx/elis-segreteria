import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage, DatabaseStorage } from "./storage";
import { schedulerService } from "./services/schedulerService";
import { maintenanceMiddleware } from "./maintenance";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add maintenance mode middleware
app.use(maintenanceMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize the database with sample data if it's empty
  if (storage instanceof DatabaseStorage) {
    try {
      await storage.initializeSampleData();
      log("Database initialized with sample data if needed");
    } catch (error) {
      log(`Error initializing database: ${error}`, "error");
      // Non blocchiamo l'avvio dell'applicazione in caso di errori di database
      // L'applicazione mostrerà un messaggio di errore appropriato all'utente nelle pagine
      log("Proceeding with application startup despite database error", "warning");
    }
  }
  
  const server = await registerRoutes(app);

  // Start the daily report scheduler
  try {
    await schedulerService.start();
    log("Daily report scheduler started successfully");
  } catch (error) {
    log(`Error starting scheduler: ${error}`, "error");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
