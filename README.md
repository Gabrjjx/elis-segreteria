# Sistema Gestione Sartoria ELIS

Sistema completo per la gestione di servizi di sartoria, pagamenti e manutenzione residenziale.

## Setup per WebStorm

### Prerequisiti
- Node.js 18+ 
- PostgreSQL database (consigliato Neon.tech)
- Account PayPal Developer (opzionale)

### 1. Clona e Installa Dipendenze
```bash
git clone <repository-url>
cd sartoria-elis
npm install
```

### 2. Configurazione Environment
Crea file `.env` nella root del progetto:
```env
# Database (RICHIESTO)
DATABASE_URL=postgresql://username:password@host:port/database

# PayPal (Opzionale - per pagamenti online)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Google Sheets (Opzionale - per import manutenzione)
GOOGLE_SHEETS_API_KEY=your_google_api_key
```

### 3. Setup Database
```bash
# Crea le tabelle
npm run db:push

# Il database si popolerà automaticamente con dati di esempio al primo avvio
```

### 4. Avvio Sviluppo
```bash
npm run dev
```
L'applicazione sarà disponibile su `http://localhost:5000`

### 5. Configurazione WebStorm

#### Interpreti e SDK
1. **File → Settings → Languages & Frameworks → Node.js**
   - Imposta Node.js interpreter
   - Abilita "Coding assistance for Node.js"

2. **File → Settings → Languages & Frameworks → TypeScript**
   - Imposta TypeScript service: "Use TypeScript service"
   - Imposta versione: "Bundled"

#### Run Configurations
Crea nuova configurazione:
- **Type**: npm
- **Package.json**: `package.json` nella root
- **Command**: `run`
- **Scripts**: `dev`
- **Environment variables**: Aggiungi variabili da `.env`

#### Database Integration
1. **Database Tool Window → + → Data Source → PostgreSQL**
2. Inserisci credenziali dal tuo `DATABASE_URL`
3. Test connessione e applica

#### Debugging
1. **Run → Edit Configurations → + → Node.js**
2. **JavaScript file**: `server/index.ts`
3. **Application parameters**: Lascia vuoto
4. **Environment variables**: Importa da `.env`

## Struttura Progetto

```
├── client/                 # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/     # Componenti UI
│   │   ├── pages/         # Pagine applicazione
│   │   ├── lib/           # Utility e configurazioni
│   │   └── hooks/         # Custom hooks React
├── server/                # Backend Express + TypeScript
│   ├── services/          # Business logic
│   ├── db.ts             # Configurazione database
│   ├── routes.ts         # API endpoints
│   └── storage.ts        # Operazioni database
├── shared/               # Codice condiviso
│   └── schema.ts         # Schema Drizzle + validazione Zod
└── migrations/           # Migrazioni database
```

## Scripts Disponibili

```bash
npm run dev          # Sviluppo (frontend + backend)
npm run build        # Build produzione
npm run preview      # Preview build produzione
npm run db:push      # Applica schema al database
npm run db:studio    # Interfaccia visuale database (Drizzle Studio)
npm run type-check   # Controllo tipi TypeScript
```

## Tecnologie Principali

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Drizzle ORM
- **UI**: Shadcn/ui, Radix UI
- **Validation**: Zod
- **State Management**: TanStack Query
- **PDF Generation**: html2pdf.js
- **Payments**: PayPal SDK

## Features Implementate

### ✅ Gestione Servizi
- Creazione/modifica/eliminazione servizi
- Tipologie: Siglatura, Happy Hour, Riparazione
- Tracciamento stato pagamenti
- Generazione ricevute PDF

### ✅ Sistema Pagamenti
- Integrazione PayPal
- Metodi multipli (contanti, carta, bonifico)
- Tracciamento ordini e stati

### ✅ Gestione Studenti
- Database studenti completo
- Import/export CSV
- Associazione automatica servizi-studenti

### ✅ Dashboard & Reporting
- Metriche in tempo reale
- Filtri per data e tipologia
- Export PDF report completi

### ✅ Manutenzione Residenziale
- Sistema richieste manutenzione
- Gestione priorità e stati
- Integrazione Google Sheets

## API Endpoints

### Servizi
- `GET /api/services` - Lista servizi
- `POST /api/services` - Crea servizio
- `PUT /api/services/:id` - Aggiorna servizio
- `DELETE /api/services/:id` - Elimina servizio
- `PATCH /api/services/:id/mark-paid` - Marca come pagato

### Studenti  
- `GET /api/students` - Lista studenti
- `GET /api/students/by-sigla/:sigla` - Cerca per sigla
- `POST /api/students/import` - Import CSV

### Dashboard
- `GET /api/dashboard/metrics` - Metriche generali
- `GET /api/dashboard/recent-services` - Servizi recenti

### PayPal
- `POST /api/paypal/create-order` - Crea ordine
- `POST /api/paypal/capture/:orderId` - Cattura pagamento

### Manutenzione
- `GET /api/maintenance` - Lista richieste
- `POST /api/maintenance` - Crea richiesta
- `PATCH /api/maintenance/:id/status` - Aggiorna stato

## Troubleshooting

### Database Connection Issues
1. Verifica `DATABASE_URL` in `.env`
2. Controlla che il database sia accessibile
3. Esegui `npm run db:push` per creare le tabelle

### PayPal Integration
1. Verifica credenziali in PayPal Developer Dashboard
2. Controlla `PAYPAL_CLIENT_ID` e `PAYPAL_CLIENT_SECRET`
3. Usa sandbox per testing

### Build Issues
1. Esegui `npm run type-check` per errori TypeScript
2. Controlla compatibilità versioni Node.js
3. Pulisci cache: `rm -rf node_modules package-lock.json && npm install`

## Deployment

Il progetto è configurato per deploy su:
- **Replit** (configurazione già presente)
- **Vercel** (frontend + serverless functions)
- **Railway/Render** (full-stack)

### Environment Variables di Produzione
- `NODE_ENV=production`
- `DATABASE_URL` (PostgreSQL production)
- `PAYPAL_CLIENT_ID` (PayPal live credentials)
- `PAYPAL_CLIENT_SECRET` (PayPal live credentials)

## Contribuire

1. Crea branch per nuove feature
2. Segui convenzioni TypeScript
3. Testa tutte le funzionalità prima del commit
4. Aggiorna documentazione se necessario

## Supporto

Per domande tecniche:
1. Consulta la documentazione in `DOCUMENTAZIONE.md`
2. Verifica i log di sviluppo
3. Controlla issues note in questo README