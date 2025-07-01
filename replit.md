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