import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoadingProvider } from "@/contexts/loading-context";
import NavigationProgress from "@/components/navigation-progress";
import { GlobalLoading } from "@/components/global-loading";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { HammerSickle } from "@/components/ui/hammer-sickle";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import ServicesPage from "@/pages/ServicesPage";
import ServiceForm from "@/pages/ServiceForm";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import MaintenancePage from "@/pages/MaintenancePage";
import NotFound from "@/pages/not-found";
import { Suspense, lazy } from "react";

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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-4">
        <div className="animate-spin">
          <HammerSickle width={32} height={32} />
        </div>
        <p className="text-base font-medium text-primary">Caricamento pagina...</p>
      </div>
    </div>
  );
}

// Layout for public pages without navigation menu
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {/* Rotta pubblica per i pagamenti */}
        <Route path="/pay">
          <PublicLayout>
            <LazyPublicPaymentPage />
          </PublicLayout>
        </Route>
        
        {/* Rotte protette con MainLayout */}
        <Route>
          <MainLayout>
            <Switch>
              <Route path="/" component={LazyDashboard} />
              <Route path="/services" component={LazyServicesPage} />
              <Route path="/services/new">
                <LazyServiceForm />
              </Route>
              <Route path="/services/:id/edit">
                {params => <ServiceForm id={params.id} />}
              </Route>
              <Route path="/payments" component={LazyPaymentsPage} />
              <Route path="/reports" component={LazyReportsPage} />
              <Route path="/maintenance" component={LazyMaintenancePage} />
              <Route path="/students" component={LazyStudentsPage} />
              <Route path="/settings" component={LazySettingsPage} />
              <Route path="/google-auth" component={LazyGoogleAuthPage} />
              <Route path="/scanner" component={LazyQrScannerPage} />
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="elis-theme">
        <LoadingProvider>
          <TooltipProvider>
            <NavigationProgress />
            <GlobalLoading />
            <Toaster />
            <Router />
          </TooltipProvider>
        </LoadingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
