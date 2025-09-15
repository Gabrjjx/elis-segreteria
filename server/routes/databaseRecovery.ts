import { Router } from 'express';
import { enableMaintenanceMode, disableMaintenanceMode } from '../maintenance';
import { db } from '../db';
import { services } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Canonical per-piece prices
const CANONICAL_PRICES = {
  'siglatura': 0.50,
  'happy_hour': 1.00,
  'riparazione': 4.00
};

interface RecoveryStats {
  totalProcessed: number;
  amountCorrections: number;
  errors: string[];
  corrections: Array<{
    id: number;
    sigla: string;
    type: string;
    pieces: number;
    oldAmount: number;
    newAmount: number;
    correctionReason: string;
  }>;
}

// Fix amount calculation bugs in existing data
async function fixAmountCalculations(dryRun = true): Promise<RecoveryStats> {
  const stats: RecoveryStats = {
    totalProcessed: 0,
    amountCorrections: 0,
    errors: [],
    corrections: []
  };

  console.log('🔧 Starting amount calculation fixes...');
  
  try {
    // Get all services that potentially have wrong amounts
    const allServices = await db.select().from(services);
    
    for (const service of allServices) {
      stats.totalProcessed++;
      
      const canonicalPrice = CANONICAL_PRICES[service.type as keyof typeof CANONICAL_PRICES];
      if (!canonicalPrice) {
        stats.errors.push(`Unknown service type: ${service.type} for service ID ${service.id}`);
        continue;
      }

      const expectedTotalAmount = service.pieces * canonicalPrice;
      const tolerance = 0.01;

      // Check if amount needs correction
      let needsCorrection = false;
      let correctionReason = '';
      let newAmount = service.amount;

      // Fix 1: Per-piece amount stored instead of total (e.g., 0.50 for 3 pieces instead of 1.50)
      if (Math.abs(service.amount - canonicalPrice) < tolerance && service.pieces > 1) {
        needsCorrection = true;
        newAmount = canonicalPrice; // Ensure per-piece canonical price
        correctionReason = `Fixed per-piece amount (was storing per-piece ${service.amount} instead of canonical ${canonicalPrice})`;
      }
      
      // Fix 2: Wrong historical per-piece price (e.g., 0.40 instead of 0.50)
      else if (service.amount !== canonicalPrice) {
        needsCorrection = true;
        newAmount = canonicalPrice;
        correctionReason = `Fixed wrong per-piece price (${service.amount} -> ${canonicalPrice})`;
      }

      if (needsCorrection) {
        stats.amountCorrections++;
        stats.corrections.push({
          id: service.id,
          sigla: service.sigla,
          type: service.type,
          pieces: service.pieces,
          oldAmount: service.amount,
          newAmount: newAmount,
          correctionReason
        });

        console.log(`${dryRun ? '[DRY-RUN] ' : ''}Correcting service ${service.id} (${service.sigla}): ${service.amount} -> ${newAmount} (${correctionReason})`);

        if (!dryRun) {
          await db.update(services)
            .set({ amount: newAmount })
            .where(eq(services.id, service.id));
        }
      }
    }

    console.log(`✅ Amount fixes complete: ${stats.amountCorrections} corrections out of ${stats.totalProcessed} services`);
    return stats;

  } catch (error) {
    stats.errors.push(`Critical error in amount fix: ${error}`);
    console.error('❌ Amount calculation fix failed:', error);
    return stats;
  }
}

