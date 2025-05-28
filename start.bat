@echo off
title Sistema Gestione Sartoria ELIS

echo.
echo 🚀 Avvio Sistema Gestione Sartoria ELIS
echo ========================================
echo.

REM Verifica Node.js
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js non trovato. Installa Node.js 18+ prima di continuare.
    pause
    exit /b 1
)

REM Verifica npm
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ npm non trovato. Installa npm prima di continuare.
    pause
    exit /b 1
)

echo ✅ Node.js versione:
node --version
echo ✅ npm versione:
npm --version
echo.

REM Verifica file .env
if not exist ".env" (
    echo ⚠️  File .env non trovato. Copio .env.example...
    copy .env.example .env >nul
    echo 📝 Modifica il file .env con le tue credenziali database prima di continuare.
    echo    DATABASE_URL è obbligatorio per il funzionamento.
    echo.
) else (
    echo ✅ File .env trovato
)

REM Installa dipendenze se node_modules non esiste
if not exist "node_modules" (
    echo 📦 Installazione dipendenze...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ❌ Errore durante l'installazione delle dipendenze.
        pause
        exit /b 1
    )
    echo ✅ Dipendenze installate
    echo.
) else (
    echo ✅ Dipendenze già installate
)

echo 🗄️  Controllo configurazione database...
findstr "your_database_url_here" .env >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ⚠️  DATABASE_URL non configurato. Modifica .env prima di continuare.
    pause
    exit /b 1
)

echo.
echo 🚀 Avvio server di sviluppo...
echo    Frontend: http://localhost:5000
echo    Backend API: http://localhost:5000/api
echo.
echo 💡 Premi Ctrl+C per fermare il server
echo.

REM Avvia il server
npm run dev

pause