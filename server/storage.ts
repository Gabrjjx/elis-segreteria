import { 
  Service,
  InsertService,
  ServiceSearch,
  User, 
  InsertUser,
  ServiceType,
  PaymentStatus,
  services,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, like, gte, lte, desc, count, sum } from "drizzle-orm";

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Service operations
  getServices(params: ServiceSearch): Promise<{ services: Service[], total: number }>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Dashboard operations
  getServiceMetrics(): Promise<{
    totalServices: number,
    pendingPayments: number,
    siglaturaCount: number,
    happyHourCount: number,
    repairCount: number,
    totalAmount: number,
    pendingAmount: number
  }>;
  getPendingPayments(): Promise<Service[]>;
  getRecentServices(limit: number): Promise<Service[]>;
  
  // Maintenance request operations
  getMaintenanceRequests(params: MaintenanceRequestSearch): Promise<{ requests: MaintenanceRequest[], total: number }>;
  getMaintenanceRequest(id: number): Promise<MaintenanceRequest | undefined>;
  createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(id: number, request: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined>;
  deleteMaintenanceRequest(id: number): Promise<boolean>;
  getMaintenanceMetrics(): Promise<{
    totalRequests: number,
    pendingRequests: number,
    inProgressRequests: number,
    completedRequests: number,
    urgentRequests: number
  }>;
  getPendingMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  getRecentMaintenanceRequests(limit: number): Promise<MaintenanceRequest[]>;
  importMaintenanceRequestsFromCSV(csvData: string): Promise<{ success: number, failed: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Maintenance request operations
  async getMaintenanceRequests(params: MaintenanceRequestSearch): Promise<{ requests: MaintenanceRequest[], total: number }> {
    // Start with a basic query
    let query = db.select().from(maintenanceRequests);
    
    // Apply filters
    if (params.query) {
      query = query.where(
        like(maintenanceRequests.requesterName, `%${params.query}%`) || 
        like(maintenanceRequests.roomNumber, `%${params.query}%`) ||
        like(maintenanceRequests.description, `%${params.query}%`)
      );
    }
    
    if (params.status && params.status !== 'all') {
      query = query.where(eq(maintenanceRequests.status, params.status));
    }
    
    if (params.priority && params.priority !== 'all') {
      query = query.where(eq(maintenanceRequests.priority, params.priority));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      query = query.where(gte(maintenanceRequests.timestamp, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      query = query.where(lte(maintenanceRequests.timestamp, endDate));
    }
    
    // Get the total count
    const countQuery = db.select({ count: count() }).from(maintenanceRequests);
    const [{ count: total }] = await countQuery;
    
    // Apply pagination and sorting
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultRequests = await query
      .orderBy(desc(maintenanceRequests.timestamp))
      .limit(limit)
      .offset(offset);
    
    return {
      requests: resultRequests,
      total: Number(total)
    };
  }

  async getMaintenanceRequest(id: number): Promise<MaintenanceRequest | undefined> {
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id));
    return request || undefined;
  }

  async createMaintenanceRequest(request: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    const [newRequest] = await db
      .insert(maintenanceRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updateMaintenanceRequest(id: number, updates: Partial<InsertMaintenanceRequest>): Promise<MaintenanceRequest | undefined> {
    const processedUpdates: any = { ...updates };
    
    if (updates.status === MaintenanceRequestStatus.COMPLETED && !processedUpdates.completedAt) {
      processedUpdates.completedAt = new Date();
    }
    
    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set(processedUpdates)
      .where(eq(maintenanceRequests.id, id))
      .returning();
      
    return updatedRequest;
  }

  async deleteMaintenanceRequest(id: number): Promise<boolean> {
    const result = await db
      .delete(maintenanceRequests)
      .where(eq(maintenanceRequests.id, id));
    return result.rowCount > 0;
  }

  async getMaintenanceMetrics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    inProgressRequests: number;
    completedRequests: number;
    urgentRequests: number;
  }> {
    // Get total requests count
    const [{ count: totalRequests }] = await db
      .select({ count: count() })
      .from(maintenanceRequests);
    
    // Get pending requests count
    const [{ count: pendingRequests }] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, MaintenanceRequestStatus.PENDING));
    
    // Get in progress requests count
    const [{ count: inProgressRequests }] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, MaintenanceRequestStatus.IN_PROGRESS));
    
    // Get completed requests count
    const [{ count: completedRequests }] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, MaintenanceRequestStatus.COMPLETED));
    
    // Get urgent requests count
    const [{ count: urgentRequests }] = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.priority, MaintenanceRequestPriority.URGENT));
    
    return {
      totalRequests: Number(totalRequests),
      pendingRequests: Number(pendingRequests),
      inProgressRequests: Number(inProgressRequests),
      completedRequests: Number(completedRequests),
      urgentRequests: Number(urgentRequests)
    };
  }

  async getPendingMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return db
      .select()
      .from(maintenanceRequests)
      .where(eq(maintenanceRequests.status, MaintenanceRequestStatus.PENDING))
      .orderBy(desc(maintenanceRequests.timestamp));
  }

  async getRecentMaintenanceRequests(limit: number): Promise<MaintenanceRequest[]> {
    return db
      .select()
      .from(maintenanceRequests)
      .orderBy(desc(maintenanceRequests.timestamp))
      .limit(limit);
  }

  async importMaintenanceRequestsFromCSV(csvData: string): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;
    
    try {
      // Parse CSV data (simple implementation)
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      
      // Map field indices
      const fieldMap = {
        timestamp: headers.findIndex(h => h.includes('Timestamp')),
        requesterName: headers.findIndex(h => h.includes('Nome')),
        requesterEmail: headers.findIndex(h => h.includes('Email')),
        roomNumber: headers.findIndex(h => h.includes('Numero di stanza')),
        requestType: headers.findIndex(h => h.includes('Tipo di richiesta')),
        description: headers.findIndex(h => h.includes('Descrizione')),
        location: headers.findIndex(h => h.includes('Luogo')),
      };
      
      // Process each line
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          if (values.length <= 1) continue; // Skip empty lines
          
          const request: InsertMaintenanceRequest = {
            requesterName: values[fieldMap.requesterName] || 'Sconosciuto',
            requesterEmail: values[fieldMap.requesterEmail] || 'sconosciuto@example.com',
            roomNumber: values[fieldMap.roomNumber] || 'N/D',
            requestType: values[fieldMap.requestType] || 'Altro',
            description: values[fieldMap.description] || 'Nessuna descrizione',
            location: values[fieldMap.location] || 'N/D',
            status: MaintenanceRequestStatus.PENDING,
            priority: MaintenanceRequestPriority.MEDIUM,
            notes: '',
          };
          
          await this.createMaintenanceRequest(request);
          success++;
        } catch (error) {
          console.error(`Error importing row ${i}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      throw new Error('Errore nel formato CSV');
    }
    
    return { success, failed };
  }

  // Service operations
  async getServices(params: ServiceSearch): Promise<{ services: Service[], total: number }> {
    // Start with a basic query
    let query = db.select().from(services);
    
    // Apply filters
    if (params.query) {
      query = query.where(like(services.sigla, `%${params.query}%`));
    }
    
    if (params.type && params.type !== 'all') {
      query = query.where(eq(services.type, params.type));
    }
    
    if (params.status && params.status !== 'all') {
      query = query.where(eq(services.status, params.status));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      query = query.where(gte(services.date, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      query = query.where(lte(services.date, endDate));
    }
    
    // Get the total count
    const countQuery = db.select({ count: count() }).from(services);
    const [{ count: total }] = await countQuery;
    
    // Apply pagination and sorting
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultServices = await query
      .orderBy(desc(services.date))
      .limit(limit)
      .offset(offset);
    
    return {
      services: resultServices,
      total: Number(total)
    };
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async createService(insertService: InsertService): Promise<Service> {
    // Ensure date is properly parsed as Date object
    const processedData = {
      ...insertService,
      date: new Date(insertService.date), // Convert to Date object
    };
    
    console.log("Creating service with processed data:", processedData);
    
    try {
      const [service] = await db
        .insert(services)
        .values(processedData)
        .returning();
      
      console.log("Service created successfully:", service);
      return service;
    } catch (error) {
      console.error("Error creating service in database:", error);
      throw error;
    }
  }

  async updateService(id: number, updates: Partial<InsertService>): Promise<Service | undefined> {
    // Process updates to ensure date is properly formatted if it exists
    const processedUpdates: any = { ...updates };
    
    if (updates.date) {
      processedUpdates.date = new Date(updates.date);
    }
    
    console.log("Updating service with id:", id, "with data:", processedUpdates);
    
    try {
      const [updatedService] = await db
        .update(services)
        .set(processedUpdates)
        .where(eq(services.id, id))
        .returning();
        
      console.log("Service updated successfully:", updatedService);
      return updatedService;
    } catch (error) {
      console.error("Error updating service in database:", error);
      throw error;
    }
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db
      .delete(services)
      .where(eq(services.id, id));
    return result.rowCount > 0;
  }

  // Dashboard operations
  async getServiceMetrics(): Promise<{
    totalServices: number;
    pendingPayments: number;
    siglaturaCount: number;
    happyHourCount: number;
    repairCount: number;
    totalAmount: number;
    pendingAmount: number;
  }> {
    // Get total services count
    const [{ count: totalServices }] = await db
      .select({ count: count() })
      .from(services);
    
    // Get pending payments count
    const [{ count: pendingPayments }] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.status, PaymentStatus.UNPAID));
    
    // Get service type counts
    const [{ count: siglaturaCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.type, ServiceType.SIGLATURA));
    
    const [{ count: happyHourCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.type, ServiceType.HAPPY_HOUR));
    
    const [{ count: repairCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(eq(services.type, ServiceType.RIPARAZIONE));
    
    // Get total amount
    const totalResult = await db
      .select({ sum: sum(services.amount) })
      .from(services);
    const totalAmount = totalResult[0]?.sum || 0;
    
    // Get pending amount
    const pendingResult = await db
      .select({ sum: sum(services.amount) })
      .from(services)
      .where(eq(services.status, PaymentStatus.UNPAID));
    const pendingAmount = pendingResult[0]?.sum || 0;
    
    return {
      totalServices: Number(totalServices),
      pendingPayments: Number(pendingPayments),
      siglaturaCount: Number(siglaturaCount),
      happyHourCount: Number(happyHourCount),
      repairCount: Number(repairCount),
      totalAmount: Number(totalAmount),
      pendingAmount: Number(pendingAmount)
    };
  }

  async getPendingPayments(): Promise<Service[]> {
    return db
      .select()
      .from(services)
      .where(eq(services.status, PaymentStatus.UNPAID))
      .orderBy(desc(services.date));
  }

  async getRecentServices(limit: number): Promise<Service[]> {
    return db
      .select()
      .from(services)
      .orderBy(desc(services.date))
      .limit(limit);
  }

  // Initialize sample data - only used for first setup
  async initializeSampleData(): Promise<void> {
    // Check if there's any data already
    const [countResult] = await db.select({ value: count() }).from(services);
    const countValue = Number(countResult.value || 0);
    
    // Only seed if the database is empty
    if (countValue === 0) {
      // Add admin user
      await this.createUser({
        username: "admin",
        password: "admin"
      });

      // Sample services data
      const sampleServices = [
        {
          date: new Date("2025-05-05"),
          sigla: "145",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.UNPAID,
          notes: ""
        },
        {
          date: new Date("2025-04-29"),
          sigla: "177",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-11"),
          sigla: "157",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-09"),
          sigla: "140",
          pieces: 1,
          type: ServiceType.HAPPY_HOUR,
          amount: 1.00,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-07"),
          sigla: "141",
          pieces: 1,
          type: ServiceType.RIPARAZIONE,
          amount: 4.00,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-07"),
          sigla: "139",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-04"),
          sigla: "135",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-04"),
          sigla: "164",
          pieces: 1,
          type: ServiceType.HAPPY_HOUR,
          amount: 1.00,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-01"),
          sigla: "28",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 1.00,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-08"),
          sigla: "142",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        },
        {
          date: new Date("2025-04-08"),
          sigla: "177",
          pieces: 1,
          type: ServiceType.SIGLATURA,
          amount: 0.50,
          status: PaymentStatus.PAID,
          notes: ""
        }
      ];

      // Add sample services
      for (const service of sampleServices) {
        await this.createService(service);
      }
    }
  }
}

// Create and export a single instance of the storage implementation
export const storage = new DatabaseStorage();
