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
    
    // Stampiamo i dati che riceviamo per capire meglio la struttura
    console.log("FOGLIO RICEVUTO:");
    console.log("Prima riga (intestazioni):", JSON.stringify(data[0]));
    console.log("Seconda riga (primo record):", JSON.stringify(data[1]));
    console.log("Terza riga (secondo record):", JSON.stringify(data[2]));
    
    // I dati che stiamo ricevendo sembrano diversi da quelli attesi
    // Analizziamo meglio la struttura
    
    // Verifichiamo le dimensioni per capire meglio la struttura 
    if (!data || data.length < 3) {
      console.log("Dati insufficienti nel foglio");
      return '';
    }
    
    // Il formato sembra avere la prima colonna vuota e poi le intestazioni
    // Cerchiamo di identificare le colonne giuste
    let headerRow = data[0] || [];
    
    // Identifichiamo gli indici delle colonne importanti
    let siglaIdx = -1;
    let luogoIdx = -1;
    let infoIdx = -1;
    let ubicazioneIdx = -1;
    let dettagliIdx = -1;
    let prioritaIdx = -1;
    
    // Cerchiamo le colonne in base ai nomi
    console.log("Analisi intestazioni:");
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '').toLowerCase();
      console.log(`Colonna ${i}: "${headerRow[i]}" (${header})`);
      
      if (header.includes('sigla')) {
        siglaIdx = i;
        console.log(`-> Trovata colonna SIGLA all'indice ${i}`);
      }
      else if (header.includes('luogo') && !header.includes('ubicazione')) {
        luogoIdx = i;
        console.log(`-> Trovata colonna LUOGO all'indice ${i}`);
      }
      else if (header.includes('informazioni') || header.includes('cronologiche')) {
        infoIdx = i;
        console.log(`-> Trovata colonna INFORMAZIONI CRONOLOGICHE all'indice ${i}`);
      }
      else if (header.includes('ubicazione') || header.includes('specifica')) {
        ubicazioneIdx = i;
        console.log(`-> Trovata colonna UBICAZIONE all'indice ${i}`);
      }
      else if (header.includes('dettagli') || header.includes('difetto')) {
        dettagliIdx = i;
        console.log(`-> Trovata colonna DETTAGLI DIFETTO all'indice ${i}`);
      }
      else if (header.includes('priorità')) {
        prioritaIdx = i;
        console.log(`-> Trovata colonna PRIORITÀ all'indice ${i}`);
      }
    }
    
    // Se ancora non troviamo le colonne facciamo un tentativo basato sui dati dello screenshot
    if (siglaIdx === -1 && data[0].length > 2) siglaIdx = 2;  // Terza colonna
    if (luogoIdx === -1 && data[0].length > 3) luogoIdx = 3;  // Quarta colonna
    if (infoIdx === -1 && data[0].length > 1) infoIdx = 1;    // Seconda colonna
    if (ubicazioneIdx === -1 && data[0].length > 4) ubicazioneIdx = 4; // Quinta colonna
    if (dettagliIdx === -1 && data[0].length > 5) dettagliIdx = 5;   // Sesta colonna
    if (prioritaIdx === -1 && data[0].length > 6) prioritaIdx = 6;   // Settima colonna
    
    console.log(`Indici finali: Sigla=${siglaIdx}, Luogo=${luogoIdx}, Info=${infoIdx}, Ubicazione=${ubicazioneIdx}, Dettagli=${dettagliIdx}, Priorità=${prioritaIdx}`);
    
    // Preparare il formato dei dati
    let formattedData = [
      ['Timestamp', 'Richiedente', 'Stanza', 'Tipo', 'Descrizione', 'Priorità', 'Note']
    ];
    
    // Processa ogni riga di dati
    console.log(`Processando ${data.length} righe dal foglio`);
    let processed = 0;
    
    // Verifichiamo quali righe hanno un primo campo che indica se sono state risolte
    let skipFirstColumn = false;
    if (data[1] && data[1][0] && typeof data[1][0] === 'string' && 
        (data[1][0].toLowerCase().includes('risolto') || data[1][0].toLowerCase().includes('segnalato'))) {
      skipFirstColumn = true;
      console.log("Rilevata colonna di stato risolta/segnalata nel primo campo, la ignoreremo");
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < Math.max(siglaIdx, luogoIdx, infoIdx) + 1) {
        continue; // Salta righe troppo corte
      }
      
      // Valori predefiniti
      let timestamp = new Date().toISOString();
      let sigla = "T00"; // Valore di sigla di default
      let luogo = "N/D";
      let descrizione = "Richiesta manutenzione";
      let note = "";
      let priorita = "Bassa";
      
      // Timestamp proviene da "Informazioni cronologiche"
      if (infoIdx >= 0 && infoIdx < row.length) timestamp = row[infoIdx] || timestamp;
      
      // Richiedente proviene da "Sigla"
      if (siglaIdx >= 0 && siglaIdx < row.length) {
        const rawSigla = row[siglaIdx];
        // Se la sigla è un numero molto lungo, potrebbe essere un ID di Google Forms, usiamo un placeholder
        if (rawSigla && String(rawSigla).length > 8 && !isNaN(Number(rawSigla))) {
          sigla = "T" + String(i).padStart(2, '0'); // Generiamo una sigla fittizia basata sull'indice
          console.log(`Riga ${i}: Sostituita sigla anomala ${rawSigla} con ${sigla}`);
        } else {
          sigla = rawSigla || sigla;
        }
      }
      
      // Stanza proviene da "Luogo"
      if (luogoIdx >= 0 && luogoIdx < row.length) luogo = row[luogoIdx] || luogo;
      
      // Componiamo la descrizione e le note con informazioni aggiuntive
      if (dettagliIdx >= 0 && dettagliIdx < row.length && row[dettagliIdx]) {
        descrizione = row[dettagliIdx];
      }
      
      if (ubicazioneIdx >= 0 && ubicazioneIdx < row.length && row[ubicazioneIdx]) {
        note = `Ubicazione: ${row[ubicazioneIdx]}`;
      }
      
      // Priorità
      if (prioritaIdx >= 0 && prioritaIdx < row.length) {
        const priorityVal = row[prioritaIdx];
        if (priorityVal) {
          // Possibilità: numeri o testo per la priorità
          if (typeof priorityVal === 'number' || !isNaN(Number(priorityVal))) {
            const numPriority = Number(priorityVal);
            if (numPriority === 1) priorita = "Bassa";
            else if (numPriority === 2) priorita = "Media";
            else if (numPriority === 3) priorita = "Alta";
            else if (numPriority === 4) priorita = "Urgente";
          } else if (typeof priorityVal === 'string') {
            const lowerPriority = priorityVal.toLowerCase();
            if (lowerPriority.includes('bassa') || lowerPriority.includes('low')) {
              priorita = "Bassa";
            } else if (lowerPriority.includes('media') || lowerPriority.includes('medium')) {
              priorita = "Media";
            } else if (lowerPriority.includes('alta') || lowerPriority.includes('high')) {
              priorita = "Alta";
            } else if (lowerPriority.includes('urgente') || lowerPriority.includes('urgent')) {
              priorita = "Urgente";
            }
          }
        }
      }
      
      if (i <= 5) {
        console.log(`Riga ${i} - Richiedente: "${sigla}", Stanza: "${luogo}", Data: "${timestamp}", Priorità: "${priorita}"`);
      }
      
      // Aggiungi la riga se abbiamo dati significativi e la stanza non è vuota
      if (luogo && luogo !== "N/D") {
        formattedData.push([
          timestamp,
          sigla,
          luogo,
          'Manutenzione',
          descrizione,
          priorita,
          note
        ]);
        
        processed++;
      } else {
        console.log(`Riga ${i} saltata perché la stanza/luogo è vuoto`);
      }
    }
    
    console.log(`Processate ${processed} righe con successo`);
    
    return convertToCSV(formattedData);
  } catch (error) {
    console.error('Errore durante l\'elaborazione del foglio Google:', error);
    throw error;
  }
}