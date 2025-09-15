// Transform historical service row from PDF/TSV format to database format
export function transformHistoricalServiceRow(row: any): any {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid row data');
  }
  
  // Parse and validate date
  const dateStr = row.date?.toString().trim();
  if (!dateStr) {
    throw new Error('Date is required');
  }
  
  // Convert DD/MM/YYYY to Date object
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY`);
  }
  
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const rowYear = parseInt(dateParts[2]);
  
  if (isNaN(day) || isNaN(month) || isNaN(rowYear)) {
    throw new Error(`Invalid date components: ${dateStr}`);
  }
  
  const parsedDate = new Date(rowYear, month - 1, day);
  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  // Validate sigla
  const sigla = row.sigla?.toString().trim();
  if (!sigla) {
    throw new Error('Sigla is required');
  }
  
  // Validate pieces
  const pieces = parseInt(row.pieces);
  if (isNaN(pieces) || pieces < 1) {
    throw new Error(`Invalid pieces: ${row.pieces}`);
  }
  
  // Validate and map service type
  const rawType = row.type?.toString().toLowerCase().trim();
  if (!rawType) {
    throw new Error('Service type is required');
  }
  
  let mappedType: string;
  let notes: string | null = null;
  
  switch (rawType) {
    case 'siglatura':
      mappedType = 'siglatura';
      break;
    case 'riparazione':
      mappedType = 'riparazione';
      break;
    case 'happy hour':
    case 'happyhour':
      mappedType = 'happy_hour';
      break;
    case 'orlo':
      mappedType = 'riparazione';
      notes = 'orlo';
      break;
    case 'bottone':
      mappedType = 'riparazione';
      notes = 'bottone';
      break;
    case 'riparazione zip':
      mappedType = 'riparazione';
      notes = 'zip';
      break;
    case 'riparazione+siglatura':
    case 'siglatura + riparazione':
      mappedType = 'riparazione';
      notes = 'riparazione+siglatura';
      break;
    case 'siglatura + kit':
      mappedType = 'siglatura';
      notes = 'kit';
      break;
    case 'sostituzione bottone rotto':
      mappedType = 'riparazione';
      notes = 'sostituzione bottone rotto';
      break;
    case 'siglaura': // Common typo
      mappedType = 'siglatura';
      break;
    default:
      throw new Error(`Unknown service type: ${rawType}`);
  }
  
  // Validate and convert amount (PDF provides total amount, we need per-piece amount)
  let totalAmount: number;
  if (typeof row.amount === 'number') {
    totalAmount = row.amount;
  } else if (typeof row.amount === 'string') {
    // Handle € formatting like "€ 0,50" or "€ 1,20"
    const cleanAmount = row.amount.replace(/€|\s/g, '').replace(',', '.');
    totalAmount = parseFloat(cleanAmount);
  } else {
    totalAmount = parseFloat(row.amount);
  }
  
  if (isNaN(totalAmount) || totalAmount < 0) {
    throw new Error(`Invalid amount: ${row.amount}`);
  }
  
  // Convert total amount to per-piece amount
  const amount = totalAmount / pieces;
  
  // Additional notes from input
  if (row.notes && notes) {
    notes = `${notes}; ${row.notes}`;
  } else if (row.notes) {
    notes = row.notes;
  }
  
  return {
    date: parsedDate,
    sigla,
    cognome: null, // Not available in PDF/TSV
    pieces,
    type: mappedType,
    amount,
    status: 'paid', // Historical data is assumed paid
    paymentMethod: null,
    notes,
    archivedYear: parsedDate.getFullYear(), // Use the actual year from the record's date
    archivedAt: new Date() // Set archived timestamp
  };
}