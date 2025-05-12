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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import MaintenanceDetail from "@/components/maintenance/MaintenanceDetail";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function MaintenancePage() {
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
    refetch();
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
    refetch();
  };

  const handlePriorityChange = (value: string) => {
    setSelectedPriority(value);
    setCurrentPage(1);
    refetch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    refetch();
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Aggiornato",
      description: "Le richieste di manutenzione sono state aggiornate",
    });
  };

  const openRequestDetail = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const closeRequestDetail = () => {
    setIsDetailOpen(false);
  };

  // Helper per visualizzazione
  const getStatusColor = (status: string) => {
    switch (status) {
      case MaintenanceRequestStatus.PENDING:
        return "bg-orange-500";
      case MaintenanceRequestStatus.IN_PROGRESS:
        return "bg-blue-500";
      case MaintenanceRequestStatus.COMPLETED:
        return "bg-green-500";
      case MaintenanceRequestStatus.CANCELLED:
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case MaintenanceRequestStatus.PENDING:
        return "In attesa";
      case MaintenanceRequestStatus.IN_PROGRESS:
        return "In corso";
      case MaintenanceRequestStatus.COMPLETED:
        return "Completata";
      case MaintenanceRequestStatus.CANCELLED:
        return "Annullata";
      default:
        return "Sconosciuto";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case MaintenanceRequestPriority.LOW:
        return "bg-blue-500";
      case MaintenanceRequestPriority.MEDIUM:
        return "bg-yellow-500";
      case MaintenanceRequestPriority.HIGH:
        return "bg-orange-500";
      case MaintenanceRequestPriority.URGENT:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case MaintenanceRequestPriority.LOW:
        return "Bassa";
      case MaintenanceRequestPriority.MEDIUM:
        return "Media";
      case MaintenanceRequestPriority.HIGH:
        return "Alta";
      case MaintenanceRequestPriority.URGENT:
        return "Urgente";
      default:
        return "Sconosciuta";
    }
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Segnalazioni di Manutenzione</h1>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Aggiorna
        </Button>
      </div>

      {/* Filtri */}
      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 md:col-span-2">
          <Input
            type="text"
            placeholder="Cerca per sigla, luogo o dettagli"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-2" /> Cerca
          </Button>
        </form>

        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value={MaintenanceRequestStatus.PENDING}>In attesa</SelectItem>
            <SelectItem value={MaintenanceRequestStatus.IN_PROGRESS}>In corso</SelectItem>
            <SelectItem value={MaintenanceRequestStatus.COMPLETED}>Completata</SelectItem>
            <SelectItem value={MaintenanceRequestStatus.CANCELLED}>Annullata</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPriority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le priorità</SelectItem>
            <SelectItem value={MaintenanceRequestPriority.LOW}>Bassa</SelectItem>
            <SelectItem value={MaintenanceRequestPriority.MEDIUM}>Media</SelectItem>
            <SelectItem value={MaintenanceRequestPriority.HIGH}>Alta</SelectItem>
            <SelectItem value={MaintenanceRequestPriority.URGENT}>Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vista a tabella e cards */}
      <Tabs defaultValue="table" className="mb-6">
        <TabsContent value="table">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : isError ? (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <p className="text-center text-red-500">
                  Si è verificato un errore nel caricamento delle richieste di manutenzione.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Sigla</TableHead>
                      <TableHead>Luogo</TableHead>
                      <TableHead>Dettagli</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Priorità</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data && data.requests.length > 0 ? (
                      data.requests.map((request) => (
                        <TableRow key={request.id} onClick={() => openRequestDetail(request)} className="cursor-pointer hover:bg-slate-50">
                          <TableCell>{request.id}</TableCell>
                          <TableCell>{request.sigla || "N/D"}</TableCell>
                          <TableCell>{request.place || "N/D"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{request.defectDetails || "N/D"}</TableCell>
                          <TableCell>{formatDateTime(request.timestamp)}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(request.status)} text-white`}>
                              {getStatusLabel(request.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getPriorityColor(request.priority)} text-white`}>
                              {getPriorityLabel(request.priority)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              openRequestDetail(request);
                            }}>
                              Dettagli
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4">
                          Nessuna richiesta trovata
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))} 
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} 
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="cards">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : isError ? (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <p className="text-center text-red-500">
                  Si è verificato un errore nel caricamento delle richieste di manutenzione.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data && data.requests.length > 0 ? (
                  data.requests.map((request) => (
                    <Card 
                      key={request.id} 
                      className={`cursor-pointer transition-shadow hover:shadow-md`}
                      onClick={() => openRequestDetail(request)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">
                              #{request.id} - {request.sigla || "N/D"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{request.place}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${getStatusColor(request.status)} text-white text-xs`}>
                              {getStatusLabel(request.status)}
                            </Badge>
                            <Badge className={`${getPriorityColor(request.priority)} text-white text-xs`}>
                              {getPriorityLabel(request.priority)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm line-clamp-2 mb-2">{request.defectDetails || "N/D"}</p>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{formatDateTime(request.timestamp)}</span>
                          <span>{request.specificLocation || ""}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-full">
                    <CardContent className="py-8 text-center">
                      Nessuna richiesta trovata
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))} 
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} 
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="table">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Tabella
          </TabsTrigger>
          <TabsTrigger value="cards">
            <Filter className="h-4 w-4 mr-2" />
            Cards
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Modale dettaglio richiesta */}
      {selectedRequest && (
        <MaintenanceDetail
          isOpen={isDetailOpen}
          onClose={closeRequestDetail}
          request={selectedRequest}
          onStatusChange={() => refetch()}
        />
      )}
    </div>
  );
}