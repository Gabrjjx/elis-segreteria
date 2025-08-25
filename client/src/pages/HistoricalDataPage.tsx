import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download, Search, Filter, Clock, Euro, User, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Tipi per i dati storici
interface HistoricalService {
  id: number;
  date: string;
  sigla: string;
  cognome: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  notes?: string;
}

interface HistoricalMaintenanceRequest {
  id: number;
  timestamp: string;
  sigla?: string;
  place?: string;
  status: string;
  priority: string;
  defectDetails?: string;
  requesterName?: string;
}

interface HistoricalPayment {
  id: number;
  orderId: string;
  sigla: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface HistoricalDataResponse {
  services: HistoricalService[];
  maintenanceRequests: HistoricalMaintenanceRequest[];
  payments: HistoricalPayment[];
  totalServices: number;
  totalMaintenanceRequests: number;
  totalPayments: number;
}

export default function HistoricalDataPage() {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Query per ottenere i dati storici
  const { data: historicalData, isLoading } = useQuery<HistoricalDataResponse>({
    queryKey: ['/api/historical-data', selectedYear, searchTerm, serviceTypeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: selectedYear,
        ...(searchTerm && { search: searchTerm }),
        ...(serviceTypeFilter !== 'all' && { serviceType: serviceTypeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetch(`/api/historical-data?${params}`);
      if (!response.ok) throw new Error('Errore nel caricamento dei dati storici');
      return response.json();
    },
  });

  // Anni disponibili (ultimi 10 anni)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Funzione per l'export dei dati
  const handleExport = () => {
    if (!historicalData) return;
    
    // Creare CSV con tutti i dati
    const csvData = [
      ['Tipo', 'ID', 'Data', 'Sigla', 'Descrizione', 'Importo', 'Stato', 'Note'],
      ...historicalData.services.map(service => [
        'Servizio',
        service.id.toString(),
        service.date,
        service.sigla,
        `${service.type} - ${service.cognome || ''}`,
        service.amount.toString(),
        service.status,
        service.notes || ''
      ]),
      ...historicalData.maintenanceRequests.map(request => [
        'Manutenzione',
        request.id.toString(),
        request.timestamp,
        request.sigla || '',
        `${request.place || ''} - ${request.defectDetails || ''}`,
        '',
        request.status,
        `Priorità: ${request.priority}`
      ]),
      ...historicalData.payments.map(payment => [
        'Pagamento',
        payment.id.toString(),
        payment.createdAt,
        payment.sigla,
        `${payment.customerName} - ${payment.paymentMethod}`,
        payment.amount.toString(),
        payment.status,
        payment.orderId
      ])
    ];

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dati_storici_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: it });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'paid': 'bg-green-100 text-green-800',
      'unpaid': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-orange-100 text-orange-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
    <div className="space-y-6">
      {/* Header con controlli */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dati Storici
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualizza e analizza tutti i dati storici del sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Esporta CSV
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Anno</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona anno" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Cerca</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca per sigla, nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo Servizio</label>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i tipi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="siglatura">Siglatura</SelectItem>
                  <SelectItem value="riparazione">Riparazione</SelectItem>
                  <SelectItem value="happy_hour">Happy Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Stato</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="paid">Pagato</SelectItem>
                  <SelectItem value="unpaid">Non Pagato</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Servizi Totali
              <User className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {historicalData?.totalServices || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Anno {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Richieste Manutenzione
              <Wrench className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {historicalData?.totalMaintenanceRequests || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Anno {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-600">
              Pagamenti
              <Euro className="h-4 w-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {historicalData?.totalPayments || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Anno {selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabelle dei dati */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="services">Servizi</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenzione</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riepilogo Generale - Anno {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Servizi</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {historicalData?.services?.length || 0}
                        </p>
                      </div>
                      <User className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Manutenzioni</p>
                        <p className="text-2xl font-bold text-green-800">
                          {historicalData?.maintenanceRequests?.length || 0}
                        </p>
                      </div>
                      <Wrench className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Pagamenti</p>
                        <p className="text-2xl font-bold text-purple-800">
                          {historicalData?.payments?.length || 0}
                        </p>
                      </div>
                      <Euro className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Attività Recenti</h3>
                  <div className="space-y-2">
                    {/* Combinare e ordinare tutti i record per data */}
                    {[
                      ...(historicalData?.services?.slice(0, 5).map(s => ({ type: 'servizio', data: s, date: s.date })) || []),
                      ...(historicalData?.maintenanceRequests?.slice(0, 5).map(m => ({ type: 'manutenzione', data: m, date: m.timestamp })) || []),
                      ...(historicalData?.payments?.slice(0, 5).map(p => ({ type: 'pagamento', data: p, date: p.createdAt })) || [])
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 8)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            {item.type === 'servizio' && <User className="h-4 w-4 text-blue-500" />}
                            {item.type === 'manutenzione' && <Wrench className="h-4 w-4 text-green-500" />}
                            {item.type === 'pagamento' && <Euro className="h-4 w-4 text-purple-500" />}
                            
                            <div>
                              <p className="text-sm font-medium">
                                {item.type === 'servizio' && `Servizio - ${(item.data as HistoricalService).sigla}`}
                                {item.type === 'manutenzione' && `Manutenzione - ${(item.data as HistoricalMaintenanceRequest).sigla || 'N/A'}`}
                                {item.type === 'pagamento' && `Pagamento - ${(item.data as HistoricalPayment).sigla}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(item.date)}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            {item.type === 'servizio' && getStatusBadge((item.data as HistoricalService).status)}
                            {item.type === 'manutenzione' && getStatusBadge((item.data as HistoricalMaintenanceRequest).status)}
                            {item.type === 'pagamento' && getStatusBadge((item.data as HistoricalPayment).status)}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servizi - Anno {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Sigla</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Cognome</th>
                      <th className="text-left p-2">Importo</th>
                      <th className="text-left p-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData?.services?.map((service) => (
                      <tr key={service.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formatDate(service.date)}</td>
                        <td className="p-2 font-mono">{service.sigla}</td>
                        <td className="p-2">{service.type}</td>
                        <td className="p-2">{service.cognome || '-'}</td>
                        <td className="p-2">€{service.amount.toFixed(2)}</td>
                        <td className="p-2">{getStatusBadge(service.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Richieste Manutenzione - Anno {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Sigla</th>
                      <th className="text-left p-2">Luogo</th>
                      <th className="text-left p-2">Priorità</th>
                      <th className="text-left p-2">Stato</th>
                      <th className="text-left p-2">Descrizione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData?.maintenanceRequests?.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formatDate(request.timestamp)}</td>
                        <td className="p-2 font-mono">{request.sigla || '-'}</td>
                        <td className="p-2">{request.place || '-'}</td>
                        <td className="p-2">
                          <Badge className={
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }>
                            {request.priority}
                          </Badge>
                        </td>
                        <td className="p-2">{getStatusBadge(request.status)}</td>
                        <td className="p-2 max-w-xs truncate">{request.defectDetails || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagamenti - Anno {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Sigla</th>
                      <th className="text-left p-2">Cliente</th>
                      <th className="text-left p-2">Metodo</th>
                      <th className="text-left p-2">Importo</th>
                      <th className="text-left p-2">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData?.payments?.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formatDate(payment.createdAt)}</td>
                        <td className="p-2 font-mono">{payment.sigla}</td>
                        <td className="p-2">{payment.customerName}</td>
                        <td className="p-2">{payment.paymentMethod}</td>
                        <td className="p-2">€{payment.amount.toFixed(2)}</td>
                        <td className="p-2">{getStatusBadge(payment.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}