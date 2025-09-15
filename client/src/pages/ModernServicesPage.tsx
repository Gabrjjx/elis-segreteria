import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  RefreshCw, 
  Shirt,
  Wrench,
  Zap,
  Euro,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { ServiceTypeValue, PaymentStatusValue, ServiceWithStudent } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Utility function to format student name with fallback
const formatStudentName = (student?: { firstName: string; lastName: string; email?: string; phone?: string } | null): string => {
  if (!student?.firstName) return 'Senza studente';
  return `${student.firstName} ${student.lastName}`;
};

interface ServiceResponse {
  services: ServiceWithStudent[];
  total: number;
}

export default function ModernServicesPage() {
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
  const { data, isLoading, error, refetch } = useQuery<ServiceResponse>({
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
    retry: 1,
    retryDelay: 2000,
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
    
    newParams.set("page", "1");
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'siglatura':
        return <Shirt className="h-4 w-4 text-blue-500" />;
      case 'riparazione':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'happy_hour':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="status-paid text-xs">Pagato</Badge>;
      case 'unpaid':
        return <Badge className="status-unpaid text-xs">Da Pagare</Badge>;
      default:
        return <Badge className="status-pending text-xs">In Attesa</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const totalPages = Math.ceil((data?.total || 0) / filters.limit);

  if (isLoading && !data) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="premium-card">
          <div className="p-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
      {/* Premium Header */}
      <div className="premium-card border-0 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-full -mr-16 -mt-16" />
        
        <div className="p-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border-2 border-white/20">
                  <Shirt className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Gestione Servizi
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Sistema completo per la gestione dei servizi della Residenza ELIS
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">Totale Servizi: {data?.total || 0}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{format(new Date(), 'dd MMMM yyyy', { locale: it })}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0">
              <Button 
                className="btn-premium text-white border-0 shadow-lg shadow-blue-500/25"
                onClick={handleAddNewService}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Servizio
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-500" />
            <span>Filtri di Ricerca</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Cerca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Sigla, nome studente, email, note..."
                    value={filters.query}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    className="pl-9 premium-input"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Tipologia</label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as ServiceTypeValue | "all" }))}>
                  <SelectTrigger className="premium-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le tipologie</SelectItem>
                    <SelectItem value="siglatura">Siglatura</SelectItem>
                    <SelectItem value="happy_hour">Happy Hour</SelectItem>
                    <SelectItem value="riparazione">Riparazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Stato Pagamento</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as PaymentStatusValue | "all" }))}>
                  <SelectTrigger className="premium-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="paid">Pagato</SelectItem>
                    <SelectItem value="unpaid">Da Pagare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button type="submit" className="w-full btn-premium">
                  <Search className="mr-2 h-4 w-4" />
                  Cerca
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shirt className="h-5 w-5 text-blue-500" />
              <span>Elenco Servizi</span>
              {data && (
                <Badge variant="outline" className="ml-2">
                  {data.total} servizi trovati
                </Badge>
              )}
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading} size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : data?.services && data.services.length > 0 ? (
            <div className="space-y-3">
              {data.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50/50 rounded-xl border border-gray-100/60 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {getTypeIcon(service.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-bold text-lg text-gray-900">{service.sigla}</span>
                        {getStatusBadge(service.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <div>
                            <span>{formatStudentName(service.student)}</span>
                            {service.student?.email && (
                              <div className="text-xs text-gray-400 mt-1">
                                📧 {service.student.email}
                              </div>
                            )}
                          </div>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(service.date), 'dd/MM/yyyy', { locale: it })}</span>
                        </span>
                        <span className="capitalize font-medium text-gray-700">
                          {service.type === 'siglatura' ? 'Siglatura' : 
                           service.type === 'riparazione' ? 'Riparazione' :
                           service.type === 'happy_hour' ? 'Happy Hour' : service.type}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {formatCurrency(service.amount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {service.pieces} {service.pieces === 1 ? 'pezzo' : 'pezzi'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/services/${service.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/services/${service.id}/edit`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun servizio trovato</h3>
              <p className="text-gray-600 mb-6">Non ci sono servizi che corrispondono ai criteri di ricerca.</p>
              <Button onClick={handleAddNewService} className="btn-premium">
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi il primo servizio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Pagination */}
      {totalPages > 1 && (
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {filters.page} di {totalPages} - Totale: {data?.total || 0} servizi
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === filters.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={pageNum === filters.page ? "btn-premium" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                >
                  Successiva
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="premium-card border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-900">Errore nel caricamento</h3>
                <p className="text-red-700 text-sm mt-1">Si è verificato un errore durante il caricamento dei servizi. Riprova più tardi.</p>
              </div>
              <Button variant="outline" onClick={() => refetch()} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}