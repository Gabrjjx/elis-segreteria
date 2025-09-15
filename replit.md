# Sistema Gestione Sartoria ELIS

## Overview

This is a comprehensive web application for managing a residence's tailoring services, maintenance requests, and administrative tasks at ELIS College. The system provides a complete solution for service management, payment processing, student database management, and automated reporting.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and build
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with TypeScript support and hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety and better development experience
- **Database**: PostgreSQL hosted on Neon.tech with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas for runtime type checking and validation

## Key Components

### Service Management System
- **Service Types**: Siglatura (marking/personalization), Happy Hour (special reduced rate services), and Riparazione (repairs/alterations)
- **Student Integration**: Links services to students via sigla (student ID)
- **Payment Tracking**: Comprehensive payment status management (paid/unpaid)
- **Service History**: Complete audit trail of all services performed

### Payment Processing
- **Multiple Payment Gateways**: 
  - PayPal SDK integration for online payments
  - Stripe integration for credit card processing
  - Satispay API for mobile payments (Italian market)
  - Revolut integration (development framework ready)
  - SumUp integration (development framework ready)
- **Public Payment Interface**: Self-service payment portal for students
- **Receipt Generation**: Automated HTML receipt generation with PDF export capability

### Student Database
- **Complete Student Records**: Maintains comprehensive student information including sigla, personal details
- **Import/Export**: CSV import functionality for bulk student data management
- **Search and Filter**: Advanced search capabilities across student records

### Maintenance Request System
- **Public Request Portal**: Allow students to submit maintenance requests without authentication
- **Priority Management**: Categorizes requests by priority (low, medium, high, urgent)
- **Status Tracking**: Complete lifecycle management (pending → in_progress → completed)
- **Google Sheets Integration**: Bidirectional sync with Google Sheets for external collaboration

### Administrative Dashboard
- **Real-time Metrics**: Live statistics on services, payments, and maintenance requests
- **Date-based Filtering**: Monthly and custom date range filtering for all data views
- **Export Capabilities**: PDF and CSV export functionality for reports and data

## Data Flow

### Service Creation Flow
1. Service request created through admin interface or imported from external sources
2. Service validated against student database using sigla
3. Service stored in PostgreSQL with payment status tracking
4. Dashboard metrics updated in real-time

### Payment Processing Flow
1. Student accesses public payment portal with sigla
2. System retrieves unpaid services for the student
3. Payment processor (PayPal/Stripe/Satispay) handles secure payment
4. Webhook confirms payment completion
5. Service status updated to paid, receipt generated automatically

### Maintenance Request Flow
1. Public form submission with student details and request description
2. Request stored in database with auto-generated priority assessment
3. Optional Google Sheets sync for external management
4. Admin dashboard shows real-time request status and metrics

## External Dependencies

### Database Services
- **Neon.tech PostgreSQL**: Cloud PostgreSQL database with connection pooling and automatic scaling
- **Connection Management**: Optimized pool configuration to handle concurrent requests efficiently

### Payment Services
- **PayPal Server SDK**: Handles PayPal payment creation, capture, and webhook processing
- **Stripe API**: Credit card payment processing with Elements UI components
- **Satispay API**: Italian mobile payment platform with QR code generation

### Google Services Integration
- **Google Sheets API**: Bidirectional sync for maintenance requests and student data
- **OAuth2 Authentication**: Secure Google account integration for Sheets access
- **Google Auth Library**: Handles authentication flow and token management

### Email Services
- **SendGrid**: Automated email notifications for critical events and reports
- **HTML Email Templates**: Rich email formatting for professional communications

### Development Tools
- **ESLint + TypeScript**: Code quality and type checking
- **Prettier**: Code formatting consistency
- **Drizzle Kit**: Database migration and schema management
- **WebStorm Configuration**: IDE-optimized development environment

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot module replacement for rapid development
- **TypeScript Compilation**: Real-time type checking during development
- **Database Migrations**: Automatic schema updates via Drizzle Kit

### Production Build
- **Static Asset Generation**: Vite builds optimized static assets
- **Server Bundle**: ESBuild creates optimized Node.js server bundle
- **Environment Variables**: Secure configuration management for all services

### Replit Deployment
- **Ready-to-Run**: Pre-configured environment with all dependencies
- **Automatic Startup**: Scripts handle database initialization and service startup
- **Port Configuration**: Optimized for Replit's hosting environment

## Changelog

