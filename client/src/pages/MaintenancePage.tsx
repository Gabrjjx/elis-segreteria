import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLoading } from "@/contexts/loading-context";
import { apiRequest } from "@/lib/queryClient";
import MaintenanceDetail from "@/components/maintenance/MaintenanceDetail";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, UploadCloud, RefreshCw, Filter, Cloud } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";

// Definizioni dei tipi
type MaintenanceRequestStatus = "pending" | "in_progress" | "completed" | "rejected";
type MaintenanceRequestPriority = "low" | "medium" | "high" | "urgent";

interface MaintenanceRequest {
  id: number;
  timestamp: string;
  requesterName: string;
  requesterEmail: string;
  roomNumber: string;
  requestType: string;
  description: string;
  location: string;
  status: MaintenanceRequestStatus;
  priority: MaintenanceRequestPriority;
  notes: string | null;
  assignedTo: string | null;
  completedAt: string | null;
  attachmentUrl: string | null;
}

interface MaintenanceFilters {
  query: string;
  status: "all" | MaintenanceRequestStatus;
  priority: "all" | MaintenanceRequestPriority;
  page: number;
  limit: number;
}

// Funzioni di utilità
const getStatusLabel = (status: MaintenanceRequestStatus): string => {
  switch (status) {
    case "pending":
      return "In attesa";
    case "in_progress":
      return "In lavorazione";
    case "completed":
      return "Completata";
    case "rejected":
      return "Rifiutata";
    default:
      return status;
  }
};

