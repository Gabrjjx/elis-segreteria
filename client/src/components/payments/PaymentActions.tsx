import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PayPalButton } from "./PayPalButton";
import { Service } from "@shared/schema";

interface PaymentActionsProps {
  service: Service;
  onUpdate?: () => void;
}

export function PaymentActions({ service, onUpdate }: PaymentActionsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleMarkAsPaid = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/services/${service.id}/mark-paid`
      );
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/services'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
        
        toast({
          title: "Pagamento registrato",
          description: "Il servizio è stato contrassegnato come pagato.",
          variant: "success",
        });
        
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error("Impossibile aggiornare lo stato del pagamento");
      }
    } catch (error) {
      console.error("Errore durante l'aggiornamento dello stato:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile registrare il pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaypalComplete = (serviceId: number) => {
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    
    if (onUpdate) {
      onUpdate();
    }
  };

  // Se il servizio è già pagato, non mostrare azioni di pagamento
  if (service.status === 'paid') {
    return (
      <div className="flex items-center">
        <span className="text-green-600 flex items-center">
          <Icons.check className="h-4 w-4 mr-1" />
          Pagato
        </span>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2"
          onClick={() => {
            // Qui potrebbe aprire un dialog per visualizzare/scaricare la ricevuta
            toast({
              title: "Ricevuta",
              description: "Funzionalità per visualizzare/scaricare la ricevuta non ancora implementata",
            });
          }}
        >
          <Icons.fileText className="h-4 w-4 mr-1" />
          Ricevuta
        </Button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleMarkAsPaid}
        disabled={loading}
      >
        {loading ? (
          <Icons.spinner className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Icons.check className="h-4 w-4 mr-1" />
        )}
        Segna come pagato
      </Button>
      
      <PayPalButton 
        serviceId={service.id} 
        amount={service.amount}
        onPaymentComplete={handlePaypalComplete}
      />
    </div>
  );
}