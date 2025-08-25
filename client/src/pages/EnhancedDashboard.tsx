import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
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
  Filter,
  BarChart3
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";

// Interfacce per i dati del dashboard migliorato
interface EnhancedMetrics {
  totalServices: number;
  weeklyServices: number;
  monthlyServices: number;
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  averageServiceValue: number;
  servicesByType: {
    siglatura: number;
    riparazione: number;
    happy_hour: number;
  };
  maintenanceStats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  trendData: {
    servicesGrowth: number;
    revenueGrowth: number;
    maintenanceGrowth: number;
  };
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function EnhancedDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  
  // Query per le metriche avanzate
  const { data: enhancedMetrics, isLoading } = useQuery<EnhancedMetrics>({
    queryKey: ['/api/dashboard/enhanced-metrics', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/enhanced-metrics?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Errore nel caricamento delle metriche');
      return response.json();
    },
  });

  // Azioni rapide
  const quickActions: QuickAction[] = [
    {
      title: "Nuovo Servizio",
      description: "Crea un nuovo servizio per uno studente",
      href: "/services/new",
      icon: Shirt,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Visualizza Pagamenti",
      description: "Gestisci pagamenti in sospeso",
      href: "/payments",
      icon: Euro,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Richieste Manutenzione",
      description: "Controlla richieste di manutenzione",
      href: "/maintenance",
      icon: Wrench,
      color: "bg-orange-500 hover:bg-orange-600"
    },
    {
      title: "Dati Storici",
      description: "Analizza i dati storici per anno",
      href: "/historical-data",
      icon: BarChart3,
      color: "bg-purple-500 hover:bg-purple-600"
    }
  ];

  const getTrendIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard Gestionale
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Panoramica completa delle attività ELIS
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Settimana</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Anno</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metriche Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="premium-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Servizi Totali
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {enhancedMetrics?.totalServices || 0}
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              {getTrendIcon(enhancedMetrics?.trendData.servicesGrowth || 0)}
              <span className={getTrendColor(enhancedMetrics?.trendData.servicesGrowth || 0)}>
                {enhancedMetrics?.trendData.servicesGrowth >= 0 ? '+' : ''}
                {enhancedMetrics?.trendData.servicesGrowth?.toFixed(1) || 0}%
              </span>
              <span className="ml-1">dal mese scorso</span>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ricavi Totali
            </CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(enhancedMetrics?.totalRevenue || 0)}
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              {getTrendIcon(enhancedMetrics?.trendData.revenueGrowth || 0)}
              <span className={getTrendColor(enhancedMetrics?.trendData.revenueGrowth || 0)}>
                {enhancedMetrics?.trendData.revenueGrowth >= 0 ? '+' : ''}
                {enhancedMetrics?.trendData.revenueGrowth?.toFixed(1) || 0}%
              </span>
              <span className="ml-1">crescita</span>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pagamenti in Sospeso
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {enhancedMetrics?.pendingPayments || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {enhancedMetrics?.completedPayments || 0} pagamenti completati
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card-gradient">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Valore Medio Servizio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(enhancedMetrics?.averageServiceValue || 0)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Media per servizio
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Azioni Rapide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link key={index} href={action.href}>
              <Card className="premium-card cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${action.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Statistiche per Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Servizi per Tipologia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium">Siglatura</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{enhancedMetrics?.servicesByType.siglatura || 0}</div>
                  <div className="text-xs text-gray-500">servizi</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm font-medium">Riparazione</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{enhancedMetrics?.servicesByType.riparazione || 0}</div>
                  <div className="text-xs text-gray-500">servizi</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm font-medium">Happy Hour</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{enhancedMetrics?.servicesByType.happy_hour || 0}</div>
                  <div className="text-xs text-gray-500">servizi</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stato Manutenzioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">In Attesa</span>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  {enhancedMetrics?.maintenanceStats.pending || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">In Corso</span>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {enhancedMetrics?.maintenanceStats.inProgress || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Completate</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {enhancedMetrics?.maintenanceStats.completed || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riepilogo Periodo */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Periodo Selezionato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {enhancedMetrics?.weeklyServices || enhancedMetrics?.monthlyServices || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Servizi nel {selectedPeriod === 'week' ? 'settimana' : 
                           selectedPeriod === 'month' ? 'mese' :
                           selectedPeriod === 'quarter' ? 'trimestre' : 'anno'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(enhancedMetrics?.weeklyRevenue || enhancedMetrics?.monthlyRevenue || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Ricavi del periodo
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {enhancedMetrics?.maintenanceStats.total || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Richieste manutenzione
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}