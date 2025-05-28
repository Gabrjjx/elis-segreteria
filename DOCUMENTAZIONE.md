# Documentazione Sistema Gestione Sartoria ELIS

## Panoramica del Sistema

Il sistema di gestione della Sartoria ELIS è un'applicazione web completa per la gestione di servizi di sartoria, pagamenti e manutenzione residenziale. Il sistema è progettato per essere intuitivo e completo, con funzionalità avanzate per il tracciamento dei servizi e la generazione di report.

## Tecnologie Utilizzate

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Neon.tech)
- **Validazione**: Zod + Drizzle ORM
- **PDF Generation**: html2pdf.js
- **Pagamenti**: PayPal SDK
- **UI Components**: Shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query

## Struttura del Progetto

```
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componenti riutilizzabili
│   │   ├── pages/             # Pagine dell'applicazione
│   │   ├── lib/               # Utility e configurazioni
│   │   └── hooks/             # Custom hooks
├── server/                     # Backend Express
│   ├── services/              # Servizi business logic
│   ├── db.ts                  # Configurazione database
│   ├── routes.ts              # API endpoints
│   └── storage.ts             # Logica database
├── shared/                     # Codice condiviso
│   └── schema.ts              # Schema database e validazione
└── migrations/                # Migrazioni database
```

## Funzionalità Principali

### 1. Gestione Servizi
- **Siglatura**: Marcatura e personalizzazione capi
- **Happy Hour**: Servizi speciali a tariffa ridotta
- **Riparazione**: Riparazioni e aggiustamenti

### 2. Gestione Studenti
- Database completo degli studenti
- Associazione servizi-studenti tramite sigla
- Import/export dati studenti

### 3. Sistema Pagamenti
- Integrazione PayPal per pagamenti online
- Tracciamento stato pagamenti (pagato/non pagato)
- Metodi di pagamento multipli (contanti, PayPal, carta, bonifico)

### 4. Generazione Ricevute
- Ricevute PDF automatiche per ogni servizio
- Template professionale con dati completi
- Download e stampa delle ricevute

### 5. Manutenzione Residenziale
- Sistema separato per richieste di manutenzione
- Gestione priorità e stati
- Integrazione Google Sheets per importazione dati

### 6. Dashboard e Reporting
- Metriche in tempo reale
- Esportazione report completi in PDF
- Filtri per data e tipologia servizi

## API Endpoints

### Servizi
```
GET    /api/services              # Lista servizi con filtri
GET    /api/services/:id          # Dettaglio servizio
POST   /api/services              # Crea nuovo servizio
PUT    /api/services/:id          # Aggiorna servizio
DELETE /api/services/:id          # Elimina servizio
PATCH  /api/services/:id/mark-paid # Marca come pagato
GET    /api/services/:id/receipt  # Genera ricevuta PDF
```

### Studenti
```
GET    /api/students              # Lista studenti
GET    /api/students/:id          # Dettaglio studente
GET    /api/students/by-sigla/:sigla # Cerca per sigla
POST   /api/students              # Crea studente
PUT    /api/students/:id          # Aggiorna studente
DELETE /api/students/:id          # Elimina studente
POST   /api/students/import       # Import CSV
```

### Dashboard
```
GET    /api/dashboard/metrics            # Metriche generali
GET    /api/dashboard/pending-payments   # Pagamenti pendenti
GET    /api/dashboard/recent-services    # Servizi recenti
```

### Manutenzione
```
GET    /api/maintenance              # Lista richieste manutenzione
GET    /api/maintenance/:id          # Dettaglio richiesta
POST   /api/maintenance              # Crea richiesta
PUT    /api/maintenance/:id          # Aggiorna richiesta
DELETE /api/maintenance/:id          # Elimina richiesta
POST   /api/maintenance/import       # Import CSV
PATCH  /api/maintenance/:id/status   # Aggiorna stato
PATCH  /api/maintenance/:id/priority # Aggiorna priorità
```

### PayPal
```
POST   /api/paypal/create-order      # Crea ordine PayPal
POST   /api/paypal/capture/:orderId  # Cattura pagamento
GET    /api/paypal/check-status/:orderId # Verifica stato
```

