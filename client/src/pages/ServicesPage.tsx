import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ServiceList from "@/components/services/ServicesList";
import { Plus, Search, Filter, AlertTriangle, RefreshCw } from "lucide-react";
import { ServiceTypeValue, PaymentStatusValue } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function ServicesPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const { toast } = useToast();
  
  type FilterType = {
    query: string;
    type: ServiceTypeValue | "all";
    status: PaymentStatusValue | "all";
    page: number;
    limit: number;
  };
  
  const [filters, setFilters] = useState<FilterType>({
    query: searchParams.get("query") || "",
    type: (searchParams.get("type") as ServiceTypeValue | "all") || "all",
    status: (searchParams.get("status") as PaymentStatusValue | "all") || "all",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "10")
  });
  
  // Update filters when URL search params change
  useEffect(() => {
    console.log("URL search params changed:", search);
    const params = new URLSearchParams(search);
    setFilters({
      query: params.get("query") || "",
      type: (params.get("type") as ServiceTypeValue) || "all",
      status: (params.get("status") as PaymentStatusValue) || "all",
      page: parseInt(params.get("page") || "1"),
      limit: parseInt(params.get("limit") || "10")
    });
  }, [search]);

  // Fetch services with filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/services', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.query) params.append("query", filters.query);
      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.status !== "all") params.append("status", filters.status);
      params.append("page", filters.page.toString());
      params.append("limit", filters.limit.toString());
      
      const response = await fetch(`/api/services?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
    retry: 1, // Limitiamo i tentativi di retry
    retryDelay: 2000, // Aggiungiamo un ritardo tra i tentativi
    staleTime: 1000 * 60 * 5, // Cache valida per 5 minuti
    gcTime: 1000 * 60 * 10 // Mantieni i dati in cache per 10 minuti (in v5 di React Query si usa gcTime invece di cacheTime)
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    
    if (filters.query) newParams.set("query", filters.query);
    else newParams.delete("query");
    
    if (filters.type !== "all") newParams.set("type", filters.type);
    else newParams.delete("type");
    
    if (filters.status !== "all") newParams.set("status", filters.status);
    else newParams.delete("status");
    
    newParams.set("page", "1"); // Reset to first page on new search
    
    setLocation(`/services?${newParams.toString()}`);
  };

  const handleAddNewService = () => {
    setLocation("/services/new");
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", page.toString());
    setLocation(`/services?${newParams.toString()}`);
  };

  const serviceTypeLabels = {
    'all': 'Tutte le tipologie',
    'siglatura': 'Siglatura',
    'happy_hour': 'Happy Hour',
    'riparazione': 'Riparazione'
  };

  const paymentStatusLabels = {
    'all': 'Tutti i pagamenti',
    'paid': 'Pagato',
    'unpaid': 'Da pagare'
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-gray-800">Gestione Servizi</h2>
            <p className="text-gray-500 text-sm">Visualizza, aggiungi e modifica i servizi della Residenza ELIS</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button onClick={handleAddNewService}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Servizio
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col space-y-3">
          <div className="w-full">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input 
                placeholder="Cerca per sigla, tipologia..."
                className="pl-10"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select 
              value={filters.type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={serviceTypeLabels[filters.type] || "Tutte le tipologie"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le tipologie</SelectItem>
                <SelectItem value="siglatura">Siglatura</SelectItem>
                <SelectItem value="happy_hour">Happy Hour</SelectItem>
                <SelectItem value="riparazione">Riparazione</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={paymentStatusLabels[filters.status] || "Tutti i pagamenti"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i pagamenti</SelectItem>
                <SelectItem value="paid">Pagato</SelectItem>
                <SelectItem value="unpaid">Da pagare</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="col-span-2 md:col-span-2">
              <Button type="submit" variant="outline" className="w-full h-10">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                Filtra
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Services List */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Elenco Servizi</h3>
          <p className="text-sm text-gray-500">
            {isLoading ? (
              "Caricamento servizi..."
            ) : (
              `Visualizzazione di ${data?.services?.length || 0} su ${data?.total || 0} servizi totali`
            )}
          </p>
        </div>
        
        {isLoading ? (
          <div className="p-8">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="p-8">
            <Card className="border-amber-500">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Problema di connessione al database</h3>
                <p className="text-gray-500 mb-4">
                  Si è verificato un problema durante il caricamento dei servizi. 
                  Potrebbe essere un problema temporaneo con il database.
                </p>
                <Button 
                  variant="outline" 
                  className="flex items-center" 
                  onClick={() => {
                    refetch();
                    toast({
                      title: "Aggiornamento in corso",
                      description: "Stiamo provando a ricaricare i dati...",
                    });
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Riprova
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <ServiceList 
            services={data?.services || []} 
            total={data?.total || 0}
            currentPage={filters.page}
            limit={filters.limit}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
}
