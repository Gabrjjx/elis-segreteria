import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enumerated service types
export const ServiceType = {
  SIGLATURA: "siglatura",
  HAPPY_HOUR: "happy_hour",
  RIPARAZIONE: "riparazione",
} as const;

export type ServiceTypeValue = typeof ServiceType[keyof typeof ServiceType];

// Enumerated payment status
export const PaymentStatus = {
  PAID: "paid",
  UNPAID: "unpaid",
} as const;

export type PaymentStatusValue = typeof PaymentStatus[keyof typeof PaymentStatus];

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  sigla: text("sigla").notNull(),
  pieces: integer("pieces").notNull().default(1),
  type: text("type").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
});

// Default service prices
export const defaultPrices = {
  [ServiceType.SIGLATURA]: 0.50,
  [ServiceType.HAPPY_HOUR]: 1.00,
  [ServiceType.RIPARAZIONE]: 4.00,
};

// Service insert schema
export const insertServiceSchema = createInsertSchema(services).pick({
  sigla: true,
  pieces: true,
  type: true,
  amount: true,
  status: true,
  notes: true,
}).extend({
  // Accept date as string (YYYY-MM-DD or ISO format) or Date object
  date: z.union([
    // Accept simple YYYY-MM-DD format
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data deve essere in formato YYYY-MM-DD" }),
    // Accept ISO format string
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, { message: "Data ISO non valida" }),
    // Accept Date objects
    z.date()
  ]).transform((val) => {
    console.log(`Schema validazione data ricevuta: ${val}, tipo: ${typeof val}`);
    
    // Se è già una stringa in formato YYYY-MM-DD, la usiamo così com'è
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      console.log(`Formato data semplice valido: ${val}, lo uso così com'è`);
      return val;
    }
    
    // Per date in formato ISO string o Date object, convertiamo in YYYY-MM-DD
    let dateObj: Date;
    if (typeof val === 'string') {
      dateObj = new Date(val);
    } else {
      dateObj = val as Date;
    }
    
    // Verifica che la data sia valida
    if (isNaN(dateObj.getTime())) {
      console.error(`Data non valida: ${val}`);
      throw new Error("Invalid date");
    }
    
    // Formatta in YYYY-MM-DD
    const formatted = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    console.log(`Data convertita in: ${formatted}`);
    return formatted;
  }),
  type: z.enum([
    ServiceType.SIGLATURA,
    ServiceType.HAPPY_HOUR,
    ServiceType.RIPARAZIONE,
  ]),
  status: z.enum([
    PaymentStatus.PAID,
    PaymentStatus.UNPAID,
  ]),
});

// Service search parameters schema
export const serviceSearchSchema = z.object({
  query: z.string().optional(),
  type: z.enum([
    "all",
    ServiceType.SIGLATURA,
    ServiceType.HAPPY_HOUR,
    ServiceType.RIPARAZIONE,
  ]).optional(),
  status: z.enum([
    "all",
    PaymentStatus.PAID,
    PaymentStatus.UNPAID,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

// Service types with type validation
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type ServiceSearch = z.infer<typeof serviceSearchSchema>;

// User schema - keeping it from the template for completeness
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Enum per lo stato delle richieste di manutenzione
export const MaintenanceRequestStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export type MaintenanceRequestStatusValue = typeof MaintenanceRequestStatus[keyof typeof MaintenanceRequestStatus];

// Enum per la priorità delle richieste
export const MaintenanceRequestPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export type MaintenanceRequestPriorityValue = typeof MaintenanceRequestPriority[keyof typeof MaintenanceRequestPriority];

// Tabella per le richieste di manutenzione
export const maintenanceRequests = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  requesterName: text("requester_name").notNull(),
  requesterEmail: text("requester_email").notNull(),
  roomNumber: text("room_number").notNull(),
  requestType: text("request_type").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default(MaintenanceRequestStatus.PENDING),
  priority: text("priority").notNull().default(MaintenanceRequestPriority.MEDIUM),
  notes: text("notes"),
  assignedTo: text("assigned_to"),
  completedAt: timestamp("completed_at"),
  attachmentUrl: text("attachment_url"),
});

// Schema per l'inserimento di nuove richieste
export const insertMaintenanceRequestSchema = createInsertSchema(maintenanceRequests).pick({
  requesterName: true,
  requesterEmail: true,
  roomNumber: true,
  requestType: true,
  description: true,
  location: true,
  priority: true,
  notes: true,
  assignedTo: true,
  attachmentUrl: true,
}).extend({
  status: z.enum([
    MaintenanceRequestStatus.PENDING,
    MaintenanceRequestStatus.IN_PROGRESS,
    MaintenanceRequestStatus.COMPLETED,
    MaintenanceRequestStatus.REJECTED,
  ]).default(MaintenanceRequestStatus.PENDING),
  priority: z.enum([
    MaintenanceRequestPriority.LOW,
    MaintenanceRequestPriority.MEDIUM,
    MaintenanceRequestPriority.HIGH,
    MaintenanceRequestPriority.URGENT,
  ]).default(MaintenanceRequestPriority.MEDIUM),
});

// Schema per la ricerca delle richieste
export const maintenanceRequestSearchSchema = z.object({
  query: z.string().optional(),
  status: z.enum([
    "all",
    MaintenanceRequestStatus.PENDING,
    MaintenanceRequestStatus.IN_PROGRESS,
    MaintenanceRequestStatus.COMPLETED,
    MaintenanceRequestStatus.REJECTED,
  ]).optional(),
  priority: z.enum([
    "all",
    MaintenanceRequestPriority.LOW,
    MaintenanceRequestPriority.MEDIUM,
    MaintenanceRequestPriority.HIGH,
    MaintenanceRequestPriority.URGENT,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type InsertMaintenanceRequest = z.infer<typeof insertMaintenanceRequestSchema>;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type MaintenanceRequestSearch = z.infer<typeof maintenanceRequestSearchSchema>;
