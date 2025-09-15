/**
 * PDF Parser Utility for Historical Services Import
 * Converts raw PDF text data into structured format for database import
 */

export interface PDFServiceRow {
  date: string; // DD/MM/YYYY
  sigla: string;
  pieces: number;
  type: string;
  totalAmount: number; // Total amount for all pieces in euros
  notes?: string;
}

/**
 * Parse raw PDF text lines into structured service data
 * @param pdfLines Array of text lines from PDF
 * @returns Array of parsed service rows
 */
export function parsePDFServices(pdfLines: string[]): PDFServiceRow[] {
  const services: PDFServiceRow[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < pdfLines.length; i++) {
    const line = pdfLines[i].trim();
    
    // Skip header lines and empty lines
    if (
      !line || 
      line.includes('Informazioni') || 
      line.includes('cronologiche') ||
      line.includes('SIGLA') ||
      line.includes('N. pezzi') ||
      line.includes('Tipologia lavoro') ||
      line.includes('Tot. dovuto') ||
      line.includes('es: 0,40; 1,20')
    ) {
      continue;
    }
    
    try {
      const service = parseServiceLine(line);
      if (service) {
        services.push(service);
      }
    } catch (error) {
      const errorMsg = `Line ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`;
      errors.push(errorMsg);
      console.warn(`Parse warning for line ${i + 1}: ${line} - ${errorMsg}`);
    }
  }
  
  console.log(`PDF parsing completed: ${services.length} services parsed, ${errors.length} errors`);
  
  if (errors.length > 0) {
    console.log('Parse errors:', errors.slice(0, 10)); // Log first 10 errors
  }
  
  return services;
}

/**
 * Parse a single service line from PDF
 * Expected format: "DD/MM/YYYY SIGLA PIECES TYPE TOTAL_AMOUNT"
 * Example: "06/02/2020 97 1 Siglatura € 0,40" (total for 1 piece)
 * Example: "11/02/2020 93 2 Siglatura € 0,80" (total for 2 pieces = 0.40 per piece)
 */
