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
  
  // Handle download of the receipt
  const handleDownload = () => {
    if (!receipt || !serviceId) {
      toast({
        title: "Errore",
        description: "Nessuna ricevuta disponibile per il download.",
        variant: "destructive"
      });
      return;
    }
    
    setDownloadLoading(true);
    
    // Creiamo l'HTML manualmente usando le informazioni che abbiamo
    const createReceiptHTML = () => {
      const dateStr = receipt.receiptDate ? 
        new Date(receipt.receiptDate).toLocaleDateString('it-IT') : 
        new Date().toLocaleDateString('it-IT');
      
      const paymentMethod = getPaymentMethodDisplay(receipt.paymentMethod);
      const serviceType = service?.type === 'siglatura' ? 'Siglatura' :
                          service?.type === 'happy_hour' ? 'Happy Hour' :
                          service?.type === 'riparazione' ? 'Riparazione' : 
                          service?.type || 'Non specificato';
      
      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ricevuta #${receipt.receiptNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; color: #333; }
          .receipt-box { border: 1px solid #ccc; padding: 20px; max-width: 600px; margin: 0 auto; }
          .receipt-header { text-align: center; margin-bottom: 20px; }
          .receipt-detail { margin: 10px 0; }
          .receipt-footer { margin-top: 30px; text-align: center; font-size: 0.8em; color: #666; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="receipt-header">
            <h1>ELIS Sartoria</h1>
            <h2>Ricevuta di Pagamento</h2>
          </div>
          
          <div class="receipt-detail"><strong>Ricevuta N.:</strong> ${receipt.receiptNumber}</div>
          <div class="receipt-detail"><strong>Data:</strong> ${dateStr}</div>
          <div class="receipt-detail"><strong>Servizio ID:</strong> ${receipt.serviceId}</div>
          <div class="receipt-detail"><strong>Tipo Servizio:</strong> ${serviceType}</div>
          <div class="receipt-detail"><strong>Sigla:</strong> ${service?.sigla || 'Non specificata'}</div>
          <div class="receipt-detail"><strong>Pezzi:</strong> ${service?.pieces || '0'}</div>
          <div class="receipt-detail"><strong>Importo:</strong> €${receipt.amount.toFixed(2)}</div>
          <div class="receipt-detail"><strong>Metodo di Pagamento:</strong> ${paymentMethod}</div>
          
          <div class="receipt-footer">
            <p>Grazie per aver utilizzato i nostri servizi.</p>
            <p>ELIS Sartoria - Servizi di sartoria per gli studenti ELIS</p>
            <p>Documento generato il: ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>
      </body>
      </html>
      `;
    };
    
    // Crea un blob con il contenuto HTML
    const html = createReceiptHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Crea un link temporaneo per scaricare il file
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ricevuta_${receipt.receiptNumber}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Rilascia l'URL quando non è più necessario
    setTimeout(() => {
      URL.revokeObjectURL(url);
      toast({
        title: "Ricevuta scaricata",
        description: "La ricevuta è stata scaricata con successo.",
      });
      setDownloadLoading(false);
    }, 500);
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
              Scarica Ricevuta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}