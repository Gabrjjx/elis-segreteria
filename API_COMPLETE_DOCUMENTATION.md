# API Completa - Sistema Gestione Sartoria ELIS

## Panoramica API

Il sistema ELIS fornisce un'API REST completa per la gestione di servizi di sartoria, richieste di manutenzione, studenti e pagamenti. Tutte le API sono esposte tramite HTTP e restituiscono dati in formato JSON.

**Base URL**: `http://localhost:5000` (development) 

## Autenticazione

La maggior parte degli endpoint amministrativi non richiede autenticazione. Gli endpoint pubblici sono contrassegnati con `/public/` nel percorso.

---

## 📊 Dashboard & Metriche

### GET `/api/dashboard/metrics`
Ottiene le metriche principali del dashboard
```javascript
// Response
{
  "totalServices": 150,
  "totalAmount": 2500.00,
  "pendingPayments": 25,
  "siglaturaCount": 80,
  "repairCount": 45,
  "happyHourCount": 25
}
```

### GET `/api/dashboard/enhanced-metrics`
Ottiene metriche avanzate con confronti periodici
**Query Parameters:**
- `period`: string (week|month|quarter|year)

```javascript
// Response
{
  "totalServices": 150,
  "weeklyServices": 12,
  "monthlyServices": 45,
  "totalRevenue": 2500.00,
  "servicesByType": {
    "siglatura": 80,
    "riparazione": 45,
    "happy_hour": 25
  },
  "maintenanceStats": {
    "total": 34,
    "pending": 12,
    "inProgress": 8,
    "completed": 14
  },
  "trendData": {
    "servicesGrowth": 15.2,
    "revenueGrowth": 8.7
  }
}
```

### GET `/api/dashboard/pending-payments`
Ottiene lista pagamenti pendenti
**Query Parameters:**
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)

### GET `/api/dashboard/recent-services`
Ottiene servizi recenti
**Query Parameters:**
- `limit`: number (default: 5)
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)

### GET `/api/historical-data`
Ottiene dati storici annuali
**Query Parameters:**
- `year`: string (default: current year)
- `search`: string
- `serviceType`: string (siglatura|riparazione|happy_hour|all)
- `status`: string (paid|unpaid|all)

---

## 🧵 Servizi di Sartoria

### GET `/api/services`
Ottiene tutti i servizi con filtri e paginazione
**Query Parameters:**
- `query`: string (ricerca testuale)
- `type`: string (siglatura|riparazione|happy_hour)
- `status`: string (paid|unpaid)
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)
- `page`: number (default: 1)
- `limit`: number (default: 10)

```javascript
// Response
{
  "services": [
    {
      "id": 1,
      "sigla": "T01",
      "studentName": "Mario Rossi",
      "type": "siglatura",
      "description": "Ricamo nome su giacca",
      "amount": 15.00,
      "status": "paid",
      "date": "2025-08-27T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 15
}
```

### GET `/api/services/:id`
Ottiene un servizio specifico per ID

### POST `/api/services`
Crea un nuovo servizio
```javascript
// Request body
{
  "sigla": "T01",
  "studentName": "Mario Rossi",
  "type": "siglatura",
  "description": "Ricamo nome su giacca",
  "amount": 15.00,
  "status": "unpaid",
  "date": "2025-08-27"
}
```

### PUT `/api/services/:id`
Aggiorna un servizio esistente
```javascript
// Request body (campi parziali)
{
  "status": "paid",
  "amount": 20.00
}
```

### DELETE `/api/services/:id`
Elimina un servizio

### PATCH `/api/services/:id/mark-paid`
Marca un servizio come pagato

---

## 🔧 Richieste di Manutenzione

### GET `/api/maintenance`
Ottiene tutte le richieste di manutenzione
**Query Parameters:**
- `query`: string
- `status`: string (pending|in_progress|completed)
- `priority`: string (low|medium|high|urgent)
- `startDate`: string (YYYY-MM-DD)
- `endDate`: string (YYYY-MM-DD)
- `page`: number
- `limit`: number

### GET `/api/maintenance/:id`
Ottiene una richiesta specifica