### Ricevute
```
GET    /api/receipts              # Lista ricevute
GET    /api/receipts/:id          # Dettaglio ricevuta
```

## Schema Database

### Tabella `services`
- `id`: ID univoco servizio
- `date`: Data servizio
- `sigla`: Sigla studente
- `pieces`: Numero pezzi
- `type`: Tipologia (siglatura/happy_hour/riparazione)
- `amount`: Importo
- `status`: Stato pagamento (paid/unpaid)
- `paymentMethod`: Metodo pagamento
- `notes`: Note aggiuntive

### Tabella `students`
- `id`: ID univoco studente
- `sigla`: Sigla identificativa
- `firstName`: Nome
- `lastName`: Cognome
- `email`: Email (opzionale)
- `phone`: Telefono (opzionale)

### Tabella `maintenanceRequests`
- `id`: ID univoco richiesta
- `title`: Titolo richiesta
- `description`: Descrizione dettagliata
- `priority`: Priorità (low/medium/high/urgent)
- `status`: Stato (pending/in_progress/completed)
- `location`: Ubicazione
- `requestedBy`: Richiedente
- `createdAt`: Data creazione

### Tabella `receipts`
- `id`: ID univoco ricevuta
- `serviceId`: Riferimento al servizio
- `receiptNumber`: Numero ricevuta
- `studentName`: Nome studente
- `studentSigla`: Sigla studente
- `amount`: Importo
- `createdAt`: Data generazione

### Tabella `paypalOrders`
- `id`: ID univoco ordine
- `orderId`: ID ordine PayPal
- `status`: Stato ordine
- `amount`: Importo
- `currency`: Valuta
- `serviceId`: Riferimento al servizio

## Configurazione Ambiente

### Variabili d'Ambiente Richieste
```
DATABASE_URL=postgresql://user:password@host:port/database
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
GOOGLE_SHEETS_API_KEY=your_google_api_key (opzionale)
```

### Setup Database
1. Il database si inizializza automaticamente al primo avvio
2. Le tabelle vengono create usando Drizzle ORM
3. Dati di esempio vengono caricati se il database è vuoto

## Guida Utilizzo

### Dashboard
- **Metriche principali**: Visualizza statistiche immediate
- **Filtri per data**: Seleziona periodo di interesse
- **Servizi recenti**: Lista ultimi servizi registrati
- **Export PDF**: Genera report completo di tutti i servizi

### Gestione Servizi
1. **Nuovo Servizio**: Compila form con dati servizio
2. **Pagamento**: Scegli metodo (contanti/PayPal/altro)
3. **Ricevuta**: Genera automaticamente PDF
4. **Stato**: Traccia se pagato o pendente

### Gestione Studenti
1. **Import CSV**: Carica file con dati studenti
2. **Ricerca**: Trova per sigla o nome
3. **Modifica**: Aggiorna informazioni studente

### Manutenzione
1. **Nuova Richiesta**: Descrivi problema e priorità
2. **Stato**: Monitora avanzamento lavori
3. **Import**: Carica richieste da Google Sheets

## Sicurezza

- Validazione input con Zod
- Gestione errori centralizzata
- Configurazione CORS appropriata
- Sanitizzazione dati database

## Performance

- Connection pooling database (max 5 connessioni)
- Query ottimizzate con indici
- Caching lato client con TanStack Query
- Paginazione per liste lunghe

## Manutenzione

### Backup Database
- Backup automatici gestiti da Neon.tech
- Export manuale disponibile via dashboard

### Monitoraggio
- Log strutturati per debugging
- Metriche performance via console
- Error tracking centralizzato

### Aggiornamenti
- Deploy automatico via Replit
- Migrazioni database gestite da Drizzle
- Rollback disponibile tramite git

## Supporto

Per assistenza tecnica o domande:
1. Verifica questa documentazione
2. Controlla i log nell'interfaccia di sviluppo
3. Utilizza la funzione di debug integrata

## Note Tecniche

- Il sistema è ottimizzato per browser moderni
- PDF generati sono compatibili con Adobe Acrobat
- Responsive design per mobile e tablet
- Supporto offline limitato (cache browser)