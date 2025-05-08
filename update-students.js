// Questo script aggiorna i dati degli studenti nel database

import fs from 'fs';
import path from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Imposta il costruttore WebSocket per neon
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Leggi il file CSV
function parseStudentData() {
  const csvData = fs.readFileSync(path.join(__dirname, 'student-data.csv'), 'utf-8');
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  return records;
}

// Funzione per verificare se la sigla esiste già
async function siglaExists(sigla, client) {
  const result = await client.query('SELECT id FROM students WHERE sigla = $1', [sigla]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Aggiorna o inserisci gli studenti
async function updateStudents() {
  const students = parseStudentData();
  const client = await pool.connect();
  
  try {
    // Inizia la transazione
    await client.query('BEGIN');
    
    console.log(`Processando ${students.length} studenti...`);
    
    let updated = 0;
    let inserted = 0;
    
    for (const student of students) {
      const { NOME, COGNOME, SIGLA } = student;
      
      // Verifica se la sigla esiste già
      const existingId = await siglaExists(SIGLA, client);
      
      if (existingId) {
        // Aggiorna lo studente esistente
        await client.query(
          'UPDATE students SET "firstName" = $1, "lastName" = $2 WHERE id = $3',
          [NOME, COGNOME, existingId]
        );
        updated++;
        console.log(`Aggiornato studente con sigla ${SIGLA}: ${NOME} ${COGNOME}`);
      } else {
        // Inserisci un nuovo studente
        await client.query(
          'INSERT INTO students ("sigla", "firstName", "lastName") VALUES ($1, $2, $3)',
          [SIGLA, NOME, COGNOME]
        );
        inserted++;
        console.log(`Inserito nuovo studente con sigla ${SIGLA}: ${NOME} ${COGNOME}`);
      }
    }
    
    // Commit della transazione
    await client.query('COMMIT');
    
    console.log(`Aggiornamento completato: ${updated} studenti aggiornati, ${inserted} studenti inseriti`);
  } catch (err) {
    // Rollback in caso di errore
    await client.query('ROLLBACK');
    console.error('Errore durante l\'aggiornamento degli studenti:', err);
  } finally {
    // Rilascia il client
    client.release();
  }
}

// Esegui l'aggiornamento
updateStudents().then(() => {
  console.log('Aggiornamento studenti completato');
  pool.end();
}).catch(err => {
  console.error('Errore:', err);
  pool.end();
});