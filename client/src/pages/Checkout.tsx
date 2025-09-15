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

const CheckoutForm = ({ sigla }: { sigla: string }) => {
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

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Remove return_url to prevent redirect issues
      },
      redirect: "never", // Handle confirmation without redirects
    });

    if (error) {
      toast({
        title: "Errore nel Pagamento",
        description: error.message,
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Payment succeeded, navigate to success page manually
      toast({
        title: "Pagamento Completato",
        description: "Grazie per il tuo pagamento!",
      });
      
      // Navigate to success page with payment data
      navigate(`/payment-success?payment_intent=${paymentIntent.id}&sigla=${sigla}&method=stripe&redirect_status=succeeded`);
    } else {
      // Handle other payment states
      if (paymentIntent?.status === "requires_action") {
        toast({
          title: "Azione Richiesta",
          description: "Il pagamento richiede un'azione aggiuntiva. Riprova.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Stato Sconosciuto",
          description: "Stato del pagamento non riconosciuto. Contatta il supporto.",
          variant: "destructive",
        });
      }
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
        <CheckoutForm sigla={sigla} />
      </Elements>
    </div>
  );
}