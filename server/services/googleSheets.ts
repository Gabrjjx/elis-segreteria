import { google } from 'googleapis';
import { log } from '../vite';

// Verifica che le variabili d'ambiente necessarie siano definite
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY non definita nelle variabili d\'ambiente');
}

if (!process.env.GOOGLE_SHEET_ID) {
  throw new Error('GOOGLE_SHEET_ID non definita nelle variabili d\'ambiente');
}

// Estrae l'ID del foglio dall'URL, se necessario
function extractSheetId(sheetIdOrUrl: string): string {
  console.log(`Trying to extract sheet ID from: ${sheetIdOrUrl}`);
  
  // Pattern 1: URLs in formato https://docs.google.com/spreadsheets/d/ID/edit
  if (sheetIdOrUrl.includes('spreadsheets/d/')) {
    const matches = sheetIdOrUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      console.log(`Extracted ID (pattern 1): ${matches[1]}`);
      return matches[1];
    }
  }
  
  // Pattern 2: URLs in formato https://docs.google.com/spreadsheets/d/ID/edit#gid=0
  const editMatch = sheetIdOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)\/edit/);
  if (editMatch && editMatch[1]) {
    console.log(`Extracted ID (pattern 2): ${editMatch[1]}`);
    return editMatch[1];
  }
  
  // Pattern 3: URLs in formato https://docs.google.com/spreadsheets/d/ID/view
  const viewMatch = sheetIdOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)\/view/);
  if (viewMatch && viewMatch[1]) {
    console.log(`Extracted ID (pattern 3): ${viewMatch[1]}`);
    return viewMatch[1];
  }
  
  // Se l'input sembra già essere un ID (formato alfanumerico senza slashes o altri separatori)
  if (/^[a-zA-Z0-9-_]+$/.test(sheetIdOrUrl)) {
    console.log(`Input already appears to be an ID: ${sheetIdOrUrl}`);
    return sheetIdOrUrl;
  }
  
  console.log(`Could not extract ID, returning original: ${sheetIdOrUrl}`);
  return sheetIdOrUrl; // Restituisce l'ID originale se non è un URL riconosciuto
}

// Configurazione dell'API Google Sheets
console.log("API KEY:", process.env.GOOGLE_API_KEY ? "Present" : "Missing");
console.log("SHEET ID:", process.env.GOOGLE_SHEET_ID ? "Present" : "Missing");

// Estrai l'ID del foglio
const SHEET_ID = extractSheetId(process.env.GOOGLE_SHEET_ID || '');
console.log("Sheet ID estratto:", SHEET_ID);

// Inizializza il client Google Sheets
const sheets = google.sheets({
  version: 'v4',
  auth: process.env.GOOGLE_API_KEY
});

/**
 * Legge i dati di un foglio Google Sheets
 * 
 * @param range Range del foglio (es. 'Risposte del modulo 1!A:Z')
 * @returns Array di righe dal foglio di calcolo
 */
export async function readGoogleSheet(range: string = 'Risposte del modulo 1!A:Z'): Promise<string[][]> {
  try {
    log('Lettura del foglio Google Sheets...', 'google-sheets');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      log('Nessun dato trovato nel foglio Google Sheets', 'google-sheets');
      return [];
    }

    log(`Letti ${rows.length} record dal foglio Google Sheets`, 'google-sheets');
    return rows;
  } catch (error) {
    log(`Errore durante la lettura del foglio Google Sheets: ${error}`, 'google-sheets');
    throw error;
  }
}

/**
 * Converte i dati del foglio Google Forms in formato CSV
 * 
 * @param data Array di righe dal foglio di calcolo
 * @returns Stringa in formato CSV
 */
export function convertToCSV(data: string[][]): string {
  if (data.length === 0) return '';
  
  return data.map(row => 
    row.map(cell => {
      // Gestione delle virgolette e delle virgole all'interno delle celle
      if (cell && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        // Sostituisci le virgolette con doppia virgoletta e racchiudi in virgolette
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell || '';
    }).join(',')
  ).join('\n');
}

/**
 * Legge i dati delle richieste di manutenzione dal foglio Google
 * e li restituisce in formato CSV
 */
export async function getMaintenanceRequestsCSV(): Promise<string> {
  try {
    const data = await readGoogleSheet();
    
    // Verifica il formato del foglio (controlla le intestazioni)
    let isElisFormat = false;
    let isNewElisFormat = false;
    
    if (data.length > 0) {
      // Controlla se è il vecchio formato ELIS con segnalato/risolto
      isElisFormat = (data[0][0]?.toLowerCase()?.includes('segnalato') || 
       data[0][0]?.toLowerCase()?.includes('risolto'));
      
      // Controlla se è il nuovo formato ELIS con le colonne specificate
      isNewElisFormat = data[0][0]?.includes('Informazioni cronologiche') &&
                       data[0][1]?.includes('Sigla') &&
                       data[0][2]?.includes('Luogo');
    }
    
    if (isNewElisFormat) {
      console.log('Rilevato nuovo formato ELIS');
      
      // Per il nuovo formato ELIS, adatta le colonne al formato che ci aspettiamo
      // Le colonne sono:
      // Informazioni cronologiche | Sigla | Luogo | Ubicazione specifica | Dettagli del difetto | Priorità | Risolvibile con manutentori | Suggerimento risoluzione
      
      let formattedData = [
        ['Informazioni', 'Sigla', 'Luogo', 'Ubicazione', 'Dettagli', 'Priorità', 'Risolvibile', 'Suggerimento']
      ];
    
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 5) continue; // Salta righe incomplete
        
        formattedData.push([
          row[0] || '', // Informazioni cronologiche
          row[1] || '', // Sigla
          row[2] || '', // Luogo
          row[3] || '', // Ubicazione specifica
          row[4] || '', // Dettagli del difetto
          row.length > 5 ? row[5] || '' : '', // Priorità
          row.length > 6 ? row[6] || '' : '', // Risolvibile
          row.length > 7 ? row[7] || '' : ''  // Suggerimento
        ]);
      }
      
      return convertToCSV(formattedData);
    } else if (isElisFormat) {
      console.log('Rilevato vecchio formato ELIS');
      
      // Per il vecchio formato ELIS, adatta le colonne al formato che ci aspettiamo
      // Il formato è:
      // A: Stato, B: Data, C: Stanza, D: Luogo, E: Descrizione, F: Dettagli
      
      let formattedData = [
        ['Stato', 'Data', 'Stanza', 'Luogo', 'Descrizione', 'Dettagli']
      ];
      
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.length < 6) continue; // Salta righe incomplete
        
        formattedData.push([
          row[0] || '', // Stato
          row[1] || '', // Data
          row[2] || '', // Stanza
          row[3] || '', // Luogo
          row[4] || '', // Descrizione
          row[5] || ''  // Dettagli
        ]);
      }
      
      return convertToCSV(formattedData);
    } else {
      // Formato standard (Google Forms o altro)
      return convertToCSV(data);
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione del foglio Google:', error);
    throw error;
  }
}