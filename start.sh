#!/bin/bash

echo "🚀 Avvio Sistema Gestione Sartoria ELIS"
echo "========================================"

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato. Installa Node.js 18+ prima di continuare."
    exit 1
fi

# Verifica npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm non trovato. Installa npm prima di continuare."
    exit 1
fi

echo "✅ Node.js versione: $(node --version)"
echo "✅ npm versione: $(npm --version)"

# Verifica file .env
if [ ! -f ".env" ]; then
    echo "⚠️  File .env non trovato. Copio .env.example..."
    cp .env.example .env
    echo "📝 Modifica il file .env con le tue credenziali database prima di continuare."
    echo "   DATABASE_URL è obbligatorio per il funzionamento."
else
    echo "✅ File .env trovato"
fi

# Installa dipendenze se node_modules non esiste
if [ ! -d "node_modules" ]; then
    echo "📦 Installazione dipendenze..."
    npm install
    echo "✅ Dipendenze installate"
else
    echo "✅ Dipendenze già installate"
fi

# Verifica database
echo "🗄️  Controllo connessione database..."
if grep -q "your_database_url_here" .env; then
    echo "⚠️  DATABASE_URL non configurato. Modifica .env prima di continuare."
    exit 1
fi

echo "🚀 Avvio server di sviluppo..."
echo "   Frontend: http://localhost:5000"
echo "   Backend API: http://localhost:5000/api"
echo ""
echo "💡 Premi Ctrl+C per fermare il server"
echo ""

# Avvia il server
npm run dev