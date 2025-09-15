import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MaintenanceRequest, MaintenanceRequestPriority, MaintenanceRequestStatus } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import {
  Search,
  Filter,
  RefreshCw,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Calendar,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import MaintenanceDetail from "@/components/maintenance/MaintenanceDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ModernMaintenancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  // Caricamento richieste di manutenzione
  const { data, isLoading, isError, refetch } = useQuery<{ requests: MaintenanceRequest[], total: number }>({
    queryKey: ["/api/maintenance", searchQuery, selectedStatus, selectedPriority, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (selectedPriority !== "all") params.append("priority", selectedPriority);
      params.append("page", currentPage.toString());
      
      const response = await fetch(`/api/maintenance?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Errore nel caricamento delle richieste di manutenzione");
      }
      return response.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / 10) : 0;

  // Funzioni per la gestione dei filtri
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  };

  const handlePriorityChange = (value: string) => {
    setSelectedPriority(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRequestSelect = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-500 text-white">Urgente</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">Media</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Bassa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="status-paid">Completata</Badge>;
      case 'in_progress':
        return <Badge className="status-pending">In Corso</Badge>;
      case 'pending':
        return <Badge className="status-unpaid">In Attesa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Statistiche rapide
  const stats = data ? {
    total: data.total,
    pending: data.requests.filter(r => r.status === 'pending').length,
    inProgress: data.requests.filter(r => r.status === 'in_progress').length,
    completed: data.requests.filter(r => r.status === 'completed').length,
    urgent: data.requests.filter(r => r.priority === 'urgent').length,
  } : { total: 0, pending: 0, inProgress: 0, completed: 0, urgent: 0 };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="premium-card">
          <div className="p-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
      {/* Premium Header */}
      <div className="premium-card border-0 bg-gradient-to-r from-white via-orange-50/30 to-amber-50/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-600/10 to-amber-600/5 rounded-full -mr-16 -mt-16" />
        
        <div className="p-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-orange-500/25 border-2 border-white/20">
                  <Wrench className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Manutenzione
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Gestisci tutte le richieste di manutenzione della Residenza
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/30"></div>
                  <span className="text-gray-700 font-medium">Urgenti: {stats.urgent}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-lg shadow-yellow-500/30"></div>
                  <span className="text-gray-700 font-medium">In Corso: {stats.inProgress}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{format(new Date(), 'dd MMMM yyyy', { locale: it })}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0">
              <Button 
                variant="outline" 
                className="bg-white/80 border-gray-200/60 hover:bg-gray-50"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="premium-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-blue-700">
              <span className="text-sm font-medium">Totale Richieste</span>
              <Wrench className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <p className="text-xs text-blue-600">richieste attive</p>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-red-50 to-orange-50 border-red-200/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-red-700">
              <span className="text-sm font-medium">In Attesa</span>
              <AlertTriangle className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
            <p className="text-xs text-red-600">da elaborare</p>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-yellow-700">
              <span className="text-sm font-medium">In Corso</span>
              <Clock className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-yellow-600">in lavorazione</p>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-green-700">
              <span className="text-sm font-medium">Completate</span>
              <CheckCircle className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-green-600">risolte</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-500" />
            <span>Filtri e Ricerca</span>
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
                    placeholder="Descrizione, ubicazione..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 premium-input"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Stato</label>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="premium-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="pending">In Attesa</SelectItem>
                    <SelectItem value="in_progress">In Corso</SelectItem>
                    <SelectItem value="completed">Completate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block text-gray-700">Priorità</label>
                <Select value={selectedPriority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="premium-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le priorità</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Bassa</SelectItem>
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

      {/* Requests List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              <span>Richieste di Manutenzione</span>
              {data && (
                <Badge variant="outline" className="ml-2">
                  {data.requests.length} di {data.total}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-12 w-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : data?.requests && data.requests.length > 0 ? (
            <div className="space-y-3">
              {data.requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white via-orange-50/20 to-amber-50/20 rounded-xl border border-orange-100/60 hover:shadow-md transition-all duration-200 group cursor-pointer" onClick={() => handleRequestSelect(request)}>
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {getPriorityIcon(request.priority)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <span className="font-semibold text-gray-900">{request.description}</span>
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{request.requesterName || "N/D"}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{request.location}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{
                            (() => {
                              try {
                                const date = new Date(request.timestamp);
                                if (!isNaN(date.getTime())) {
                                  return format(date, 'dd/MM/yyyy HH:mm', { locale: it });
                                }
                                return 'Data non valida';
                              } catch {
                                return 'Data non disponibile';
                              }
                            })()
                          }</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestSelect(request);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Dettagli
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna richiesta trovata</h3>
              <p className="text-gray-600">Non ci sono richieste di manutenzione che corrispondono ai filtri selezionati.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Pagina {currentPage} di {totalPages} - Totale: {data?.total || 0} richieste
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={pageNum === currentPage ? "btn-premium" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Successiva
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Detail Dialog */}
      {selectedRequest && (
        <MaintenanceDetail
          request={selectedRequest}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedRequest(null);
          }}
          onStatusChange={() => {
            refetch();
            toast({
              title: "Richiesta aggiornata",
              description: "La richiesta di manutenzione è stata aggiornata con successo.",
            });
          }}
        />
      )}

      {/* Error State */}
      {isError && (
        <Card className="premium-card border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-900">Errore nel caricamento</h3>
                <p className="text-red-700 text-sm mt-1">Si è verificato un errore durante il caricamento delle richieste.</p>
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