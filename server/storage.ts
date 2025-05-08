import { 
  Service,
  InsertService,
  ServiceSearch,
  User, 
  InsertUser,
  ServiceType,
  PaymentStatus
} from "@shared/schema";
import { format } from "date-fns";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private currentUserId: number;
  private currentServiceId: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.currentUserId = 1;
    this.currentServiceId = 1;
    
    // Initialize with some sample data
    this.initializeSampleData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Service operations
  async getServices(params: ServiceSearch): Promise<{ services: Service[], total: number }> {
    let services = Array.from(this.services.values());
    
    // Filter by query (search in sigla)
    if (params.query) {
      const query = params.query.toLowerCase();
      services = services.filter(service => 
        service.sigla.toLowerCase().includes(query)
      );
    }
    
    // Filter by type
    if (params.type && params.type !== 'all') {
      services = services.filter(service => service.type === params.type);
    }
    
    // Filter by status
    if (params.status && params.status !== 'all') {
      services = services.filter(service => service.status === params.status);
    }
    
    // Filter by date range
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      services = services.filter(service => 
        new Date(service.date) >= startDate
      );
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      services = services.filter(service => 
        new Date(service.date) <= endDate
      );
    }
    
    // Sort by date (newest first)
    services = services.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Calculate pagination
    const total = services.length;
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    return {
      services: services.slice(startIndex, endIndex),
      total
    };
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.currentServiceId++;
    const service: Service = { ...insertService, id };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, updates: Partial<InsertService>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService: Service = { ...service, ...updates };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
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
    const services = Array.from(this.services.values());
    
    const totalServices = services.length;
    const pendingServices = services.filter(s => s.status === PaymentStatus.UNPAID);
    const pendingPayments = pendingServices.length;
    
    const siglaturaCount = services.filter(s => s.type === ServiceType.SIGLATURA).length;
    const happyHourCount = services.filter(s => s.type === ServiceType.HAPPY_HOUR).length;
    const repairCount = services.filter(s => s.type === ServiceType.RIPARAZIONE).length;
    
    const totalAmount = services.reduce((sum, service) => sum + service.amount, 0);
    const pendingAmount = pendingServices.reduce((sum, service) => sum + service.amount, 0);
    
    return {
      totalServices,
      pendingPayments,
      siglaturaCount,
      happyHourCount,
      repairCount,
      totalAmount,
      pendingAmount
    };
  }

  async getPendingPayments(): Promise<Service[]> {
    const services = Array.from(this.services.values());
    return services
      .filter(service => service.status === PaymentStatus.UNPAID)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRecentServices(limit: number): Promise<Service[]> {
    const services = Array.from(this.services.values());
    return services
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  private initializeSampleData() {
    // Add admin user
    this.createUser({
      username: "admin",
      password: "admin"
    });

    // Sample services data from the Excel spreadsheet
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
      this.createService(service);
    }
  }
}

export const storage = new MemStorage();
