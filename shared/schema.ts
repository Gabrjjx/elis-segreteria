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

// Metodi di pagamento supportati
export const PaymentMethod = {
  CASH: "cash",
  PAYPAL: "paypal",
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
} as const;

export type PaymentMethodValue = typeof PaymentMethod[keyof typeof PaymentMethod];

// Stati degli ordini PayPal
export const PaypalOrderStatus = {
  CREATED: "created",
  APPROVED: "approved",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export type PaypalOrderStatusValue = typeof PaypalOrderStatus[keyof typeof PaypalOrderStatus];

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

// Tipo esteso per includere le informazioni dello studente
export type ServiceWithStudent = Service & {
  student?: {
    firstName: string;
    lastName: string;
  }
};

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

// Tabella per gli ordini PayPal
export const paypalOrders = pgTable("paypal_orders", {
  id: text("id").primaryKey(), // ID dell'ordine PayPal
  serviceId: integer("service_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  paypalResponse: text("paypal_response"), // Risposta JSON da PayPal
});

// Schema per l'inserimento di ordini PayPal
export const insertPaypalOrderSchema = createInsertSchema(paypalOrders).pick({
  id: true,
  serviceId: true,
  amount: true,
  currency: true,
  status: true,
  paypalResponse: true,
}).extend({
  status: z.enum([
    PaypalOrderStatus.CREATED,
    PaypalOrderStatus.APPROVED,
    PaypalOrderStatus.COMPLETED,
    PaypalOrderStatus.CANCELLED,
    PaypalOrderStatus.FAILED,
  ]),
});

// Schema per la ricerca degli ordini PayPal
export const paypalOrderSearchSchema = z.object({
  status: z.enum([
    "all",
    PaypalOrderStatus.CREATED,
    PaypalOrderStatus.APPROVED,
    PaypalOrderStatus.COMPLETED,
    PaypalOrderStatus.CANCELLED,
    PaypalOrderStatus.FAILED,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type InsertPaypalOrder = z.infer<typeof insertPaypalOrderSchema>;
export type PaypalOrder = typeof paypalOrders.$inferSelect;
export type PaypalOrderSearch = z.infer<typeof paypalOrderSearchSchema>;

// Tabella per le ricevute
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  receiptNumber: text("receipt_number").notNull().unique(),
  receiptDate: timestamp("receipt_date").notNull().defaultNow(),
  amount: doublePrecision("amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  pdfUrl: text("pdf_url"), // URL del PDF della ricevuta
});

// Schema per l'inserimento delle ricevute
export const insertReceiptSchema = createInsertSchema(receipts).pick({
  serviceId: true,
  receiptNumber: true,
  amount: true,
  paymentMethod: true,
  notes: true,
  pdfUrl: true,
}).extend({
  receiptDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Data deve essere in formato YYYY-MM-DD" }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, { message: "Data ISO non valida" }),
    z.date()
  ]),
  paymentMethod: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.PAYPAL,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
  ]),
});

// Schema per la ricerca delle ricevute
export const receiptSearchSchema = z.object({
  serviceId: z.number().int().optional(),
  paymentMethod: z.enum([
    "all",
    PaymentMethod.CASH,
    PaymentMethod.PAYPAL,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
  ]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type ReceiptSearch = z.infer<typeof receiptSearchSchema>;

// Tabella per gli studenti della residenza
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  sigla: text("sigla").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema per l'inserimento degli studenti
export const insertStudentSchema = createInsertSchema(students).pick({
  sigla: true,
  firstName: true,
  lastName: true,
});

// Schema per la ricerca degli studenti
export const studentSearchSchema = z.object({
  sigla: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
});

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type StudentSearch = z.infer<typeof studentSearchSchema>;
