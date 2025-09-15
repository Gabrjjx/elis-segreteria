import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { MaintenanceRequest, MaintenanceRequestPriority, MaintenanceRequestStatus } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";

interface MaintenanceDetailProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaintenanceRequest;
  onStatusChange: () => void;
}

export default function MaintenanceDetail({
  isOpen,
  onClose,
  request,
  onStatusChange,
}: MaintenanceDetailProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(request.status);
  const [currentPriority, setCurrentPriority] = useState(request.priority);
  const { toast } = useToast();

  // Funzioni helper per formattazione
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

  // Funzioni per il cambio dello stato
  const handleStatusChange = async (status: string) => {
    setCurrentStatus(status);
  };

  const handlePriorityChange = async (priority: string) => {
    setCurrentPriority(priority);
  };

  const saveChanges = async () => {
    setIsUpdating(true);
    try {
      // Prima aggiorniamo lo stato se è cambiato
      if (currentStatus !== request.status) {
        await apiRequest("PATCH", `/api/maintenance/${request.id}/status`, {
          status: currentStatus,
        });
      }

      // Poi aggiorniamo la priorità se è cambiata
      if (currentPriority !== request.priority) {
        await apiRequest("PATCH", `/api/maintenance/${request.id}/priority`, {
          priority: currentPriority,
        });
      }

      toast({
        title: "Richiesta aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
      onStatusChange();
      onClose();
    } catch (error) {
      console.error("Errore nell'aggiornamento della richiesta:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore nell'aggiornamento della richiesta",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center justify-between">
            <span>Richiesta #{request.id}</span>
            <div className="flex gap-2">
              <Badge className={`${getStatusColor(request.status)} text-white`}>
                {getStatusLabel(request.status)}
              </Badge>
              <Badge className={`${getPriorityColor(request.priority)} text-white`}>
                {getPriorityLabel(request.priority)}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Creata il {request.timestamp ? formatDateTime(request.timestamp) : "Data non disponibile"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sigla</p>
              <p className="text-sm">{request.sigla || "N/D"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Luogo</p>
              <p className="text-sm">{request.place || "N/D"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <p className="text-sm font-medium text-muted-foreground">Ubicazione specifica</p>
            <p className="text-sm">{request.specificLocation || "N/D"}</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <p className="text-sm font-medium text-muted-foreground">Dettagli del difetto</p>
            <p className="text-sm">{request.defectDetails || "N/D"}</p>
          </div>

          {request.possibleSolution && (
            <div className="grid grid-cols-1 gap-2">
              <p className="text-sm font-medium text-muted-foreground">Soluzione proposta</p>
              <p className="text-sm">{request.possibleSolution}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Risolvibile da manutentori autarchici</p>
              <p className="text-sm">{request.canBeSolvedByMaintainers !== undefined ? (request.canBeSolvedByMaintainers ? "Sì" : "No") : "N/D"}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Stato</p>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaintenanceRequestStatus.PENDING}>In attesa</SelectItem>
                  <SelectItem value={MaintenanceRequestStatus.IN_PROGRESS}>In corso</SelectItem>
                  <SelectItem value={MaintenanceRequestStatus.COMPLETED}>Completata</SelectItem>
                  <SelectItem value={MaintenanceRequestStatus.CANCELLED}>Annullata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Priorità</p>
              <Select value={currentPriority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona priorità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaintenanceRequestPriority.LOW}>Bassa</SelectItem>
                  <SelectItem value={MaintenanceRequestPriority.MEDIUM}>Media</SelectItem>
                  <SelectItem value={MaintenanceRequestPriority.HIGH}>Alta</SelectItem>
                  <SelectItem value={MaintenanceRequestPriority.URGENT}>Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={saveChanges} 
            disabled={isUpdating || (currentStatus === request.status && currentPriority === request.priority)}
          >
            {isUpdating ? "Salvataggio..." : "Salva modifiche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}