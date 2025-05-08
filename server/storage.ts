import { 
  Service,
  InsertService,
  ServiceSearch,
  User, 
  InsertUser,
  ServiceType,
  PaymentStatus,
  MaintenanceRequestStatus,
  MaintenanceRequestPriority,
  MaintenanceRequest,
  InsertMaintenanceRequest,
  MaintenanceRequestSearch,
  PaypalOrderStatus,
  PaypalOrder, 
  PaypalOrderSearch,
  Receipt, 
  InsertReceipt, 
  ReceiptSearch,
  PaymentMethod,
  Student, 
  InsertStudent, 
  StudentSearch,
  services,
  users,
  maintenanceRequests,
  paypalOrders,
  receipts,
  students
} from "@shared/schema";
import { db } from "./db";
import { eq, like, gte, lte, desc, count, sum, or, and } from "drizzle-orm";

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
  getServiceMetrics(dateFilter?: { startDate?: Date, endDate?: Date }): Promise<{
    totalServices: number,
    pendingPayments: number,
    siglaturaCount: number,
    happyHourCount: number,
    repairCount: number,
    totalAmount: number,
    pendingAmount: number
  }>;
  getPendingPayments(dateFilter?: { startDate?: Date, endDate?: Date }): Promise<Service[]>;
  getRecentServices(limit: number, dateFilter?: { startDate?: Date, endDate?: Date }): Promise<Service[]>;
  
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
  
  // PayPal operations
  storePaypalOrderInfo(orderId: string, orderInfo: any): Promise<void>;
  getPaypalOrderInfo(orderId: string): Promise<any | null>;
  updatePaypalOrderInfo(orderId: string, updates: any): Promise<void>;
  getPaypalOrders(params: PaypalOrderSearch): Promise<{ orders: PaypalOrder[], total: number }>;
  
  // Receipt operations
  createReceipt(receipt: Partial<InsertReceipt>): Promise<number>;
  getReceipt(id: number): Promise<Receipt | undefined>;
  getReceiptByServiceId(serviceId: number): Promise<Receipt | undefined>;
  getReceipts(params: ReceiptSearch): Promise<{ receipts: Receipt[], total: number }>;
  
  // Student operations
  getStudents(params: StudentSearch): Promise<{ students: Student[], total: number }>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentBySigla(sigla: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  importStudentsFromCSV(csvData: string): Promise<{ success: number, failed: number }>;
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

  // PayPal operations
  async storePaypalOrderInfo(orderId: string, orderInfo: any): Promise<void> {
    // Assumiamo che il parametro orderInfo includa almeno serviceId, amount, currency e status
    await db.insert(paypalOrders).values({
      id: orderId,
      serviceId: orderInfo.serviceId,
      amount: orderInfo.amount,
      currency: orderInfo.currency || "EUR",
      status: orderInfo.status,
      paypalResponse: JSON.stringify(orderInfo),
    });
  }

  async getPaypalOrderInfo(orderId: string): Promise<any | null> {
    const [order] = await db.select().from(paypalOrders).where(eq(paypalOrders.id, orderId));
    
    if (!order) return null;
    
    // Se c'è una risposta JSON memorizzata, la convertiamo
    if (order.paypalResponse) {
      try {
        return {
          ...order,
          paypalResponseObj: JSON.parse(order.paypalResponse)
        };
      } catch (e) {
        console.error("Errore nel parsing della risposta PayPal:", e);
        return order;
      }
    }
    
    return order;
  }

  async updatePaypalOrderInfo(orderId: string, updates: any): Promise<void> {
    const processedUpdates: any = { ...updates };
    
    // Se lo stato è completed, impostiamo completedAt
    if (updates.status === PaypalOrderStatus.COMPLETED && !processedUpdates.completedAt) {
      processedUpdates.completedAt = new Date();
    }
    
    // Aggiorniamo la risposta JSON se presente
    if (updates.paypalResponse) {
      processedUpdates.paypalResponse = typeof updates.paypalResponse === 'string' 
        ? updates.paypalResponse 
        : JSON.stringify(updates.paypalResponse);
    }
    
    await db
      .update(paypalOrders)
      .set(processedUpdates)
      .where(eq(paypalOrders.id, orderId));
  }

  async getPaypalOrders(params: PaypalOrderSearch): Promise<{ orders: PaypalOrder[], total: number }> {
    // Inizia con una query base
    let query = db.select().from(paypalOrders);
    
    // Applica filtri
    if (params.status && params.status !== 'all') {
      query = query.where(eq(paypalOrders.status, params.status));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      query = query.where(gte(paypalOrders.createdAt, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      query = query.where(lte(paypalOrders.createdAt, endDate));
    }
    
    // Ottieni il conteggio totale
    const countQuery = db.select({ count: count() }).from(paypalOrders);
    const [{ count: total }] = await countQuery;
    
    // Applica paginazione e ordinamento
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultOrders = await query
      .orderBy(desc(paypalOrders.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      orders: resultOrders,
      total: Number(total)
    };
  }

  // Receipt operations
  async createReceipt(receipt: Partial<InsertReceipt>): Promise<number> {
    const [newReceipt] = await db
      .insert(receipts)
      .values(receipt)
      .returning();
    
    return newReceipt.id;
  }

  async getReceipt(id: number): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt || undefined;
  }

  async getReceiptByServiceId(serviceId: number): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.serviceId, serviceId));
    return receipt || undefined;
  }

  async getReceipts(params: ReceiptSearch): Promise<{ receipts: Receipt[], total: number }> {
    // Inizia con una query base
    let query = db.select().from(receipts);
    
    // Applica filtri
    if (params.serviceId) {
      query = query.where(eq(receipts.serviceId, params.serviceId));
    }
    
    if (params.paymentMethod && params.paymentMethod !== 'all') {
      query = query.where(eq(receipts.paymentMethod, params.paymentMethod));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      query = query.where(gte(receipts.receiptDate, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      query = query.where(lte(receipts.receiptDate, endDate));
    }
    
    // Ottieni il conteggio totale
    const countQuery = db.select({ count: count() }).from(receipts);
    const [{ count: total }] = await countQuery;
    
    // Applica paginazione e ordinamento
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultReceipts = await query
      .orderBy(desc(receipts.receiptDate))
      .limit(limit)
      .offset(offset);
    
    return {
      receipts: resultReceipts,
      total: Number(total)
    };
  }

  async importMaintenanceRequestsFromCSV(csvData: string): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;
    
    try {
      // Parse CSV data (simple implementation)
      const lines = csvData.split('\n').filter(line => line.trim());
      
      // Verifica se è uno dei formati conosciuti ELIS
      const isOldElisFormat = lines[0].includes('segnalato') || lines[0].includes('risolto');
      const isNewElisFormat = lines[0].includes('Informazioni cronologiche') && 
                             lines[0].includes('Sigla') && 
                             lines[0].includes('Luogo');
      
      if (isNewElisFormat) {
        // Formato ELIS Excel aggiornato:
        // Le colonne sono:
        // Informazioni cronologiche | Sigla | Luogo | Ubicazione specifica | Dettagli del difetto | Priorità | Risolvibile | Suggerimento
        
        // Salta l'intestazione
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            if (values.length < 5) continue; // Skip incomplete lines
            
            // Verifica che non sia una riga vuota
            const hasData = values.some(v => v.trim().length > 0);
            if (!hasData) continue;
            
            const timestamp = values[0] || new Date().toISOString(); // Informazioni cronologiche
            const sigla = values[1] || 'N/D'; // Sigla
            const location = values[2] || 'N/D'; // Luogo
            const specificLocation = values[3] || ''; // Ubicazione specifica
            const issueDetails = values[4] || ''; // Dettagli del difetto
            
            // Priorità, se specificata
            let priorityText = '';
            if (values.length > 5) {
              priorityText = values[5] || '';
            }
            
            // Risolvibile con manutentori?
            let resolvableBy = '';
            if (values.length > 6) {
              resolvableBy = values[6] || '';
            }
            
            // Suggerimento risoluzione
            let resolutionSuggestion = '';
            if (values.length > 7) {
              resolutionSuggestion = values[7] || '';
            }
            
            // Determina lo stato (di default è pendente)
            const requestStatus = MaintenanceRequestStatus.PENDING;
            
            // Determina priorità basata sul valore di priorità o dal testo dell'issue
            let priority = MaintenanceRequestPriority.MEDIUM;
            
            // Prima controlliamo il campo priorità esplicito
            if (priorityText) {
              const lowerPriority = priorityText.toLowerCase();
              if (lowerPriority.includes('urgente') || lowerPriority.includes('urgent') || lowerPriority.includes('alta')) {
                priority = MaintenanceRequestPriority.URGENT;
              } else if (lowerPriority.includes('alta') || lowerPriority.includes('high')) {
                priority = MaintenanceRequestPriority.HIGH;
              } else if (lowerPriority.includes('bassa') || lowerPriority.includes('low')) {
                priority = MaintenanceRequestPriority.LOW;
              } else {
                priority = MaintenanceRequestPriority.MEDIUM;
              }
            } else {
              // Altrimenti controlliamo nei dettagli del difetto
              const combinedText = (specificLocation + ' ' + issueDetails).toLowerCase();
              if (combinedText.includes('urgente') || combinedText.includes('urgent')) {
                priority = MaintenanceRequestPriority.URGENT;
              } else if (combinedText.includes('alta') || combinedText.includes('high')) {
                priority = MaintenanceRequestPriority.HIGH;
              } else if (combinedText.includes('bassa') || combinedText.includes('low')) {
                priority = MaintenanceRequestPriority.LOW;
              } else {
                priority = MaintenanceRequestPriority.MEDIUM;
              }
            }
            
            // Componi note aggiuntive
            let notes = '';
            if (resolvableBy || resolutionSuggestion) {
              notes = `Risolvibile con manutentori autarchici: ${resolvableBy}\n\nSuggerimento per la risoluzione: ${resolutionSuggestion}`;
            }
            
            // I campi sono mappati esattamente come richiesto:
            // - timestamp dal campo "Informazioni cronologiche"
            // - requesterName dal campo "Sigla"
            // - roomNumber dal campo "Luogo"
            const request: InsertMaintenanceRequest = {
              requesterName: sigla, // Richiedente è la "Sigla" dal foglio Excel
              requesterEmail: 'segreteria@elis.org',
              roomNumber: location, // Stanza è il "Luogo" dal foglio Excel
              requestType: 'Manutenzione',
              description: `${specificLocation}: ${issueDetails}`,
              location: location,
              status: requestStatus,
              priority: priority,
              notes: notes,
            };
            
            await this.createMaintenanceRequest(request);
            success++;
          } catch (error) {
            console.error(`Error importing row ${i}:`, error);
            failed++;
          }
        }
      } else if (isOldElisFormat) {
        // Formato ELIS Excel aggiornato:
        // Le colonne sono:
        // Informazioni cronologiche | Sigla | Luogo | Ubicazione specifica | Dettagli del difetto | Priorità | Risolvibile con manutentori autarchici? | Come risolvere
        
        // Salta l'intestazione
        for (let i = 1; i < lines.length; i++) {
          try {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            if (values.length < 5) continue; // Skip incomplete lines
            
            const timestamp = values[0] || new Date().toISOString(); // Informazioni cronologiche
            const sigla = values[1] || 'N/D'; // Sigla
            const location = values[2] || 'N/D'; // Luogo
            const specificLocation = values[3] || ''; // Ubicazione specifica
            const issueDetails = values[4] || ''; // Dettagli del difetto
            
            // Priorità, se specificata
            let priorityText = '';
            if (values.length > 5) {
              priorityText = values[5] || '';
            }
            
            // Risolvibile con manutentori?
            let resolvableBy = '';
            if (values.length > 6) {
              resolvableBy = values[6] || '';
            }
            
            // Suggerimento risoluzione
            let resolutionSuggestion = '';
            if (values.length > 7) {
              resolutionSuggestion = values[7] || '';
            }
            
            // Determina lo stato (di default è pendente)
            let requestStatus = MaintenanceRequestStatus.PENDING;
            
            // Determina priorità basata sul valore di priorità o dal testo dell'issue
            let priority = MaintenanceRequestPriority.MEDIUM;
            
            // Prima controlliamo il campo priorità esplicito
            if (priorityText) {
              const lowerPriority = priorityText.toLowerCase();
              if (lowerPriority.includes('urgente') || lowerPriority.includes('urgent') || lowerPriority.includes('alta')) {
                priority = MaintenanceRequestPriority.URGENT;
              } else if (lowerPriority.includes('alta') || lowerPriority.includes('high')) {
                priority = MaintenanceRequestPriority.HIGH;
              } else if (lowerPriority.includes('bassa') || lowerPriority.includes('low')) {
                priority = MaintenanceRequestPriority.LOW;
              }
            } else {
              // Altrimenti controlliamo nei dettagli del difetto
              const combinedText = (specificLocation + ' ' + issueDetails).toLowerCase();
              if (combinedText.includes('urgente') || combinedText.includes('urgent')) {
                priority = MaintenanceRequestPriority.URGENT;
              } else if (combinedText.includes('alta') || combinedText.includes('high')) {
                priority = MaintenanceRequestPriority.HIGH;
              } else if (combinedText.includes('bassa') || combinedText.includes('low')) {
                priority = MaintenanceRequestPriority.LOW;
              }
            }
            
            // Componi note aggiuntive
            let notes = '';
            if (resolvableBy || resolutionSuggestion) {
              notes = `Risolvibile con manutentori autarchici: ${resolvableBy}\n\nSuggerimento per la risoluzione: ${resolutionSuggestion}`;
            }
            
            const request: InsertMaintenanceRequest = {
              requesterName: sigla, // Sigla come richiedente
              requesterEmail: 'segreteria@elis.org',
              roomNumber: location, // Luogo come stanza
              requestType: 'Manutenzione',
              description: `${specificLocation}: ${issueDetails}`,
              location: location,
              status: requestStatus,
              priority: priority,
              notes: notes,
            };
            
            await this.createMaintenanceRequest(request);
            success++;
          } catch (error) {
            console.error(`Error importing row ${i}:`, error);
            failed++;
          }
        }
      } else {
        // Formato Google Forms (formato originale)
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
    
    // Get the total count with the same filters
    // Clona la query per usare gli stessi filtri nella count query
    const countQuery = db.select({ count: count() }).from(services);
    
    // Log dei parametri filtro ricevuti
    console.log("getServices - Parametri ricevuti:", params);
    console.log(`Tipo servizio: ${params.type}, Stato: ${params.status}`);
    
    // Applica gli stessi filtri alla query di conteggio
    if (params.query) {
      countQuery.where(like(services.sigla, `%${params.query}%`));
    }
    
    if (params.type && params.type !== 'all') {
      console.log(`Applicando filtro per tipo: ${params.type}`);
      countQuery.where(eq(services.type, params.type));
    }
    
    if (params.status && params.status !== 'all') {
      console.log(`Applicando filtro per stato: ${params.status}`);
      countQuery.where(eq(services.status, params.status));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      countQuery.where(gte(services.date, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      countQuery.where(lte(services.date, endDate));
    }
    
    const [{ count: total }] = await countQuery;
    
    // Apply pagination and sorting
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultServices = await query
      .orderBy(desc(services.date))
      .limit(limit)
      .offset(offset);
    
    // Arricchisci i risultati con i dati degli studenti
    const enrichedServices = await Promise.all(
      resultServices.map(async (service) => {
        if (service.sigla) {
          const student = await this.getStudentBySigla(service.sigla);
          if (student) {
            return {
              ...service,
              student: {
                firstName: student.firstName,
                lastName: student.lastName
              }
            };
          }
        }
        return service;
      })
    );
    
    return {
      services: enrichedServices,
      total: Number(total)
    };
  }

  async getService(id: number): Promise<(Service & { student?: { firstName: string, lastName: string } }) | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    
    if (!service) {
      return undefined;
    }
    
    // Ottieni informazioni sullo studente se presente
    if (service.sigla) {
      const student = await this.getStudentBySigla(service.sigla);
      if (student) {
        return {
          ...service,
          student: {
            firstName: student.firstName,
            lastName: student.lastName
          }
        };
      }
    }
    
    return service;
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
  async getServiceMetrics(dateFilter?: { startDate?: Date, endDate?: Date }): Promise<{
    totalServices: number;
    pendingPayments: number;
    siglaturaCount: number;
    happyHourCount: number;
    repairCount: number;
    totalAmount: number;
    pendingAmount: number;
  }> {
    // Funzione per applicare i filtri di data
    const applyDateFilter = (query: any) => {
      let filteredQuery = query;
      if (dateFilter?.startDate) {
        filteredQuery = filteredQuery.where(gte(services.date, dateFilter.startDate));
      }
      if (dateFilter?.endDate) {
        filteredQuery = filteredQuery.where(lte(services.date, dateFilter.endDate));
      }
      return filteredQuery;
    };
    
    // Debugging temporaneo - stampare i parametri di filtro
    console.log("Filter startDate:", dateFilter?.startDate);
    console.log("Filter endDate:", dateFilter?.endDate);
    
    // Definiamo le condizioni base per i filtri di data
    const dateConditions = [];
    if (dateFilter?.startDate) {
      dateConditions.push(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      dateConditions.push(lte(services.date, dateFilter.endDate));
    }
    
    // Funzione per combinare condizioni di filtro in modo corretto
    const getFilter = (baseCondition: any) => {
      // Se non ci sono filtri di data, restituisci solo la condizione base
      if (dateConditions.length === 0) {
        return baseCondition;
      }
      
      // Altrimenti, combina la condizione base con filtri di data usando AND
      if (!baseCondition) {
        // Solo filtri di data
        return and(...dateConditions);
      }
      
      return and(baseCondition, ...dateConditions);
    };
    
    // Get total services count
    let totalQuery = db.select({ count: count() }).from(services);
    if (dateConditions.length > 0) {
      totalQuery = totalQuery.where(and(...dateConditions));
    }
    const [{ count: totalServices }] = await totalQuery;
    
    // Get pending payments count 
    const pendingFilter = getFilter(eq(services.status, PaymentStatus.UNPAID));
    const [{ count: pendingPayments }] = await db
      .select({ count: count() })
      .from(services)
      .where(pendingFilter);
    
    // Get service type counts
    const siglaturaFilter = getFilter(eq(services.type, ServiceType.SIGLATURA));
    const [{ count: siglaturaCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(siglaturaFilter);
    
    const happyHourFilter = getFilter(eq(services.type, ServiceType.HAPPY_HOUR));
    const [{ count: happyHourCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(happyHourFilter);
    
    const repairFilter = getFilter(eq(services.type, ServiceType.RIPARAZIONE));
    const [{ count: repairCount }] = await db
      .select({ count: count() })
      .from(services)
      .where(repairFilter);
    
    // Get total amount
    let totalAmountQuery = db
      .select({ sum: sum(services.amount) })
      .from(services);
    if (dateConditions.length > 0) {
      totalAmountQuery = totalAmountQuery.where(and(...dateConditions));
    }
    const totalResult = await totalAmountQuery;
    const totalAmount = totalResult[0]?.sum || 0;
    
    // Get pending amount
    const pendingAmountFilter = getFilter(eq(services.status, PaymentStatus.UNPAID));
    const pendingResult = await db
      .select({ sum: sum(services.amount) })
      .from(services)
      .where(pendingAmountFilter);
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

  async getPendingPayments(dateFilter?: { startDate?: Date, endDate?: Date }): Promise<(Service & { student?: { firstName: string, lastName: string } })[]> {
    let query = db
      .select()
      .from(services)
      .where(eq(services.status, PaymentStatus.UNPAID));
    
    // Applicare i filtri di data se presenti
    if (dateFilter?.startDate) {
      query = query.where(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      query = query.where(lte(services.date, dateFilter.endDate));
    }
    
    const resultServices = await query.orderBy(desc(services.date));
    
    // Arricchisci i risultati con i dati degli studenti
    const enrichedServices = await Promise.all(
      resultServices.map(async (service) => {
        if (service.sigla) {
          const student = await this.getStudentBySigla(service.sigla);
          if (student) {
            return {
              ...service,
              student: {
                firstName: student.firstName,
                lastName: student.lastName
              }
            };
          }
        }
        return service;
      })
    );
    
    return enrichedServices;
  }

  async getRecentServices(limit: number, dateFilter?: { startDate?: Date, endDate?: Date }): Promise<(Service & { student?: { firstName: string, lastName: string } })[]> {
    let query = db
      .select()
      .from(services);
    
    // Applicare i filtri di data se presenti
    if (dateFilter?.startDate) {
      query = query.where(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      query = query.where(lte(services.date, dateFilter.endDate));
    }
    
    const resultServices = await query
      .orderBy(desc(services.date))
      .limit(limit);
      
    // Arricchisci i risultati con i dati degli studenti
    const enrichedServices = await Promise.all(
      resultServices.map(async (service) => {
        if (service.sigla) {
          const student = await this.getStudentBySigla(service.sigla);
          if (student) {
            return {
              ...service,
              student: {
                firstName: student.firstName,
                lastName: student.lastName
              }
            };
          }
        }
        return service;
      })
    );
    
    return enrichedServices;
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
    
    // Check if we have any existing students
    const { students } = await this.getStudents({
      page: 1,
      limit: 1
    });
    
    if (students.length === 0) {
      console.log("Initializing students data");
      
      // CSV data di esempio
      const csvData = `NOME,COGNOME,SIGLA
ROBERTO,FERULANO,26
DOMENICO,PONTARI,41
MARCO,VANZINI,57
ANTONINO,GENCO,87
GIUSEPPE,ALASTRA,90
PAOLO,ARDOLINO,91
GIACOMO,BONGIOVANNI,92
FABIO,BOSCO,93
GIOELE,CALUISI,95
GIUSEPPE,DI MATTEO,98
KEVIN,ALUTHDURAG,102
MATTEO,CONVERTINO,103
SERGIO,CASTIGLIONE,105
ANDREA,GRIMAUDO,106
ANTONINO,ALESTRA,107
SERGIO,FUMAGALLI,108
NICOLO,BALDARI,109
PIETRO,FORNAI,110
EDOARDO,CACCIAPUOTI,111
VIENCENZO,CAPALBO,114
ANTONIO,CANGIANO,115
MANUEL,LAMMOGLIA,116
PIETRO,ADRAGNA,117
GIUSEPPE,PALMIERI,119`;
      
      await this.importStudentsFromCSV(csvData);
    }
  }
  // Student operations
  async getStudents(params: StudentSearch): Promise<{ students: Student[], total: number }> {
    // Start with a basic query
    let query = db.select().from(students);
    
    // Apply filters
    if (params.sigla) {
      query = query.where(like(students.sigla, `%${params.sigla}%`));
    }
    
    if (params.firstName) {
      query = query.where(like(students.firstName, `%${params.firstName}%`));
    }
    
    if (params.lastName) {
      query = query.where(like(students.lastName, `%${params.lastName}%`));
    }
    
    // Get the total count
    const countQuery = db.select({ count: count() }).from(students);
    const [{ count: total }] = await countQuery;
    
    // Apply pagination and sorting
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const resultStudents = await query
      .orderBy(students.sigla)
      .limit(limit)
      .offset(offset);
    
    return {
      students: resultStudents,
      total: Number(total)
    };
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentBySigla(sigla: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.sigla, sigla));
    return student || undefined;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db
      .insert(students)
      .values(student)
      .returning();
    return newStudent;
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set(updates)
      .where(eq(students.id, id))
      .returning();
      
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db
      .delete(students)
      .where(eq(students.id, id));
    return result.rowCount > 0;
  }

  async importStudentsFromCSV(csvData: string): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;
    
    const rows = csvData.split("\n");
    // Saltiamo l'intestazione se presente
    if (rows[0].toLowerCase().includes("nome") && rows[0].toLowerCase().includes("cognome")) {
      rows.shift();
    }
    
    for (const row of rows) {
      try {
        if (!row.trim()) continue;
        
        const columns = row.split(",").map(col => col.trim());
        
        if (columns.length < 3) {
          console.error("Invalid CSV row:", row);
          failed++;
          continue;
        }
        
        // Formato CSV: NOME,COGNOME,SIGLA
        const [firstName, lastName, sigla] = columns;
        
        // Controlla se lo studente esiste già
        const existingStudent = await this.getStudentBySigla(sigla);
        if (existingStudent) {
          // Aggiorna lo studente
          await this.updateStudent(existingStudent.id, {
            firstName,
            lastName,
            sigla
          });
        } else {
          // Crea un nuovo studente
          await this.createStudent({
            firstName,
            lastName,
            sigla
          });
        }
        
        success++;
      } catch (error) {
        console.error("Error importing student:", error);
        failed++;
      }
    }
    
    return { success, failed };
  }
}

// Create and export a single instance of the storage implementation
export const storage = new DatabaseStorage();