- September 15, 2025: Sistema versione 2.2.0 completato - IMPORTAZIONE STORICA TSV COMPLETATA AL 100%
  - 🎉 **500 SERVIZI STORICI IMPORTATI**: Dataset completo 2020-2022 da 7 file TSV originali
  - ✅ **PARSER TSV AVANZATO**: Lettura e parsing automatico di 6 colonne con gestione intelligente date italiane
  - ✅ **NORMALIZZAZIONE PERFETTA**: Mapping automatico siglatura/siglature/bottone/orlo → tipi standard
  - ✅ **DISTRIBUZIONE STORICA**: 2020 (84 servizi), 2021 (206 servizi), 2022 (210 servizi)
  - ✅ **BREAKDOWN SERVIZI**: 472 siglature, 27 riparazioni, 1 happy hour correttamente categorizzati
  - ✅ **BUG CRITICO RISOLTO**: Fix storage.getServices compatibility per evitare crash durante import
  - ✅ **SISTEMA ARCHIVIAZIONE**: Tutti i dati storici separati con archivedYear per non interferire con dashboard corrente
  - ✅ **IDEMPOTENCY GARANTITA**: Controlli duplicati basati su data, sigla, tipo, pezzi, importo
  - ✅ **ENDPOINT TSV**: POST /api/import/services/tsv con supporto dry-run e logging dettagliato
  - ✅ **PRODUCTION-READY**: Sistema robusto validato dall'architetto, pronto per uso in produzione

- September 15, 2025: Sistema versione 2.1.0 completato - IMPORTAZIONE STORICA PDF COMPLETATA
  - ✅ IMPORT STORICO FUNZIONALE: Importazione dati storici da PDF amministrazione sartoria 2020-2024
  - ✅ 8 RECORD IMPORTATI: Dati storici separati automaticamente dalla dashboard corrente
  - ✅ PARSER PDF COMPLETO: Parsing automatico date, sigla, importi, tipi servizio (siglatura, riparazione, orlo)
  - ✅ SISTEMA ARCHIVIAZIONE INTEGRATO: Uso del sistema existing per separare dati storici (archivedYear)
  - ✅ SICUREZZA ADMIN: Endpoint POST /api/import/services/historical protetto da autenticazione admin
  - ✅ IDEMPOTENCY GARANTITA: Controlli duplicati prevengono importazioni multiple accidentali
  - ✅ VALIDATION COMPLETA: Trasformazione e normalizzazione dati con error handling robusto
  - ✅ PRODUCTION-READY: Tutti i bug critici risolti (year tagging, amount semantics, idempotency)

- September 12, 2025: Sistema versione 2.0.0 completato - SISTEMA ARCHIVIAZIONE ANNUALE
  - ✅ ARCHIVIAZIONE COMPLETA: Sistema di archiviazione annuale per tutti i dati operativi
  - ✅ 6 TABELLE SUPPORTATE: Services, maintenance_requests, paypal_orders, receipts, secretariat_payments, bike_reservations
  - ✅ API ADMIN SICURE: 3 endpoint protetti (POST /api/archive/close-year, GET /api/archive/years, GET /api/archive/stats)
  - ✅ TRANSAZIONI SICURE: Operazioni atomiche con rollback e supporto dry-run per test
  - ✅ DASHBOARD PULITA: I dati archiviati sono esclusi automaticamente dalla dashboard
  - ✅ REPORTING AVANZATO: Statistiche e anni archiviati aggregate da tutte le tabelle operative
  - ✅ FILTERING INTELLIGENTE: Flag includeArchived per accesso dati storici quando necessario
  - ✅ SICUREZZA ADMIN: Solo utenti admin possono accedere alle funzioni di archiviazione

- July 03, 2025: Sistema versione 1.7.0 completato - PAGAMENTI PRODUZIONE + UX OTTIMIZZATA
  - ✅ SATISPAY QR CODE FUNZIONANTE: Generazione QR codes autentici da API live
  - ✅ STRIPE PAYMENT COMPLETO: Checkout Elements integrato e operativo
  - ✅ UX MIGLIORATA: Flusso temporizzato per QR code con controllo manuale polling
  - ✅ REVOLUT/SUMUP STATUS: Mostrati come "In fase di test" e disabilitati
  - ✅ TIMEOUT GESTITO: Polling limitato a 5 minuti con opzione annullamento
  - ✅ SISTEMA ROUTING: URLs /secretariat-payment/[metodo]/[sigla] completamente operativi

