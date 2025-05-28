# Setup WebStorm - Guida Completa

## Importazione Progetto

### 1. Apri il Progetto
1. **File → Open** 
2. Seleziona la cartella del progetto
3. Scegli **"Open as Project"**

### 2. Configurazione Automatica
WebStorm rileverà automaticamente:
- ✅ Progetto Node.js/TypeScript
- ✅ Configurazione Vite
- ✅ Package.json con scripts

## Configurazioni WebStorm

### Node.js Interpreter
1. **File → Settings → Languages & Frameworks → Node.js**
2. Seleziona la versione Node.js installata (18+)
3. ✅ Spunta "Coding assistance for Node.js"

### TypeScript Service
1. **File → Settings → Languages & Frameworks → TypeScript**
2. Seleziona **"Use TypeScript service"**
3. Imposta versione: **"Bundled"**

### Run Configuration
1. **Run → Edit Configurations → +**
2. Seleziona **"npm"**
3. Configurazione:
   - **Name**: "Development Server"
   - **Package.json**: `./package.json`
   - **Command**: `run`
   - **Scripts**: `dev`

### Database Integration
1. **View → Tool Windows → Database**
2. **+ → Data Source → PostgreSQL**
3. Inserisci le credenziali dal tuo `.env`:
   - **Host**: dal DATABASE_URL
   - **Port**: 5432 (default)
   - **Database**: nome database
   - **User**: username
   - **Password**: password

### Environment Variables
Crea file `.env` nella root:
```env
DATABASE_URL=postgresql://user:password@host:port/database
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
```

## Scripts Utili

### Avvio Sviluppo
```bash
npm run dev
```
- Avvia frontend (Vite) e backend (Express)
- Hot reload automatico
- Disponibile su `http://localhost:5000`

### Database Management
```bash
npm run db:push        # Applica schema al database
npm run db:studio      # Apri Drizzle Studio (GUI database)
```

### Build e Deploy
```bash
npm run build         # Build produzione
npm run preview       # Preview build
npm run type-check    # Verifica tipi TypeScript
```

## Debugging

### Backend Debugging
1. **Run → Edit Configurations → + → Node.js**
2. Configurazione:
   - **Name**: "Debug Backend"
   - **JavaScript file**: `server/index.ts`
   - **Working directory**: `./`
   - **Environment variables**: Importa da `.env`

### Frontend Debugging
1. **Run → Edit Configurations → + → JavaScript Debug**
2. Configurazione:
   - **Name**: "Debug Frontend"
   - **URL**: `http://localhost:5000`
   - **Browser**: Chrome/Firefox

## Shortcuts Utili

### Navigazione
- **Ctrl+Shift+N**: Trova file
- **Ctrl+Shift+F**: Cerca in tutto il progetto  
- **Ctrl+B**: Vai a definizione
- **Alt+F7**: Trova utilizzi

### Refactoring
- **Shift+F6**: Rinomina
- **Ctrl+Alt+M**: Estrai metodo
- **F2**: Prossimo errore

### Git Integration
- **Alt+9**: Tool window Git
- **Ctrl+K**: Commit
- **Ctrl+Shift+K**: Push

## Estensioni Consigliate

### Plugin WebStorm
1. **File → Settings → Plugins**
2. Installa:
   - **Tailwind CSS** (già incluso)
   - **GitToolBox**
   - **Rainbow Brackets**
   - **String Manipulation**

## Struttura Progetto in WebStorm

```
├── 📁 client/              # Frontend React
│   ├── 📁 src/
│   │   ├── 📁 components/  # Componenti UI
│   │   ├── 📁 pages/      # Pagine applicazione
│   │   ├── 📁 lib/        # Utilities
│   │   └── 📁 hooks/      # Custom hooks
│   └── 📄 index.html      # Entry point
├── 📁 server/             # Backend Express
│   ├── 📄 index.ts        # Server principale
│   ├── 📄 routes.ts       # API endpoints
│   ├── 📄 db.ts          # Database config
│   └── 📄 storage.ts     # Database operations
├── 📁 shared/            # Codice condiviso
│   └── 📄 schema.ts      # Schema database + validazione
├── 📄 package.json       # Dipendenze e scripts
├── 📄 vite.config.ts     # Configurazione Vite
├── 📄 tailwind.config.ts # Configurazione Tailwind
└── 📄 tsconfig.json      # Configurazione TypeScript
```

## Testing

### Unit Tests (Future)
```bash
npm run test           # Esegui test
npm run test:watch     # Test in modalità watch
npm run test:coverage  # Test con coverage
```

### E2E Tests (Future)
```bash
npm run e2e           # Test end-to-end
npm run e2e:ui        # Test E2E con UI
```

## Troubleshooting

### Problemi Comuni

**TypeScript errors**
1. **File → Invalidate Caches and Restart**
2. Verifica `tsconfig.json` sia valido
3. Riavvia TypeScript service

**Database connection**
1. Verifica `.env` configurato correttamente
2. Testa connessione nel Database tool
3. Esegui `npm run db:push`

**Port già in uso**
1. Verifica nessun altro server su porta 5000
2. Cambia porta in `vite.config.ts` se necessario

**Dipendenze mancanti**
```bash
rm -rf node_modules package-lock.json
npm install
```

## Workflow Consigliato

1. **Avvio giornata**:
   - Apri WebStorm
   - Pull latest changes (Git)
   - Avvia development server (`npm run dev`)

2. **Sviluppo**:
   - Usa hot reload per vedere modifiche
   - Debugging con breakpoints
   - Commit frequenti

3. **Fine giornata**:
   - Commit e push changes
   - Stop development server

## Performance Tips

### WebStorm Optimization
1. **File → Settings → Appearance & Behavior → System Settings**
2. Aumenta memory heap: `-Xmx2048m`
3. Disabilita plugin non necessari

### Esclusioni Indexing
1. **File → Settings → Directories**
2. Marca come "Excluded":
   - `node_modules`
   - `dist`
   - `.next` (se presente)

Questo setup ti garantisce un ambiente di sviluppo ottimale in WebStorm! 🚀