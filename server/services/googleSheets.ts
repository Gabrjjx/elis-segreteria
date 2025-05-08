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
    
    // Verifica il formato del foglio ELIS (verificato dalle schermate inviate)
    const elisFormat = data[0] && 
                      data[0][0]?.includes('Informazioni cronologiche') && 
                      data[0][1]?.includes('Sigla') && 
                      data[0][2]?.includes('Luogo');
    
    if (elisFormat) {
      console.log('Rilevato formato ELIS corretto dal foglio condiviso');
      
      // Questo è il formato del foglio ELIS che abbiamo visto nella schermata:
      // [0]: Informazioni cronologiche | [1]: Sigla | [2]: Luogo | [3]: Ubicazione specifica | [4]: Dettagli del difetto
      
      let formattedData = [
        ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note']
      ];
    
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue; // Salta righe davvero incomplete
        
        // Prendiamo i dati dalle colonne corrette come visto nel foglio
        const timestamp = row[0] || new Date().toISOString(); // Data dalla colonna "Informazioni cronologiche"
        const sigla = row[1] || ''; // Sigla (es. T67, 136, 157)
        const luogo = row[2] || ''; // Luogo (es. Palestra 2, Piscina 4)
        const ubicazione = row.length > 3 ? row[3] || '' : ''; // Ubicazione specifica
        const dettagli = row.length > 4 ? row[4] || '' : ''; // Dettagli del difetto
        
        // Mappiamo correttamente i campi nel formato richiesto dall'applicazione
        formattedData.push([
          timestamp, // Timestamp - usiamo direttamente la data di compilazione
          sigla, // Richiedente - usiamo la sigla come richiesto
          luogo, // Stanza - usiamo il luogo come richiesto
          'Manutenzione', // Tipo fisso
          dettagli, // Descrizione - dettagli del difetto
          'Bassa', // Priorità default (non sembra essere nel foglio)
          ubicazione // Note - mettiamo l'ubicazione specifica
        ]);
      }
      
      return convertToCSV(formattedData);
    } else {
      console.log('Il formato del foglio non corrisponde al formato ELIS atteso');
      console.log('Tentativo di mappare automaticamente le colonne...');
      
      // Cerchiamo di capire la struttura delle colonne
      let headerRow = data[0] || [];
      let formattedData = [
        ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note']
      ];
      
      // Indici delle colonne che ci interessano
      let infoIdx = -1;
      let siglaIdx = -1;
      let luogoIdx = -1;
      let ubicazioneIdx = -1;
      let dettagliIdx = -1;
      
      // Cerchiamo di trovare le colonne in base ai nomi
      for (let i = 0; i < headerRow.length; i++) {
        const header = (headerRow[i] || '').toLowerCase();
        
        if (header.includes('informazioni') || header.includes('cronologiche') || header.includes('data') || header.includes('timestamp')) {
          infoIdx = i;
        } 
        else if (header.includes('sigla')) {
          siglaIdx = i;
        }
        else if (header.includes('luogo') && !header.includes('ubicazione')) {
          luogoIdx = i;
        }
        else if (header.includes('ubicazione') || header.includes('specifica')) {
          ubicazioneIdx = i;
        }
        else if (header.includes('dettagli') || header.includes('difetto') || header.includes('problema')) {
          dettagliIdx = i;
        }
      }
      
      console.log(`Indici trovati: Info=${infoIdx}, Sigla=${siglaIdx}, Luogo=${luogoIdx}, Ubicazione=${ubicazioneIdx}, Dettagli=${dettagliIdx}`);
      
      // Se non troviamo alcune colonne, usiamo indici di default basati sul formato che abbiamo visto
      if (infoIdx === -1) infoIdx = 0;  // Prima colonna
      if (siglaIdx === -1) siglaIdx = 1;  // Seconda colonna
      if (luogoIdx === -1) luogoIdx = 2;  // Terza colonna
      if (ubicazioneIdx === -1) ubicazioneIdx = 3;  // Quarta colonna
      if (dettagliIdx === -1) dettagliIdx = 4;  // Quinta colonna
      
      // Aggiungi le righe dei dati, saltando l'intestazione
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue; // Salta righe vuote
        
        // Estrai i valori dalle posizioni identificate (o usa stringhe vuote se non disponibili)
        const timestamp = infoIdx >= 0 && infoIdx < row.length ? row[infoIdx] || '' : '';
        const sigla = siglaIdx >= 0 && siglaIdx < row.length ? row[siglaIdx] || '' : '';
        const luogo = luogoIdx >= 0 && luogoIdx < row.length ? row[luogoIdx] || '' : '';
        const ubicazione = ubicazioneIdx >= 0 && ubicazioneIdx < row.length ? row[ubicazioneIdx] || '' : '';
        const dettagli = dettagliIdx >= 0 && dettagliIdx < row.length ? row[dettagliIdx] || '' : '';
        
        // Aggiungi solo se abbiamo almeno una sigla o un luogo significativo
        if (sigla || luogo) {
          formattedData.push([
            timestamp || new Date().toISOString(),
            sigla || 'Segnalazione Excel',
            luogo || 'N/D',
            'Manutenzione',
            dettagli || 'Richiesta manutenzione',
            'Bassa',
            ubicazione || ''
          ]);
        }
      }
      
      return convertToCSV(formattedData);
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione del foglio Google:', error);
    throw error;
  }
}