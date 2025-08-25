import { Link, useLocation } from "wouter";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  Euro, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  Calendar,
  Users,
  Shirt,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import FloatingActionButton from "@/components/ui/floating-action-button";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

// Interfacce per il dashboard moderno
interface DashboardMetrics {
  totalServices: number;
  pendingPayments: number;
  siglaturaCount: number;
  happyHourCount: number;
  repairCount: number;
  totalAmount: number;
  pendingAmount: number;
}

interface RecentService {
  id: number;
  date: string;
  sigla: string;
  cognome: string;
  type: string;
  amount: number;
  status: string;
}

export default function ModernDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentDate = new Date();
  const currentMonth = format(currentDate, 'MMMM yyyy', { locale: it });
  
  // Stato per il filtro temporale
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [filterPeriod, setFilterPeriod] = useState<{startDate: Date, endDate: Date}>({
    startDate: startOfMonth(currentDate),
    endDate: endOfMonth(currentDate)
  });

  // Handler per il cambio periodo
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'month':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'quarter':
        const quarterStart = Math.floor(new Date().getMonth() / 3) * 3;
        startDate = new Date(new Date().getFullYear(), quarterStart, 1);
        endDate = new Date(new Date().getFullYear(), quarterStart + 3, 0);
        break;
      default:
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
    }

    setFilterPeriod({ startDate, endDate });
    toast({
      title: "Filtro applicato",
      description: `Periodo: ${period === 'week' ? 'Settimana' : period === 'month' ? 'Mese' : 'Trimestre'}`,
    });
  };

  // Parametri per le query
  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', filterPeriod.startDate.toISOString());
    queryParams.append('endDate', filterPeriod.endDate.toISOString());
    return queryParams.toString();
  }, [filterPeriod]);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) throw new Error('Errore nel caricamento delle metriche');
      return response.json();
    },
  });

  // Fetch recent services
  const { data: recentServices, isLoading: isLoadingServices } = useQuery<RecentService[]>({
    queryKey: ['/api/dashboard/recent-services', filterPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/recent-services?${queryString}`);
      if (!response.ok) throw new Error('Errore nel caricamento dei servizi recenti');
      return response.json();
    },
  });

  // Fetch pending payments
  const { data: pendingPayments, isLoading: isLoadingPendingPayments } = useQuery<RecentService[]>({
    queryKey: ['/api/dashboard/pending-payments', filterPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/pending-payments?${queryString}`);
      if (!response.ok) throw new Error('Errore nel caricamento dei pagamenti pendenti');
      return response.json();
    },
  });

  const handleAddNewService = () => {
    setLocation("/services/new");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="status-paid">Pagato</Badge>;
      case 'unpaid':
        return <Badge className="status-unpaid">Da Pagare</Badge>;
      default:
        return <Badge className="status-pending">In Attesa</Badge>;
    }
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
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoadingMetrics) {
    return (
      <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
        <div className="premium-card">
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 min-h-screen">
      {/* Premium Header */}
      <div className="premium-card border-0 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-600/10 to-pink-600/5 rounded-full -ml-12 -mb-12" />
        
        <div className="p-8 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border-2 border-white/20">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Dashboard ELIS
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    Sistema di Gestione della Residenza - {currentMonth}
                  </p>
                </div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30"></div>
                  <span className="text-gray-700 font-medium">Sistema Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/30"></div>
                  <span className="text-gray-700 font-medium">Dati in Tempo Reale</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">{format(new Date(), 'dd MMMM yyyy', { locale: it })}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0 flex flex-wrap gap-3">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-40 bg-white/80 border-gray-200/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Questa Settimana</SelectItem>
                  <SelectItem value="month">Questo Mese</SelectItem>
                  <SelectItem value="quarter">Questo Trimestre</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                className="bg-white/80 border-gray-200/60 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              
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

      {/* Modern Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="metric-card group">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Servizi Totali
              <Activity className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics?.totalServices || 0}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +12% dal mese scorso
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card group">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Ricavi Totali
              <Euro className="h-5 w-5 text-green-500 group-hover:scale-110 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatCurrency(metrics?.totalAmount || 0)}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              +8% crescita
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card group">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Pagamenti Pendenti
              <Clock className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {metrics?.pendingPayments || 0}
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(metrics?.pendingAmount || 0)} in sospeso
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card group">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Valore Medio
              <TrendingUp className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatCurrency((metrics?.totalAmount || 0) / (metrics?.totalServices || 1))}
            </div>
            <div className="text-sm text-gray-600">
              per servizio
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span>Servizi per Tipologia</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Shirt className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Siglatura</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{metrics?.siglaturaCount || 0}</div>
                <div className="text-xs text-gray-500">servizi</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Wrench className="h-5 w-5 text-orange-500" />
                <span className="font-medium">Riparazione</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{metrics?.repairCount || 0}</div>
                <div className="text-xs text-gray-500">servizi</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl">
              <div className="flex items-center space-x-3">
                <Zap className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Happy Hour</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{metrics?.happyHourCount || 0}</div>
                <div className="text-xs text-gray-500">servizi</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Services */}
        <Card className="premium-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-500" />
                <span>Servizi Recenti</span>
              </div>
              <Link href="/services">
                <Button variant="outline" size="sm">
                  Vedi Tutti
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingServices ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentServices?.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(service.type)}
                      <div>
                        <div className="font-medium">{service.sigla}</div>
                        <div className="text-sm text-gray-500">
                          {service.cognome || 'N/A'} • {format(new Date(service.date), 'dd/MM', { locale: it })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(service.amount)}</div>
                      {getStatusBadge(service.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/services/new">
          <Card className="premium-card cursor-pointer group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Nuovo Servizio</h3>
              <p className="text-sm text-gray-600">Aggiungi un nuovo servizio</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/payments">
          <Card className="premium-card cursor-pointer group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Euro className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Gestisci Pagamenti</h3>
              <p className="text-sm text-gray-600">Visualizza pagamenti pendenti</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/historical-data">
          <Card className="premium-card cursor-pointer group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Dati Storici</h3>
              <p className="text-sm text-gray-600">Analizza dati per anno</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/maintenance">
          <Card className="premium-card cursor-pointer group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Manutenzione</h3>
              <p className="text-sm text-gray-600">Gestisci richieste</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onClick={handleAddNewService}
        tooltip="Nuovo Servizio"
      />
    </div>
  );
}