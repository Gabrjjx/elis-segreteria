# Documentazione API - Sistema ELIS

## Panoramica
Il sistema ELIS fornisce API REST per la gestione di servizi di sartoria, pagamenti, manutenzione e amministrazione della residenza.

**Base URL**: `http://localhost:5000`

## Autenticazione
Alcune API richiedono autenticazione. Gli endpoint pubblici sono contrassegnati come `[PUBLIC]`.

---

## 📋 Servizi di Sartoria

### GET /api/services
Recupera tutti i servizi con filtri e paginazione.

**Parametri Query:**
```
sigla: string (opzionale) - Filtra per sigla studente
status: "paid" | "unpaid" | "all" (opzionale) - Filtra per stato pagamento
type: "siglatura" | "happy_hour" | "riparazione" | "all" (opzionale) - Filtra per tipo
startDate: string (YYYY-MM-DD) (opzionale) - Data inizio
endDate: string (YYYY-MM-DD) (opzionale) - Data fine
page: number (default: 1) - Numero pagina
limit: number (default: 10) - Elementi per pagina
```

**Risposta:**
```json
{
  "services": [
    {
      "id": 1,
      "date": "2025-06-10T00:00:00.000Z",
      "sigla": "127",
      "pieces": 2,
      "type": "siglatura",
      "amount": 1.0,
      "status": "unpaid",
      "notes": null,
      "payment_method": null,
      "cognome": "CALDERON"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### POST /api/services
Crea un nuovo servizio.

**Body:**
```json
{
  "sigla": "127",
  "pieces": 2,
  "type": "siglatura",
  "amount": 1.0,
  "date": "2025-06-10",
  "notes": "Note opzionali",
  "cognome": "CALDERON"
}
```

### PUT /api/services/:id
Aggiorna un servizio esistente.

### DELETE /api/services/:id
Elimina un servizio.

### GET /api/services/metrics
Recupera metriche dei servizi.

**Risposta:**
```json
{
  "totalServices": 45,
  "pendingPayments": 12,
  "siglaturaCount": 30,
  "happyHourCount": 10,
  "repairCount": 5,
  "totalAmount": 150.50,
  "pendingAmount": 45.00
}
```

---

## 💳 Pagamenti Segreteria

### POST /api/public/secretariat-payment `[PUBLIC]`
Crea un nuovo pagamento per servizi di segreteria.

**Body:**
```json
{
  "customerEmail": "studente@example.com",
  "customerName": "NOME COGNOME",
  "sigla": "127",
  "amount": 1.50
}
```

**Risposta:**
```json
{
  "success": true,
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "paymentIntentId": "pi_xxxxx",
  "paymentId": 1,
  "orderId": "SEC_127_1749550134698",
  "amount": 1.5,
  "message": "Secretariat service payment created. Ready for payment."
}
```

### GET /api/public/payment-status/:orderId `[PUBLIC]`
Verifica lo stato di un pagamento.

**Risposta:**
```json
{
  "orderId": "SEC_127_1749550134698",
  "status": "completed",
  "amount": 1.5,
  "currency": "EUR",
  "customerName": "NOME COGNOME",
  "customerEmail": "studente@example.com",
  "sigla": "127",
  "createdAt": "2025-06-10T10:08:54.720Z",
  "paymentDate": "2025-06-10T10:15:30.000Z"
}
```

### GET /api/public/pending-services/:sigla `[PUBLIC]`
Recupera servizi in sospeso per una sigla.

**Risposta:**
```json
{
  "services": [
    {
      "id": 44,
      "type": "siglatura",
      "amount": 1.5,
      "date": "2025-06-06T00:00:00.000Z",
      "pieces": 3,
      "status": "unpaid"
    }
  ],
  "totalAmount": 1.5,
  "count": 1,
  "studentName": "JOSE CALDERON"
}
```

### POST /api/stripe/webhook `[PUBLIC]`
Webhook Stripe per conferma pagamenti.

---

## 👥 Gestione Studenti

### GET /api/students
Recupera tutti gli studenti con filtri.

**Parametri Query:**
```
sigla: string (opzionale)
firstName: string (opzionale)
lastName: string (opzionale)
page: number (default: 1)
limit: number (default: 10)
```

### POST /api/students
Crea un nuovo studente.

**Body:**
```json
{
  "sigla": "127",
  "firstName": "Jose",
  "lastName": "Calderon"
}
```

### PUT /api/students/:id
Aggiorna un studente.

### DELETE /api/students/:id
Elimina un studente.

### POST /api/students/import
Importa studenti da CSV.

**Body:**
```json
{
  "csvData": "sigla,firstName,lastName\n127,Jose,Calderon\n128,Maria,Rossi"
}
```

---

## 🔧 Richieste di Manutenzione

### GET /api/maintenance-requests
Recupera richieste di manutenzione.

**Parametri Query:**
```
status: "pending" | "in_progress" | "completed" | "all"
priority: "low" | "medium" | "high" | "urgent" | "all"
room: string (opzionale)
startDate: string (opzionale)
endDate: string (opzionale)
page: number (default: 1)
limit: number (default: 10)
```

### POST /api/maintenance-requests
Crea nuova richiesta di manutenzione.

**Body:**
```json
{
  "studentName": "Jose Calderon",
  "room": "A101",
  "description": "Rubinetto che perde",
  "priority": "medium",
  "email": "jose@example.com",
  "phone": "+39123456789"
}
```

### POST /api/public/maintenance-request `[PUBLIC]`
Crea richiesta pubblica di manutenzione.

### GET /api/maintenance-requests/metrics
Recupera metriche delle richieste di manutenzione.

**Risposta:**
```json
{
  "totalRequests": 25,
  "pendingRequests": 8,
  "inProgressRequests": 5,
  "completedRequests": 12,
  "urgentRequests": 2
}
```

---

## 📄 Ricevute

### GET /api/receipts
Recupera tutte le ricevute.

### POST /api/receipts
Crea una nuova ricevuta.

**Body:**
```json
{
  "serviceId": 1,
  "amount": 1.5,
  "paymentMethod": "card",
  "receiptNumber": "REC_001",
  "receiptDate": "2025-06-10",
  "notes": "Pagamento servizi sartoria"
}
```

### GET /api/receipts/:id
Recupera ricevuta specifica.

### GET /api/receipts/service/:serviceId
Recupera ricevuta per servizio specifico.

---

## 🚴 Prenotazioni Bici (Legacy)

### GET /api/bike-reservations
Recupera prenotazioni bici.

### POST /api/bike-reservations
Crea prenotazione bici.

**Body:**
```json
{
  "orderId": "BIKE_127_1749550000000",
  "sigla": "127",
  "customerName": "Jose Calderon",
  "customerEmail": "jose@example.com",
  "amount": 2.50,
  "currency": "EUR",
  "status": "pending_payment"
}
```

---

## 💰 PayPal (Legacy)

### POST /api/paypal/create-order
Crea ordine PayPal.

### POST /api/paypal/capture/:orderId
Cattura pagamento PayPal.

### GET /api/paypal/orders
Recupera ordini PayPal.

---

## 🔍 Ricerca AI

### POST /api/search/semantic
Ricerca semantica nei contenuti.

**Body:**
```json
{
  "query": "riparazioni urgenti",
  "limit": 10
}
```

### POST /api/search/analyze
Analizza query di ricerca.

**Body:**
```json
{
  "query": "servizi non pagati questo mese"
}
```

---

## 🔐 Autenticazione Google

### GET /api/auth/google/url
Ottieni URL autorizzazione Google.

### POST /api/auth/google/token
Scambia codice con token.

### GET /api/auth/google/verify
Verifica token Google.

### POST /api/auth/google/device/start
Avvia flusso device Google.

### GET /api/auth/google/device/status/:deviceCode
Controlla stato device flow.

---

## 📊 Google Sheets

### GET /api/sheets/maintenance-requests
Sincronizza richieste manutenzione con Google Sheets.

### POST /api/sheets/maintenance-requests/import
Importa da Google Sheets.

---

## 📝 Codici di Stato HTTP

- `200` - Successo
- `201` - Creato
- `204` - Eliminato con successo
- `400` - Richiesta non valida
- `401` - Non autorizzato
- `404` - Non trovato
- `500` - Errore interno del server

## 🔧 Formati Data

- **Date**: YYYY-MM-DD (es. "2025-06-10")
- **DateTime**: ISO 8601 (es. "2025-06-10T10:08:54.720Z")
- **Timestamp**: Unix timestamp in millisecondi

## 💡 Note Importanti

1. **Paginazione**: Tutti gli endpoint che restituiscono liste supportano paginazione con `page` e `limit`
2. **Filtri**: I parametri di filtro sono opzionali e possono essere combinati
3. **Validazione**: Tutti i dati in input vengono validati con schema Zod
4. **Errori**: Gli errori restituiscono sempre un oggetto `{ message: string }` o `{ error: string }`
5. **CORS**: L'API supporta CORS per richieste da frontend
6. **Webhooks**: I webhook Stripe aggiornano automaticamente lo stato dei servizi