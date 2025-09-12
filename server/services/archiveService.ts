import { db } from '../db';
import { 
  services, 
  maintenanceRequests, 
  paypalOrders, 
  receipts, 
  secretariatPayments, 
  bikeReservations 
} from '../../shared/schema';
import { sql, eq, and, isNull, lte } from 'drizzle-orm';

interface ArchiveOperation {
  table: string;
  count: number;
  error?: string;
}

interface ArchiveResult {
  year: number;
  dryRun: boolean;
  operations: ArchiveOperation[];
  totalRecords: number;
  success: boolean;
}

/**
 * Service per gestire l'archiviazione annuale dei dati operativi
 */
export class ArchiveService {
  
  /**
   * Archivia tutti i dati operativi fino alla fine dell'anno specificato
   * @param year Anno da archiviare (es. 2024)
   * @param options Opzioni per l'operazione
   * @returns Risultato dell'operazione di archiviazione
   */
  async closeYear(year: number, options: { dryRun?: boolean } = {}): Promise<ArchiveResult> {
    const { dryRun = false } = options;
    
    // Data limite: 31 dicembre 23:59:59 dell'anno specificato
    const cutoffDate = new Date(year, 11, 31, 23, 59, 59); // Month is 0-based
    
    const operations: ArchiveOperation[] = [];
    let totalRecords = 0;
    let success = true;

    try {
      await db.transaction(async (tx) => {
        // 1. Archivia services
        const servicesQuery = tx
          .select({ count: sql`count(*)` })
          .from(services)
          .where(
            and(
              lte(services.date, cutoffDate),
              isNull(services.archivedYear)
            )
          );
        
        const servicesCount = await servicesQuery;
        const serviceRecords = Number(servicesCount[0]?.count || 0);
        
        if (!dryRun && serviceRecords > 0) {
          await tx
            .update(services)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(services.date, cutoffDate),
                isNull(services.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'services', count: serviceRecords });
        totalRecords += serviceRecords;

        // 2. Archivia maintenance_requests
        const maintenanceQuery = tx
          .select({ count: sql`count(*)` })
          .from(maintenanceRequests)
          .where(
            and(
              lte(maintenanceRequests.timestamp, cutoffDate),
              isNull(maintenanceRequests.archivedYear)
            )
          );
        
        const maintenanceCount = await maintenanceQuery;
        const maintenanceRecords = Number(maintenanceCount[0]?.count || 0);
        
        if (!dryRun && maintenanceRecords > 0) {
          await tx
            .update(maintenanceRequests)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(maintenanceRequests.timestamp, cutoffDate),
                isNull(maintenanceRequests.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'maintenance_requests', count: maintenanceRecords });
        totalRecords += maintenanceRecords;

        // 3. Archivia paypal_orders
        const paypalQuery = tx
          .select({ count: sql`count(*)` })
          .from(paypalOrders)
          .where(
            and(
              lte(paypalOrders.createdAt, cutoffDate),
              isNull(paypalOrders.archivedYear)
            )
          );
        
        const paypalCount = await paypalQuery;
        const paypalRecords = Number(paypalCount[0]?.count || 0);
        
        if (!dryRun && paypalRecords > 0) {
          await tx
            .update(paypalOrders)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(paypalOrders.createdAt, cutoffDate),
                isNull(paypalOrders.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'paypal_orders', count: paypalRecords });
        totalRecords += paypalRecords;

        // 4. Archivia receipts (basato su receiptDate)
        const receiptsQuery = tx
          .select({ count: sql`count(*)` })
          .from(receipts)
          .where(
            and(
              lte(receipts.receiptDate, cutoffDate),
              isNull(receipts.archivedYear)
            )
          );
        
        const receiptsCount = await receiptsQuery;
        const receiptRecords = Number(receiptsCount[0]?.count || 0);
        
        if (!dryRun && receiptRecords > 0) {
          await tx
            .update(receipts)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(receipts.receiptDate, cutoffDate),
                isNull(receipts.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'receipts', count: receiptRecords });
        totalRecords += receiptRecords;

        // 5. Archivia secretariat_payments (basato su createdAt o paymentDate)
        const secretariatQuery = tx
          .select({ count: sql`count(*)` })
          .from(secretariatPayments)
          .where(
            and(
              lte(secretariatPayments.createdAt, cutoffDate),
              isNull(secretariatPayments.archivedYear)
            )
          );
        
        const secretariatCount = await secretariatQuery;
        const secretariatRecords = Number(secretariatCount[0]?.count || 0);
        
        if (!dryRun && secretariatRecords > 0) {
          await tx
            .update(secretariatPayments)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(secretariatPayments.createdAt, cutoffDate),
                isNull(secretariatPayments.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'secretariat_payments', count: secretariatRecords });
        totalRecords += secretariatRecords;

        // 6. Archivia bike_reservations
        const bikeQuery = tx
          .select({ count: sql`count(*)` })
          .from(bikeReservations)
          .where(
            and(
              lte(bikeReservations.createdAt, cutoffDate),
              isNull(bikeReservations.archivedYear)
            )
          );
        
        const bikeCount = await bikeQuery;
        const bikeRecords = Number(bikeCount[0]?.count || 0);
        
        if (!dryRun && bikeRecords > 0) {
          await tx
            .update(bikeReservations)
            .set({ 
              archivedYear: year, 
              archivedAt: new Date() 
            })
            .where(
              and(
                lte(bikeReservations.createdAt, cutoffDate),
                isNull(bikeReservations.archivedYear)
              )
            );
        }
        
        operations.push({ table: 'bike_reservations', count: bikeRecords });
        totalRecords += bikeRecords;

        // Se è un dry run, fai rollback della transazione per non salvare
        if (dryRun) {
          throw new Error('DRY_RUN_ROLLBACK');
        }
      });
      
    } catch (error) {
      if (error instanceof Error && error.message === 'DRY_RUN_ROLLBACK') {
        // Questo è normale per un dry run
        success = true;
      } else {
        console.error('Error in closeYear operation:', error);
        success = false;
        operations.forEach(op => {
          op.error = error instanceof Error ? error.message : 'Unknown error';
        });
      }
    }

    return {
      year,
      dryRun,
      operations,
      totalRecords,
      success
    };
  }

