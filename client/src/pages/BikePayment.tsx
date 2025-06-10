import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bike, CreditCard, Euro, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const paymentSchema = z.object({
  sigla: z.string().min(1, "La sigla è obbligatoria"),
  customerName: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  customerEmail: z.string().email("Inserisci un indirizzo email valido"),
  amount: z.number().min(0.50, "L'importo minimo è 0.50 €").max(100, "L'importo massimo è 100 €"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// Stripe Checkout Form Component
function CheckoutForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bike-payment?success=true`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Errore durante il pagamento");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            Elaborazione pagamento...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Paga 2.50 €
          </>
        )}
      </Button>
    </form>
  );
}

export default function BikePayment() {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [clientSecret, setClientSecret] = useState<string>("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      sigla: "",
      customerName: "",
      customerEmail: "",
      amount: 2.50,
    },
  });

  // Check for success parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setStep('success');
    }
  }, []);

  const onSubmit = async (data: PaymentFormData) => {
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/public/bike-payment", data);
      setPaymentData(response);
      setClientSecret(response.clientSecret);
      setStep('payment');
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione del pagamento");
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CreditCard className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Pagamenti Segreteria ELIS</h1>
          </div>
          <p className="text-lg text-gray-600">
            Pagamento sicuro per servizi di segreteria
          </p>
        </div>

        {step === 'form' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Dati per il Pagamento
              </CardTitle>
              <CardDescription>
                Inserisci i tuoi dati e l'importo da pagare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="sigla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sigla Studente</FormLabel>
                        <FormControl>
                          <Input placeholder="Es. 157" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Es. Mario Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="mario.rossi@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Importo (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0.50" 
                            max="100" 
                            placeholder="2.50" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Importo da pagare:</span>
                      <span className="text-xl font-bold text-blue-900 flex items-center">
                        <Euro className="h-5 w-5 mr-1" />
                        {form.watch('amount')?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Procedi al Pagamento
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && clientSecret && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Pagamento Sicuro
              </CardTitle>
              <CardDescription>
                Completa il pagamento di €{paymentData?.amount?.toFixed(2)} con la tua carta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-900">Sigla:</span>
                    <p className="text-blue-700">{paymentData.orderId?.split('_')[1]}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-900">Importo:</span>
                    <p className="text-blue-700">€{paymentData?.amount?.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
              </Elements>

              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={() => setStep('form')}
              >
                Torna Indietro
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'success' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Pagamento Completato!
              </CardTitle>
              <CardDescription>
                Il tuo pagamento di segreteria è stato registrato con successo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Pagamento Confermato
                  </h3>
                  <p className="text-green-700">
                    Riceverai una conferma via email. La transazione è stata completata con successo.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Il pagamento è stato elaborato con successo. 
                  La ricevuta sarà disponibile nella tua email.
                </AlertDescription>
              </Alert>

              <Button 
                className="w-full" 
                onClick={() => {
                  setStep('form');
                  setPaymentData(null);
                  setClientSecret("");
                  form.reset();
                  // Clear URL parameters
                  window.history.pushState({}, '', '/bike-payment');
                }}
                size="lg"
              >
                Nuovo Pagamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Pagamento sicuro tramite Stripe • Segreteria ELIS
          </p>
          <p className="mt-1">
            Per assistenza contatta l'amministrazione ELIS
          </p>
        </div>
      </div>
    </div>
  );
}