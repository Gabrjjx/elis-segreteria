import { google, sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from './googleAuth';
import { log } from '../vite';

// Stato globale per la connessione
let sheetsApi: sheets_v4.Sheets | null = null;

/**
 * Ottiene un'istanza autenticata dell'API Google Sheets
 */
export async function getSheetsApi(): Promise<sheets_v4.Sheets> {
  if (sheetsApi) {
    return sheetsApi;
  }

  try {
    const authClient = await getAuthenticatedClient();
    sheetsApi = google.sheets({ version: 'v4', auth: authClient });
    return sheetsApi;
  } catch (error) {
    log(`Errore nell'inizializzazione dell'API Google Sheets: ${error}`, 'googleSheetsApi');
    throw error;
  }
}

/**
 * Legge i dati da un foglio Google Sheets utilizzando l'API autenticata OAuth2
 * 
 * @param spreadsheetId ID del foglio Google
 * @param range Range da leggere (es. 'Sheet1!A1:Z')
 * @returns I dati del foglio come array di array
 */
export async function readSheet(spreadsheetId: string, range: string): Promise<string[][]> {
  if (!spreadsheetId) {
    throw new Error('spreadsheetId is required');
  }

  try {
    const sheets = await getSheetsApi();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // Controlla se abbiamo ricevuto dei dati validi
    if (!response.data.values) {
      log(`Nessun dato trovato nel range ${range}`, 'googleSheetsApi');
      return [];
    }

    // Converte tutti i valori in stringhe
    return response.data.values.map(row => 
      row.map(cell => cell === null ? '' : String(cell))
    );
  } catch (error) {
    log(`Errore nella lettura del foglio: ${error}`, 'googleSheetsApi');
    throw error;
  }
}

/**
 * Aggiorna una cella o un range nel foglio Google Sheets utilizzando l'API autenticata OAuth2
 * 
 * @param spreadsheetId ID del foglio Google
 * @param range Range da aggiornare (es. 'Sheet1!A1' o 'Sheet1!A1:B2')
 * @param values Valori da inserire nel range
 * @returns True se l'aggiornamento è riuscito
 */
export async function updateCell(
  spreadsheetId: string, 
  range: string, 
  values: any[][]
): Promise<boolean> {
  if (!spreadsheetId) {
    throw new Error('spreadsheetId is required');
  }

  try {
    const sheets = await getSheetsApi();
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    return response.status === 200;
  } catch (error) {
    log(`Errore nell'aggiornamento del foglio: ${error}`, 'googleSheetsApi');
    throw error;
  }
}

/**
 * Aggiorna lo stato di una richiesta di manutenzione nel foglio Google Sheets
 * 
 * @param spreadsheetId ID del foglio Google
 * @param rowIndex Indice della riga da aggiornare (0-based)
 * @param status Nuovo stato della richiesta
 * @returns True se l'aggiornamento è riuscito
 */
export async function updateMaintenanceStatus(
  spreadsheetId: string,
  rowIndex: number,
  status: string
): Promise<boolean> {
  // Google Sheets è 1-indexed per le righe nelle ranges, ma nelle API il rowIndex è 0-based
  const range = `Risposte del modulo 1!A${rowIndex + 1}`;
  const values = [[status]];

  try {
    return await updateCell(spreadsheetId, range, values);
  } catch (error) {
    log(`Errore nell'aggiornamento dello stato di manutenzione: ${error}`, 'googleSheetsApi');
    throw error;
  }
}

/**
 * Ottiene informazioni sul foglio Google Sheets
 * 
 * @param spreadsheetId ID del foglio Google
 * @returns Informazioni sul foglio
 */
export async function getSheetInfo(spreadsheetId: string): Promise<any> {
  if (!spreadsheetId) {
    throw new Error('spreadsheetId is required');
  }

  try {
    const sheets = await getSheetsApi();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return response.data;
  } catch (error) {
    log(`Errore nell'ottenimento delle informazioni sul foglio: ${error}`, 'googleSheetsApi');
    throw error;
  }
}