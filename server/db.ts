import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Ottimizziamo il pool di connessione per ridurre il carico sul database
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limitiamo il numero massimo di connessioni per evitare errori di rate limit
  idleTimeoutMillis: 30000, // Timeout più lungo per le connessioni inutilizzate
  connectionTimeoutMillis: 10000, // Timeout più lungo per le connessioni
  allowExitOnIdle: true // Permette di chiudere il pool quando l'app si ferma
});
export const db = drizzle({ client: pool, schema });