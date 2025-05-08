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
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import ServicesPage from "@/pages/ServicesPage";
import ServiceForm from "@/pages/ServiceForm";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import { Suspense, lazy } from "react";

// Utilizzo React.lazy per caricare i componenti in modo asincrono
const LazyDashboard = lazy(() => import("@/pages/Dashboard"));
const LazyServicesPage = lazy(() => import("@/pages/ServicesPage"));
const LazyServiceForm = lazy(() => import("@/pages/ServiceForm"));
const LazyReportsPage = lazy(() => import("@/pages/ReportsPage"));
const LazySettingsPage = lazy(() => import("@/pages/SettingsPage"));

function LoadingFallback() {
  return <LoadingScreen text="Caricamento pagina..." />;
}

function Router() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/" component={LazyDashboard} />
          <Route path="/services" component={LazyServicesPage} />
          <Route path="/services/new">
            <LazyServiceForm />
          </Route>
          <Route path="/services/:id/edit">
            {params => <ServiceForm id={params.id} />}
          </Route>
          <Route path="/reports" component={LazyReportsPage} />
          <Route path="/settings" component={LazySettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </MainLayout>
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
