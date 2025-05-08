import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

interface MaintenanceDetailProps {
  requestId: number;
  isOpen: boolean;
  onClose: () => void;
}

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
      return "bg-yellow-500";
    case "in_progress":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    case "rejected":
      return "bg-red-500";
    default:
      return "bg-gray-500";
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

export default function MaintenanceDetail({ requestId, isOpen, onClose }: MaintenanceDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  
  // Query per ottenere i dettagli della richiesta
  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['/api/maintenance', requestId],
    queryFn: async () => {
      const response = await apiRequest<MaintenanceRequest>(`/api/maintenance/${requestId}`);
      return response;
    },
    enabled: isOpen && requestId > 0,
    refetchOnWindowFocus: false
  });
  
  // Reset dei campi quando cambia la richiesta
  React.useEffect(() => {
    if (request) {
      setNotes(request.notes || "");
      setAssignee(request.assignedTo || "");
    }
  }, [request]);
  
  // Mutazione per aggiornare la richiesta
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<MaintenanceRequest>) => {
      return apiRequest(`/api/maintenance/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance', requestId] });
      toast({
        title: "Richiesta aggiornata",
        description: "La richiesta di manutenzione è stata aggiornata con successo",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della richiesta",
        variant: "destructive"
      });
    }
  });
  
  const handleSave = () => {
    updateMutation.mutate({
      notes,
      assignedTo: assignee
    });
  };
  
  if (!isOpen) return null;

  // Funzione per controllare la validità di una data e formattarla correttamente
  const safeDate = (dateString?: string | null): Date | null => {
    if (!dateString) return null;
    
    try {
      // Prova a interpretare il formato italiano (DD/MM/YYYY HH.MM.SS)
      if (dateString.includes('/') && dateString.includes('.')) {
        const parts = dateString.split(' ');
        if (parts.length === 2) {
          const dateParts = parts[0].split('/');
          const timeParts = parts[1].split('.');
          
          if (dateParts.length === 3 && timeParts.length >= 2) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // I mesi in JS sono 0-based
            const year = parseInt(dateParts[2], 10);
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);
            const second = timeParts.length > 2 ? parseInt(timeParts[2], 10) : 0;
            
            const date = new Date(year, month, day, hour, minute, second);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
      }
      
      // Formato standard
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      return null;
    } catch (e) {
      console.error("Errore nel parsing della data:", e);
      return null;
    }
  };
  
  // Funzioni di estrazione informazioni
  const extractOriginalDate = (request?: MaintenanceRequest) => {
    if (!request) return null;
    
    if (request.notes?.includes("Data:")) 
      return request.notes.match(/Data:\s*([^\n]+)/)?.[1];
    
    if (request.notes?.includes("data:"))
      return request.notes.match(/data:\s*([^\n]+)/)?.[1];
    
    if (request.description?.includes("Data originale:"))
      return request.description.match(/Data originale:\s*([^)]+)/)?.[1];
    
    return null;
  };
  
  const extractUbicazione = (request?: MaintenanceRequest) => {
    if (!request) return null;
    let ubicazione = "";
    
    // Cerca nei notes
    if (request.notes?.includes("Ubicazione specifica")) {
      const match = request.notes.match(/Ubicazione specifica[^:]*:\s*([^\n]+)/);
      if (match && match[1]) ubicazione = match[1];
    }
    
    // Cerca nella descrizione
    if (!ubicazione && request.description) {
      // Controlla se la descrizione ha il formato "ubicazione: dettagli"
      if (request.description.includes(":") && !request.description.includes("Data originale:")) {
        ubicazione = request.description.split(":")[0];
      }
    }
    
    return ubicazione || null;
  };
  
  const extractDettagli = (request?: MaintenanceRequest) => {
    if (!request) return null;
    let dettagli = "";
    
    // Cerca nei notes
    if (request.notes?.includes("Dettagli del difetto")) {
      const match = request.notes.match(/Dettagli del difetto[^:]*:\s*([^\n]+)/);
      if (match && match[1]) dettagli = match[1];
    }
    
    // Cerca nella descrizione
    if (!dettagli && request.description) {
      // Controlla se la descrizione ha il formato "ubicazione: dettagli"
      if (request.description.includes(":") && !request.description.includes("Data originale:")) {
        const parts = request.description.split(":");
        if (parts.length > 1) {
          dettagli = parts[1].split("(Data originale")[0]?.trim();
        }
      } else if (!request.description.includes(":")) {
        // Se non c'è separatore, usa tutta la descrizione come dettagli
        dettagli = request.description;
      }
    }
    
    return dettagli || null;
  };
  
  if (!isOpen) return null;
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Caricamento in corso...</DialogTitle>
            <DialogDescription>
              Attendere il caricamento dei dati della richiesta...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (isError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Errore</DialogTitle>
            <DialogDescription>
              Si è verificato un problema durante il caricamento.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500">Si è verificato un errore durante il caricamento dei dettagli della richiesta.</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/maintenance', requestId] })}
              variant="outline"
              className="mt-2"
            >
              Riprova
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!request) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dati non disponibili</DialogTitle>
            <DialogDescription>
              La richiesta di manutenzione non è stata trovata.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Debug temporaneo
  console.log("DATI RICHIESTA:", {
    id: request.id,
    timestamp: request.timestamp,
    notes: request.notes || "NOTES MISSING",
    description: request.description || "DESCRIPTION MISSING",
    requesterName: request.requesterName || "NAME MISSING",
    requesterEmail: request.requesterEmail || "EMAIL MISSING",
    roomNumber: request.roomNumber || "ROOM MISSING",
    location: request.location || "LOCATION MISSING",
    requestType: request.requestType || "TYPE MISSING",
    ubicazione: extractUbicazione(request),
    dettagli: extractDettagli(request),
    dataOriginale: extractOriginalDate(request)
  });
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Richiesta di Manutenzione #{request.id}</span>
            <div className="flex space-x-2">
              <Badge className={`${getStatusColor(request.status)} text-white`}>
                {getStatusLabel(request.status)}
              </Badge>
              <Badge className={`${getPriorityColor(request.priority)} text-white`}>
                {getPriorityLabel(request.priority)}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Inviata il {safeDate(request.timestamp) ? formatDate(safeDate(request.timestamp)!) : 'Data non disponibile'}
            {safeDate(request.completedAt) ? ` • Completata il ${formatDate(safeDate(request.completedAt)!)}` : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div>
            <h3 className="font-medium text-gray-700">Richiedente</h3>
            <p>{request.requesterName}</p>
            <p className="text-sm text-gray-500">{request.requesterEmail}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700">Ubicazione</h3>
            <p>Stanza: {request.roomNumber}</p>
            <p className="text-sm text-gray-500">{request.location}</p>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-medium text-gray-700">Tipo di richiesta</h3>
            <p>{request.requestType}</p>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-medium text-gray-700">Descrizione</h3>
            <p className="whitespace-pre-line">{request.description}</p>
          </div>
          
          {/* Estrazione e visualizzazione dei dettagli */}
          {extractOriginalDate(request) && (
            <div className="md:col-span-2 mt-2">
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="font-medium text-blue-700">Data originale dal Google Sheet</h3>
                <p className="text-blue-800 font-semibold">{extractOriginalDate(request)}</p>
              </div>
            </div>
          )}
          
          {extractUbicazione(request) && (
            <div className="md:col-span-2 mt-2">
              <div className="bg-yellow-50 p-3 rounded-md">
                <h3 className="font-medium text-yellow-700">Ubicazione specifica</h3>
                <p className="text-yellow-800">{extractUbicazione(request)}</p>
              </div>
            </div>
          )}
          
          {extractDettagli(request) && (
            <div className="md:col-span-2 mt-2">
              <div className="bg-red-50 p-3 rounded-md">
                <h3 className="font-medium text-red-700">Dettagli del difetto rilevato</h3>
                <p className="text-red-800">{extractDettagli(request)}</p>
              </div>
            </div>
          )}
          
          {/* Note originali complete */}
          {request.notes && (
            <div className="md:col-span-2 mt-4">
              <details>
                <summary className="font-medium text-gray-700 cursor-pointer">Note complete</summary>
                <p className="whitespace-pre-line text-sm mt-2 pl-2 border-l-2 border-gray-200">{request.notes}</p>
              </details>
            </div>
          )}
          
          {request.attachmentUrl && (
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-700">Allegato</h3>
              <a 
                href={request.attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Visualizza allegato
              </a>
            </div>
          )}
          
          <div className="md:col-span-2">
            <h3 className="font-medium text-gray-700 mb-1">Assegnata a</h3>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Nome dell'incaricato"
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-medium text-gray-700 mb-1">Note</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note sulla richiesta..."
              className="w-full min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva modifiche"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}