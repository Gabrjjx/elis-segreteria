import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingProvider } from "@/contexts/loading-context";
import { LanguageProvider } from "@/contexts/language-context";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import Header from "@/components/layout/Header";
import Dashboard from "@/pages/Dashboard";
import ServicesPage from "@/pages/ServicesPage";
import ServiceForm from "@/pages/ServiceForm";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import MaintenancePage from "@/pages/MaintenancePage";
import NotFound from "@/pages/not-found";
import { Suspense, lazy, useState, useEffect } from "react";

// Utilizzo React.lazy per caricare i componenti in modo asincrono
const LazyDashboard = lazy(() => import("@/pages/Dashboard"));
const LazyServicesPage = lazy(() => import("@/pages/ServicesPage"));
const LazyServiceForm = lazy(() => import("@/pages/ServiceForm"));
const LazyPaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const LazyReportsPage = lazy(() => import("@/pages/ReportsPage"));
const LazySettingsPage = lazy(() => import("@/pages/SettingsPage"));
const LazyMaintenancePage = lazy(() => import("@/pages/MaintenancePage"));
const LazyStudentsPage = lazy(() => import("@/pages/StudentsPage"));
const LazyGoogleAuthPage = lazy(() => import("@/pages/GoogleAuthPage"));
const LazyPublicPaymentPage = lazy(() => import("@/pages/PublicPaymentPage"));
const LazyQrScannerPage = lazy(() => import("@/pages/QrScannerPage"));
const LazyWelcomePage = lazy(() => import("@/pages/WelcomePage"));
const LazyPublicMaintenanceRequest = lazy(() => import("@/pages/PublicMaintenanceRequest"));
const LazySecretariatPayment = lazy(() => import("@/pages/SecretariatPayment"));
const LazyReportsAdmin = lazy(() => import("@/pages/ReportsAdmin"));
const LazySatispayPayment = lazy(() => import("@/pages/SatispayPayment"));
const LazyStripePayment = lazy(() => import("@/pages/StripePayment"));
const LazyRevolutPayment = lazy(() => import("@/pages/RevolutPayment"));
const LazySumupPayment = lazy(() => import("@/pages/SumupPayment"));
const LazyPaymentSelection = lazy(() => import("@/pages/PaymentSelection"));
const LazyPaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const LazyCheckout = lazy(() => import("@/pages/Checkout"));
const LazyHistoricalDataPage = lazy(() => import("@/pages/HistoricalDataPage"));

function LoadingFallback() {
  return null; // Nessun indicatore di caricamento
}

// Layout for public pages without navigation menu
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Pagina di benvenuto come home page principale */}
        <Route path="/">
          <PublicLayout>
            <LazyWelcomePage />
          </PublicLayout>
        </Route>

        {/* Rotte specifiche per i pagamenti (devono essere prima della rotta generica) */}
        <Route path="/secretariat-payment/satispay/:sigla?">
          <PublicLayout>
            <LazySatispayPayment />
          </PublicLayout>
        </Route>
        
        <Route path="/secretariat-payment/stripe/:sigla?">
          <PublicLayout>
            <LazyStripePayment />
          </PublicLayout>
        </Route>
        
        <Route path="/secretariat-payment/revolut/:sigla?">
          <PublicLayout>
            <LazyRevolutPayment />
          </PublicLayout>
        </Route>
        
        <Route path="/secretariat-payment/sumup/:sigla?">
          <PublicLayout>
            <LazySumupPayment />
          </PublicLayout>
        </Route>
        
        {/* Rotta generica per il pagamento del servizio segreteria */}
        <Route path="/secretariat-payment">
          <PublicLayout>
            <LazySecretariatPayment />
          </PublicLayout>
        </Route>
        
        {/* Rotta pubblica per i pagamenti */}
        <Route path="/pay">
          <PublicLayout>
            <LazyPublicPaymentPage />
          </PublicLayout>
        </Route>
        
        {/* Rotta pubblica per la segnalazione di manutenzione */}
        <Route path="/maintenance-request">
          <PublicLayout>
            <LazyPublicMaintenanceRequest />
          </PublicLayout>
        </Route>
        
        {/* Rotta pubblica per il pagamento Satispay (retrocompatibilità) */}
        <Route path="/satispay-payment/:sigla?">
          <PublicLayout>
            <LazySatispayPayment />
          </PublicLayout>
        </Route>

        {/* Rotta pubblica per la selezione del metodo di pagamento */}
        <Route path="/payment">
          <PublicLayout>
            <LazyPaymentSelection />
          </PublicLayout>
        </Route>

        {/* Rotta pubblica per la pagina di successo pagamento */}
        <Route path="/payment-success">
          <PublicLayout>
            <LazyPaymentSuccess />
          </PublicLayout>
        </Route>
        
        {/* Rotta pubblica per il checkout Stripe */}
        <Route path="/checkout">
          <PublicLayout>
            <LazyCheckout />
          </PublicLayout>
        </Route>
        
        {/* Rotte protette con nuovo layout moderno */}
        <Route>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-6">
              <Switch>
                <Route path="/" component={LazyDashboard} />
                <Route path="/dashboard" component={LazyDashboard} />
                <Route path="/services" component={LazyServicesPage} />
                <Route path="/services/new">
                  <LazyServiceForm />
                </Route>
                <Route path="/services/:id/edit">
                  {params => <ServiceForm id={params.id} />}
                </Route>
                <Route path="/payments" component={LazyPaymentsPage} />
                <Route path="/reports" component={LazyReportsPage} />
                <Route path="/reports/admin" component={LazyReportsAdmin} />
                <Route path="/maintenance" component={LazyMaintenancePage} />
                <Route path="/students" component={LazyStudentsPage} />
                <Route path="/historical-data" component={LazyHistoricalDataPage} />
                <Route path="/settings" component={LazySettingsPage} />
                <Route path="/google-auth" component={LazyGoogleAuthPage} />
                <Route path="/scanner" component={LazyQrScannerPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </Route>
      </Switch>
    </Suspense>
  );
}

// Indicatore discreto per le chiamate API
function ApiLoadingIndicator() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (isFetching || isMutating) {
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 300); // Mostra dopo un piccolo ritardo per evitare flash
    } else {
      setIsVisible(false);
    }
    
    return () => {
      clearTimeout(timeout);
    };
  }, [isFetching, isMutating]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-2 right-2 z-40 pointer-events-none">
      <div className="bg-white/80 dark:bg-gray-800/80 p-1.5 rounded-full shadow-sm flex items-center gap-1.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    </div>
  );
}

// Indicatore discreto per il cambio pagina
function PageLoadingIndicator() {
  const [isLoading, setIsLoading] = useState(false);
  const [location] = useLocation();
  
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [location]);
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
      <div className="bg-white/80 dark:bg-gray-800/80 py-1 px-3 rounded-full shadow-sm flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-medium">Caricamento</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="elis-theme">
        <LanguageProvider>
          <LoadingProvider>
            <TooltipProvider>
              <ApiLoadingIndicator />
              <PageLoadingIndicator />
              <Toaster />
              <Router />
            </TooltipProvider>
          </LoadingProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;