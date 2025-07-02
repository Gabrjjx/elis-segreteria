import { Link, useLocation } from "wouter";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import ServiceList from "@/components/services/ServicesList";
import { Plus, Search, Filter, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ELISLoader, { ELISInlineLoader } from "@/components/ELISLoader";
import FloatingActionButton from "@/components/ui/floating-action-button";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentDate = new Date();
  const currentMonth = format(currentDate, 'MMMM yyyy', { locale: it });
  
  // Stato per il mese selezionato
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toLowerCase());
  const [filterPeriod, setFilterPeriod] = useState<{startDate: Date, endDate: Date}>({
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate)
  });

  // Parametri per le query con il periodo selezionato
  // Utilizziamo useMemo per ricalcolare i parametri quando filterPeriod cambia
  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', filterPeriod.startDate.toISOString());
    queryParams.append('endDate', filterPeriod.endDate.toISOString());
    console.log('Filtro aggiornato:', filterPeriod.startDate.toLocaleDateString(), 'a', filterPeriod.endDate.toLocaleDateString());
    return queryParams.toString();
  }, [filterPeriod]);

  // Fetch dashboard metrics - sempre globali per overview
  const { data: metrics, isLoading: isLoadingMetrics, error: metricsError } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle metriche');
      }
      return response.json();
    },
    retry: 1, // Riduciamo i tentativi di retry per evitare troppi errori di rate limit
    retryDelay: 1500, // Aggiungiamo un ritardo tra i tentativi
    onError: (error) => {
      console.error("Errore nel caricamento delle metriche:", error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile caricare le metriche. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });

  // Fetch recent services
  const { data: recentServices, isLoading: isLoadingServices, error: servicesError } = useQuery({
    queryKey: ['/api/dashboard/recent-services', filterPeriod],
    queryFn: async () => {
      console.log('Fetching recent services with filter:', queryString);
      const response = await fetch(`/api/dashboard/recent-services?${queryString}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei servizi recenti');
      }
      return response.json();
    },
    retry: 1, // Riduciamo i tentativi di retry per evitare troppi errori di rate limit
    retryDelay: 2500, // Aggiungiamo un ritardo tra i tentativi
    onError: (error) => {
      console.error("Errore nel caricamento dei servizi recenti:", error);
      toast({
        title: "Errore di connessione",
        description: "Impossibile caricare i servizi recenti. Riprova più tardi.",
        variant: "destructive",
      });
    }
  });

  // Fetch pending payments
  const { data: pendingPayments, isLoading: isLoadingPendingPayments, error: pendingPaymentsError } = useQuery({
    queryKey: ['/api/dashboard/pending-payments', filterPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/pending-payments?${queryString}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei pagamenti pendenti');
      }
      return response.json();
    },
    retry: 1,
    retryDelay: 2000
  });

  const handleAddNewService = () => {
    setLocation("/services/new");
  };

  const handleExportToPDF = async () => {
    try {
      // Generate and download PDF report
      await handleExportServices();
    } catch (error) {
      console.error('Errore durante l\'export PDF:', error);
      toast({
        title: "Errore nell'export",
        description: "Si è verificato un errore durante la generazione del PDF.",
        variant: "destructive",
      });
    }
  };

  const handleExportServices = async () => {
    try {
      // Fetch all services (not just recent ones)
      const response = await fetch('/api/services?limit=1000');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei servizi');
      }
      const data = await response.json();
      const allServices = data.services;

      // Create HTML content for PDF
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #333; margin-bottom: 30px;">
            Report Servizi - Sartoria ELIS
          </h1>
          <p style="text-align: center; margin-bottom: 30px; color: #666;">
            Generato il ${new Date().toLocaleDateString('it-IT')}
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Data</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Sigla</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Nome</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Tipologia</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Pezzi</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Importo</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Stato</th>
              </tr>
            </thead>
            <tbody>
              ${allServices.map((service: any) => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(service.date).toLocaleDateString('it-IT')}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${service.sigla}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${service.student ? `${service.student.firstName} ${service.student.lastName}` : 
                      service.cognome ? service.cognome : 'N/A'}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    ${service.type === 'siglatura' ? 'Siglatura' : 
                      service.type === 'happy_hour' ? 'Happy Hour' : 
                      service.type === 'riparazione' ? 'Riparazione' : service.type}
                  </td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${service.pieces}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">€${service.amount.toFixed(2)}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">
                    <span style="color: ${service.status === 'paid' ? '#10b981' : '#ef4444'};">
                      ${service.status === 'paid' ? 'Pagato' : 'Da pagare'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>Totale servizi: ${allServices.length}</p>
            <p>Importo totale: €${allServices.reduce((sum: number, s: any) => sum + s.amount, 0).toFixed(2)}</p>
          </div>
        </div>
      `;

      // Convert to PDF
      const opt = {
        margin: 1,
        filename: `servizi-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(opt).from(htmlContent).save();

      toast({
        title: "Export completato",
        description: "Il report PDF è stato scaricato con successo.",
        variant: "default",
      });

    } catch (error) {
      console.error('Errore durante l\'export:', error);
      toast({
        title: "Errore nell'export",
        description: "Si è verificato un errore durante la generazione del PDF.",
        variant: "destructive",
      });
    }
  };
  
  // Gestisce il cambio del mese
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    
    let startDate, endDate;
    
    switch (month) {
      case 'maggio 2025':
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
        break;
      case 'aprile 2025':
        startDate = startOfMonth(subMonths(currentDate, 1));
        endDate = endOfMonth(subMonths(currentDate, 1));
        break;
      case 'marzo 2025':
        startDate = startOfMonth(subMonths(currentDate, 2));
        endDate = endOfMonth(subMonths(currentDate, 2));
        break;
      default:
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
    }
    
    setFilterPeriod({ startDate, endDate });
    
    toast({
      title: "Filtro applicato",
      description: `Visualizzazione dati: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    });
  };

  return (
    <>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-gray-800">Riepilogo Servizi</h2>
            <p className="text-gray-500 text-sm">Panoramica delle attività recenti e dei pagamenti pendenti</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <div className="relative inline-block text-left mr-2">
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={currentMonth} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maggio 2025">Maggio 2025</SelectItem>
                  <SelectItem value="aprile 2025">Aprile 2025</SelectItem>
                  <SelectItem value="marzo 2025">Marzo 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddNewService}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Servizio
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Metrics */}
      {isLoadingMetrics ? (
        <ELISInlineLoader 
          text="Caricamento metriche dashboard..." 
          size="lg"
          className="py-12"
        />
      ) : metricsError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Errore nel caricamento delle metriche</p>
        </div>
      ) : (
        <DashboardMetrics metrics={metrics || {
          totalServices: 0,
          pendingPayments: 0,
          siglaturaCount: 0,
          happyHourCount: 0,
          repairCount: 0,
          totalAmount: 0,
          pendingAmount: 0
        }} />
      )}

      {/* Servizi Recenti */}
      <div className="premium-card rounded-2xl mb-8 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-b border-blue-100/40">
          <h3 className="text-xl leading-6 font-bold text-gray-800 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Servizi Recenti - {format(filterPeriod.startDate, 'dd/MM/yyyy')} - {format(filterPeriod.endDate, 'dd/MM/yyyy')}
          </h3>
        </div>
        
        {isLoadingServices ? (
          <ELISInlineLoader 
            text="Caricamento servizi recenti..." 
            size="md"
            className="py-8"
          />
        ) : servicesError ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Errore nel caricamento dei servizi</p>
            </div>
          </div>
        ) : recentServices && Array.isArray(recentServices) && recentServices.length > 0 ? (
          <div className="overflow-x-auto">
            <ServiceList services={recentServices} />
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>Nessun servizio trovato per il periodo selezionato</p>
          </div>
        )}
      </div>

      {/* Pagamenti Pendenti */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-amber-50/50 to-orange-50/30 border-b border-amber-100/40 flex justify-between items-center">
          <h3 className="text-xl leading-6 font-bold text-gray-800 flex items-center">
            <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
            Pagamenti Pendenti
          </h3>
          <Button 
            onClick={handleExportToPDF}
            className="btn-premium text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta PDF
          </Button>
        </div>
        
        {isLoadingPendingPayments ? (
          <ELISInlineLoader 
            text="Caricamento pagamenti pendenti..." 
            size="md"
            className="py-8"
          />
        ) : pendingPaymentsError ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Errore nel caricamento dei pagamenti pendenti</p>
            </div>
          </div>
        ) : pendingPayments && Array.isArray(pendingPayments) && pendingPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <ServiceList services={pendingPayments} />
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>Nessun pagamento pendente trovato</p>
          </div>
        )}
      </div>
      
      {/* Floating Action Button */}
      <FloatingActionButton />
    </>
  );
}
