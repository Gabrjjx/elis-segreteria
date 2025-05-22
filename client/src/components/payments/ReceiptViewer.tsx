import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Receipt, Service } from "@shared/schema";
import { jsPDF } from "jspdf";

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
    
    try {
      // Creiamo un nuovo documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Prepariamo i dati della ricevuta
      const dateStr = receipt.receiptDate ? 
        new Date(receipt.receiptDate).toLocaleDateString('it-IT') : 
        new Date().toLocaleDateString('it-IT');
      
      const paymentMethod = getPaymentMethodDisplay(receipt.paymentMethod);
      const serviceType = service?.type === 'siglatura' ? 'Siglatura' :
                          service?.type === 'happy_hour' ? 'Happy Hour' :
                          service?.type === 'riparazione' ? 'Riparazione' : 
                          service?.type || 'Non specificato';
      
      // Impostiamo il font
      doc.setFont('helvetica', 'normal');
      
      // Intestazione
      doc.setFontSize(22);
      doc.text('ELIS Sartoria', 105, 20, { align: 'center' });
      doc.setFontSize(16);
      doc.text('Ricevuta di Pagamento', 105, 30, { align: 'center' });
      
      // Linea separatrice
      doc.setLineWidth(0.5);
      doc.line(20, 35, 190, 35);
      
      // Dettagli ricevuta
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Ricevuta N.:', 20, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(receipt.receiptNumber, 70, 50);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Data:', 20, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(dateStr, 70, 60);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Servizio ID:', 20, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(receipt.serviceId.toString(), 70, 70);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Tipo Servizio:', 20, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(serviceType, 70, 80);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Sigla:', 20, 90);
      doc.setFont('helvetica', 'normal');
      doc.text(service?.sigla || 'Non specificata', 70, 90);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Pezzi:', 20, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(service?.pieces?.toString() || '0', 70, 100);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Importo:', 20, 110);
      doc.setFont('helvetica', 'normal');
      doc.text(`€${receipt.amount.toFixed(2)}`, 70, 110);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Metodo di Pagamento:', 20, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(paymentMethod, 70, 120);
      
      // Linea separatrice
      doc.setLineWidth(0.5);
      doc.line(20, 130, 190, 130);
      
      // Footer
      doc.setFontSize(10);
      doc.text('Grazie per aver utilizzato i nostri servizi.', 105, 150, { align: 'center' });
      doc.text('ELIS Sartoria - Servizi di sartoria per gli studenti ELIS', 105, 160, { align: 'center' });
      doc.text(`Documento generato il: ${new Date().toLocaleString('it-IT')}`, 105, 170, { align: 'center' });
      
      // Salviamo il PDF
      doc.save(`ricevuta_${receipt.receiptNumber}.pdf`);
      
      setTimeout(() => {
        toast({
          title: "Ricevuta PDF scaricata",
          description: "La ricevuta PDF è stata scaricata con successo.",
        });
        setDownloadLoading(false);
      }, 500);
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