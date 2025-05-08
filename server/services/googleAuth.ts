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

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // Per applicazioni desktop o CLI
  );

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

/**
 * Ottiene un URL di autorizzazione per il flusso OAuth2
 */
export function getAuthorizationUrl(): string {
  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Forza il refresh token
  });
}

/**
 * Genera un token di accesso a partire da un codice di autorizzazione
 */
export async function getTokenFromCode(code: string): Promise<any> {
  if (!oAuth2Client) {
    createOAuth2Client();
  }
  
  if (!oAuth2Client) {
    throw new Error('Impossibile creare il client OAuth2');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
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