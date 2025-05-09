import React, { createContext, useContext, useState, useEffect } from 'react';

// Lingue supportate
export type Language = 'it' | 'en';

// Interfaccia del contesto
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Dizionari di traduzione
const translations: Record<Language, Record<string, string>> = {
  it: {
    // Navbar
    'dashboard': 'Dashboard',
    'services': 'Servizi',
    'siglatura': 'Siglatura',
    'happy_hour': 'Happy Hour',
    'repairs': 'Riparazioni',
    'payments': 'Pagamenti',
    'maintenance': 'Manutenzione',
    'students': 'Studenti',
    'reports': 'Report',
    'settings': 'Impostazioni',
    'scanner': 'Scanner',
    
    // Stati
    'pending': 'In attesa',
    'completed': 'Completato',
    'paid': 'Pagato',
    'unpaid': 'Non pagato',
    
    // Azioni
    'add': 'Aggiungi',
    'edit': 'Modifica',
    'delete': 'Elimina',
    'save': 'Salva',
    'cancel': 'Annulla',
    'search': 'Cerca',
    'filter': 'Filtra',
    'view': 'Visualizza',
    'pay': 'Paga',
    'export': 'Esporta',
    'import': 'Importa',
    'sync': 'Sincronizza',
    
    // Form
    'name': 'Nome',
    'surname': 'Cognome',
    'sigla': 'Sigla',
    'date': 'Data',
    'amount': 'Importo',
    'quantity': 'Quantità',
    'description': 'Descrizione',
    'type': 'Tipo',
    'status': 'Stato',
    'price': 'Prezzo',
    
    // Messaggi
    'no_data': 'Nessun dato disponibile',
    'loading': 'Caricamento...',
    'error': 'Errore',
    'success': 'Operazione completata con successo',
    'confirm_delete': 'Sei sicuro di voler eliminare questo elemento?',
    'yes': 'Sì',
    'no': 'No',
    
    // Tema
    'theme': 'Tema',
    'light': 'Chiaro',
    'dark': 'Scuro',
    'change_theme': 'Cambia tema',
    
    // Lingua
    'language': 'Lingua',
    'change_language': 'Cambia lingua',
  },
  en: {
    // Navbar
    'dashboard': 'Dashboard',
    'services': 'Services',
    'siglatura': 'Labeling',
    'happy_hour': 'Happy Hour',
    'repairs': 'Repairs',
    'payments': 'Payments',
    'maintenance': 'Maintenance',
    'students': 'Students',
    'reports': 'Reports',
    'settings': 'Settings',
    'scanner': 'Scanner',
    
    // States
    'pending': 'Pending',
    'completed': 'Completed',
    'paid': 'Paid',
    'unpaid': 'Unpaid',
    
    // Actions
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete',
    'save': 'Save',
    'cancel': 'Cancel',
    'search': 'Search',
    'filter': 'Filter',
    'view': 'View',
    'pay': 'Pay',
    'export': 'Export',
    'import': 'Import',
    'sync': 'Sync',
    
    // Form
    'name': 'Name',
    'surname': 'Surname',
    'sigla': 'Sigla',
    'date': 'Date',
    'amount': 'Amount',
    'quantity': 'Quantity',
    'description': 'Description',
    'type': 'Type',
    'status': 'Status',
    'price': 'Price',
    
    // Messages
    'no_data': 'No data available',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Operation completed successfully',
    'confirm_delete': 'Are you sure you want to delete this item?',
    'yes': 'Yes',
    'no': 'No',
    
    // Theme
    'theme': 'Theme',
    'light': 'Light',
    'dark': 'Dark',
    'change_theme': 'Change theme',
    
    // Language
    'language': 'Language',
    'change_language': 'Change language',
  }
};

// Creazione del contesto
const LanguageContext = createContext<LanguageContextType>({
  language: 'it',
  setLanguage: () => {},
  t: () => '',
});

// Hook per utilizzare il contesto
export const useLanguage = () => useContext(LanguageContext);

// Provider del contesto
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Inizializza la lingua dal localStorage o usa l'italiano come default
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('elis-language');
    return (savedLanguage as Language) || 'it';
  });

  // Funzione di traduzione
  const t = (key: string) => {
    return translations[language][key] || key;
  };

  // Salva la lingua nel localStorage quando cambia
  useEffect(() => {
    localStorage.setItem('elis-language', language);
    // Aggiorna l'attributo lang dell'HTML per migliorare l'accessibilità
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}