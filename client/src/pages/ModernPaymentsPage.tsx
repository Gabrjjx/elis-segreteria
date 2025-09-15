import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Euro, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  User,
  Hash,
  CreditCard,
  Clock,
  Shirt,
  Wrench,
  Zap,
  Eye,
  Check,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceWithStudent } from "@shared/schema";

// Utility function to format student name with fallback
const formatStudentName = (student?: { firstName: string; lastName: string; email?: string; phone?: string } | null): string => {
  if (!student?.firstName) return 'Senza studente';
  return `${student.firstName} ${student.lastName}`;
};

interface ServicesResponse {
  services: ServiceWithStudent[];
  total: number;
}

export default function ModernPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unpaid services
  const { data, isLoading, error, refetch } = useQuery<ServicesResponse>({
    queryKey: ['/api/services', { status: 'unpaid', limit: 1000 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'unpaid',
        limit: '1000',
        page: '1'
      });
      const response = await fetch(`/api/services?${params}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei pagamenti');
      }
      return response.json();
    },
  });

  // Mark service as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("PATCH", `/api/services/${serviceId}/mark-paid`, {});
    },
    onSuccess: () => {
      toast({
        title: "Pagamento confermato",
        description: "Il servizio è stato marcato come pagato",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error) => {
      console.error("Errore nel marcamento del pagamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile confermare il pagamento",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsPaid = (serviceId: number) => {
    markAsPaidMutation.mutate(serviceId);
  };

  const filteredServices = data?.services?.filter(service => {
    const searchLower = searchTerm.toLowerCase();
    const studentName = formatStudentName(service.student);
    const studentEmail = service.student?.email || '';
    
    return service.sigla.toLowerCase().includes(searchLower) ||
           studentName.toLowerCase().includes(searchLower) ||
           studentEmail.toLowerCase().includes(searchLower);
  }) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'siglatura':
        return <Shirt className="h-4 w-4 text-blue-500" />;
      case 'riparazione':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      case 'happy_hour':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const totalUnpaidAmount = filteredServices.reduce((sum, service) => sum + service.amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="premium-card">
          <div className="p-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="space-y-4">
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
      <div className="premium-card border-0 bg-gradient-to-r from-white via-green-50/30 to-emerald-50/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-600/10 to-emerald-600/5 rounded-full -mr-16 -mt-16" />
        
        <div className="p-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-600 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/25 border-2 border-white/20">
                  <Euro className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 via-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Gestione Pagamenti
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Controlla e gestisci tutti i pagamenti in sospeso
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/30"></div>
                  <span className="text-gray-700 font-medium">Da Pagare: {filteredServices.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700 font-bold">{formatCurrency(totalUnpaidAmount)}</span>
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

      {/* Search and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-500" />
              <span>Ricerca Pagamenti</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cerca per sigla o nome studente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 premium-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card bg-gradient-to-br from-red-50 to-orange-50 border-red-200/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-red-700">
              <span>Totale Da Incassare</span>
              <AlertTriangle className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {formatCurrency(totalUnpaidAmount)}
            </div>
            <div className="text-sm text-red-600">
              {filteredServices.length} servizi in attesa
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span>Pagamenti in Sospeso</span>
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                {filteredServices.length}
              </Badge>
            </div>
            {filteredServices.length > 0 && (
              <div className="text-sm text-gray-600">
                Totale: {formatCurrency(totalUnpaidAmount)}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl animate-pulse">
                  <div className="h-12 w-12 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredServices.length > 0 ? (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white via-red-50/20 to-orange-50/20 rounded-xl border border-red-100/60 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {getTypeIcon(service.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-bold text-xl text-gray-900">{service.sigla}</span>
                        <Badge className="status-unpaid text-xs">Da Pagare</Badge>
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
                        <span className="flex items-center space-x-1 capitalize font-medium text-gray-700">
                          <Hash className="h-3 w-3" />
                          <span>
                            {service.type === 'siglatura' ? 'Siglatura' : 
                             service.type === 'riparazione' ? 'Riparazione' :
                             service.type === 'happy_hour' ? 'Happy Hour' : service.type}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {service.pieces} {service.pieces === 1 ? 'pezzo' : 'pezzi'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {formatCurrency(service.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        importo dovuto
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      size="sm" 
                      className="btn-success"
                      onClick={() => handleMarkAsPaid(service.id)}
                      disabled={markAsPaidMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Segna Pagato
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tutti i pagamenti sono in regola!</h3>
              <p className="text-gray-600">
                Non ci sono servizi in attesa di pagamento al momento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="premium-card border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="font-medium text-red-900">Errore nel caricamento</h3>
                <p className="text-red-700 text-sm mt-1">Si è verificato un errore durante il caricamento dei pagamenti.</p>
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