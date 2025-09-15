import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

interface ParsedService {
  date: Date;
  sigla: string;
  pieces: number;
  type: string;
  amount: number;
  notes?: string;
  archivedYear: number;
}

function parseNewTSVFormat(filePath: string): ParsedService[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const services: ParsedService[] = [];

  console.log(`Processing ${lines.length} lines from new TSV format`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by tab characters
    const columns = line.split('\t').map(col => col.trim());
    
    if (columns.length < 5) {
      console.log(`Skipping line ${i + 1}: insufficient columns (${columns.length})`);
      continue;
    }

    try {
      // Parse columns: Date, Sigla, Empty, Pieces, Type, Amount
      const [dateStr, siglaStr, , piecesStr, typeStr, amountStr] = columns;

      // Parse Italian date DD/MM/YYYY
      const [day, month, year] = dateStr.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isNaN(date.getTime())) {
        console.log(`Skipping line ${i + 1}: invalid date ${dateStr}`);
        continue;
      }

      // Parse sigla
      const sigla = siglaStr.toString();

      // Parse pieces
      const pieces = parseInt(piecesStr) || 1;

      // Parse amount - remove € symbol and convert comma to dot
      let amount = 0;
      if (amountStr) {
        const cleanAmount = amountStr.replace('€', '').replace(',', '.').trim();
        amount = parseFloat(cleanAmount) || 0;
      }

      // Normalize service type
      let type = 'siglatura';
      let notes = '';

      const lowerType = typeStr.toLowerCase();
      if (lowerType.includes('riparazione') || lowerType.includes('orlo') || lowerType.includes('bottone') || lowerType.includes('zip')) {
        type = 'riparazione';
        if (lowerType !== 'riparazione') {
          notes = typeStr; // Keep original description as notes
        }
      } else if (lowerType.includes('siglatur')) {
        type = 'siglatura';
        if (lowerType.includes('+')) {
          notes = typeStr; // Mixed service, keep full description
        }
      } else {
        // Default to siglatura for unknown types
        type = 'siglatura';
        if (typeStr.toLowerCase() !== 'siglatura') {
          notes = typeStr;
        }
      }

      const service: ParsedService = {
        date,
        sigla,
        pieces,
        type,
        amount,
        archivedYear: date.getFullYear(),
        ...(notes && { notes })
      };

      services.push(service);

    } catch (error) {
      console.error(`Error parsing line ${i + 1}: ${error.message}`);
      console.log(`Line content: ${line}`);
    }
  }

  console.log(`Successfully parsed ${services.length} services from new TSV format`);
  return services;
}

router.post('/import/services/new-tsv', async (req, res) => {
  try {
    const { dryRun = true } = req.body;
    
    // File path for the new TSV data
    const filePath = path.join(process.cwd(), 'attached_assets/Pasted-06-02-2020-97-1-Siglatura-0-40-11-02-2020-93-2-Siglatura-0-80-11-02-2020-135-2-Siglatura--1757939527048_1757939527049.txt');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const services = parseNewTSVFormat(filePath);
    
    if (dryRun) {
      // Analyze data for dry run
      const stats = {
        totalServices: services.length,
        servicesByYear: {},
        servicesByType: {},
        sampleServices: services.slice(0, 5)
      };

      services.forEach(service => {
        const year = service.archivedYear;
        const type = service.type;
        
        stats.servicesByYear[year] = (stats.servicesByYear[year] || 0) + 1;
        stats.servicesByType[type] = (stats.servicesByType[type] || 0) + 1;
      });

      return res.json({
        dryRun: true,
        ...stats
      });
    }

    // Actual import
    const { storage } = await import('../storage.js');
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      
      try {
        // Check for duplicates
        const existingResult = await storage.getServices({
          startDate: service.date,
          endDate: service.date,
          sigla: service.sigla,
          type: service.type,
          pieces: service.pieces,
          includeArchived: true
        });
        
        const existingServices = Array.isArray(existingResult) ? existingResult : existingResult.services || [];
        
        const duplicate = existingServices.find(s => 
          s.sigla === service.sigla && 
          s.type === service.type && 
          s.pieces === service.pieces &&
          Math.abs(s.amount - service.amount) < 0.01 &&
          s.archivedYear === service.archivedYear
        );

        if (duplicate) {
          skipped++;
          continue;
        }

        // Create new service
        const newService = {
          date: service.date,
          sigla: service.sigla,
          pieces: service.pieces,
          type: service.type,
          amount: service.amount,
          status: 'paid' as const,
          paymentMethod: null,
          notes: service.notes || null,
          archivedYear: service.archivedYear,
          archivedAt: new Date()
        };

        await storage.createService(newService);
        imported++;
        
        if (imported % 50 === 0) {
          console.log(`Progress: ${imported} services imported`);
        }

      } catch (error) {
        errors.push(`Service ${i + 1} (${service.sigla}): ${error.message}`);
        if (errors.length > 10) break; // Limit error reporting
      }
    }

    const finalStats = {
      totalServices: services.length,
      servicesByYear: {},
      servicesByType: {}
    };

    services.forEach(service => {
      const year = service.archivedYear;
      const type = service.type;
      
      finalStats.servicesByYear[year] = (finalStats.servicesByYear[year] || 0) + 1;
      finalStats.servicesByType[type] = (finalStats.servicesByType[type] || 0) + 1;
    });

    res.json({
      success: true,
      imported,
      skipped,
      errors: errors.slice(0, 5), // Show only first 5 errors
      ...finalStats
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;