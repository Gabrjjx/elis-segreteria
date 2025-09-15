import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

interface ParsedDatabaseService {
  id: number;
  date: Date;
  sigla: string;
  pieces: number;
  type: string;
  amount: number;
  status: string;
  notes?: string;
  archivedYear: number;
}

// Parse database export format
export function parseDatabaseExportFile(filePath: string): { services: ParsedDatabaseService[], errors: string[] } {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  const services: ParsedDatabaseService[] = [];
  const errors: string[] = [];
  
  console.log(`Processing ${lines.length} lines from database export format`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Parse line with fixed column positions to handle datetime properly
      // Format: ID datetime sigla pieces type amount status [notes...]
      // Example: 2 2025-04-29 00:00:00.000 177 1 siglatura 0.5 paid
      
      const parts = line.split(/\s+/);
      if (parts.length < 8) {
        errors.push(`Line ${i + 1}: insufficient columns (${parts.length}) - ${line}`);
        continue;
      }
      
      // Extract parts: ID date time sigla pieces type amount status [notes...]
      const [idStr, dateStr, timeStr, sigla, piecesStr, type, amountStr, status, ...notesParts] = parts;
      
      // Combine date and time back together
      const dateTimeStr = `${dateStr} ${timeStr}`;
      
      // Parse ID
      const id = parseInt(idStr);
      if (isNaN(id)) {
        errors.push(`Line ${i + 1}: invalid ID - ${idStr}`);
        continue;
      }
      
      // Parse datetime (ISO format: 2025-04-29 00:00:00.000)
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) {
        errors.push(`Line ${i + 1}: invalid datetime - ${dateTimeStr}`);
        continue;
      }
      
      // Skip test records
      if (sigla === 'TS00' || sigla.includes('TEST')) {
        console.log(`Skipping test record: ${sigla}`);
        continue;
      }
      
      // Parse pieces
      const pieces = parseInt(piecesStr) || 1;
      
      // Parse amount (already per-piece in database export format)
      const amount = parseFloat(amountStr) || 0;
      
      // Normalize type
      let normalizedType = type.toLowerCase();
      if (normalizedType === 'happy_hour') {
        normalizedType = 'happy_hour';
      } else if (normalizedType === 'siglatura') {
        normalizedType = 'siglatura';
      } else if (normalizedType === 'riparazione') {
        normalizedType = 'riparazione';
      }
      
      // Combine notes if any
      const notes = notesParts.length > 0 ? notesParts.join(' ') : undefined;
      
      // Determine archived year
      const archivedYear = date.getFullYear();
      
      services.push({
        id,
        date,
        sigla,
        pieces,
        type: normalizedType,
        amount,
        status,
        notes,
        archivedYear
      });
      
    } catch (error) {
      errors.push(`Line ${i + 1}: parsing error - ${error.message}`);
    }
  }
  
  console.log(`Successfully parsed ${services.length} services from database export format`);
  return { services, errors };
}

// Import database export endpoint
router.post('/import/services/database-export', async (req, res) => {
  // TODO: Add authentication once auth system is located
  // SECURITY: This endpoint should be protected in production
  try {
    const { dryRun = true, filePath: providedFilePath } = req.body;
    
    // Default to the 2025 database export file
    const filePath = providedFilePath || 
      path.join(process.cwd(), 'attached_assets/Pasted-2-2025-04-29-00-00-00-000-177-1-siglatura-0-5-paid-4-2025-04-09-00-00-00-000-140-1-happy-hour-1-0-p-1757940465175_1757940465177.txt');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Database export file not found' });
    }
    
    // Parse the database export file
    const { services, errors } = parseDatabaseExportFile(filePath);
    
    if (errors.length > 0) {
      console.log('⚠️ Parsing errors found:');
      errors.forEach(error => console.log('  ', error));
    }
    
    console.log(`📊 Parsed ${services.length} services from database export`);
    
    // Calculate statistics
    const servicesByYear = services.reduce((acc, service) => {
      acc[service.archivedYear] = (acc[service.archivedYear] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const servicesByType = services.reduce((acc, service) => {
      acc[service.type] = (acc[service.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (dryRun) {
      return res.json({
        dryRun: true,
        totalServices: services.length,
        errors,
        servicesByYear,
        servicesByType,
        sampleServices: services.slice(0, 5),
        ...{ servicesByYear, servicesByType }
      });
    }

    // Actual import
    const { storage } = await import('../storage.js');
    let imported = 0;
    let skipped = 0;
    const importErrors = [];

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      
      try {
        // Check for duplicates using the same logic as other importers
        const existingServices = await storage.getServices({
          startDate: service.date,
          endDate: service.date,
          sigla: service.sigla,
          type: service.type,
          pieces: service.pieces,
          includeArchived: true
        });

        // Check if a very similar service already exists
        const duplicate = existingServices.find(existing => 
          Math.abs(existing.amount - service.amount) < 0.01 // Tolerance for floating point comparison
        );

        if (duplicate) {
          console.log(`Duplicate found for service: ${service.sigla} on ${service.date.toISOString().split('T')[0]}`);
          skipped++;
          continue;
        }

        // Create the service
        await storage.createService({
          date: service.date,
          sigla: service.sigla,
          pieces: service.pieces,
          type: service.type,
          amount: service.amount,
          status: 'paid', // All database exports are already paid
          paymentMethod: null,
          notes: service.notes || null,
          archivedYear: service.archivedYear,
          archivedAt: new Date()
        });

        imported++;
        
        // Progress logging
        if (imported % 10 === 0) {
          console.log(`Progress: ${imported} services imported`);
        }
        
      } catch (error) {
        console.error(`Error importing service ${i + 1} (${service.sigla}):`, error);
        importErrors.push(`Service ${i + 1} (${service.sigla}): ${error.message}`);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      errors: importErrors,
      totalServices: services.length,
      servicesByYear,
      servicesByType
    });

  } catch (error) {
    console.error('Import database export failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;