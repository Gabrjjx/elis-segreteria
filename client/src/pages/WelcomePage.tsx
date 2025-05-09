import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { HammerSickle } from "@/components/ui/hammer-sickle";
import { motion } from "framer-motion";

export default function WelcomePage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  
  const handleEnter = () => {
    setLoading(true);
    
    // Simuliamo un breve caricamento per una transizione fluida
    setTimeout(() => {
      setLocation("/");
    }, 800);
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
              <HammerSickle width={80} height={80} className="text-primary" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                ELIS Segreteria
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
                  <div className="animate-spin mr-2">
                    <HammerSickle width={20} height={20} />
                  </div>
                  {t('loading')}
                </div>
              ) : (
                t('enter_system')
              )}
            </Button>
          </motion.div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-4 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ELIS - {t('all_rights_reserved')}</p>
        </div>
      </footer>
    </div>
  );
}