import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Service, ServiceType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Search, Receipt, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { it } from "date-fns/locale";

export default function PaymentsPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  
  const [filters, setFilters] = useState({
    query: searchParams.get("query") || "",
    type: (searchParams.get("type") as string) || "all",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "50") // Aumentato per vedere più pagamenti
  });
  
  // Update filters when URL search params change
  useEffect(() => {
    const params = new URLSearchParams(search);
    setFilters({
      query: params.get("query") || "",
      type: (params.get("type") as string) || "all",
      page: parseInt(params.get("page") || "1"),
      limit: parseInt(params.get("limit") || "50")
    });
  }, [search]);

  // Create date filter for current month
  const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Format dates for display
  const formattedStartDate = format(startDate, "dd/MM/yyyy");
  const formattedEndDate = format(endDate, "dd/MM/yyyy");
  
  // Format month for display in the header
  const formattedMonth = format(selectedMonth, "MMMM yyyy", { locale: it });

  // Fetch unpaid services with filters
  const queryKey = ['/api/services', { ...filters, status: 'unpaid', startDate, endDate }];
  
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.query) params.append("query", filters.query);
      if (filters.type !== "all") params.append("type", filters.type);
      params.append("status", "unpaid");
      params.append("page", filters.page.toString());
      params.append("limit", filters.limit.toString());
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());
      
      const response = await fetch(`/api/services?${params.toString()}`);
      if (!response.ok) throw new Error("Errore nel caricamento dei pagamenti in sospeso");
      return response.json();
    },
    onSuccess: (data) => {
      // Calcola il totale degli importi da pagare (solo servizi non pagati)
      if (data?.services) {
        // Filtra solo i servizi con status="unpaid"
        const unpaidServices = data.services.filter((service: Service) => service.status === 'unpaid');
        console.log('Servizi non pagati:', unpaidServices);
        const total = unpaidServices.reduce((sum: number, service: Service) => sum + service.amount, 0);
        console.log('Totale calcolato:', total);
        setTotalAmount(total);
      }
    }
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  // Marks a service as paid
  const handleMarkAsPaid = async (id: number) => {
    try {
      await apiRequest("PATCH", `/api/services/${id}/mark-paid`);
      
      toast({
        title: "Pagamento registrato",
        description: "Il servizio è stato contrassegnato come pagato",
        variant: "success",
      });
      
      // Invalidate services queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del pagamento",
        variant: "destructive",
      });
    }
  };

  // Get service type friendly name
  const getServiceTypeName = (type: string): string => {
    switch(type) {
      case ServiceType.SIGLATURA: return "Siglatura";
      case ServiceType.HAPPY_HOUR: return "Happy Hour";
      case ServiceType.RIPARAZIONE: return "Riparazione";
      default: return type;
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-gray-800">Gestione Pagamenti</h2>
            <p className="text-gray-500 text-sm">Visualizza e gestisci i pagamenti in sospeso</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center">
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-auto justify-start text-left font-normal py-2"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="capitalize">{formattedMonth}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedMonth(date);
                      setShowCalendar(false);
                      refetch();
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Filters section */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Filtra pagamenti in sospeso</h3>
          <p className="text-sm text-gray-500">
            Periodo: <span className="font-medium">{formattedStartDate}</span> a <span className="font-medium">{formattedEndDate}</span>
          </p>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Ricerca</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <Input 
                  id="search"
                  placeholder="Cerca per sigla o altro..."
                  className="pl-10"
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipologia</label>
              <Select 
                id="type"
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-full md:w-[180px] mt-1">
                  <SelectValue placeholder="Tipologia servizio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le tipologie</SelectItem>
                  <SelectItem value="siglatura">Siglatura</SelectItem>
                  <SelectItem value="happy_hour">Happy Hour</SelectItem>
                  <SelectItem value="riparazione">Riparazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full md:w-auto mt-1">
              <Filter className="mr-2 h-4 w-4" />
              Filtra
            </Button>
          </form>
        </div>
      </div>

      {/* Riepilogo pagamenti */}
      {!isLoading && data?.services?.length > 0 && (
        <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Riepilogo pagamenti da riscuotere</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Periodo: <span className="font-medium">{formattedMonth}</span>
                </p>
              </div>
              <div className="mt-4 md:mt-0 bg-white shadow-sm rounded-md px-6 py-3 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 mr-4">Totale da incassare:</span>
                  <span className="text-xl font-bold text-destructive">€{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-500">Totale servizi da pagare</h4>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.total}</p>
            </div>
            <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-500">Servizi visualizzati</h4>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {data.services.filter((service: Service) => service.status === 'unpaid').length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-500">Importo medio</h4>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(() => {
                  const unpaidServices = data.services.filter((service: Service) => service.status === 'unpaid');
                  const unpaidCount = unpaidServices.length;
                  return `€${unpaidCount > 0 ? (totalAmount / unpaidCount).toFixed(2) : '0.00'}`;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Pagamenti da riscuotere</h3>
              <p className="text-sm text-gray-500">
                {isLoading ? (
                  "Caricamento pagamenti..."
                ) : (
                  (() => {
                    const unpaidCount = data.services.filter((service: Service) => service.status === 'unpaid').length;
                    return unpaidCount ? 
                      `${unpaidCount} pagamenti in sospeso su ${data.total} totali` : 
                      "Nessun pagamento in sospeso";
                  })()
                )}
              </p>
            </div>
            {data?.total > 0 && (
              <Badge variant="destructive" className="text-md px-3 py-1">
                <AlertTriangle className="mr-1 h-4 w-4" />
                {data.total} pagamenti da riscuotere
              </Badge>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data?.services?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun pagamento in sospeso</h3>
                <p className="text-gray-500 max-w-md">
                  Tutti i servizi del periodo selezionato risultano pagati.
                </p>
              </div>
            ) : (
              data?.services?.filter((service: Service) => service.status === 'unpaid').map((service: Service) => (
                <div key={service.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex flex-col mb-4 md:mb-0 md:pr-4 md:border-r md:border-gray-100 md:w-2/3">
                      <div className="flex items-center mb-3">
                        <div className="bg-red-50 text-destructive p-2 rounded-full mr-3">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Sigla: {service.sigla}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {format(new Date(service.date), "dd MMMM yyyy", { locale: it })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                              <p className="text-sm font-medium text-gray-700">Tipologia</p>
                            </div>
                            <p className="mt-1 font-semibold pl-5">{getServiceTypeName(service.type)}</p>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                              <p className="text-sm font-medium text-gray-700">N. Pezzi</p>
                            </div>
                            <p className="mt-1 font-semibold pl-5">{service.pieces}</p>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                              <p className="text-sm font-medium text-gray-700">Stato</p>
                            </div>
                            <p className="mt-1 font-semibold text-destructive pl-5">Non pagato</p>
                          </div>
                        </div>
                      </div>
                      
                      {service.notes && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Note:</p>
                          <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                            {service.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end justify-center md:w-1/3 md:pl-4">
                      <div className="bg-white shadow-sm rounded-lg p-5 border border-gray-100 mb-4 w-full md:w-auto text-center md:text-right">
                        <p className="text-sm font-medium text-gray-500 mb-1">Importo da pagare</p>
                        <p className="text-3xl font-bold text-destructive">€{service.amount.toFixed(2)}</p>
                      </div>
                      
                      <Button 
                        onClick={() => handleMarkAsPaid(service.id)}
                        variant="default"
                        size="lg"
                        className="w-full md:w-auto font-semibold bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Receipt className="mr-2 h-5 w-5" />
                        Segna come pagato
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}