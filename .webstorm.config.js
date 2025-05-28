// WebStorm configuration per il progetto Sartoria ELIS
module.exports = {
  // Configurazione TypeScript
  typescript: {
    service: true,
    preferGoToSourceDefinition: true,
  },
  
  // Configurazione Node.js
  nodejs: {
    version: "18",
    enableCodingAssistance: true,
  },
  
  // Configurazione ESLint (se presente)
  eslint: {
    enable: true,
    autofix: true,
  },
  
  // Configurazione Prettier
  prettier: {
    enable: true,
    runOnSave: true,
  },
  
  // Configurazione debugging
  debugging: {
    sourceMaps: true,
    breakOnExceptions: false,
  }
};