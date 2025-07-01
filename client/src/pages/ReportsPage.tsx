import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, getMonth, getYear, isEqual, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  FileDown, 
  Calendar as CalendarIcon,
  Filter, 
  ChevronDown,
  ChevronsUpDown
} from "lucide-react";

// Importazioni per i grafici con recharts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { ServiceType, PaymentStatus, type Service } from "@shared/schema";
import { getServiceTypeLabel, getPaymentStatusLabel, formatDate, formatAmount } from "@/lib/utils/services";

interface ReportFilters {
  dateRange: "current_month" | "last_month" | "last_3_months" | "last_6_months" | "custom" | "all";
  startDate: Date | null;
  endDate: Date | null;
  serviceType: string;
  paymentStatus: string;
}

interface DataPoint {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export default function ReportsPage() {
  // Report filters state - default to "all" to show all data
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "all",
    startDate: null,
    endDate: null,
    serviceType: "all",
    paymentStatus: "all"
  });
  
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Get all services for reports
  const { data: services, isLoading } = useQuery<{ services: Service[], total: number }>({
    queryKey: ['/api/services', { limit: 500 }],
  });
  
  // Update date range based on selection
  const updateDateRange = (range: ReportFilters['dateRange']) => {
    const today = new Date();
    let startDate = null;
    let endDate = null;
    
    switch (range) {
      case "current_month":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case "last_month":
        startDate = startOfMonth(subMonths(today, 1));
        endDate = endOfMonth(subMonths(today, 1));
        break;
      case "last_3_months":
        startDate = startOfMonth(subMonths(today, 2));
        endDate = endOfMonth(today);
        break;
      case "last_6_months":
        startDate = startOfMonth(subMonths(today, 5));
        endDate = endOfMonth(today);
        break;
      case "all":
        startDate = null;
        endDate = null;
        break;
      case "custom":
        // Keep existing dates for custom
        return setFilters(prev => ({
          ...prev,
          dateRange: range,
          showCalendar: true
        }));
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: range,
      startDate,
      endDate
    }));
  };
  
  // Compute filtered services based on selected filters
  const filteredServices = React.useMemo(() => {
    if (!services?.services) return [];
    
    return services.services.filter((service: Service) => {
      // Filter by date range
      if (filters.startDate && filters.endDate) {
        const serviceDate = new Date(service.date);
        if (serviceDate < filters.startDate || serviceDate > filters.endDate) {
          return false;
        }
      }
      
      // Filter by service type
      if (filters.serviceType !== "all" && service.type !== filters.serviceType) {
        return false;
      }
      
      // Filter by payment status
      if (filters.paymentStatus !== "all" && service.status !== filters.paymentStatus) {
        return false;
      }
      
      return true;
    });
  }, [services, filters]);

  // Compute statistics
  const stats = React.useMemo(() => {
    const totalServices = filteredServices.length;
    const totalAmount = filteredServices.reduce((sum: number, service: Service) => sum + service.amount, 0);
    const paidServices = filteredServices.filter((s: Service) => s.status === PaymentStatus.PAID);
    const paidAmount = paidServices.reduce((sum: number, service: Service) => sum + service.amount, 0);
    const unpaidServices = filteredServices.filter((s: Service) => s.status === PaymentStatus.UNPAID);
    const unpaidAmount = unpaidServices.reduce((sum: number, service: Service) => sum + service.amount, 0);
    
    return {
      totalServices,
      totalAmount,
      paidServices: paidServices.length,
      paidAmount,
      unpaidServices: unpaidServices.length,
      unpaidAmount
    };
  }, [filteredServices]);
  
  // Compute type distribution data for visualization
  const typeDistribution = React.useMemo(() => {
    const typeCount = filteredServices.reduce((acc: Record<string, number>, service: Service) => {
      acc[service.type] = (acc[service.type] || 0) + 1;
      return acc;
    }, {});
    
    const typeAmount = filteredServices.reduce((acc: Record<string, number>, service: Service) => {
      acc[service.type] = (acc[service.type] || 0) + service.amount;
      return acc;
    }, {});
    
    const typeColors = {
      [ServiceType.SIGLATURA]: "#3b82f6", // blue
      [ServiceType.HAPPY_HOUR]: "#eab308", // yellow
      [ServiceType.RIPARAZIONE]: "#22c55e", // green
    };
    
    const countData: DataPoint[] = Object.entries(typeCount).map(([type, count]) => ({
      label: getServiceTypeLabel(type),
      value: count,
      percentage: Math.round(count / (filteredServices.length || 1) * 100),
      color: typeColors[type as keyof typeof typeColors] || "#9ca3af"
    }));
    
    const amountData: DataPoint[] = Object.entries(typeAmount).map(([type, amount]) => ({
      label: getServiceTypeLabel(type),
      value: amount,
      percentage: Math.round(amount / (stats.totalAmount || 1) * 100),
      color: typeColors[type as keyof typeof typeColors] || "#9ca3af"
    }));
    
    return { countData, amountData };
  }, [filteredServices, stats.totalAmount]);
  
  // Compute payment status distribution
  const statusDistribution = React.useMemo(() => {
    const statusCount = filteredServices.reduce((acc: Record<string, number>, service: Service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {});
    
    const statusAmount = filteredServices.reduce((acc: Record<string, number>, service: Service) => {
      acc[service.status] = (acc[service.status] || 0) + service.amount;
      return acc;
    }, {});
    
    const statusColors = {
      [PaymentStatus.PAID]: "#22c55e", // green
      [PaymentStatus.UNPAID]: "#ef4444", // red
    };
    
    const countData: DataPoint[] = Object.entries(statusCount).map(([status, count]) => ({
      label: getPaymentStatusLabel(status),
      value: count,
      percentage: Math.round(count / (filteredServices.length || 1) * 100),
      color: statusColors[status as keyof typeof statusColors] || "#9ca3af"
    }));
    
    const amountData: DataPoint[] = Object.entries(statusAmount).map(([status, amount]) => ({
      label: getPaymentStatusLabel(status),
      value: amount,
      percentage: Math.round(amount / (stats.totalAmount || 1) * 100),
      color: statusColors[status as keyof typeof statusColors] || "#9ca3af"
    }));
    
    return { countData, amountData };
  }, [filteredServices, stats.totalAmount]);
  
  // Compute service trend data (monthly aggregation)
  const trendData = React.useMemo(() => {
    if (!filteredServices.length) return [];
    
    // Group services by month
    const servicesByMonth: Record<string, { 
      count: Record<string, number>, 
      amount: Record<string, number> 
    }> = {};
    
    // Sort services by date first
    const sortedServices = [...filteredServices].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Process each service
    sortedServices.forEach(service => {
      const date = new Date(service.date);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM yyyy', { locale: it });
      
      if (!servicesByMonth[monthKey]) {
        servicesByMonth[monthKey] = { 
          count: {
            [ServiceType.SIGLATURA]: 0,
            [ServiceType.HAPPY_HOUR]: 0,
            [ServiceType.RIPARAZIONE]: 0,
            total: 0
          }, 
          amount: {
            [ServiceType.SIGLATURA]: 0,
            [ServiceType.HAPPY_HOUR]: 0,
            [ServiceType.RIPARAZIONE]: 0,
            total: 0
          },
          label: monthLabel
        };
      }
      
      // Increment counters
      servicesByMonth[monthKey].count[service.type] = 
        (servicesByMonth[monthKey].count[service.type] || 0) + 1;
      servicesByMonth[monthKey].count.total += 1;
      
      // Add amounts
      servicesByMonth[monthKey].amount[service.type] = 
        (servicesByMonth[monthKey].amount[service.type] || 0) + service.amount;
      servicesByMonth[monthKey].amount.total += service.amount;
    });
    
    // Convert to array suitable for charts
    return Object.entries(servicesByMonth)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, data]) => ({
        name: data.label,
        // Service counts
        [getServiceTypeLabel(ServiceType.SIGLATURA)]: data.count[ServiceType.SIGLATURA],
        [getServiceTypeLabel(ServiceType.HAPPY_HOUR)]: data.count[ServiceType.HAPPY_HOUR],
        [getServiceTypeLabel(ServiceType.RIPARAZIONE)]: data.count[ServiceType.RIPARAZIONE],
        // Total for line chart
        Totale: data.count.total,
        // For tooltip display
        amount: data.amount.total
      }));
  }, [filteredServices]);
  
  // Table columns for data export
  const tableColumns = [
    { 
      accessorKey: 'date' as const, 
      header: 'Data', 
      cell: (item: Service) => formatDate(item.date) 
    },
    { 
      accessorKey: 'sigla' as const, 
      header: 'Sigla' 
    },
    { 
      accessorKey: 'type' as const, 
      header: 'Tipologia', 
      cell: (item: Service) => getServiceTypeLabel(item.type) 
    },
    { 
      accessorKey: 'pieces' as const, 
      header: 'Pezzi' 
    },
    { 
      accessorKey: 'amount' as const, 
      header: 'Importo', 
      cell: (item: Service) => formatAmount(item.amount) 
    },
    { 
      accessorKey: 'status' as const, 
      header: 'Stato', 
      cell: (item: Service) => getPaymentStatusLabel(item.status) 
    },
    { 
      accessorKey: 'notes' as const, 
      header: 'Note' 
    },
  ];

  // Handler for exporting data to CSV
  const handleExportCSV = () => {
    if (!filteredServices.length) return;
    
    const headers = tableColumns.map(col => col.header).join(',');
    const rows = filteredServices.map((service: Service) => {
      return [
        formatDate(service.date),
        service.sigla,
        getServiceTypeLabel(service.type),
        service.pieces,
        service.amount.toFixed(2),
        getPaymentStatusLabel(service.status),
        service.notes || ""
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

  // Get date range display text
  const getDateRangeText = () => {
    switch (filters.dateRange) {
      case "current_month":
        return `Mese corrente (${format(new Date(), 'MMMM yyyy', { locale: it })})`;
      case "last_month":
        return `Mese scorso (${format(subMonths(new Date(), 1), 'MMMM yyyy', { locale: it })})`;
      case "last_3_months":
        return "Ultimi 3 mesi";
      case "last_6_months":
        return "Ultimi 6 mesi";
      case "custom":
        return filters.startDate && filters.endDate
          ? `Dal ${format(filters.startDate, 'dd/MM/yyyy')} al ${format(filters.endDate, 'dd/MM/yyyy')}`
          : "Periodo personalizzato";
      case "all":
        return "Tutti i periodi";
      default:
        return "Seleziona periodo";
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Report e Statistiche</h2>
          <p className="text-gray-500 text-sm">Analisi dei servizi della Residenza ELIS</p>
        </div>
        <Button className="flex items-center" onClick={handleExportCSV} disabled={!filteredServices.length}>
          <FileDown className="h-4 w-4 mr-2" />
          Esporta CSV
        </Button>
      </div>
      
      {/* Filters Panel */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filtri Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periodo</label>
              <div className="flex flex-col space-y-2">
                <Select
                  value={filters.dateRange}
                  onValueChange={(value) => updateDateRange(value as ReportFilters['dateRange'])}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span className="truncate">{getDateRangeText()}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i periodi</SelectItem>
                    <SelectItem value="last_6_months">Ultimi 6 mesi</SelectItem>
                    <SelectItem value="last_3_months">Ultimi 3 mesi</SelectItem>
                    <SelectItem value="last_month">Mese scorso</SelectItem>
                    <SelectItem value="current_month">Mese corrente</SelectItem>
                    <SelectItem value="custom">Periodo personalizzato</SelectItem>
                  </SelectContent>
                </Select>

                {filters.dateRange === "custom" && (
                  <div className="flex space-x-2 pt-2">
                    <div className="space-y-1 w-1/2">
                      <label className="text-xs font-medium">Data inizio</label>
                      <Calendar
                        mode="single"
                        selected={filters.startDate || undefined}
                        onSelect={(date) => 
                          setFilters(prev => ({ 
                            ...prev, 
                            startDate: date || null 
                          }))
                        }
                        disabled={(date) => 
                          filters.endDate ? date > filters.endDate : false
                        }
                        initialFocus
                      />
                    </div>
                    <div className="space-y-1 w-1/2">
                      <label className="text-xs font-medium">Data fine</label>
                      <Calendar
                        mode="single"
                        selected={filters.endDate || undefined}
                        onSelect={(date) => 
                          setFilters(prev => ({ 
                            ...prev, 
                            endDate: date || null 
                          }))
                        }
                        disabled={(date) => 
                          filters.startDate ? date < filters.startDate : false
                        }
                        initialFocus
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Service Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo Servizio</label>
              <Select
                value={filters.serviceType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, serviceType: value }))}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>
                      {filters.serviceType === "all" 
                        ? "Tutti i tipi" 
                        : getServiceTypeLabel(filters.serviceType)
                      }
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value={ServiceType.SIGLATURA}>Siglatura</SelectItem>
                  <SelectItem value={ServiceType.HAPPY_HOUR}>Happy Hour</SelectItem>
                  <SelectItem value={ServiceType.RIPARAZIONE}>Riparazione</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stato Pagamento</label>
              <Select
                value={filters.paymentStatus}
                onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <ChevronsUpDown className="h-4 w-4 mr-2" />
                    <span>
                      {filters.paymentStatus === "all" 
                        ? "Tutti gli stati" 
                        : getPaymentStatusLabel(filters.paymentStatus)
                      }
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value={PaymentStatus.PAID}>Pagato</SelectItem>
                  <SelectItem value={PaymentStatus.UNPAID}>Da Pagare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Totale Servizi</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{stats.totalServices}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Importo Totale</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-3xl font-bold text-primary">€{stats.totalAmount.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pagati</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-success">€{stats.paidAmount.toFixed(2)}</div>
                <div className="text-sm text-success">{stats.paidServices} servizi</div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Da Pagare</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-destructive">€{stats.unpaidAmount.toFixed(2)}</div>
                <div className="text-sm text-destructive">{stats.unpaidServices} servizi</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Report Content */}
      <Tabs defaultValue="data" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="data" className="flex items-center">
            <BarChart className="h-4 w-4 mr-2" />
            Dati
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center">
            <PieChart className="h-4 w-4 mr-2" />
            Grafici
          </TabsTrigger>
        </TabsList>
        
        {/* Table View */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Elenco Servizi {getDateRangeText()}
                {filters.serviceType !== "all" && ` - ${getServiceTypeLabel(filters.serviceType)}`}
                {filters.paymentStatus !== "all" && ` - ${getPaymentStatusLabel(filters.paymentStatus)}`}
              </CardTitle>
              <CardDescription>
                {filteredServices.length} servizi trovati per un totale di €{stats.totalAmount.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nessun dato disponibile per i criteri selezionati</p>
                </div>
              ) : (
                <DataTable
                  columns={tableColumns}
                  data={filteredServices}
                  keyExtractor={(item: Service) => item.id}
                  searchable
                  pagination
                  itemsPerPage={15}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Charts View */}
        <TabsContent value="charts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisi per Tipologia</CardTitle>
              <CardDescription>Distribuzione dei servizi per tipologia</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nessun dato disponibile per i criteri selezionati</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Per numero di servizi */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-500">Per numero di servizi</h4>
                      
                      {/* Progress bars for service count */}
                      <div className="space-y-4">
                        {typeDistribution.countData.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium">{item.value} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full" 
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: item.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Per importo */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-500">Per importo (€)</h4>
                      
                      {/* Progress bars for amount */}
                      <div className="space-y-4">
                        {typeDistribution.amountData.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium">€{item.value.toFixed(2)} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full" 
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: item.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analisi per Stato Pagamento</CardTitle>
              <CardDescription>Distribuzione dei servizi per stato di pagamento</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>Nessun dato disponibile per i criteri selezionati</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Per numero di servizi */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-500">Per numero di servizi</h4>
                      
                      {/* Progress bars for service count */}
                      <div className="space-y-4">
                        {statusDistribution.countData.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium">{item.value} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full" 
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: item.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Per importo */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-500">Per importo (€)</h4>
                      
                      {/* Progress bars for amount */}
                      <div className="space-y-4">
                        {statusDistribution.amountData.map((item) => (
                          <div key={item.label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.label}</span>
                              <span className="font-medium">€{item.value.toFixed(2)} ({item.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full" 
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: item.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Andamento Servizi</CardTitle>
              <CardDescription>Evoluzione mensile dei servizi</CardDescription>
            </CardHeader>
            <CardContent className="h-[450px] pt-4">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                  <div>
                    <p>Nessun dato disponibile per il periodo selezionato.</p>
                    <p className="text-sm text-gray-400 mt-2">Prova a modificare i filtri o selezionare un periodo più ampio.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <Tabs defaultValue="bar" className="mb-4">
                    <TabsList className="w-full justify-start mb-4">
                      <TabsTrigger value="bar" className="flex items-center">
                        <BarChartIcon className="h-4 w-4 mr-2" />
                        <span>Istogramma</span>
                      </TabsTrigger>
                      <TabsTrigger value="line" className="flex items-center">
                        <LineChartIcon className="h-4 w-4 mr-2" />
                        <span>Lineare</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="bar" className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={trendData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end"
                            height={70}
                            tickMargin={20}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any, name: any) => [value, name]}
                            labelFormatter={(label) => `Mese: ${label}`}
                          />
                          <Legend />
                          <Bar 
                            dataKey={getServiceTypeLabel(ServiceType.SIGLATURA)} 
                            fill="#3b82f6" 
                            stackId="a"
                          />
                          <Bar 
                            dataKey={getServiceTypeLabel(ServiceType.HAPPY_HOUR)} 
                            fill="#eab308" 
                            stackId="a"
                          />
                          <Bar 
                            dataKey={getServiceTypeLabel(ServiceType.RIPARAZIONE)} 
                            fill="#22c55e" 
                            stackId="a"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    
                    <TabsContent value="line" className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end"
                            height={70}
                            tickMargin={20}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: any, name: any) => {
                              if (name === "Totale") return [`${value} servizi`, name];
                              return [value, name];
                            }}
                            labelFormatter={(label) => `Mese: ${label}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="Totale" 
                            stroke="#6366f1" 
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={getServiceTypeLabel(ServiceType.SIGLATURA)} 
                            stroke="#3b82f6" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey={getServiceTypeLabel(ServiceType.HAPPY_HOUR)} 
                            stroke="#eab308" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey={getServiceTypeLabel(ServiceType.RIPARAZIONE)} 
                            stroke="#22c55e" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}