  /**
   * Ottiene tutti gli anni archiviati disponibili da tutte le tabelle
   * @returns Array di anni archiviati
   */
  async getArchivedYears(): Promise<number[]> {
    // Unione di tutti gli anni archiviati da tutte le 6 tabelle operative
    const allYears = new Set<number>();
    
    // Services
    const serviceYears = await db
      .select({ year: services.archivedYear })
      .from(services)
      .where(sql`${services.archivedYear} IS NOT NULL`)
      .groupBy(services.archivedYear);
    
    // Maintenance Requests
    const maintenanceYears = await db
      .select({ year: maintenanceRequests.archivedYear })
      .from(maintenanceRequests)
      .where(sql`${maintenanceRequests.archivedYear} IS NOT NULL`)
      .groupBy(maintenanceRequests.archivedYear);
    
    // PayPal Orders
    const paypalYears = await db
      .select({ year: paypalOrders.archivedYear })
      .from(paypalOrders)
      .where(sql`${paypalOrders.archivedYear} IS NOT NULL`)
      .groupBy(paypalOrders.archivedYear);
    
    // Receipts
    const receiptYears = await db
      .select({ year: receipts.archivedYear })
      .from(receipts)
      .where(sql`${receipts.archivedYear} IS NOT NULL`)
      .groupBy(receipts.archivedYear);
    
    // Secretariat Payments
    const secretariatYears = await db
      .select({ year: secretariatPayments.archivedYear })
      .from(secretariatPayments)
      .where(sql`${secretariatPayments.archivedYear} IS NOT NULL`)
      .groupBy(secretariatPayments.archivedYear);
    
    // Bike Reservations
    const bikeYears = await db
      .select({ year: bikeReservations.archivedYear })
      .from(bikeReservations)
      .where(sql`${bikeReservations.archivedYear} IS NOT NULL`)
      .groupBy(bikeReservations.archivedYear);
    
    // Combina tutti gli anni
    [serviceYears, maintenanceYears, paypalYears, receiptYears, secretariatYears, bikeYears]
      .flat()
      .forEach(result => {
        if (result.year !== null) {
          allYears.add(result.year);
        }
      });
    
    return Array.from(allYears).sort((a, b) => b - a); // Ordine decrescente
  }