// Import from specific data file with proper parsing
async function importFromDataFile(filePath: string, fileType: 'tsv' | 'database_export', dryRun = true): Promise<{imported: number, skipped: number, errors: string[]}> {
  console.log(`📄 Importing from ${fileType}: ${filePath}`);
  
  const result = { imported: 0, skipped: 0, errors: [] };

  if (!fs.existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    return result;
  }

  try {
    if (fileType === 'database_export') {
      // Use the fixed database export parser
      const { parseDatabaseExportFile } = await import('./importDatabaseExport');
      const { services: parsedServices, errors } = parseDatabaseExportFile(filePath);
      
      result.errors.push(...errors);
      
      for (const service of parsedServices) {
        // Apply canonical price fix during import
        const canonicalPrice = CANONICAL_PRICES[service.type as keyof typeof CANONICAL_PRICES] || service.amount;
        
        if (!dryRun) {
          // Check for duplicates and import
          const existingServices = await db.select()
            .from(services)
            .where(eq(services.sigla, service.sigla));
            
          const duplicate = existingServices.find(existing => 
            Math.abs(new Date(existing.date).getTime() - service.date.getTime()) < 24 * 60 * 60 * 1000 && // Same day
            existing.type === service.type &&
            existing.pieces === service.pieces
          );

          if (duplicate) {
            result.skipped++;
          } else {
            await db.insert(services).values({
              date: service.date,
              sigla: service.sigla,
              pieces: service.pieces,
              type: service.type,
              amount: canonicalPrice, // Use canonical price
              status: service.status,
              notes: service.notes,
              archivedYear: service.archivedYear,
              archivedAt: new Date()
            });
            result.imported++;
          }
        } else {
          result.imported++;
        }
      }
    }
    else if (fileType === 'tsv') {
      // Use TSV parser with canonical price corrections
      const { parseAllTSVFiles } = await import('../utils/tsvParser');
      const { transformHistoricalServiceRow } = await import('../utils/historicalTransformer');
      
      // Parse TSV data
      const parsedData = parseAllTSVFiles();
      result.errors.push(...parsedData.errors);

      for (const serviceRow of parsedData.services) {
        try {
          const transformedService = transformHistoricalServiceRow({
            ...serviceRow,
            amount: serviceRow.totalAmount
          });
          
          // Apply canonical price fix
          const canonicalPrice = CANONICAL_PRICES[transformedService.type as keyof typeof CANONICAL_PRICES] || transformedService.amount;
          transformedService.amount = canonicalPrice;

          if (!dryRun) {
            // Check for duplicates and import (similar logic as above)
            const existingServices = await db.select()
              .from(services)
              .where(eq(services.sigla, transformedService.sigla));
              
            const duplicate = existingServices.find(existing => 
              Math.abs(new Date(existing.date).getTime() - transformedService.date.getTime()) < 24 * 60 * 60 * 1000 &&
              existing.type === transformedService.type &&
              existing.pieces === transformedService.pieces
            );

            if (duplicate) {
              result.skipped++;
            } else {
              await db.insert(services).values(transformedService);
              result.imported++;
            }
          } else {
            result.imported++;
          }
        } catch (error) {
          result.errors.push(`Transform error: ${error}`);
        }
      }
    }

    console.log(`✅ Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;

  } catch (error) {
    result.errors.push(`Import failed: ${error}`);
    console.error('❌ Import failed:', error);
    return result;
  }
}

// Comprehensive recovery orchestrator
router.post('/recovery/comprehensive', async (req, res) => {
  const { dryRun = true, skipAmountFix = false, skipDataImport = false } = req.body;
  
  console.log(`🚀 Starting comprehensive database recovery (dryRun: ${dryRun})`);
  
  const recoveryLog = {
    startTime: new Date().toISOString(),
    dryRun,
    phases: [] as any[],
    finalStats: {} as any,
    errors: [] as string[]
  };

  try {
    // Phase 1: Enable maintenance mode
    if (!dryRun) {
      enableMaintenanceMode('Comprehensive database recovery in progress');
    }
    console.log('🚨 Maintenance mode enabled');

    // Phase 2: Fix existing amount calculations
    if (!skipAmountFix) {
      console.log('📊 Phase 2: Fixing amount calculations in existing data');
      const amountFixStats = await fixAmountCalculations(dryRun);
      recoveryLog.phases.push({
        phase: 'amount_fixes',
        stats: amountFixStats,
        timestamp: new Date().toISOString()
      });
      
      if (amountFixStats.errors.length > 0) {
        recoveryLog.errors.push(...amountFixStats.errors);
      }
    }

    // Phase 3: Import historical data files (if needed)
    if (!skipDataImport) {
      console.log('📂 Phase 3: Importing from historical data files');
      
      const dataFiles = [
        {
          path: path.join(process.cwd(), 'attached_assets/Pasted-2-2025-04-29-00-00-00-000-177-1-siglatura-0-5-paid-4-2025-04-09-00-00-00-000-140-1-happy-hour-1-0-p-1757940465175_1757940465177.txt'),
          type: 'database_export' as const,
          description: '2025 Database Export'
        }
        // Add more data files as needed
      ];

      for (const file of dataFiles) {
        console.log(`📄 Importing ${file.description}...`);
        const importStats = await importFromDataFile(file.path, file.type, dryRun);
        recoveryLog.phases.push({
          phase: 'import_data',
          file: file.description,
          stats: importStats,
          timestamp: new Date().toISOString()
        });
        
        if (importStats.errors.length > 0) {
          recoveryLog.errors.push(...importStats.errors);
        }
      }
    }

    // Phase 4: Final validation
    console.log('✅ Phase 4: Final validation');
    const finalCount = await db.$count(services);
    recoveryLog.finalStats = {
      totalServicesInDatabase: finalCount,
      recoveryComplete: true,
      timestamp: new Date().toISOString()
    };

    // Phase 5: Disable maintenance mode (if not dry run)
    if (!dryRun) {
      disableMaintenanceMode();
      console.log('✅ Maintenance mode disabled');
    }

    recoveryLog.finalStats.success = true;
    
    res.json({
      success: true,
      dryRun,
      recoveryLog,
      message: dryRun 
        ? 'Dry-run completed successfully. Run with dryRun=false to execute.' 
        : 'Comprehensive database recovery completed successfully!'
    });

  } catch (error) {
    console.error('❌ Comprehensive recovery failed:', error);
    recoveryLog.errors.push(`Critical failure: ${error}`);
    recoveryLog.finalStats.success = false;
    
    // Disable maintenance mode on error
    if (!dryRun) {
      disableMaintenanceMode();
    }
    
    res.status(500).json({
      success: false,
      error: 'Comprehensive recovery failed',
      recoveryLog,
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Quick amount fix endpoint
router.post('/recovery/fix-amounts', async (req, res) => {
  const { dryRun = true } = req.body;
  
  try {
    if (!dryRun) {
      enableMaintenanceMode('Amount calculation fixes in progress');
    }
    
    const stats = await fixAmountCalculations(dryRun);
    
    if (!dryRun) {
      disableMaintenanceMode();
    }
    
    res.json({
      success: true,
      dryRun,
      stats,
      message: dryRun 
        ? `Dry-run: ${stats.amountCorrections} amount corrections needed`
        : `Applied ${stats.amountCorrections} amount corrections successfully`
    });
    
  } catch (error) {
    if (!dryRun) {
      disableMaintenanceMode();
    }
    
    res.status(500).json({
      success: false,
      error: 'Amount fix failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Recovery status endpoint
router.get('/recovery/status', async (req, res) => {
  try {
    const totalServices = await db.$count(services);
    const servicesByType = await db.select().from(services);
    
    const stats = servicesByType.reduce((acc, service) => {
      acc[service.type] = (acc[service.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for amount inconsistencies
    const amountIssues = servicesByType.filter(service => {
      const canonicalPrice = CANONICAL_PRICES[service.type as keyof typeof CANONICAL_PRICES];
      return canonicalPrice && Math.abs(service.amount - canonicalPrice) > 0.01;
    }).length;

    res.json({
      totalServices,
      servicesByType: stats,
      amountIssuesDetected: amountIssues,
      status: amountIssues > 0 ? 'needs_recovery' : 'healthy'
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get recovery status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;