function parseServiceLine(line: string): PDFServiceRow | null {
  // Clean up the line
  const cleanLine = line.replace(/→/g, '').trim();
  
  // Split by whitespace but preserve quoted strings
  const parts = cleanLine.split(/\s+/);
  
  if (parts.length < 5) {
    return null; // Skip lines with insufficient data
  }
  
  let partIndex = 0;
  
  // Parse date (first part)
  const dateStr = parts[partIndex++];
  if (!isValidDate(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  // Parse sigla (second part) 
  const sigla = parts[partIndex++];
  if (!/^\d+$/.test(sigla)) {
    throw new Error(`Invalid sigla format: ${sigla}`);
  }
  
  // Parse pieces (third part)
  const piecesStr = parts[partIndex++];
  const pieces = parseInt(piecesStr);
  if (isNaN(pieces) || pieces < 1) {
    throw new Error(`Invalid pieces: ${piecesStr}`);
  }
  
  // Parse service type (can be multiple words)
  let type = '';
  let amountIndex = -1;
  
  // Find the amount (starts with € or contains currency)
  for (let i = partIndex; i < parts.length; i++) {
    if (parts[i].includes('€') || /\d+[,.]\d+/.test(parts[i])) {
      amountIndex = i;
      break;
    }
  }
  
  if (amountIndex === -1) {
    throw new Error('No total amount found in line');
  }
  
  // Extract type (everything between pieces and amount)
  for (let i = partIndex; i < amountIndex; i++) {
    type += (i > partIndex ? ' ' : '') + parts[i];
  }
  
  type = normalizeServiceType(type.trim());
  
  // Parse total amount (remove € and convert to number)
  const amountStr = parts.slice(amountIndex).join(' ');
  const totalAmount = parseAmount(amountStr);
  
  return {
    date: normalizeDateFormat(dateStr),
    sigla,
    pieces,
    type,
    totalAmount
  };
}

/**
 * Validate date format DD/MM/YYYY
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  return dateRegex.test(dateStr);
}

/**
 * Normalize date format to ensure DD/MM/YYYY
 */
function normalizeDateFormat(dateStr: string): string {
  // Handle cases like "18/09" without year or " 7/10/2024" with space
  let normalized = dateStr.trim();
  
  // If missing year, assume current context (we'll handle this in transformer)
  const parts = normalized.split('/');
  if (parts.length === 2) {
    // Missing year - this will be handled by transformer based on context
    normalized = dateStr; // Keep as is, transformer will handle
  }
  
  // Clean up spacing issues like " 7/10/2024"
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
}

/**
 * Normalize service type names to match database enum values
 */
function normalizeServiceType(rawType: string): string {
  const type = rawType.toLowerCase().trim();
  
  // Handle variations in capitalization and spacing
  switch (type) {
    case 'siglatura':
    case 'siglatura':  // sometimes lowercase in PDF
    case 'siglature':   // plural variation
      return 'siglatura';
    
    case 'riparazione':
    case 'riparazioni': // plural
      return 'riparazione';
    
    case 'happy hour':
      return 'happy hour';
    
    case 'orlo':
      return 'orlo';
    
    case 'bottone':
      return 'bottone';
    
    case 'riparazione zip':
      return 'riparazione zip';
    
    case 'riparazione+siglatura':
      return 'riparazione+siglatura';
    
    case 'siglatura + kit':
      return 'siglatura + kit';
    
    default:
      // Return as-is and let transformer handle unknown types
      return rawType;
  }
}

/**
 * Parse total amount string to number
 * Handles formats like "€ 0,40", "€ 1,20", "€ 5,00"
 * Returns the total amount for all pieces as found in the PDF
 */
function parseAmount(amountStr: string): number {
  // Remove currency symbols and spaces
  let cleanAmount = amountStr.replace(/€|\s/g, '');
  
  // Replace comma with dot for decimal
  cleanAmount = cleanAmount.replace(',', '.');
  
  // Extract numeric value
  const match = cleanAmount.match(/\d+\.?\d*/);
  if (!match) {
    throw new Error(`Invalid amount format: ${amountStr}`);
  }
  
  const totalAmount = parseFloat(match[0]);
  if (isNaN(totalAmount) || totalAmount < 0) {
    throw new Error(`Invalid amount value: ${amountStr}`);
  }
  
  return totalAmount;
}

/**
 * Create sample test data for testing the import endpoint
 * Note: totalAmount represents the total cost for all pieces
 * - pieces=1, totalAmount=0.40 means 0.40 per piece
 * - pieces=2, totalAmount=0.80 means 0.40 per piece (total = 2 × 0.40)
 * - pieces=2, totalAmount=9.50 means 4.75 per piece (total = 2 × 4.75)
 */
export function createSampleHistoricalData(): PDFServiceRow[] {
  return [
    {
      date: '06/02/2020',
      sigla: '97',
      pieces: 1,
      type: 'siglatura',
      totalAmount: 0.40  // 1 piece × 0.40 per piece = 0.40 total
    },
    {
      date: '11/02/2020',
      sigla: '93',
      pieces: 2,
      type: 'siglatura',
      totalAmount: 0.80  // 2 pieces × 0.40 per piece = 0.80 total
    },
    {
      date: '18/10/2024',
      sigla: '102',
      pieces: 2,
      type: 'happy hour',
      totalAmount: 9.50  // 2 pieces × 4.75 per piece = 9.50 total
    },
    {
      date: '26/01/2021',
      sigla: '198',
      pieces: 1,
      type: 'orlo',
      totalAmount: 5.00  // 1 piece × 5.00 per piece = 5.00 total
    }
  ];
}

/**
 * Extract services data from PDF text content
 * This function processes the actual PDF content you provided
 */
export function extractServicesFromPDFContent(pdfContent: string): PDFServiceRow[] {
  // Split content into lines
  const lines = pdfContent.split('\n');
  
  // Parse the lines
  return parsePDFServices(lines);
}