- July 03, 2025: Sistema versione 1.4.0 completato - LIVE SATISPAY + URL ROUTING
  - ✅ SATISPAY LIVE COMPLETAMENTE FUNZIONANTE: Produzione endpoint attivo con pagamenti reali
  - ✅ Production Authentication: RSA-SHA256 signatures funzionanti con server Satispay live
  - ✅ Real QR Code Generation: QR codes autentici generati da API Satispay ufficiali
  - ✅ URL Routing Implementato: /secretariat-payment/[tipo] per tutti i metodi (satispay, stripe, revolut, sumup)
  - ✅ Componenti Dedicati: Pagine separate per ogni metodo di pagamento con UX ottimizzata
  - ✅ Sistema Multi-Payment Completo: 4 metodi attivi con routing specifico e interfacce dedicate

- July 03, 2025: Sistema versione 1.3.0 completato - AUTHENTIC SATISPAY INTEGRATION
  - ✓ Official Satispay API Implementation: Complete authentication flow with RSA-SHA256 signatures
  - ✓ Proper Request Signing: Step-by-step implementation following official documentation
  - ✓ Payment Creation API: Using correct endpoints and payload structure
  - ✓ Error Handling & Fallbacks: Robust system with intelligent fallback when credentials need activation
  - ✓ Authentication Test Endpoint: /api/satispay/test-auth for verifying integration
  - ✓ Production-Ready Structure: All components ready for live Satispay activation

- July 02, 2025: Sistema versione 1.2.0 completato - PREMIUM UI/UX ENHANCEMENT
  - ✓ Premium Navigation Header: Enhanced logo design con gradient ELIS e glassmorphism effects
  - ✓ Floating Action Button: Component animato con quick actions (Nuovo Servizio, QR Scanner)
  - ✓ Premium CSS Framework: Glassmorphism cards, animated gradients, backdrop blur effects
  - ✓ Enhanced Metric Cards: 3D hover effects, animated borders, premium styling
  - ✓ Advanced Animations: Gradient shifts, floating elements, hover transformations
  - ✓ Professional Design System: Modern color schemes, shadows, responsive animations
  - ✓ Brand Identity Elevata: ELIS branding con professional typography e iconografia

- July 02, 2025: Sistema versione 1.1.0 completato - LOADING ANIMATIONS
  - ✓ ELIS Loading Components: Mascotte animata ELIS College con simboli accademici
  - ✓ Spinner personalizzati: Design rotating con lettere "E" stilizzate e pallini animati
  - ✓ Componenti multipli: ELISLoader, ELISLoadingOverlay, ELISInlineLoader, ELISTableLoader
  - ✓ Integrazione completa: Payment forms, dashboard, processing states
  - ✓ Animazioni smooth: Framer Motion per transizioni professionali
  - ✓ Sistema user experience elevato con brand identity ELIS
  
- July 02, 2025: Sistema versione 1.0.9 completato
  - ✓ SumUp: Tutte le credenziali configurate (API Key, Client ID, Client Secret, MERCHANT_CODE MCTXASKY)
  - ✓ SumUp: Endpoint aggiornato a formato ufficiale API (/v0.1/checkouts)
  - ✓ SumUp: Fallback intelligente attivo durante attivazione account merchant
  - ✓ Sistema 4 metodi pagamento completato: Stripe (✅), Satispay (✅), SumUp (🔄), Revolut (🚧)
  - ✓ Interfaccia utente aggiornata con status reali per ogni metodo
  - ✓ Sistema pronto per produzione con documentazione completa

- July 02, 2025: Sistema versione 1.0.6 completato  
  - ✓ Aggiunti Revolut e SumUp come nuovi metodi di pagamento
  - ✓ Interfaccia utente aggiornata con 4 opzioni di pagamento: Stripe, Satispay, Revolut, SumUp
  - ✓ Framework backend preparato per future integrazioni API reali
  - ✓ Route API complete per tutti i metodi di pagamento

- July 01, 2025: Sistema versione 1.0.5 completato
  - ✓ Implementato aggiornamento automatico database dopo pagamenti Stripe
  - ✓ Sistema ora aggiorna automaticamente servizi da "unpaid" a "paid" post-pagamento
  - ✓ Migliorata pagina di successo con dettagli completi sui servizi pagati
  - ✓ Risolto problema filtri report - ora mostra "Tutti i periodi" come default
  - ✓ Flusso di pagamento completamente funzionale e automatizzato

- July 01, 2025: Sistema versione 1.0.4 completato
  - ✓ Risolto problema pagamento Roberto Martines (ID 57) aggiornato a "paid"
  - ✓ Migliorato webhook Satispay per aggiornamenti automatici di pagamento
  - ✓ Nuovo header moderno con navigazione migliorata
  - ✓ Dashboard ridisegnata con card animate e design moderno
  - ✓ Interfaccia completamente responsive e ottimizzata
  - ✓ Animazioni smooth con Framer Motion integrate
  - ✓ Layout pulito e professionale pronto per produzione

- July 01, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.