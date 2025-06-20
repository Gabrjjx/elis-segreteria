# Configurazione WebStorm per Sistema ELIS

## Setup Iniziale

### 1. Aprire il Progetto
- File → Open → Seleziona cartella del progetto
- WebStorm rileverà automaticamente la configurazione TypeScript

### 2. Configurazione Node.js
- File → Settings → Languages & Frameworks → Node.js
- Node interpreter: Seleziona Node.js v18+ dal sistema
- Package manager: npm

### 3. Plugin Consigliati
Installa questi plugin per ottimizzare lo sviluppo:
- **Tailwind CSS** - Autocompletamento classi CSS
- **Database Tools** - Gestione PostgreSQL
- **GitToolBox** - Miglioramenti Git
- **Rainbow Brackets** - Visualizzazione parentesi

### 4. Configurazione Run/Debug

#### Development Server
- Run → Edit Configurations → Add → npm
- **Name**: Dev Server
- **Scripts**: dev
- **Environment variables**: NODE_ENV=development

#### Build Production
- Run → Edit Configurations → Add → npm
- **Name**: Build Production
- **Scripts**: build

#### Database Push
- Run → Edit Configurations → Add → npm
- **Name**: Database Push
- **Scripts**: db:push

### 5. Configurazione TypeScript
- File → Settings → Languages & Frameworks → TypeScript
- **TypeScript service**: Enabled
- **Service directory**: node_modules/typescript/lib
- **Options**: --strict --noImplicitAny

### 6. Configurazione Database
- Database → + → Data Source → PostgreSQL
- **Host**: ep-snowy-sun-a5ayue8j-pooler.us-east-2.aws.neon.tech
- **Port**: 5432
- **Database**: neondb
- **User**: neondb_owner
- **Password**: [dalla variabile PGPASSWORD]

### 7. Struttura Progetto WebStorm
```
├── 📁 client/
│   ├── 📁 src/
│   │   ├── 📁 components/    # Componenti React
│   │   ├── 📁 pages/         # Pagine applicazione
│   │   ├── 📁 hooks/         # Custom hooks
│   │   └── 📁 lib/           # Utilities
├── 📁 server/
│   ├── 📄 index.ts           # Entry point server
│   ├── 📄 routes.ts          # API endpoints
│   ├── 📄 storage.ts         # Database operations
│   └── 📄 satispay.ts        # Pagamenti Satispay
├── 📁 shared/
│   └── 📄 schema.ts          # Schema database
└── 📄 package.json
```

### 8. Shortcuts Utili

#### Sviluppo
- `Ctrl+Shift+F10` - Run configurazione corrente
- `Ctrl+F5` - Restart server
- `Ctrl+Shift+F` - Ricerca globale nel progetto
- `Ctrl+B` - Vai a definizione

#### Database
- `Ctrl+Shift+A` → "Database" - Apri database tools
- Doppio click su tabella - Visualizza dati
- `Ctrl+Enter` - Esegui query SQL

#### Git
- `Ctrl+K` - Commit changes
- `Ctrl+Shift+K` - Push to repository
- `Alt+9` - Version Control tool window

### 9. File Watching
WebStorm monitor automaticamente:
- ✅ File TypeScript (.ts, .tsx)
- ✅ File CSS/Tailwind
- ✅ File environment (.env)
- ✅ Package.json dependencies

### 10. Debug Configuration

#### Server Debug
- Run → Edit Configurations → Add → Node.js
- **Name**: Debug Server
- **JavaScript file**: dist/index.js
- **Environment**: NODE_ENV=development
- **Before launch**: Build

#### Client Debug
- Run → Edit Configurations → Add → JavaScript Debug
- **Name**: Debug Client
- **URL**: http://localhost:5000
- **Browser**: Chrome

### 11. Code Quality

#### ESLint
- File → Settings → Languages & Frameworks → ESLint
- **Automatic ESLint configuration**: ✅
- **Run for files**: {**/*.{js,ts,jsx,tsx}}

#### Prettier
- File → Settings → Languages & Frameworks → Prettier
- **Prettier package**: {project}/node_modules/prettier
- **Run for files**: {**/*.{js,ts,jsx,tsx,css,md}}

### 12. Variabili Ambiente WebStorm

Crea file `.env` nella root del progetto:
```env
# Copia da .env di produzione ma usa valori development
NODE_ENV=development
DATABASE_URL=postgresql://...
SATISPAY_KEY_ID=53p1h1ejue2fu4ha3vc2...
# ... altre variabili
```

### 13. Tasks Comuni

#### Avvio Sviluppo
1. Apri terminale WebStorm (`Alt+F12`)
2. `npm install` (solo prima volta)
3. `npm run dev`
4. Apri http://localhost:5000

#### Deploy su GitHub
1. VCS → Import into Version Control → Create Git Repository
2. Add files to Git (`Ctrl+Alt+A`)
3. Commit (`Ctrl+K`)
4. VCS → Git → Push (`Ctrl+Shift+K`)

#### Troubleshooting
- **TypeScript errors**: Restart TypeScript service
- **Database connection**: Verifica credenziali in .env
- **Build errors**: Pulisci cache e reinstalla (`npm install`)
- **Hot reload non funziona**: Restart dev server

### 14. Estensioni Raccomandate

Per sviluppo ottimale installa:
- **Tailwind CSS IntelliSense** - Autocompletamento CSS
- **Database Navigator** - Gestione database avanzata
- **GitLive** - Collaborazione Git real-time
- **HTTP Client** - Test API endpoints