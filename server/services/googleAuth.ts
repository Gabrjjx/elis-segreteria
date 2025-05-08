import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../vite';

// Configurazione OAuth2
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', // Accesso completo a tutti i fogli
];

// Token cache file
const TOKEN_PATH = '.google-token.json';

// Stato globale del token
let oAuth2Client: OAuth2Client | null = null;
let tokenData: any = null;

/**
 * Verifica se le credenziali OAuth2 sono configurate
 */
export function hasOAuth2Credentials(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Crea un client OAuth2 con le credenziali configurate
 */
export function createOAuth2Client(): OAuth2Client {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Credenziali OAuth2 mancanti. Configurare GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET');
  }

  // Utilizziamo l'approccio più semplice possibile senza redirect URI
  // Questo dovrebbe funzionare indipendentemente dalle impostazioni della console Google Cloud
  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  });

  oAuth2Client = client;
  return client;
}

/**
 * Verifica se esiste un token salvato e se è valido
 */
export function hasValidToken(): boolean {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return false;
    }

    const tokenString = fs.readFileSync(TOKEN_PATH, 'utf-8');
    const token = JSON.parse(tokenString);
    
    // Controlla se il token è scaduto (con un margine di sicurezza di 5 minuti)
    if (token.expiry_date && token.expiry_date > Date.now() + 5 * 60 * 1000) {
      tokenData = token;
      return true;
    }
    
    return false;
  } catch (error) {
    log(`Errore durante la verifica del token: ${error}`, 'googleAuth');
    return false;
  }
}

/**
 * Salva il token su file
 */
export function saveToken(token: any): void {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
  log('Token salvato con successo', 'googleAuth');
  tokenData = token;
}

// Struttura dati per il Device Flow
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

let deviceCodeInfo: DeviceCodeResponse | null = null;

/**
 * Avvia il Device Flow per l'autenticazione senza URI di reindirizzamento
 * Questa è una soluzione migliore per applicazioni che non hanno un browser integrato
 */
export async function startDeviceFlow(): Promise<DeviceCodeResponse> {
  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  try {
    // Usiamo la Google Auth Library per avviare il Device Flow
    const response = await oAuth2Client.getDeviceCode({
      scope: SCOPES
    });
    
    // Salviamo le informazioni del device code per poterle utilizzare dopo
    deviceCodeInfo = response.data as DeviceCodeResponse;
    log(`Device Flow avviato: ${JSON.stringify(deviceCodeInfo)}`, 'googleAuth');
    
    return deviceCodeInfo;
  } catch (error) {
    log(`Errore durante l'avvio del Device Flow: ${error}`, 'googleAuth');
    throw error;
  }
}

/**
 * Verifica lo stato del Device Flow e ottiene il token quando l'utente ha completato l'autorizzazione
 */
export async function checkDeviceFlowStatus(): Promise<{ status: 'pending' | 'complete' | 'error', tokens?: any, error?: string }> {
  if (!deviceCodeInfo) {
    return { status: 'error', error: 'Device Flow non avviato' };
  }

  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  try {
    // Verifica se l'utente ha completato l'autorizzazione
    const { tokens } = await oAuth2Client.getToken({
      deviceCode: deviceCodeInfo.device_code
    });
    
    // Se siamo qui, l'utente ha completato l'autorizzazione
    log(`Token ottenuto con successo tramite Device Flow: ${JSON.stringify(tokens).substring(0, 50)}...`, 'googleAuth');
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);
    
    // Puliamo lo stato del Device Flow
    deviceCodeInfo = null;
    
    return { status: 'complete', tokens };
  } catch (error: any) {
    // Se il codice non è ancora stato usato (l'utente non ha ancora autorizzato), 
    // Google restituisce un errore con il codice 'authorization_pending'
    if (error.message && error.message.includes('authorization_pending')) {
      return { status: 'pending' };
    }
    
    // Se c'è un altro errore, qualcosa è andato storto
    log(`Errore durante il controllo del Device Flow: ${error}`, 'googleAuth');
    return { status: 'error', error: error.message || 'Errore sconosciuto' };
  }
}

/**
 * Ottiene un URL di autorizzazione per il flusso OAuth2 (mantenuto per compatibilità)
 * Nota: questa funzione è deprecata e dovrebbe essere sostituita dall'utilizzo del Device Flow
 */
export function getAuthorizationUrl(): string {
  log('AVVISO: getAuthorizationUrl è deprecato. Si consiglia di utilizzare startDeviceFlow().', 'googleAuth');
  
  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', 
    scope: SCOPES,
    prompt: 'consent' // Forza il refresh token
  });
}

/**
 * Genera un token di accesso a partire da un codice di autorizzazione (mantenuto per compatibilità)
 * Nota: questa funzione è deprecata e dovrebbe essere sostituita dall'utilizzo del Device Flow
 */
export async function getTokenFromCode(code: string): Promise<any> {
  log('AVVISO: getTokenFromCode è deprecato. Si consiglia di utilizzare il Device Flow.', 'googleAuth');
  
  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  try {
    const { tokens } = await oAuth2Client.getToken({
      code
    });
    
    log(`Token ottenuto con successo: ${JSON.stringify(tokens).substring(0, 50)}...`, 'googleAuth');
    oAuth2Client.setCredentials(tokens);
    saveToken(tokens);
    return tokens;
  } catch (error) {
    log(`Errore durante lo scambio del codice: ${error}`, 'googleAuth');
    throw error;
  }
}

/**
 * Ottiene un client autenticato per Google API
 * Se non c'è un token valido, lancia un'eccezione
 */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  if (!hasOAuth2Credentials()) {
    throw new Error('Credenziali OAuth2 mancanti');
  }

  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  // Se abbiamo un token in memoria, lo usiamo
  if (tokenData) {
    oAuth2Client.setCredentials(tokenData);
    return oAuth2Client;
  }

  // Altrimenti controlliamo se esiste un token valido salvato
  if (hasValidToken()) {
    oAuth2Client.setCredentials(tokenData);
    return oAuth2Client;
  }

  // Se non abbiamo un token valido, lanciamo un'eccezione
  throw new Error('Token di accesso mancante o non valido. Eseguire l\'autorizzazione prima.');
}

/**
 * Verifica se il token è valido facendo una richiesta di test
 */
export async function verifyToken(): Promise<boolean> {
  try {
    if (!hasOAuth2Credentials() || !hasValidToken()) {
      return false;
    }

    const client = await getAuthenticatedClient();
    
    // Usiamo tokenInfo per verificare il token
    await client.getTokenInfo(
      client.credentials.access_token as string
    );
    
    return true;
  } catch (error) {
    log(`Token non valido: ${error}`, 'googleAuth');
    return false;
  }
}