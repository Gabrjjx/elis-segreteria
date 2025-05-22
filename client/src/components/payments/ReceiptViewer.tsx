import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Receipt, Service } from "@shared/schema";
import html2pdf from 'html2pdf.js';

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
  
  // Riferimento all'elemento HTML da convertire in PDF
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Handle download of the receipt
  const handleDownload = async () => {
    if (!receipt || !serviceId) {
      toast({
        title: "Errore",
        description: "Nessuna ricevuta disponibile per il download.",
        variant: "destructive"
      });
      return;
    }
    
    setDownloadLoading(true);
    
    try {
      // Prepariamo i dati della ricevuta
      const dateStr = receipt.receiptDate ? 
        new Date(receipt.receiptDate).toLocaleDateString('it-IT') : 
        new Date().toLocaleDateString('it-IT');
      
      const paymentMethod = getPaymentMethodDisplay(receipt.paymentMethod);
      const serviceType = service?.type === 'siglatura' ? 'Siglatura' :
                          service?.type === 'happy_hour' ? 'Happy Hour' :
                          service?.type === 'riparazione' ? 'Riparazione' : 
                          service?.type || 'Non specificato';
      
      // Creiamo un elemento HTML temporaneo per la ricevuta
      const receiptElement = document.createElement('div');
      receiptElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 5px;">ELIS Sartoria</h1>
            <h2 style="color: #555; margin-top: 5px;">Ricevuta di Pagamento</h2>
          </div>
          
          <div style="border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Ricevuta N.:</td>
                <td style="padding: 8px 0;">${receipt.receiptNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Data:</td>
                <td style="padding: 8px 0;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Servizio ID:</td>
                <td style="padding: 8px 0;">${receipt.serviceId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Tipo Servizio:</td>
                <td style="padding: 8px 0;">${serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Sigla:</td>
                <td style="padding: 8px 0;">${service?.sigla || 'Non specificata'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Pezzi:</td>
                <td style="padding: 8px 0;">${service?.pieces || '0'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Importo:</td>
                <td style="padding: 8px 0;">€${receipt.amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Metodo di Pagamento:</td>
                <td style="padding: 8px 0;">${paymentMethod}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; font-size: 0.9em; color: #666; margin-top: 30px;">
            <p>Grazie per aver utilizzato i nostri servizi.</p>
            <p>ELIS Sartoria - Servizi di sartoria per gli studenti ELIS</p>
            <p>Documento generato il: ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>
      `;
      
      // Opzioni per html2pdf
      const options = {
        margin: 10,
        filename: `ricevuta_${receipt.receiptNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Convertiamo l'HTML in PDF
      await html2pdf().from(receiptElement).set(options).save();
      
      setTimeout(() => {
        toast({
          title: "Ricevuta PDF scaricata",
          description: "La ricevuta PDF è stata scaricata con successo.",
        });
        setDownloadLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Errore durante la generazione del PDF:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del PDF.",
        variant: "destructive"
      });
      setDownloadLoading(false);
    }
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