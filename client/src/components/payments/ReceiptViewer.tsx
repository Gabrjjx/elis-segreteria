import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Receipt, Service } from "@shared/schema";

interface ReceiptViewerProps {
  serviceId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptViewer({ serviceId, isOpen, onClose }: ReceiptViewerProps) {
  const { toast } = useToast();
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // Fetch receipt data
  const { data: receipt, isLoading, error } = useQuery<Receipt>({
    queryKey: ['/api/services', serviceId, 'receipt'],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}/receipt`);
      if (!response.ok) {
        throw new Error("Errore durante il recupero della ricevuta");
      }
      return response.json();
    },
    enabled: isOpen && !!serviceId, // Only fetch when dialog is open
  });
  
  // Fetch service data
  const { data: service } = useQuery<Service>({
    queryKey: ['/api/services', serviceId],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error("Errore durante il recupero del servizio");
      }
      return response.json();
    },
    enabled: isOpen && !!serviceId, // Only fetch when dialog is open
  });
  
  // Handle download (this would be expanded in a real implementation)
  const handleDownload = () => {
    setDownloadLoading(true);
    
    // In a real application, this would be an API call to generate a PDF
    setTimeout(() => {
      toast({
        title: "Ricevuta scaricata",
        description: "La ricevuta è stata scaricata con successo.",
      });
      setDownloadLoading(false);
    }, 1500);
  };
  
  // Get payment method display
  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Contanti';
      case 'paypal':
        return 'PayPal';
      case 'bank_transfer':
        return 'Bonifico bancario';
      default:
        return method;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ricevuta di pagamento</DialogTitle>
          <DialogDescription>
            Dettagli del pagamento e della ricevuta generata
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-destructive">
              Ricevuta non trovata per questo servizio.
            </p>
          </div>
        ) : receipt ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">Ricevuta #{receipt.id}</h3>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Data:</p>
                  <p>{receipt.receiptDate ? format(new Date(receipt.receiptDate), "dd MMMM yyyy", { locale: it }) : 'Data non disponibile'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Importo:</p>
                  <p className="font-medium">€{receipt.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Metodo di pagamento:</p>
                  <p>{getPaymentMethodDisplay(receipt.paymentMethod)}</p>
                </div>
                {receipt.paymentReference && (
                  <div>
                    <p className="text-gray-500">Riferimento:</p>
                    <p className="text-xs break-all">{receipt.paymentReference}</p>
                  </div>
                )}
              </div>
            </div>
            
            {service && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold mb-2">Dettagli servizio</h3>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Sigla:</p>
                    <p>{service.sigla}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Data servizio:</p>
                    <p>{service && service.date ? format(new Date(service.date), "dd MMMM yyyy", { locale: it }) : 'Data non disponibile'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tipologia:</p>
                    <p>
                      {service.type === 'siglatura' ? 'Siglatura' :
                       service.type === 'happy_hour' ? 'Happy Hour' :
                       service.type === 'riparazione' ? 'Riparazione' : service.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pezzi:</p>
                    <p>{service.pieces}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-destructive">
              Ricevuta non trovata per questo servizio.
            </p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          {receipt && (
            <Button
              onClick={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.fileText className="mr-2 h-4 w-4" />
              )}
              Scarica PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}