import { Router } from 'express';
import { parseAllTSVFiles } from '../utils/tsvParser';
import { transformHistoricalServiceRow } from '../utils/historicalTransformer';

const router = Router();

// Import all historical data from TSV files
router.post('/import/services/tsv', async (req, res) => {
  // TODO: Add authentication once auth system is located
  // SECURITY: This endpoint should be protected in production
  try {
    const { dryRun = false } = req.body;
    
    console.log('🔄 Starting TSV import process...');
    
    // Parse all TSV files
    const parsedData = parseAllTSVFiles();
    
    if (parsedData.errors.length > 0) {
      console.log('⚠️ Parsing errors found:');
      parsedData.errors.forEach(error => console.log('  ', error));
    }
    
    console.log(`📊 Parsed ${parsedData.services.length} services from TSV files`);
    
    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        totalServices: parsedData.services.length,
        errors: parsedData.errors,
        sampleServices: parsedData.services.slice(0, 5),
        servicesByYear: parsedData.services.reduce((acc, service) => {
          const year = new Date(service.date.split('/').reverse().join('-')).getFullYear();
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
        servicesByType: parsedData.services.reduce((acc, service) => {
          acc[service.type] = (acc[service.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    }
    
    // Transform and import services
    const transformedServices = [];
    const transformErrors = [];
    
    for (let i = 0; i < parsedData.services.length; i++) {
      const service = parsedData.services[i];
      
      try {
        const transformed = transformHistoricalServiceRow({
          ...service,
          amount: service.totalAmount // Map totalAmount to amount for transformer
        });
        
        transformedServices.push(transformed);
      } catch (error) {
        transformErrors.push(`Service ${i + 1}: ${error}`);
      }
    }
    
    if (transformErrors.length > 0) {
      console.log('⚠️ Transformation errors:');
      transformErrors.forEach(error => console.log('  ', error));
    }
    
    console.log(`✅ Transformed ${transformedServices.length} services for database import`);
    
    // Real import to database
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const importErrors = [];
    
    if (!dryRun) {
      // Import each service with idempotency check
      const { storage } = await import('../storage');
      
      for (let i = 0; i < transformedServices.length; i++) {
        const service = transformedServices[i];
        
        try {
          // Check for existing service to avoid duplicates
          const existing = await storage.getServices({
            startDate: service.date,
            endDate: service.date,
            sigla: service.sigla,
            type: service.type,
            pieces: service.pieces,
            includeArchived: true // Include archived data in duplicate check
          });
          
          const duplicate = existing.find(s => 
            s.sigla === service.sigla && 
            s.type === service.type && 
            s.pieces === service.pieces &&
            Math.abs(s.amount - service.amount) < 0.01 &&
            s.archivedYear === service.archivedYear
          );
          
          if (duplicate) {
            skipped++;
            console.log(`Skipped duplicate: ${service.sigla} ${service.type} ${service.date}`);
          } else {
            await storage.createService(service);
            imported++;
            console.log(`Imported: ${service.sigla} ${service.type} ${service.date}`);
          }
        } catch (error) {
          failed++;
          const errorMsg = `Service ${i + 1} (${service.sigla}): ${error}`;
          importErrors.push(errorMsg);
          console.error(`Import error:`, errorMsg);
        }
      }
    }
    
    res.json({
      success: true,
      imported: dryRun ? 0 : imported,
      skipped: dryRun ? 0 : skipped,
      failed: dryRun ? 0 : failed,
      totalParsed: transformedServices.length,
      parseErrors: parsedData.errors,
      transformErrors,
      importErrors: dryRun ? [] : importErrors,
      servicesByYear: transformedServices.reduce((acc, service) => {
        acc[service.archivedYear!] = (acc[service.archivedYear!] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
      servicesByType: transformedServices.reduce((acc, service) => {
        acc[service.type] = (acc[service.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
  } catch (error) {
    console.error('❌ TSV import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import TSV data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;