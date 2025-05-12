import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function WelcomePage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  
  const handleEnter = () => {
    setLoading(true);
    
    // Passiamo alla dashboard utilizzando l'URL diretto
    window.location.href = "/dashboard";
  };
  
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      {/* Header con selettori lingua e tema */}
      <header className="px-6 py-4 flex justify-end border-b border-border">
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      
      {/* Contenuto principale */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <svg 
                  className="w-12 h-12 text-primary" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                Segreteria Elis College
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t('welcome_message')}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <svg 
                      className="w-6 h-6 text-primary" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{t('services_management')}</h3>
                <p className="text-sm text-muted-foreground">{t('services_description')}</p>
              </div>
              
              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <svg 
                      className="w-6 h-6 text-primary" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{t('payments_management')}</h3>
                <p className="text-sm text-muted-foreground">{t('payments_description')}</p>
              </div>
              
              <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <svg 
                      className="w-6 h-6 text-primary" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">{t('reports_management')}</h3>
                <p className="text-sm text-muted-foreground">{t('reports_description')}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button 
              size="lg" 
              onClick={handleEnter}
              disabled={loading}
              className="px-8 py-6 text-lg rounded-full shadow-lg transition-all hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  {t('loading')}
                </div>
              ) : (
                t('enter_system')
              )}
            </Button>
          </motion.div>
        </div>
      </main>
      
      {/* Quick Links */}
      <div className="py-6 border-t border-border">
        <div className="container mx-auto text-center">
          <h3 className="text-lg font-medium mb-4">Link Rapidi</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/pay"}
              className="text-sm"
            >
              Paga un servizio
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/maintenance-request"}
              className="text-sm"
            >
              Segnala un problema di manutenzione
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy;GabHub - Segreteria Elis College</p>
        </div>
      </footer>
    </div>
  );
}