### POST `/api/maintenance`
Crea nuova richiesta di manutenzione
```javascript
// Request body
{
  "requesterName": "Mario Rossi",
  "requesterEmail": "mario@example.com",
  "roomNumber": "101",
  "requestType": "Riparazione",
  "description": "Rubinetto gocciola",
  "location": "Bagno",
  "priority": "medium",
  "notes": "Urgente per ospiti"
}
```

### PUT `/api/maintenance/:id`
Aggiorna richiesta di manutenzione

### DELETE `/api/maintenance/:id`
Elimina richiesta di manutenzione

### PATCH `/api/maintenance/:id/status`
Cambia stato di una richiesta
```javascript
// Request body
{
  "status": "completed"
}
```

### PATCH `/api/maintenance/:id/priority`
Cambia priorità di una richiesta
```javascript
// Request body
{
  "priority": "urgent"
}
```

### GET `/api/maintenance/dashboard/metrics`
Metriche dashboard manutenzione

### GET `/api/maintenance/dashboard/pending`
Richieste pendenti

### GET `/api/maintenance/dashboard/recent`
Richieste recenti

### POST `/api/maintenance/import`
Importa richieste da CSV
```javascript
// Request body
{
  "csvData": "nome,email,stanza,tipo,descrizione\nMario,mario@test.com,101,Riparazione,Rubinetto"
}
```

---

## 🎓 Gestione Studenti

### GET `/api/students`
Ottiene tutti gli studenti
**Query Parameters:**
- `sigla`: string
- `firstName`: string
- `lastName`: string
- `page`: number
- `limit`: number

### GET `/api/students/:id`
Ottiene studente per ID

### GET `/api/students/by-sigla/:sigla`
Ottiene studente per sigla

### POST `/api/students`
Crea nuovo studente
```javascript
// Request body
{
  "sigla": "T01",
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario.rossi@elis.org",
  "roomNumber": "101",
  "course": "Informatica"
}
```

### PUT `/api/students/:id`
Aggiorna studente

### DELETE `/api/students/:id`
Elimina studente

### POST `/api/students/import`
Importa studenti da CSV
```javascript
// Request body
{
  "csvData": "sigla,nome,cognome,email,stanza,corso\nT01,Mario,Rossi,mario@test.com,101,Informatica"
}
```

---

## 💳 Sistema Pagamenti

### Stripe

#### POST `/api/create-payment-intent`
Crea un payment intent Stripe
```javascript
// Request body
{
  "amount": 25.50
}

// Response
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

#### POST `/api/stripe/create-bike-payment`
Crea pagamento per servizio bici (2.50 EUR)

#### POST `/api/stripe/webhook`
Webhook per eventi Stripe

#### GET `/api/stripe/verify/:orderId`
Verifica stato pagamento Stripe

### Satispay

#### POST `/api/public/satispay-payment`
Crea pagamento Satispay
```javascript
// Request body
{
  "sigla": "T01",
  "amount": 25.50,
  "description": "Pagamento servizi sartoria"
}

