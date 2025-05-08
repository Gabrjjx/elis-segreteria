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
  // Accept date as string (ISO format) or Date object
  date: z.string().or(z.date()).transform((val) => {
    if (typeof val === 'string') {
      // Parse the string to a Date object
      const date = new Date(val);
      // Validate the date
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      return val; // Return the string as is, will be parsed in storage
    }
    return val instanceof Date ? val.toISOString() : val;
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
