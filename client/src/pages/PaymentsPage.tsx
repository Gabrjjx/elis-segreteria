import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Euro, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  User,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface Service {
  id: number;
  sigla: string;
  cognome: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  notes?: string;
}

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unpaid services
  const { data, isLoading, error } = useQuery({
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
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del pagamento",
        variant: "destructive",
      });
    },
  });

  const services = data?.services || [];
  
  // Filter services based on search term
  const filteredServices = services.filter((service: Service) => 
    service.sigla.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalAmount = filteredServices.reduce((sum: number, service: Service) => sum + service.amount, 0);
  const totalServices = filteredServices.length;

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'siglatura': return 'Siglatura';
      case 'happy_hour': return 'Happy Hour';
      case 'riparazione': return 'Riparazione';
      default: return type;
    }
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'siglatura':
        return <Badge variant="default">Siglatura</Badge>;
      case 'happy_hour':
        return <Badge variant="secondary">Happy Hour</Badge>;
      case 'riparazione':
        return <Badge variant="destructive">Riparazione</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Errore nel caricamento dei dati</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pagamenti Pendenti</h1>
            <p className="text-muted-foreground">
              Gestisci i servizi in attesa di pagamento
            </p>
          </div>
          
          {/* Summary Cards */}
          <div className="flex space-x-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Servizi</p>
                    <p className="text-2xl font-bold">{totalServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Totale</p>
                    <p className="text-2xl font-bold">€{totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Cerca Pagamenti</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca per sigla, cognome o tipo servizio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Services Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Servizi Non Pagati</span>
            </CardTitle>
            <CardDescription>
              {totalServices} servizi per un totale di €{totalAmount.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Sigla</TableHead>
                    <TableHead>Studente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service: Service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(service.date), 'dd MMM yyyy', { locale: it })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.sigla}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{service.cognome || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getServiceTypeBadge(service.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Euro className="h-4 w-4 text-green-600" />
                          <span className="font-medium">€{service.amount.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {service.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => markAsPaidMutation.mutate(service.id)}
                          disabled={markAsPaidMutation.isPending}
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Marca Pagato</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredServices.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun pagamento pendente</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nessun risultato per la ricerca corrente' : 'Tutti i servizi sono stati pagati'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}