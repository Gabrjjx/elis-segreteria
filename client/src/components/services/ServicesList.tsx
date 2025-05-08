import { format } from "date-fns";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Service, ServiceType, PaymentStatus } from "@shared/schema";
import { Pencil, Receipt, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { PaymentActions } from "@/components/payments/PaymentActions";

interface ServicesListProps {
  services: Service[];
  total?: number;
  currentPage?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
}

export default function ServiceList({
  services,
  total = 0,
  currentPage = 1,
  limit = 10,
  onPageChange,
  showPagination = true,
}: ServicesListProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/services/${id}`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
      
      toast({
        title: "Servizio eliminato",
        description: "Il servizio è stato eliminato con successo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mark service as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/services/${id}/mark-paid`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
      
      toast({
        title: "Pagamento registrato",
        description: "Il servizio è stato contrassegnato come pagato.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (id: number) => {
    setLocation(`/services/${id}/edit`);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleMarkAsPaid = (id: number) => {
    markAsPaidMutation.mutate(id);
  };

  const handleReceiptGeneration = (id: number) => {
    // In a real app, this would generate a receipt
    toast({
      title: "Ricevuta generata",
      description: "La ricevuta è stata generata con successo.",
    });
  };

  // Helper function to generate badge variant based on service type
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case ServiceType.SIGLATURA:
        return <Badge variant="secondary">Siglatura</Badge>;
      case ServiceType.HAPPY_HOUR:
        return <Badge variant="warning">Happy Hour</Badge>;
      case ServiceType.RIPARAZIONE:
        return <Badge variant="outline">Riparazione</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Helper function to generate badge variant based on payment status
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Badge variant="success">Pagato</Badge>;
      case PaymentStatus.UNPAID:
        return <Badge variant="destructive">Da pagare</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);
  const pageNumbers = [];
  const maxVisiblePages = 3;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    // Always include first page
    pageNumbers.push(1);
    
    // Calculate range around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    // Adjust if at the beginning or end
    if (startPage === 2) endPage = Math.min(totalPages - 1, startPage + 2);
    if (endPage === totalPages - 1) startPage = Math.max(2, endPage - 2);
    
    // Add ellipsis if needed
    if (startPage > 2) pageNumbers.push('...');
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) pageNumbers.push('...');
    
    // Always include last page
    pageNumbers.push(totalPages);
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nessun servizio trovato</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Sigla</TableHead>
              <TableHead>N. Pezzi</TableHead>
              <TableHead>Tipologia</TableHead>
              <TableHead>Importo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(service.date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="font-medium">{service.sigla}</TableCell>
                <TableCell>{service.pieces}</TableCell>
                <TableCell>{getServiceTypeBadge(service.type)}</TableCell>
                <TableCell>€{service.amount.toFixed(2)}</TableCell>
                <TableCell>{getPaymentStatusBadge(service.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(service.id)}
                      title="Modifica"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center">
                      <PaymentActions 
                        service={service} 
                        onUpdate={() => {
                          queryClient.invalidateQueries({ queryKey: ['/api/services'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
                          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
                        }} 
                      />
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sei sicuro di voler eliminare questo servizio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Questa azione non può essere annullata. Eliminerai definitivamente il servizio
                            e i relativi dati dal sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(service.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-lg font-semibold">{service.sigla}</div>
                <div className="text-sm text-gray-500">{format(new Date(service.date), "dd/MM/yyyy")}</div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-lg font-medium">€{service.amount.toFixed(2)}</div>
                <div>{getPaymentStatusBadge(service.status)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="text-sm text-gray-500">Tipologia:</span>
                <div>{getServiceTypeBadge(service.type)}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">N. Pezzi:</span>
                <div className="font-medium">{service.pieces}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEdit(service.id)}
                className="flex items-center text-xs"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Modifica
              </Button>
              
              <div className="flex flex-grow justify-center">
                <PaymentActions 
                  service={service}
                  onUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
                  }}
                />
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive border-destructive flex items-center text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Elimina
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei sicuro di voler eliminare questo servizio?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione non può essere annullata. Eliminerai definitivamente il servizio
                      e i relativi dati dal sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(service.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {showPagination && totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          {/* Desktop pagination */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Visualizzati <span className="font-medium">{services.length}</span> di{" "}
                <span className="font-medium">{total}</span> servizi
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => onPageChange && currentPage > 1 && onPageChange(currentPage - 1)}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {pageNumbers.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === '...' ? (
                      <span className="px-2">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange && onPageChange(page as number)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => onPageChange && currentPage < totalPages && onPageChange(currentPage + 1)}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
          
          {/* Mobile pagination */}
          <div className="flex flex-col sm:hidden w-full">
            <div className="mb-2 text-center">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{services.length}</span> di{" "}
                <span className="font-medium">{total}</span> servizi • Pagina <span className="font-medium">{currentPage}</span> di <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange && currentPage > 1 && onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Precedente
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange && currentPage < totalPages && onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center"
              >
                Successiva
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
