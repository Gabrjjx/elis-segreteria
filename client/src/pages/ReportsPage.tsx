import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { BarChart, LineChart, PieChart, FileDown } from "lucide-react";
import { ServiceType, PaymentStatus } from "@shared/schema";
import { getServiceTypeLabel, getPaymentStatusLabel, formatDate, formatAmount } from "@/lib/utils/services";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("monthly");
  const [month, setMonth] = useState<Date>(new Date());
  const [serviceType, setServiceType] = useState("all");
  
  // Get all services for reports
  const { data: services, isLoading } = useQuery({
    queryKey: ['/api/services', { limit: 500 }],
  });
  
  // Compute filtered services based on selected filters
  const filteredServices = services?.services?.filter(service => {
    // Filter by month if monthly report is selected
    if (reportType === "monthly") {
      const serviceDate = new Date(service.date);
      const isInSameMonth = serviceDate.getMonth() === month.getMonth() && 
                             serviceDate.getFullYear() === month.getFullYear();
      if (!isInSameMonth) return false;
    }
    
    // Filter by service type
    if (serviceType !== "all" && service.type !== serviceType) {
      return false;
    }

    return true;
  }) || [];

  // Compute statistics
  const totalServices = filteredServices.length;
  const totalAmount = filteredServices.reduce((sum, service) => sum + service.amount, 0);
  const paidServices = filteredServices.filter(s => s.status === PaymentStatus.PAID);
  const paidAmount = paidServices.reduce((sum, service) => sum + service.amount, 0);
  const unpaidServices = filteredServices.filter(s => s.status === PaymentStatus.UNPAID);
  const unpaidAmount = unpaidServices.reduce((sum, service) => sum + service.amount, 0);
  
  // Group by service type
  const servicesByType = filteredServices.reduce((acc, service) => {
    acc[service.type] = (acc[service.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by service status
  const servicesByStatus = filteredServices.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Table columns for data export
  const tableColumns = [
    { accessorKey: 'date', header: 'Data', cell: (item: any) => formatDate(item.date) },
    { accessorKey: 'sigla', header: 'Sigla' },
    { accessorKey: 'type', header: 'Tipologia', cell: (item: any) => getServiceTypeLabel(item.type) },
    { accessorKey: 'pieces', header: 'Pezzi' },
    { accessorKey: 'amount', header: 'Importo', cell: (item: any) => formatAmount(item.amount) },
    { accessorKey: 'status', header: 'Stato', cell: (item: any) => getPaymentStatusLabel(item.status) },
  ];

  // Handler for exporting data to CSV
  const handleExportCSV = () => {
    if (!filteredServices.length) return;
    
    const headers = tableColumns.map(col => col.header).join(',');
    const rows = filteredServices.map(service => {
      return [
        formatDate(service.date),
        service.sigla,
        getServiceTypeLabel(service.type),
        service.pieces,
        service.amount.toFixed(2),
        getPaymentStatusLabel(service.status)
      ].join(',');
    }).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `report-servizi-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-semibold text-gray-800">Report e Statistiche</h2>
            <p className="text-gray-500 text-sm">Visualizza e analizza i dati dei servizi della Residenza ELIS</p>
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipo di Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={reportType}
              onValueChange={setReportType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Report Mensile</SelectItem>
                <SelectItem value="all">Report Completo</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        {reportType === "monthly" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seleziona Mese</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={month}
                onSelect={(date) => date && setMonth(date)}
                classNames={{
                  root: "w-full",
                  table: "w-full",
                  head_cell: "text-muted-foreground",
                  day: "p-0 h-7 w-7",
                  caption: "text-sm",
                }}
                ISOWeek
                locale={it}
                disabled={{ after: new Date() }}
                month={month}
                onMonthChange={setMonth}
                captionLayout="dropdown"
                fromMonth={new Date(2020, 0)}
                toMonth={new Date()}
              />
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtra per Tipologia</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={serviceType}
              onValueChange={setServiceType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le tipologie</SelectItem>
                <SelectItem value={ServiceType.SIGLATURA}>Siglatura</SelectItem>
                <SelectItem value={ServiceType.HAPPY_HOUR}>Happy Hour</SelectItem>
                <SelectItem value={ServiceType.RIPARAZIONE}>Riparazione</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
      
      {/* Report Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totale Servizi</CardTitle>
            <CardDescription>
              {reportType === "monthly" 
                ? `${format(month, 'MMMM yyyy', { locale: it })}`
                : "Tutti i periodi"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold">{totalServices}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Importo Totale</CardTitle>
            <CardDescription>
              {serviceType === "all" 
                ? "Tutte le tipologie" 
                : getServiceTypeLabel(serviceType)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <div className="text-3xl font-bold text-primary">€{totalAmount.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stato Pagamenti</CardTitle>
            <CardDescription>Pagati vs. Da Pagare</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-500">Pagati</div>
                  <div className="text-xl font-semibold text-success">€{paidAmount.toFixed(2)}</div>
                  <div className="text-sm text-success">{paidServices.length} servizi</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Da Pagare</div>
                  <div className="text-xl font-semibold text-destructive">€{unpaidAmount.toFixed(2)}</div>
                  <div className="text-sm text-destructive">{unpaidServices.length} servizi</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Report Tabs */}
      <Tabs defaultValue="table" className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="table" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Tabella
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Distribuzione
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center">
              <LineChart className="h-4 w-4 mr-2" />
              Andamento
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={!filteredServices.length}>
            <FileDown className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
        </div>
        
        <TabsContent value="table" className="space-y-4 bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">
            {reportType === "monthly" 
              ? `Report ${format(month, 'MMMM yyyy', { locale: it })}`
              : "Report Completo"}
            {serviceType !== "all" && ` - ${getServiceTypeLabel(serviceType)}`}
          </h3>
          
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nessun dato disponibile per i criteri selezionati</p>
            </div>
          ) : (
            <DataTable
              columns={tableColumns}
              data={filteredServices}
              keyExtractor={(item) => item.id}
              searchable
              pagination
              itemsPerPage={10}
            />
          )}
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuzione per Tipologia</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : Object.keys(servicesByType).length === 0 ? (
                  <p className="text-gray-500">Nessun dato disponibile</p>
                ) : (
                  <div className="w-full h-full">
                    {/* Qui andrebbe un grafico a torta, ma per semplicità mostreremo dati testuali */}
                    {Object.entries(servicesByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            type === ServiceType.SIGLATURA 
                              ? 'bg-blue-500' 
                              : type === ServiceType.HAPPY_HOUR 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}></div>
                          <span>{getServiceTypeLabel(type)}</span>
                        </div>
                        <div className="font-semibold">{count} ({Math.round(count / totalServices * 100)}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuzione per Stato Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : Object.keys(servicesByStatus).length === 0 ? (
                  <p className="text-gray-500">Nessun dato disponibile</p>
                ) : (
                  <div className="w-full h-full">
                    {/* Qui andrebbe un grafico a torta, ma per semplicità mostreremo dati testuali */}
                    {Object.entries(servicesByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            status === PaymentStatus.PAID 
                              ? 'bg-green-500' 
                              : 'bg-red-500'
                          }`}></div>
                          <span>{getPaymentStatusLabel(status)}</span>
                        </div>
                        <div className="font-semibold">{count} ({Math.round(count / totalServices * 100)}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Andamento temporale</CardTitle>
              <CardDescription>Evoluzione dei servizi nel tempo</CardDescription>
            </CardHeader>
            <CardContent className="h-80 p-6">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : filteredServices.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">Nessun dato disponibile per i criteri selezionati</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <p className="text-gray-500 mb-4">I grafici di andamento saranno implementati in una versione successiva.</p>
                  <p className="text-sm text-gray-400">Intanto puoi esportare i dati ed elaborarli in Excel.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}