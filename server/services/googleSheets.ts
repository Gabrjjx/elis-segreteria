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
    log('Lettura del foglio Google Sheets usando fetch diretto...', 'google-sheets');
    
    // Utilizziamo fetch direttamente per evitare problemi con il client Google Sheets
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    
    console.log("Calling Google Sheets API with URL:", url.replace(apiKey || '', '[REDACTED]'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Sheets API error (${response.status}): ${errorText}`);
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const rows = data.values;
    
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
    
    console.log("Dati del foglio - prima riga:", data[0]);
    console.log("Dati del foglio - seconda riga:", data[1]);
    
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
      console.log('Rilevato nuovo formato ELIS - Excel');
      
      // Per il nuovo formato ELIS, adatta le colonne al formato che ci aspettiamo
      // Le colonne probabilmente sono:
      // Informazioni cronologiche | Sigla | Luogo | Ubicazione specifica | Dettagli del difetto | Priorità | Risolvibile con manutentori | Suggerimento risoluzione
      
      let formattedData = [
        ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note', 'Suggerimento']
      ];
    
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 5) continue; // Salta righe incomplete
        
        // Usiamo la data attuale per il timestamp della richiesta
        const timestamp = new Date().toISOString();
        
        // Correttamente mappiamo i campi
        formattedData.push([
          timestamp, // Timestamp della richiesta (data attuale)
          row[1] || '', // Richiedente (Sigla)
          row[2] || '', // Stanza (Luogo)
          'Manutenzione', // Tipo fisso
          row[4] || '', // Descrizione (Dettagli del difetto)
          row.length > 5 && row[5] ? row[5] : 'Bassa', // Priorità o default 'Bassa'
          // Aggiungiamo le note con i dettagli aggiuntivi
          `Data compilazione: ${row[0] || ''}, Ubicazione: ${row[3] || ''}`, // Note
          row.length > 7 ? row[7] || '' : ''  // Suggerimento
        ]);
      }
      
      return convertToCSV(formattedData);
    } else if (isElisFormat) {
      console.log('Rilevato vecchio formato ELIS');
      
      // Il formato potrebbe essere:
      // Marca temporale | Email | Nome | Sigla | Ubicazione | Definizione del problema | Proposta di soluzione | Altro...
      
      let formattedData = [
        ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note']
      ];
      
      // Analizziamo le prime righe per identificare le colonne
      let headerRow = data[0];
      console.log("Header row:", headerRow);
      
      // Indici delle colonne importanti
      let timestampIdx = -1;
      let siglaIdx = -1;
      let ubicazioneIdx = -1;
      let problemaIdx = -1;
      
      // Cerchiamo di identificare le colonne in base ai nomi
      for (let i = 0; i < headerRow.length; i++) {
        const header = headerRow[i]?.toLowerCase() || '';
        if (header.includes('temporale') || header.includes('orario') || header.includes('data') || header.includes('time')) {
          timestampIdx = i;
        }
        else if (header.includes('sigla') || header.includes('segnalazione')) {
          siglaIdx = i;
        }
        else if (header.includes('luogo') || header.includes('ubicazione') || header.includes('dove')) {
          ubicazioneIdx = i;
        }
        else if (header.includes('problema') || header.includes('difetto') || header.includes('dettagli')) {
          problemaIdx = i;
        }
      }
      
      console.log(`Indici: Timestamp=${timestampIdx}, Sigla=${siglaIdx}, Ubicazione=${ubicazioneIdx}, Problema=${problemaIdx}`);
      
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue; // Salta righe incomplete
        
        // Prendiamo i valori usando gli indici identificati o utilizziamo valori di default
        const timestamp = timestampIdx >= 0 && row[timestampIdx] ? row[timestampIdx] : new Date().toISOString();
        const sigla = siglaIdx >= 0 && row[siglaIdx] ? row[siglaIdx] : 'Segnalazione Excel';
        const ubicazione = ubicazioneIdx >= 0 && row[ubicazioneIdx] ? row[ubicazioneIdx] : 'N/D';
        const problema = problemaIdx >= 0 && row[problemaIdx] ? row[problemaIdx] : 'Richiesta manutenzione';
        
        formattedData.push([
          timestamp, // Timestamp (data segnalazione se disponibile)
          sigla, // Richiedente (Sigla)
          ubicazione, // Stanza (Ubicazione)
          'Manutenzione', // Tipo fisso
          problema, // Descrizione problema
          'Bassa', // Priorità default
          `Importato da Excel ELIS` // Note
        ]);
      }
      
      return convertToCSV(formattedData);
    } else {
      console.log('Nessun formato specifico rilevato, analizziamo il contenuto...');
      
      // Se non abbiamo riconosciuto nessun formato noto, cerchiamo di adattarci al formato del foglio
      let formattedData = [
        ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note']
      ];
      
      // Prendi la prima riga come intestazione
      let headers = data[0];
      
      // Analizza la struttura e crea un mapping adatto
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue; // Salta righe vuote o quasi vuote
        
        // Cerchiamo di identificare le informazioni chiave
        let timestamp = '';
        let richiedente = '';
        let stanza = '';
        let descrizione = '';
        let note = '';
        
        // Per un foglio generico, cerchiamo di fare del nostro meglio
        for (let j = 0; j < row.length; j++) {
          if (!row[j]) continue;
          
          if (j === 0) {
            // Prima colonna spesso contiene timestamp o ID
            timestamp = row[j];
          } else if (j === 1) {
            // Seconda colonna spesso contiene informazioni sul richiedente
            richiedente = row[j];
          } else if (j === 2) {
            // Terza colonna potrebbe contenere informazioni sulla posizione
            stanza = row[j];
          } else if (j === 3 || j === 4) {
            // La quarta o quinta colonna spesso contiene la descrizione del problema
            if (row[j] && row[j].length > 0) {
              if (descrizione) {
                descrizione += " - " + row[j];
              } else {
                descrizione = row[j];
              }
            }
          } else {
            // Altre colonne le mettiamo nelle note
            if (row[j] && row[j].length > 0) {
              if (note) {
                note += ", " + headers[j] + ": " + row[j];
              } else {
                note = headers[j] + ": " + row[j];
              }
            }
          }
        }
        
        formattedData.push([
          timestamp || new Date().toISOString(),
          richiedente || 'Segnalazione Excel',
          stanza || 'N/D',
          'Manutenzione',
          descrizione || 'Richiesta manutenzione',
          'Bassa',
          note || 'Importato da Excel'
        ]);
      }
      
      return convertToCSV(formattedData);
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione del foglio Google:', error);
    throw error;
  }
}