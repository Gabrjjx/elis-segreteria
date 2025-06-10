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
import { CheckCircle, CreditCard, User, Euro, AlertCircle, Loader2, X } from "lucide-react";
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
});

type PaymentFormData = z.infer<typeof paymentSchema>;

// Stripe Checkout Form Component
function CheckoutForm({ clientSecret, onSuccess, onError, amount }: { 
  clientSecret: string, 
  onSuccess: () => void, 
  onError: (error: string) => void,
  amount: number 
}) {
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

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/secretariat-payment?success=true`,
        },
      });

      if (submitError) {
        const errorMessage = submitError.message || "Errore durante il pagamento";
        setError(errorMessage);
        setIsProcessing(false);
        
        // Categorize error types for better user experience
        if (submitError.type === 'card_error') {
          onError(`Errore carta: ${errorMessage}`);
        } else if (submitError.code === 'payment_intent_authentication_failure') {
          onError(`Autenticazione fallita: ${errorMessage}`);
        } else if (submitError.code === 'card_declined') {
          onError(`Carta rifiutata: ${errorMessage}`);
        } else {
          onError(errorMessage);
        }
      } else {
        // Payment successful - call onSuccess safely
        try {
          onSuccess();
        } catch (callbackError) {
          console.log("Success callback error handled:", callbackError);
          // Still consider payment successful even if callback fails
        }
      }
    } catch (error: any) {
      console.error("Payment confirmation error:", error);
      setError("Si è verificato un errore durante il pagamento. Riprova.");
      setIsProcessing(false);
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
            Paga €{amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function SecretariatPayment() {
  const [step, setStep] = useState<'form' | 'payment' | 'success' | 'failed' | 'cancelled'>('form');
  const [clientSecret, setClientSecret] = useState<string>("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingServices, setPendingServices] = useState<any>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      sigla: "",
      customerName: "",
      customerEmail: "",
    },
  });

  // Check for success parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setStep('success');
    }
  }, []);

  // Function to fetch pending services for a sigla
  const fetchPendingServices = async (sigla: string) => {
    if (!sigla || sigla.length < 2) {
      setPendingServices(null);
      return;
    }

    setIsLoadingServices(true);
    try {
      const response = await apiRequest("GET", `/api/public/services/pending/${sigla}`);
      setPendingServices(response);
      
      // Auto-populate customer name if student found
      if (response.student) {
        form.setValue('customerName', `${response.student.firstName} ${response.student.lastName}`);
      }
      
      setError(null);
    } catch (err: any) {
      setPendingServices(null);
      setError(err.message || "Errore nel recupero dei servizi");
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Watch sigla field changes
  const watchedSigla = form.watch('sigla');
  useEffect(() => {
    if (watchedSigla) {
      const timer = setTimeout(() => {
        fetchPendingServices(watchedSigla);
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timer);
    }
  }, [watchedSigla]);

  const onSubmit = async (data: PaymentFormData) => {
    setError(null);

    if (!pendingServices || pendingServices.totalAmount === 0) {
      setError("Nessun servizio in sospeso trovato per questa sigla");
      return;
    }

    try {
      const paymentData = {
        ...data,
        amount: pendingServices.totalAmount
      };
      
      const response = await apiRequest("POST", "/api/public/bike-payment", paymentData);
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

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setStep('failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CreditCard className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Pagamento Servizi ELIS</h1>
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

                  {/* Mostra informazioni sui servizi pendenti */}
                  {isLoadingServices && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
                        <span className="text-sm text-gray-600">Ricerca servizi in corso...</span>
                      </div>
                    </div>
                  )}

                  {pendingServices && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Servizi in sospeso per {pendingServices.student.firstName} {pendingServices.student.lastName}
                      </h4>
                      <div className="space-y-2">
                        {pendingServices.pendingServices.map((service: any) => (
                          <div key={service.id} className="flex justify-between items-center text-sm">
                            <span className="text-blue-700">
                              {service.type} - {new Date(service.date).toLocaleDateString()}
                            </span>
                            <span className="font-medium text-blue-900">€{service.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-blue-900">Totale da pagare:</span>
                            <span className="text-lg text-blue-900">€{pendingServices.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingServices && pendingServices.servicesCount === 0 && (
                    <Alert>
                      <AlertDescription>
                        Nessun servizio in sospeso trovato per questa sigla.
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}



                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={!pendingServices || pendingServices.totalAmount === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {pendingServices ? `Procedi al Pagamento (€${pendingServices.totalAmount.toFixed(2)})` : 'Procedi al Pagamento'}
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
                <CheckoutForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} onError={handlePaymentError} amount={paymentData?.amount || 0} />
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
                  window.history.pushState({}, '', '/secretariat-payment');
                }}
                size="lg"
              >
                Nuovo Pagamento
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Failed State */}
        {step === 'failed' && (
          <Card className="shadow-lg border-red-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-red-800">Pagamento Non Riuscito</CardTitle>
              <CardDescription className="text-red-600">
                Si è verificato un problema durante l'elaborazione del pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Dettagli errore</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setStep('payment');
                    setError(null);
                  }}
                  size="lg"
                >
                  Riprova Pagamento
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={() => {
                    setStep('form');
                    setPaymentData(null);
                    setClientSecret("");
                    setError(null);
                    form.reset();
                    window.history.pushState({}, '', '/secretariat-payment');
                  }}
                  size="lg"
                >
                  Torna all'Inizio
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Cosa puoi fare:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Verifica i dati della carta</li>
                  <li>• Controlla il saldo disponibile</li>
                  <li>• Prova con un'altra carta</li>
                  <li>• Contatta la tua banca se il problema persiste</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Cancelled State */}
        {step === 'cancelled' && (
          <Card className="shadow-lg border-yellow-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <X className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <CardTitle className="text-yellow-800">Pagamento Annullato</CardTitle>
              <CardDescription className="text-yellow-600">
                Il pagamento è stato annullato dall'utente
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Alert>
                <AlertDescription>
                  Nessun addebito è stato effettuato sulla tua carta.
                  Puoi ritentare il pagamento quando vuoi.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setStep('payment');
                    setError(null);
                  }}
                  size="lg"
                >
                  Riprova Pagamento
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={() => {
                    setStep('form');
                    setPaymentData(null);
                    setClientSecret("");
                    setError(null);
                    form.reset();
                    window.history.pushState({}, '', '/secretariat-payment');
                  }}
                  size="lg"
                >
                  Torna all'Inizio
                </Button>
              </div>
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