  /**
   * Ottiene statistiche sui dati archiviati per anno da tutte le tabelle
   * @param year Anno specifico (opzionale)
   * @returns Statistiche aggregate per anno
   */
  async getArchiveStats(year?: number) {
    const statsMap = new Map<number, {
      year: number;
      services: number;
      maintenanceRequests: number;
      paypalOrders: number;
      receipts: number;
      secretariatPayments: number;
      bikeReservations: number;
      total: number;
    }>();
    
    const whereClause = year ? 
      (table: any) => eq(table.archivedYear, year) : 
      (table: any) => sql`${table.archivedYear} IS NOT NULL`;
    
    // Services
    const serviceStats = await db
      .select({
        year: services.archivedYear,
        count: sql`count(*)`
      })
      .from(services)
      .where(whereClause(services))
      .groupBy(services.archivedYear);
    
    // Maintenance Requests
    const maintenanceStats = await db
      .select({
        year: maintenanceRequests.archivedYear,
        count: sql`count(*)`
      })
      .from(maintenanceRequests)
      .where(whereClause(maintenanceRequests))
      .groupBy(maintenanceRequests.archivedYear);
    
    // PayPal Orders
    const paypalStats = await db
      .select({
        year: paypalOrders.archivedYear,
        count: sql`count(*)`
      })
      .from(paypalOrders)
      .where(whereClause(paypalOrders))
      .groupBy(paypalOrders.archivedYear);
    
    // Receipts
    const receiptStats = await db
      .select({
        year: receipts.archivedYear,
        count: sql`count(*)`
      })
      .from(receipts)
      .where(whereClause(receipts))
      .groupBy(receipts.archivedYear);
    
    // Secretariat Payments
    const secretariatStats = await db
      .select({
        year: secretariatPayments.archivedYear,
        count: sql`count(*)`
      })
      .from(secretariatPayments)
      .where(whereClause(secretariatPayments))
      .groupBy(secretariatPayments.archivedYear);
    
    // Bike Reservations
    const bikeStats = await db
      .select({
        year: bikeReservations.archivedYear,
        count: sql`count(*)`
      })
      .from(bikeReservations)
      .where(whereClause(bikeReservations))
      .groupBy(bikeReservations.archivedYear);
    
    // Aggrega tutte le statistiche
    const allStats = [
      { table: 'services', data: serviceStats },
      { table: 'maintenanceRequests', data: maintenanceStats },
      { table: 'paypalOrders', data: paypalStats },
      { table: 'receipts', data: receiptStats },
      { table: 'secretariatPayments', data: secretariatStats },
      { table: 'bikeReservations', data: bikeStats }
    ];
    
    allStats.forEach(({ table, data }) => {
      data.forEach(stat => {
        if (stat.year !== null) {
          if (!statsMap.has(stat.year)) {
            statsMap.set(stat.year, {
              year: stat.year,
              services: 0,
              maintenanceRequests: 0,
              paypalOrders: 0,
              receipts: 0,
              secretariatPayments: 0,
              bikeReservations: 0,
              total: 0
            });
          }
          
          const yearStats = statsMap.get(stat.year)!;
          const count = Number(stat.count);
          (yearStats as any)[table] = count;
          yearStats.total += count;
        }
      });
    });
    
    return Array.from(statsMap.values())
      .sort((a, b) => b.year - a.year); // Ordine decrescente per anno
  }
}

// Singleton instance
export const archiveService = new ArchiveService();