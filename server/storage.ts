import { 
  Service,
  ServiceWithStudent,
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
  BikeReservation,
  InsertBikeReservation,
  BikeReservationSearch,
  BikeReservationStatusValue,
  SecretariatPayment,
  InsertSecretariatPayment,
  SecretariatPaymentStatus,
  services,
  users,
  maintenanceRequests,
  paypalOrders,
  receipts,
  students,
  bikeReservations,
  secretariatPayments
} from "@shared/schema";
import { db } from "./db";
import { eq, like, gte, lte, desc, count, sum, or, and, isNull } from "drizzle-orm";

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Service operations
  getServices(params: ServiceSearch): Promise<{ services: ServiceWithStudent[], total: number }>;
  getService(id: number): Promise<ServiceWithStudent | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Dashboard operations
  getServiceMetrics(dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<{
    totalServices: number,
    pendingPayments: number,
    siglaturaCount: number,
    happyHourCount: number,
    repairCount: number,
    totalAmount: number,
    pendingAmount: number
  }>;
  getPendingPayments(dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<(Service & { student?: { firstName: string, lastName: string, email?: string, phone?: string } })[]>;
  getRecentServices(limit: number, dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<(Service & { student?: { firstName: string, lastName: string, email?: string, phone?: string } })[]>;
  
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
  
  // Bike reservation operations
  getBikeReservations(params: BikeReservationSearch): Promise<{ reservations: BikeReservation[], total: number }>;
  getBikeReservation(id: number): Promise<BikeReservation | undefined>;
  getBikeReservationByOrderId(orderId: string): Promise<BikeReservation | undefined>;
  createBikeReservation(reservation: InsertBikeReservation): Promise<BikeReservation>;
  updateBikeReservationStatus(id: number, status: BikeReservationStatusValue, paymentDate?: Date, approvalDate?: Date): Promise<BikeReservation | undefined>;
  
  // Secretariat payment operations
  createSecretariatPayment(payment: InsertSecretariatPayment): Promise<SecretariatPayment>;
  getSecretariatPayment(id: number): Promise<SecretariatPayment | undefined>;
  getSecretariatPaymentByOrderId(orderId: string): Promise<SecretariatPayment | undefined>;
  getSecretariatPaymentByPaymentIntentId(paymentIntentId: string): Promise<SecretariatPayment | undefined>;
  updateSecretariatPaymentStatus(orderId: string, status: string, paymentDate?: Date): Promise<SecretariatPayment | undefined>;
  getSecretariatPayments(filters: { year?: number, search?: string, status?: string }): Promise<SecretariatPayment[]>;
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
    // Usiamo il primo ID servizio dall'array se disponibile, altrimenti il serviceId
    const serviceId = orderInfo.serviceIds && Array.isArray(orderInfo.serviceIds) && orderInfo.serviceIds.length > 0 
      ? orderInfo.serviceIds[0] 
      : orderInfo.serviceId || 0;
      
    await db.insert(paypalOrders).values({
      id: orderId,
      serviceId: serviceId,
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
    // Creiamo un oggetto di aggiornamento solo con i campi validi per il database
    const dbUpdates: any = {};
    
    // Aggiungiamo solo i campi che vogliamo aggiornare nel database
    if (updates.status) {
      dbUpdates.status = updates.status;
    }
    
    // Se lo stato è completed, impostiamo completedAt
    if (updates.status === PaypalOrderStatus.COMPLETED) {
      dbUpdates.completedAt = new Date();
    }
    
    // Aggiorniamo la risposta JSON completa
    // Convertiamo prima l'oggetto originale in una stringa JSON
    const orderInfo = await this.getPaypalOrderInfo(orderId);
    if (orderInfo) {
      const updatedPaypalResponse = {
        ...JSON.parse(orderInfo.paypalResponse || '{}'),
        ...updates
      };
      dbUpdates.paypalResponse = JSON.stringify(updatedPaypalResponse);
    }
    
    await db
      .update(paypalOrders)
      .set(dbUpdates)
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
  
  async updateReceipt(id: number, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const [updatedReceipt] = await db
      .update(receipts)
      .set(updates)
      .where(eq(receipts.id, id))
      .returning();
    
    return updatedReceipt || undefined;
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
  async getServices(params: ServiceSearch): Promise<{ services: ServiceWithStudent[], total: number }> {
    // Costruisci le condizioni di query
    const whereConditions = [];
    
    // Filtro per sigla esatta (prioritario rispetto al filtro query)
    if (params.sigla) {
      whereConditions.push(eq(services.sigla, params.sigla));
      console.log(`Filtro per sigla esatta: ${params.sigla}`);
    }
    // Filtro di ricerca generico (se non è specificata una sigla esatta)
    else if (params.query) {
      whereConditions.push(like(services.sigla, `%${params.query}%`));
    }
    
    if (params.type && params.type !== 'all') {
      whereConditions.push(eq(services.type, params.type));
    }
    
    if (params.status && params.status !== 'all') {
      whereConditions.push(eq(services.status, params.status));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      whereConditions.push(gte(services.date, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      whereConditions.push(lte(services.date, endDate));
    }
    
    // Start with a basic query che include il join con gli studenti
    let query = db.select({
      service: services,
      student: {
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        phone: students.phone
      }
    })
    .from(services)
    .leftJoin(students, eq(services.sigla, students.sigla));
    
    // Applica tutte le condizioni se ce ne sono
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // Log dei parametri filtro ricevuti
    console.log("getServices - Parametri ricevuti:", params);
    console.log(`Tipo servizio: ${params.type}, Stato: ${params.status}`);
    
    // Usa le stesse condizioni già generate per la query principale
    
    // Esegui la query di conteggio con le condizioni accumulate
    let total = 0;
    try {
      let countResult;
      if (whereConditions.length > 0) {
        countResult = await db
          .select({ count: count() })
          .from(services)
          .where(and(...whereConditions));
      } else {
        countResult = await db
          .select({ count: count() })
          .from(services);
      }
      
      total = Number(countResult[0]?.count || 0);
      console.log("Conteggio totale servizi:", total);
    } catch (error) {
      console.error("Errore nell'esecuzione query conteggio:", error);
      return { services: [], total: 0 };
    }
    
    // Apply pagination and sorting
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    
    const results = await query
      .orderBy(desc(services.date))
      .limit(limit)
      .offset(offset);
    
    try {
      // Trasforma i risultati nel formato atteso
      const formattedServices = results.map(result => ({
        ...result.service,
        student: result.student?.firstName ? {
          firstName: result.student.firstName,
          lastName: result.student.lastName,
          email: result.student.email,
          phone: result.student.phone
        } : undefined
      }));
      
      return {
        services: formattedServices,
        total: typeof total === 'number' ? total : 0
      };
    } catch (error) {
      console.error("Errore nella formattazione dei risultati:", error);
      return { services: [], total: 0 };
    }
  }

  async getService(id: number): Promise<ServiceWithStudent | undefined> {
    const result = await db.select({
      service: services,
      student: {
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        phone: students.phone
      }
    })
    .from(services)
    .leftJoin(students, eq(services.sigla, students.sigla))
    .where(eq(services.id, id));
    
    if (!result || result.length === 0) {
      return undefined;
    }

    // Trasforma i risultati nel formato atteso
    return {
      ...result[0].service,
      student: result[0].student.firstName ? {
        firstName: result[0].student.firstName,
        lastName: result[0].student.lastName,
        email: result[0].student.email,
        phone: result[0].student.phone
      } : undefined
    };
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
  async getServiceMetrics(dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<{
    totalServices: number;
    pendingPayments: number;
    siglaturaCount: number;
    happyHourCount: number;
    repairCount: number;
    totalAmount: number;
    pendingAmount: number;
  }> {
    // Funzione per applicare i filtri di data e archivio
    const applyFilters = (query: any) => {
      let filteredQuery = query;
      
      // Esclude dati archiviati di default (a meno che non sia specificato includeArchived=true)
      if (!dateFilter?.includeArchived) {
        filteredQuery = filteredQuery.where(isNull(services.archivedYear));
      }
      
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
    console.log("Include archived:", dateFilter?.includeArchived);
    
    // Definiamo le condizioni base combinando data e archivio
    const allConditions = [];
    
    // Esclude dati archiviati di default
    if (!dateFilter?.includeArchived) {
      allConditions.push(isNull(services.archivedYear));
    }
    
    if (dateFilter?.startDate) {
      allConditions.push(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      allConditions.push(lte(services.date, dateFilter.endDate));
    }
    
    // Funzione per combinare condizioni di filtro
    const getFilter = (baseCondition: any) => {
      if (allConditions.length === 0) {
        return baseCondition;
      }
      
      if (!baseCondition) {
        return allConditions.length === 1 ? allConditions[0] : and(...allConditions);
      }
      
      return and(baseCondition, ...allConditions);
    };
    
    // Get total services count
    let totalQuery = db.select({ count: count() }).from(services);
    if (allConditions.length > 0) {
      totalQuery = totalQuery.where(allConditions.length === 1 ? allConditions[0] : and(...allConditions));
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
    if (allConditions.length > 0) {
      totalAmountQuery = totalAmountQuery.where(allConditions.length === 1 ? allConditions[0] : and(...allConditions));
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

  async getPendingPayments(dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<(Service & { student?: { firstName: string, lastName: string } })[]> {
    // Build the conditions array
    const conditions = [eq(services.status, PaymentStatus.UNPAID)];
    
    // Exclude archived data by default
    if (!dateFilter?.includeArchived) {
      conditions.push(isNull(services.archivedYear));
    }
    
    // Add date filters if present
    if (dateFilter?.startDate) {
      conditions.push(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      conditions.push(lte(services.date, dateFilter.endDate));
    }
    
    const query = db.select({
      service: services,
      student: {
        // Map the database snake_case to camelCase for frontend
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        phone: students.phone
      }
    })
    .from(services)
    .leftJoin(students, eq(services.sigla, students.sigla))
    .where(and(...conditions))
    .orderBy(desc(services.date));
    
    const results = await query;
    
    // Trasforma i risultati nel formato atteso
    return results.map(result => ({
      ...result.service,
      student: result.student && result.student.firstName ? {
        firstName: result.student.firstName,
        lastName: result.student.lastName
      } : undefined
    }));
  }

  async getRecentServices(limit: number, dateFilter?: { startDate?: Date, endDate?: Date, includeArchived?: boolean }): Promise<(Service & { student?: { firstName: string, lastName: string } })[]> {
    // Build the conditions array
    const conditions = [];
    
    // Exclude archived data by default
    if (!dateFilter?.includeArchived) {
      conditions.push(isNull(services.archivedYear));
    }
    
    // Add date filters if present
    if (dateFilter?.startDate) {
      conditions.push(gte(services.date, dateFilter.startDate));
    }
    if (dateFilter?.endDate) {
      conditions.push(lte(services.date, dateFilter.endDate));
    }
    
    let query = db.select({
      service: services,
      student: {
        // Map the database snake_case to camelCase for frontend
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        phone: students.phone
      }
    })
    .from(services)
    .leftJoin(students, eq(services.sigla, students.sigla));
    
    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const results = await query
      .orderBy(desc(services.date))
      .limit(limit);
    
    // Trasforma i risultati nel formato atteso
    return results.map(result => ({
      ...result.service,
      student: result.student && result.student.firstName ? {
        firstName: result.student.firstName,
        lastName: result.student.lastName
      } : undefined
    }));
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

  // Bike reservation operations
  async getBikeReservations(params: BikeReservationSearch): Promise<{ reservations: BikeReservation[], total: number }> {
    let query = db.select().from(bikeReservations);
    let countQuery = db.select({ count: count() }).from(bikeReservations);

    // Build where conditions
    const conditions = [];
    
    if (params.sigla) {
      conditions.push(like(bikeReservations.sigla, `%${params.sigla}%`));
    }
    
    if (params.customerEmail) {
      conditions.push(like(bikeReservations.customerEmail, `%${params.customerEmail}%`));
    }
    
    if (params.status && params.status !== "all") {
      conditions.push(eq(bikeReservations.status, params.status));
    }
    
    if (params.startDate) {
      const startDate = new Date(params.startDate);
      conditions.push(gte(bikeReservations.createdAt, startDate));
    }
    
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(bikeReservations.createdAt, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const [reservations, totalResult] = await Promise.all([
      query.orderBy(desc(bikeReservations.createdAt))
           .limit(limit)
           .offset(offset),
      countQuery
    ]);

    const total = totalResult[0]?.count || 0;
    return { reservations, total };
  }

  async getBikeReservation(id: number): Promise<BikeReservation | undefined> {
    const [reservation] = await db.select().from(bikeReservations).where(eq(bikeReservations.id, id));
    return reservation || undefined;
  }

  async getBikeReservationByOrderId(orderId: string): Promise<BikeReservation | undefined> {
    const [reservation] = await db.select().from(bikeReservations).where(eq(bikeReservations.orderId, orderId));
    return reservation || undefined;
  }

  async createBikeReservation(reservation: InsertBikeReservation): Promise<BikeReservation> {
    const [created] = await db.insert(bikeReservations).values(reservation).returning();
    return created;
  }

  async updateBikeReservationStatus(
    id: number, 
    status: BikeReservationStatusValue, 
    paymentDate?: Date, 
    approvalDate?: Date
  ): Promise<BikeReservation | undefined> {
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (paymentDate) {
      updateData.paymentDate = paymentDate;
    }
    
    if (approvalDate) {
      updateData.approvalDate = approvalDate;
    }

    const [updated] = await db.update(bikeReservations)
      .set(updateData)
      .where(eq(bikeReservations.id, id))
      .returning();
    
    return updated || undefined;
  }

  // Secretariat payment operations
  async createSecretariatPayment(payment: InsertSecretariatPayment): Promise<SecretariatPayment> {
    const [created] = await db.insert(secretariatPayments)
      .values(payment)
      .returning();
    return created;
  }

  async getSecretariatPayment(id: number): Promise<SecretariatPayment | undefined> {
    const [payment] = await db.select().from(secretariatPayments).where(eq(secretariatPayments.id, id));
    return payment || undefined;
  }

  async getSecretariatPaymentByOrderId(orderId: string): Promise<SecretariatPayment | undefined> {
    const [payment] = await db.select().from(secretariatPayments).where(eq(secretariatPayments.orderId, orderId));
    return payment || undefined;
  }

  async getSecretariatPaymentByPaymentIntentId(paymentIntentId: string): Promise<SecretariatPayment | undefined> {
    const [payment] = await db.select().from(secretariatPayments).where(eq(secretariatPayments.paymentIntentId, paymentIntentId));
    return payment || undefined;
  }

  async updateSecretariatPaymentStatus(orderId: string, status: string, paymentDate?: Date): Promise<SecretariatPayment | undefined> {
    const updateData: any = { 
      status,
      updatedAt: new Date()
    };
    
    if (paymentDate) {
      updateData.paymentDate = paymentDate;
    }

    const [updated] = await db.update(secretariatPayments)
      .set(updateData)
      .where(eq(secretariatPayments.orderId, orderId))
      .returning();
    
    return updated || undefined;
  }

  async getSecretariatPayments(filters: { year?: number, search?: string, status?: string }): Promise<SecretariatPayment[]> {
    let query = db.select().from(secretariatPayments);
    
    const conditions: any[] = [];
    
    // Filter by year
    if (filters.year) {
      const startDate = new Date(`${filters.year}-01-01`);
      const endDate = new Date(`${filters.year}-12-31T23:59:59`);
      conditions.push(gte(secretariatPayments.createdAt, startDate));
      conditions.push(lte(secretariatPayments.createdAt, endDate));
    }
    
    // Filter by search term (sigla or customer name)
    if (filters.search) {
      const searchConditions = [
        like(secretariatPayments.sigla, `%${filters.search}%`),
        like(secretariatPayments.customerName, `%${filters.search}%`)
      ];
      conditions.push(or(...searchConditions));
    }
    
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(secretariatPayments.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(secretariatPayments.createdAt));
  }
}

// Create and export a single instance of the storage implementation
export const storage = new DatabaseStorage();
