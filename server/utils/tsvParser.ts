import { readFileSync } from 'fs';
import { join } from 'path';

export interface TSVServiceRow {
  date: string;        // DD/MM/YYYY format
  sigla: string;       // Student ID
  pieces: number;      // Number of pieces
  type: string;        // Service type
  totalAmount: number; // Total amount in euros
}

export interface ParsedTSVData {
  services: TSVServiceRow[];
  errors: string[];
}

// Normalize service type names
function normalizeServiceType(type: string): string {
  const cleaned = type.toLowerCase().trim();
  
  // Map variations to standard names
  const typeMap: Record<string, string> = {
    'siglatura': 'siglatura',
    'siglature': 'siglatura', 
    'riparazione': 'riparazione',
    'orlo': 'orlo',
    'bottone': 'bottone',
    'happyhour': 'happyhour',
    'happy hour': 'happyhour',
    'sostituzione bottone rotto': 'bottone',
    'riparazione zip': 'riparazione',
    'siglatura + riparazione': 'riparazione', // Complex service -> main type
    'siglaura': 'siglatura' // Common typo
  };
  
  return typeMap[cleaned] || cleaned;
}

// Parse date from DD/MM/YYYY or DDMMYYYY format
function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();
  
  // Handle DD/MM/YYYY format
  if (cleaned.includes('/')) {
    const [day, month, year] = cleaned.split('/').map(Number);
    if (day && month && year) {
      return new Date(year, month - 1, day);
    }
  }
  
  // Handle DDMMYYYY format (like "27062022")
  if (cleaned.length === 8 && /^\d{8}$/.test(cleaned)) {
    const day = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4));
    const year = parseInt(cleaned.substring(4, 8));
    
    if (day && month && year && day <= 31 && month <= 12) {
      return new Date(year, month - 1, day);
    }
  }
  
  return null;
}

// Parse euro amount (€ 1,50 or € 1.50 format)
function parseEuroAmount(amountStr: string): number {
  const cleaned = amountStr
    .replace(/[€\s]/g, '') // Remove € symbol and spaces
    .replace(',', '.'); // Convert comma to dot for decimal
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

export function parseTSVFile(filePath: string): ParsedTSVData {
  const result: ParsedTSVData = {
    services: [],
    errors: []
  };
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Split by tabs
      const columns = line.split('\t');
      
      if (columns.length < 5) {
        result.errors.push(`Line ${lineNum}: Insufficient columns (${columns.length})`);
        continue;
      }
      
      const [dateStr, siglaStr, , piecesStr, typeStr, amountStr] = columns;
      
      // Parse date
      const parsedDate = parseDate(dateStr);
      if (!parsedDate) {
        result.errors.push(`Line ${lineNum}: Invalid date format "${dateStr}"`);
        continue;
      }
      
      // Parse sigla
      const sigla = siglaStr?.trim();
      if (!sigla) {
        result.errors.push(`Line ${lineNum}: Missing sigla`);
        continue;
      }
      
      // Parse pieces
      const pieces = parseInt(piecesStr?.trim() || '0');
      if (pieces <= 0) {
        result.errors.push(`Line ${lineNum}: Invalid pieces "${piecesStr}"`);
        continue;
      }
      
      // Parse and normalize service type
      const type = normalizeServiceType(typeStr?.trim() || '');
      if (!type) {
        result.errors.push(`Line ${lineNum}: Missing service type`);
        continue;
      }
      
      // Parse amount
      const totalAmount = parseEuroAmount(amountStr?.trim() || '0');
      if (totalAmount < 0) {
        result.errors.push(`Line ${lineNum}: Invalid amount "${amountStr}"`);
        continue;
      }
      
      // Format date for consistency
      const formattedDate = `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
      
      result.services.push({
        date: formattedDate,
        sigla,
        pieces,
        type,
        totalAmount
      });
    }
    
  } catch (error) {
    result.errors.push(`File reading error: ${error}`);
  }
  
  return result;
}

export function parseAllTSVFiles(): ParsedTSVData {
  const attachedAssetsDir = join(process.cwd(), 'attached_assets');
  
  const tsvFiles = [
    'Pasted-06-02-2020-97-1-Siglatura-0-40-11-02-2020-93-2-Siglatura-0-80-11-02-2020-135-2-Siglatura--1757936851868_1757936851869.txt',
    'Pasted-18-11-2020-175-1-Siglatura-0-40-20-11-2020-110-2-Siglatura-0-80-20-11-2020-115-2-Siglatura--1757936867957_1757936867957.txt',
    'Pasted-22-04-2021-198-1-bottone-0-40-26-04-2021-142-1-siglatura-0-40-27-04-2021-182-3-siglatura--1757936875923_1757936875923.txt',
    'Pasted-27-09-2021-143-1-siglatura-0-40-29-09-2021-149-4-siglatura-1-60-30-09-2021-109-2-siglatura--1757936884154_1757936884154.txt',
    'Pasted-10-01-2022-151-2-siglatura-0-80-10-01-2022-107-1-siglatura-0-40-10-01-2022-161-2-siglatura--1757936898423_1757936898423.txt',
    'Pasted-25-03-2022-133-1-riparazione-1-00-25-03-2022-162-2-siglatura-0-80-25-03-2022-122-1-siglatur-1757936908947_1757936908947.txt',
    'Pasted-23-06-2022-109-5-siglatura-2-00-24-06-2022-117-3-siglatura-1-20-24-06-2022-169-1-siglatura--1757936916343_1757936916343.txt'
  ];
  
  const allResults: ParsedTSVData = {
    services: [],
    errors: []
  };
  
  for (const filename of tsvFiles) {
    const filePath = join(attachedAssetsDir, filename);
    console.log(`Processing file: ${filename}`);
    
    const result = parseTSVFile(filePath);
    allResults.services.push(...result.services);
    
    if (result.errors.length > 0) {
      allResults.errors.push(`File ${filename}:`);
      allResults.errors.push(...result.errors);
    }
    
    console.log(`  - Parsed ${result.services.length} services, ${result.errors.length} errors`);
  }
  
  console.log(`Total: ${allResults.services.length} services, ${allResults.errors.length} errors`);
  return allResults;
}