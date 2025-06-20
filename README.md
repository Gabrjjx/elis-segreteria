# Sistema Gestione Sartoria ELIS

Sistema completo di amministrazione per la Residenza ELIS con gestione servizi, pagamenti e reportistica automatica.

## Funzionalità Principali

- **Gestione Servizi**: Siglatura, riparazioni, happy hour
- **Pagamenti Integrati**: Stripe e Satispay con QR code autentici
- **Dashboard Amministrativa**: Metriche e statistiche in tempo reale
- **Reportistica PDF**: Generazione automatica giornaliera alle 23:00
- **Sistema Manutenzioni**: Gestione richieste e priorità
- **Integrazione Google Sheets**: Sincronizzazione automatica dati
- **AI Assistant**: Ricerca intelligente e analisi query

## Tecnologie

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon.tech)
- **Pagamenti**: Stripe, Satispay API
- **PDF**: jsPDF, Puppeteer
- **Email**: SendGrid
- **Deployment**: Replit, GitHub

## Setup Sviluppo

### 1. Installazione Dipendenze
```bash
npm install
```

### 2. Configurazione Database
```bash
npm run db:push
```

### 3. Configurazione Variabili Ambiente
Copia `.env.example` in `.env` e configura:

```env
# Database PostgreSQL
DATABASE_URL=your_neon_database_url

# Pagamenti
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...
SATISPAY_KEY_ID=your_key_id
SATISPAY_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Email
SENDGRID_API_KEY=SG...

# OpenAI
OPENAI_API_KEY=sk-proj-...
```

### 4. Avvio Sviluppo
```bash
npm run dev
```

### 5. Build Produzione
```bash
npm run build
npm start
```

## Struttura Progetto

```
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componenti UI
│   │   ├── pages/        # Pagine applicazione
│   │   └── lib/          # Utilities e configurazioni
├── server/               # Backend Express
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   ├── satispay.ts       # Integrazione Satispay
│   └── services/         # Servizi background
├── shared/               # Codice condiviso
│   └── schema.ts         # Schema database Drizzle
└── reports/              # PDF generati automaticamente
```

## Configurazione WebStorm

1. Apri il progetto in WebStorm
2. Configura Node.js interpreter (v18+)
3. Installa plugin TypeScript e Tailwind CSS
4. Configura run configuration:
   - **Name**: Dev Server
   - **Script**: dev
   - **Environment**: NODE_ENV=development

## Deployment

### GitHub
1. Inizializza repository:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### Produzione
1. Configura variabili ambiente produzione
2. Imposta `NODE_ENV=production`
3. Esegui build e deploy

## API Endpoints Principali

- `GET /api/services` - Lista servizi
- `POST /api/services` - Crea nuovo servizio
- `GET /api/dashboard/metrics` - Metriche dashboard
- `POST /api/public/satispay-payment` - Pagamento Satispay
- `POST /api/paypal/create-order` - Pagamento PayPal
- `GET /api/reports/list` - Lista report generati

## Pagamenti Satispay

Il sistema utilizza autenticazione RSA-SHA256 con credenziali autentiche:
- KeyId di produzione configurato
- Chiavi private RSA per firma digitale
- Gestione automatica ambiente staging/produzione
- Fallback intelligente durante attivazione credenziali

## Supporto

Per assistenza tecnica o configurazione:
- Verifica log applicazione in `/logs`
- Controlla status servizi esterni
- Valida configurazione variabili ambiente