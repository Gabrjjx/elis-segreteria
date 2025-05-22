import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PayPalButtonProps {
  serviceId: number; // -1 indica un pagamento multiplo dalla pagina pubblica
  amount: number;
  onPaymentComplete?: (serviceId: number) => void;
  onPaymentCancel?: () => void;
  className?: string;
  sigla?: string; // Per pagamenti pubblici, passa la sigla dell'utente
}

export function PayPalButton({ 
  serviceId, 
  amount, 
  onPaymentComplete, 
  onPaymentCancel,
  className,
  sigla
}: PayPalButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Processo di pagamento PayPal
  const handlePayPalPayment = async () => {
    if (amount <= 0) {
      toast({
        title: "Errore",
        description: "L'importo del pagamento deve essere maggiore di zero.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Step 1: Creare l'ordine PayPal
      const orderData = await apiRequest("POST", "/api/paypal/create-order", {
        serviceId,
        sigla, // Passiamo la sigla per i pagamenti pubblici
        amount: amount.toFixed(2),
        currency: "EUR",
        isPublicPayment: serviceId === -1 // Indica se è un pagamento dalla pagina pubblica
      });
      
      const orderId = orderData.id;
      
      // Step 2: Informiamo l'utente che sta avvenendo il pagamento
      toast({
        title: "Simulazione pagamento",
        description: "Stiamo simulando il pagamento...",
      });
      
      // Simulazione del pagamento (in un'applicazione reale, si userebbe l'integrazione del client SDK di PayPal)
      setTimeout(async () => {
        try {
          // Catturiamo direttamente l'ordine (simulando che l'utente ha completato il processo su PayPal)
          const captureData = await apiRequest("POST", `/api/paypal/capture/${orderId}`);
          
          // Pagamento completato con successo
          toast({
            title: "Pagamento completato",
            description: "Il pagamento è stato elaborato con successo.",
            variant: "success",
          });
          
          // Notifica il completamento del pagamento
          if (onPaymentComplete) {
            onPaymentComplete(serviceId);
          }
        } catch (error) {
          console.error("Errore durante il completamento del pagamento:", error);
          toast({
            title: "Errore di pagamento",
            description: "Non è stato possibile completare il pagamento. Riprova più tardi.",
            variant: "destructive",
          });
          
          // Notifica la cancellazione del pagamento
          if (onPaymentCancel) {
            onPaymentCancel();
          }
        } finally {
          setLoading(false);
        }
      }, 2000); // Simuliamo un ritardo di 2 secondi
      
    } catch (error) {
      console.error("Errore durante il processo di pagamento:", error);
      toast({
        title: "Errore",
        description: "Non è stato possibile avviare il processo di pagamento. Riprova più tardi.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayPalPayment}
      disabled={loading || amount <= 0}
      className={`${className || ""} bg-[#0070ba] hover:bg-[#003087] text-white`}
      aria-label="Paga con PayPal"
      size={serviceId === -1 ? "lg" : "sm"} // Pulsante più grande per la pagina pubblica
    >
      {loading ? (
        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.067 8.478c.492.981.589 2.114.291 3.293-.437 1.713-1.43 3.044-2.794 3.937-1.202.788-2.596 1.163-4.067 1.105h-.261a.774.774 0 0 0-.705.47l-.53 1.587a7.868 7.868 0 0 1-.259.657c-.232.436-.699.615-1.132.615h-2.416c-.291 0-.523-.232-.494-.494l1.482-9.624c.116-.669.67-1.163 1.367-1.163h4.702c.291 0 .61.029.9.087.9.203 1.744.64 2.44 1.308.494.494.872 1.105 1.105 1.804l.261.407.11.105zM9.439 9.99l-.668 4.299c-.29.174.87.32.261.32h.64c1.25 0 2.374-.203 3.366-.64a4.38 4.38 0 0 0 2.24-1.977c.756-1.453.349-2.965-1.017-3.605a4.417 4.417 0 0 0-1.891-.378H9.99a.581.581 0 0 0-.552.582v1.25l.001.149zm3.487-5.017c2.211 0 4.251.726 5.73 2.034 1.105.988 1.88 2.265 2.211 3.66.407 1.717.174 3.376-.697 4.714-.9 1.366-2.295 2.354-3.954 2.763-.639.174-1.308.231-1.977.232H9.581c-.261 0-.465-.204-.436-.465l1.947-12.675c.087-.64.639-1.105 1.279-1.105h3.487l1.068-.158z" fill="currentColor" />
        </svg>
      )}
      Paga con PayPal
    </Button>
  );
}