// Response
{
  "paymentId": "sat_xxx",
  "qrCode": "data:image/png;base64,xxx",
  "status": "pending"
}
```

#### GET `/api/public/satispay-status/:paymentId`
Verifica stato pagamento Satispay

#### GET `/api/satispay/test-auth`
Test autenticazione Satispay

#### POST `/api/satispay/webhook`
Webhook Satispay

### Revolut

#### POST `/api/public/revolut-payment`
Crea pagamento Revolut (in sviluppo)

#### GET `/api/public/revolut-status/:paymentId`
Verifica stato Revolut

#### POST `/api/revolut/webhook`
Webhook Revolut

### SumUp

#### POST `/api/public/sumup-payment`
Crea pagamento SumUp (in sviluppo)

#### GET `/api/public/sumup-status/:paymentId`
Verifica stato SumUp

#### POST `/api/sumup/webhook`
Webhook SumUp

---

## 🌐 Endpoint Pubblici

### GET `/api/public/services/pending/:sigla`
Ottiene servizi pendenti per una sigla
```javascript
// Response
{
  "student": {
    "sigla": "T01",
    "firstName": "Mario",
    "lastName": "Rossi"
  },
  "pendingServices": [
    {
      "id": 1,
      "type": "siglatura",
      "description": "Ricamo nome",
      "amount": 15.00,
      "status": "unpaid"
    }
  ],
  "totalAmount": 15.00,
  "servicesCount": 1
}
```

### POST `/api/public/maintenance`
Richiesta manutenzione pubblica da studenti
```javascript
// Request body
{
  "sigla": "T01",
  "place": "Stanza 101",
  "specificLocation": "Bagno",
  "defectDetails": "Rubinetto gocciola",
  "priority": 3,
  "canBeSolvedByMaintainers": true,
  "possibleSolution": "Sostituire guarnizione"
}
```

### POST `/api/public/secretariat-payment`
Pagamento segreteria pubblico

### GET `/api/public/payment-status/:orderId`
Verifica stato pagamento generico

---

## 🔗 Google Sheets Integration

### GET `/api/google/auth/status`
Verifica stato autenticazione Google OAuth2
```javascript
// Response
{
  "hasCredentials": true,
  "hasValidToken": false
}
```

### GET `/api/google/auth/url`
Ottiene URL autorizzazione OAuth2

### POST `/api/google/auth/device`
Avvia Device Flow OAuth2
```javascript
// Response
{
  "user_code": "ABCD-EFGH",
  "verification_url": "https://www.google.com/device",
  "expires_in": 1800,
  "interval": 5
}
```

### GET `/api/google/auth/device/status`
Verifica stato Device Flow

### POST `/api/google/auth/token`
Scambia codice autorizzazione con token
```javascript
// Request body
{
  "code": "authorization_code_from_google"
}
```

### POST `/api/maintenance/sync-google-sheets`
Sincronizza richieste manutenzione con Google Sheets

### POST `/api/maintenance/sync-status-to-sheets`
Sincronizza stati completati con Google Sheets

---

## 📊 Report e Analytics

### POST `/api/reports/generate`
Genera report giornaliero
```javascript
// Request body
{
  "date": "2025-08-27"  // Optional, default: today
}

// Response
{
  "success": true,
  "filePath": "/reports/report_2025-08-27.pdf",
  "message": "Report generato con successo"
}
```

### GET `/api/reports/list`
Lista report disponibili

---

## 📝 Ricerca Semantica AI

### POST `/api/search/semantic`
Ricerca semantica nei dati
```javascript
// Request body
{
  "query": "trova servizi di riparazione costosi",
  "filters": {
    "type": "riparazione",
    "minAmount": 20
  }
}
```

### POST `/api/search/analyze`
Analisi query di ricerca con AI

---

## ⚙️ Codici di Stato HTTP

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request (errore validazione)
- `404` - Not Found
- `500` - Internal Server Error

## 🔄 Formati Data

Tutte le date devono essere in formato ISO 8601: `YYYY-MM-DDTHH:mm:ssZ`

## 💡 Note Implementative

1. **Validazione**: Tutti gli endpoint utilizzano validazione Zod per i dati in input
2. **Paginazione**: Endpoints con paginazione restituiscono `page`, `limit`, `total`, `totalPages`
3. **Filtri**: La maggior parte degli endpoint supporta filtri via query parameters
4. **Errori**: Errori di validazione includono dettagli specifici sui campi
5. **Webhook**: Implementati per tutti i gateway di pagamento
6. **Logging**: Tutte le operazioni sono loggate per debug e monitoring

## 🔐 Variabili Ambiente Richieste

```bash
# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
VITE_STRIPE_PUBLIC_KEY=pk_...

# Satispay
SATISPAY_ACTIVATION_CODE=...
SATISPAY_KEY_ID=...
SATISPAY_PRIVATE_KEY=...

# Google Services
GOOGLE_API_KEY=...
GOOGLE_SHEET_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# SendGrid
SENDGRID_API_KEY=...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...

# SumUp
SUMUP_API_KEY=...
SUMUP_CLIENT_ID=...
SUMUP_CLIENT_SECRET=...
```

---

## 📞 Supporto

Per domande o problemi con l'API, consultare la documentazione tecnica o contattare il team di sviluppo.

**©GabrieleIngrosso - ElisCollege 2025**