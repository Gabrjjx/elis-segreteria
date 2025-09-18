import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from 'wouter';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ sigla, clientSecret }: { sigla: string; clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Initiating payment confirmation...');
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // No return_url specified - prevents automatic redirects
        },
        redirect: "if_required", // Valid Stripe option
      });

      console.log('💳 Payment confirmation result:', { error, paymentIntentStatus: paymentIntent?.status });

      if (error) {
        console.error('❌ Payment error:', error);
        toast({
          title: "Errore nel Pagamento",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (paymentIntent) {
        console.log('🔍 Processing payment intent with status:', paymentIntent.status);
        
        if (paymentIntent.status === "succeeded") {
          console.log('✅ Payment succeeded immediately, navigating...');
          console.log('🔧 Navigation params:', { paymentIntentId: paymentIntent.id, sigla, method: 'stripe' });
          
          // Get amount from paymentIntent (convert from cents to euros)
          const amountEuros = paymentIntent.amount / 100;
          const navigationUrl = `/payment-success?payment_intent=${paymentIntent.id}&sigla=${sigla}&method=stripe&amount=${amountEuros}&redirect_status=succeeded`;
          console.log('🔗 Navigation URL:', navigationUrl);
          
          toast({
            title: "Pagamento Completato",
            description: "Grazie per il tuo pagamento!",
          });
          
          // Navigate to success page with payment data
          navigate(navigationUrl);
          return;
        } 
        
        if (paymentIntent.status === "processing") {
          console.log('⏳ Payment processing, polling for status...');
          // Payment is processing, poll for status update
          let attempts = 0;
          const maxAttempts = 10; // Maximum 20 seconds of polling
          
          const pollPaymentStatus = async () => {
            attempts++;
            console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);
            
            try {
              const { paymentIntent: updatedPI } = await stripe.retrievePaymentIntent(clientSecret!);
              console.log('📡 Retrieved payment status:', updatedPI?.status);
              
              if (updatedPI?.status === "succeeded") {
                console.log('✅ Payment succeeded after polling, navigating...');
                console.log('🔧 Polling navigation params:', { paymentIntentId: updatedPI.id, sigla, method: 'stripe' });
                
                // Get amount from paymentIntent (convert from cents to euros)
                const amountEuros = updatedPI.amount / 100;
                const navigationUrl = `/payment-success?payment_intent=${updatedPI.id}&sigla=${sigla}&method=stripe&amount=${amountEuros}&redirect_status=succeeded`;
                console.log('🔗 Polling navigation URL:', navigationUrl);
                
                toast({
                  title: "Pagamento Completato",
                  description: "Grazie per il tuo pagamento!",
                });
                navigate(navigationUrl);
                setIsLoading(false);
                return;
              } 
              
              if (updatedPI?.status === "requires_payment_method" || updatedPI?.status === "canceled") {
                console.log('❌ Payment failed during polling:', updatedPI.status);
                toast({
                  title: "Pagamento Fallito",
                  description: "Il pagamento non è andato a buon fine. Riprova.",
                  variant: "destructive",
                });
                setIsLoading(false);
                return;
              }
              
              // Still processing, continue polling if we have attempts left
              if (attempts < maxAttempts && (updatedPI?.status === "processing" || updatedPI?.status === "requires_action")) {
                setTimeout(pollPaymentStatus, 2000); // Poll every 2 seconds
              } else {
                console.log('⏰ Polling timeout or final status:', updatedPI?.status);
                // Timeout or final status reached
                toast({
                  title: "Verifica Pagamento",
                  description: "Il pagamento potrebbe essere in elaborazione. Controlla lo stato del pagamento.",
                  variant: "default",
                });
                setIsLoading(false);
              }
            } catch (pollError) {
              console.error('❌ Error polling payment status:', pollError);
              toast({
                title: "Errore di Connessione",
                description: "Errore nel verificare lo stato del pagamento. Riprova.",
                variant: "destructive",
              });
              setIsLoading(false);
            }
          };
          
          // Start polling after a short delay
          setTimeout(pollPaymentStatus, 1000);
          return;
        }
        
        if (paymentIntent.status === "requires_action") {
          console.log('🔐 Payment requires action');
          toast({
            title: "Azione Richiesta",
            description: "Il pagamento richiede un'azione aggiuntiva. Riprova.",
            variant: "destructive",
          });
        } else {
          console.log('❓ Unknown payment status:', paymentIntent.status);
          toast({
            title: "Stato Sconosciuto",
            description: `Stato del pagamento: ${paymentIntent.status}. Contatta il supporto se necessario.`,
            variant: "default",
          });
        }
      } else {
        console.log('❌ No payment intent returned');
        toast({
          title: "Errore",
          description: "Nessun risultato di pagamento ricevuto. Riprova.",
          variant: "destructive",
        });
      }
      
    } catch (submitError) {
      console.error('❌ Error in handleSubmit:', submitError);
      toast({
        title: "Errore Imprevisto",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  }

  const handleBack = () => {
    navigate(`/secretariat-payment/stripe/${sigla}`);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Completa il Pagamento</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Elaborazione...
              </>
            ) : (
              'Paga Ora'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [sigla, setSigla] = useState("");

  useEffect(() => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientSecretParam = urlParams.get('client_secret');
    const siglaParam = urlParams.get('sigla');
    
    if (clientSecretParam) {
      setClientSecret(clientSecretParam);
    }
    if (siglaParam) {
      setSigla(siglaParam);
    }
  }, []);

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Caricamento pagamento...</p>
        </div>
      </div>
    );
  }

  // Make SURE to wrap the form in <Elements> which provides the stripe context.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm sigla={sigla} clientSecret={clientSecret} />
      </Elements>
    </div>
  );
}