const getStatusColor = (status: MaintenanceRequestStatus): string => {
  switch (status) {
    case "pending":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "in_progress":
      return "bg-blue-500 hover:bg-blue-600";
    case "completed":
      return "bg-green-500 hover:bg-green-600";
    case "rejected":
      return "bg-red-500 hover:bg-red-600";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

const getPriorityLabel = (priority: MaintenanceRequestPriority): string => {
  switch (priority) {
    case "low":
      return "Bassa";
    case "medium":
      return "Media";
    case "high":
      return "Alta";
    case "urgent":
      return "Urgente";
    default:
      return priority;
  }
};

const getPriorityColor = (priority: MaintenanceRequestPriority): string => {
  switch (priority) {
    case "low":
      return "bg-green-500";
    case "medium":
      return "bg-blue-500";
    case "high":
      return "bg-orange-500";
    case "urgent":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const queryClient = useQueryClient();
  
  // Stato per i filtri
  const [filters, setFilters] = useState<MaintenanceFilters>({
    query: "",
    status: "all",  // Aggiornato per mostrare tutte le richieste, incluse quelle completate
    priority: "all",
    page: 1,
    limit: 50  // Aumentato a 50 elementi per pagina per visualizzare più richieste contemporaneamente
  });
  
  // Stato temporaneo per la ricerca
  const [searchInput, setSearchInput] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Query per ottenere le richieste di manutenzione
  const maintenanceQuery = useQuery({
    queryKey: ['/api/maintenance', filters],
    refetchOnWindowFocus: false
  });
  
  // Mutazioni per le azioni
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: MaintenanceRequestStatus }) => {
      return apiRequest(`/api/maintenance/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      
      // Controlla se la richiesta è COMPLETED e abbiamo informazioni su Google Sheets
      const googleSheetSync = data?.googleSheetSync;
      
      if (data?.status === "completed" && googleSheetSync) {
        if (googleSheetSync.success) {
          toast({
            title: "Stato aggiornato",
            description: `Richiesta completata e sincronizzata con Google Sheets: ${googleSheetSync.message}`,
          });
        } else {
          toast({
            title: "Stato aggiornato parzialmente",
            description: `La richiesta è stata completata ma non è stato possibile sincronizzare con Google Sheets: ${googleSheetSync.message}`,
            variant: "warning",
          });
        }
      } else {
        toast({
          title: "Stato aggiornato",
          description: "Lo stato della richiesta è stato aggiornato con successo",
        });
      }
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dello stato della richiesta",
        variant: "destructive"
      });
    }
  });
  
  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: number, priority: MaintenanceRequestPriority }) => {
      return apiRequest(`/api/maintenance/${id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({
        title: "Priorità aggiornata",
        description: "La priorità della richiesta è stata aggiornata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della priorità della richiesta",
        variant: "destructive"
      });
    }
  });
  
  const importCsvMutation = useMutation({
    mutationFn: async (csvData: string) => {
      return apiRequest('/api/maintenance/import', {
        method: 'POST',
        body: JSON.stringify({ csvData })
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({
        title: "Importazione completata",
        description: `Importate con successo ${data.success} richieste (fallite: ${data.failed})`,
      });
      setIsImportDialogOpen(false);
      setCsvData("");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione delle richieste",
        variant: "destructive"
      });
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/maintenance/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta è stata eliminata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della richiesta",
        variant: "destructive"
      });
    }
  });
  
  const syncGoogleSheetsMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await fetch('/api/maintenance/sync-google-sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{}'
        });
      
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      
        return await response.json();
      } catch (error) {
        console.error("Errore richiesta sync:", error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({
        title: "Sincronizzazione completata",
        description: `Importate con successo ${data.imported} richieste (fallite: ${data.failed})`,
      });
      setIsSyncDialogOpen(false);
    },
    onError: (error) => {
      console.error("Errore sincronizzazione:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la sincronizzazione con Google Sheets",
        variant: "destructive"
      });
    }
  });
  
  // Gestori eventi
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, query: searchInput, page: 1 }));
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  
  const handleStatusChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status as "all" | MaintenanceRequestStatus,
      page: 1
    }));
  };
  
  const handlePriorityChange = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priority: priority as "all" | MaintenanceRequestPriority,
      page: 1
    }));
  };
  
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };
  
  const handleImport = () => {
    if (csvData.trim()) {
      importCsvMutation.mutate(csvData);
    } else {
      toast({
        title: "Campo richiesto",
        description: "Inserisci i dati CSV da importare",
        variant: "destructive"
      });
    }
  };
  
  const handleStatusUpdate = (id: number, status: MaintenanceRequestStatus) => {
    updateStatusMutation.mutate({ id, status });
  };
  
  const handlePriorityUpdate = (id: number, priority: MaintenanceRequestPriority) => {
    updatePriorityMutation.mutate({ id, priority });
  };
  
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  const handleSyncGoogleSheets = () => {
    syncGoogleSheetsMutation.mutate();
  };
  
  // Definizione colonne per la tabella
  const columns = [
    { 
      accessorKey: "timestamp", 
      header: "Data", 
      cell: (item: MaintenanceRequest) => formatDate(new Date(item.timestamp))
    },
    { 
      accessorKey: "requesterName", 
      header: "Richiedente"
    },
    { 
      accessorKey: "roomNumber", 
      header: "Stanza",
      cell: (item: MaintenanceRequest) => item.roomNumber || "N/D"
    },
    { 
      accessorKey: "requestType", 
      header: "Tipo"
    },
    { 
      accessorKey: "status", 
      header: "Stato", 
      cell: (item: MaintenanceRequest) => (
        <Select
          defaultValue={item.status}
          onValueChange={(value) => handleStatusUpdate(item.id, value as MaintenanceRequestStatus)}
        >
          <SelectTrigger className={`w-32 ${getStatusColor(item.status)} text-white`}>
            <SelectValue placeholder={getStatusLabel(item.status)} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="in_progress">In lavorazione</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="rejected">Rifiutata</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )
    },
    { 
      accessorKey: "priority", 
      header: "Priorità", 
      cell: (item: MaintenanceRequest) => (
        <Select
          defaultValue={item.priority}
          onValueChange={(value) => handlePriorityUpdate(item.id, value as MaintenanceRequestPriority)}
        >
          <SelectTrigger className="w-28">
            <SelectValue>
              <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                {getPriorityLabel(item.priority)}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="low">Bassa</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )
    },
    { 
      accessorKey: "actions", 
      header: "Azioni", 
      cell: (item: MaintenanceRequest) => (
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedRequestId(item.id);
              setDetailDialogOpen(true);
            }}
          >
            Dettagli
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Elimina</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Questa azione non può essere annullata. Verranno eliminati permanentemente i dati della richiesta di manutenzione.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(item.id)}>Elimina</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }
  ];
  
  // Variabili di stato
  const isLoading = maintenanceQuery.isLoading;
  const isError = maintenanceQuery.isError;
  const maintenanceData = maintenanceQuery.data || { requests: [], total: 0 };
  
  const totalPages = Math.ceil(maintenanceData.total / filters.limit);
  
  return (
    <div className="container mx-auto py-6">
      {/* Dialog per i dettagli */}
      {selectedRequestId && (
        <MaintenanceDetail 
          requestId={selectedRequestId}
          isOpen={detailDialogOpen}
          onClose={() => {
            setDetailDialogOpen(false);
            setSelectedRequestId(null);
          }}
        />
      )}
      
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Richieste di Manutenzione</h1>
          
          <div className="flex space-x-2">
            {/* Pulsante per sincronizzare da Google Sheets */}
            <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Cloud className="mr-2 h-4 w-4" />
                  Sincronizza da Google
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sincronizza richieste di manutenzione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa operazione sincronizzerà automaticamente le richieste di manutenzione dal modulo Google Forms. 
                    Assicurati che GOOGLE_API_KEY e GOOGLE_SHEET_ID siano configurati correttamente.
                  </AlertDialogDescription>
                  {syncGoogleSheetsMutation.isError && (
                    <div className="mt-2 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                      <p className="font-semibold">Errore di sincronizzazione:</p>
                      <p>Verifica che l'ID del foglio Google sia corretto e che l'API key abbia accesso.</p>
                    </div>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSyncGoogleSheets} disabled={syncGoogleSheetsMutation.isPending}>
                    {syncGoogleSheetsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizzazione...
                      </>
                    ) : (
                      "Sincronizza"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* Pulsante per importare manualmente da CSV */}
            <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Importa da CSV
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Importa richieste di manutenzione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Incolla qui sotto i dati CSV esportati dal form Google. Assicurati che il formato sia corretto.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="min-h-[200px] p-2 w-full border rounded-md"
                  placeholder="Incolla qui i dati CSV..."
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleImport} disabled={importCsvMutation.isPending}>
                    {importCsvMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importazione...
                      </>
                    ) : (
                      "Importa"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex w-full md:w-auto items-center space-x-2">
            <Input
              placeholder="Cerca..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full md:w-72"
            />
            <Button onClick={handleSearch} className="flex-shrink-0">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Select
              defaultValue={filters.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="in_progress">In lavorazione</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="rejected">Rifiutata</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              defaultValue={filters.priority}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filtra per priorità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le priorità</SelectItem>
                <SelectItem value="low">Bassa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] })}
              variant="outline"
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : isError ? (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-500">Si è verificato un errore durante il caricamento delle richieste di manutenzione.</p>
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] })}
                  variant="outline"
                  className="mt-2"
                >
                  Riprova
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : maintenanceData.requests.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-500">Nessuna richiesta di manutenzione trovata.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Puoi importare le richieste utilizzando il pulsante "Sincronizza da Google" o manualmente con "Importa da CSV".
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={maintenanceData.requests}
                keyExtractor={(item: MaintenanceRequest) => item.id}
                pagination
                currentPage={filters.page}
                itemsPerPage={filters.limit}
                totalItems={maintenanceData.total}
                onPageChange={handlePageChange}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}