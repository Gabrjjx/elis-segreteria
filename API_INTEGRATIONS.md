# API Payment Integrations Guide

## Overview
Questo documento descrive le integrazioni dei metodi di pagamento implementati nel sistema ELIS.

## Metodi di Pagamento Attivi

### 1. Stripe (✅ COMPLETAMENTE INTEGRATO)
- **Status**: Produzione
- **File**: `server/stripe.ts`
- **Endpoint**: `/api/public/secretariat-payment`
- **Webhook**: Configurato automaticamente
- **Funzionalità**:
  - Creazione PaymentIntent
  - Aggiornamento automatico database post-pagamento
  - Gestione successo/errore

### 2. Satispay (✅ COMPLETAMENTE INTEGRATO)
- **Status**: Produzione
- **File**: `server/satispay.ts`
- **Endpoints**:
  - Creazione: `/api/public/satispay-payment`
  - Verifica: `/api/public/satispay-status/:paymentId`
  - Webhook: `/api/satispay/webhook`
- **Funzionalità**:
  - Autenticazione con signature digitale
  - QR code generation
  - Polling automatico per verifica stato

## Metodi di Pagamento in Sviluppo

### 3. Revolut (🚧 FRAMEWORK PRONTO)
- **Status**: Mock implementation attiva
- **File**: `server/revolut.ts`
- **Endpoints**:
  - Creazione: `/api/public/revolut-payment`
  - Verifica: `/api/public/revolut-status/:paymentId`
  - Webhook: `/api/revolut/webhook`

#### TODO per implementazione reale Revolut:
1. **Registrazione Merchant Account**:
   - Creare account business su Revolut Business
   - Ottenere API credentials (API Key, Webhook Secret)
   
2. **API Integration**:
   - Sostituire mock con chiamate reali a Revolut Merchant API
   - Implementare gestione token di autenticazione
   - Configurare webhook endpoint per notifiche di pagamento

3. **Environment Variables richieste**:
   ```
   REVOLUT_API_KEY=your_api_key_here
   REVOLUT_WEBHOOK_SECRET=your_webhook_secret_here
   REVOLUT_ENVIRONMENT=sandbox|production
   ```

4. **Documentazione API**:
   - [Revolut Business API Documentation](https://developer.revolut.com/docs/business-api/)

### 4. SumUp (🚧 FRAMEWORK PRONTO)
- **Status**: Mock implementation attiva
- **File**: `server/sumup.ts`
- **Endpoints**:
  - Creazione: `/api/public/sumup-payment`
  - Verifica: `/api/public/sumup-status/:paymentId`
  - Webhook: `/api/sumup/webhook`

#### TODO per implementazione reale SumUp:
1. **Registrazione Merchant Account**:
   - Creare account business su SumUp
   - Ottenere API credentials (Client ID, Client Secret, API Key)
   
2. **API Integration**:
   - Sostituire mock con chiamate reali a SumUp API
   - Implementare OAuth2 flow per autenticazione
   - Configurare checkout flow con redirect URL

3. **Environment Variables richieste**:
   ```
   SUMUP_API_KEY=your_api_key_here
   SUMUP_CLIENT_ID=your_client_id_here
   SUMUP_CLIENT_SECRET=your_client_secret_here
   SUMUP_ENVIRONMENT=sandbox|production
   ```

4. **Documentazione API**:
   - [SumUp REST API Documentation](https://developer.sumup.com/docs/)

5. **URL di Redirect**:
   - Per l'app in produzione: `https://your-replit-domain.replit.app/payment-success`
   - Per sviluppo locale: `http://localhost:5000/payment-success`

## Architettura Frontend

### Interfaccia Utente
- **File**: `client/src/pages/SecretariatPayment.tsx`
- **Tipologie supportate**: `stripe | satispay | revolut | sumup`
- **Step del processo**:
  1. Input dati studente (sigla, nome, email)
  2. Visualizzazione servizi da pagare
  3. Selezione metodo di pagamento (4 opzioni)
  4. Processo di pagamento specifico
  5. Pagina di successo con riepilogo

### Stati Payment Flow
```typescript
type PaymentMethod = 'stripe' | 'satispay' | 'revolut' | 'sumup';

interface PaymentState {
  step: 'input' | 'services' | 'method-selection' | 
        'stripe-payment' | 'satispay-payment' | 
        'revolut-payment' | 'sumup-payment' | 
        'processing' | 'success' | 'error';
  // ... altri campi
}
```

## Database Schema

### Tabella Services
- Campo `paymentMethod`: Salva il metodo utilizzato per il pagamento
- Valori supportati: `stripe`, `satispay`, `revolut`, `sumup`

## Testing

### Mock Implementations
I metodi Revolut e SumUp attualmente utilizzano implementazioni mock che:
- Generano ID di pagamento fittizi
- Simulano successo immediato
- Permettono test dell'interfaccia utente
- Aggiornano correttamente il database

### Passaggio a Produzione
Per attivare le integrazioni reali:
1. Configurare le credenziali API nei secrets di Replit
2. Sostituire i mock con le chiamate API reali nei rispettivi file
3. Testare in modalità sandbox prima del deployment
4. Configurare i webhook nei dashboard dei provider

## Note Implementative

### Gestione Errori
Tutti i metodi di pagamento implementano:
- Validazione input parametri
- Gestione errori API con status codes appropriati
- Logging dettagliato per debugging
- Fallback a messaggi di errore user-friendly

### Sicurezza
- Validazione webhook signatures (implementata per Satispay)
- Environment variables per credenziali sensibili
- Nessun hardcode di API keys nel codice

### Monitoraggio
- Log dettagliati di tutte le transazioni
- Tracking dello stato dei pagamenti
- Gestione timeout e retry logic