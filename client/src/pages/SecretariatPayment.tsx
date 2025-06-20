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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, CreditCard, User, Euro, AlertCircle, Loader2, X, Smartphone } from "lucide-react";
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
  clientSecret: string; 
  onSuccess: () => void; 
  onError: (error: string) => void;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/secretariat-payment?success=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Errore nel pagamento");
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Elaborazione...
          </>
        ) : (
          `Paga €${amount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
}

interface PendingService {
  id: number;
  type: string;
  description: string;
  amount: number;
  date: string;
}

type PaymentMethod = 'stripe' | 'satispay';

interface PaymentState {
  step: 'input' | 'services' | 'method-selection' | 'stripe-payment' | 'satispay-payment' | 'processing' | 'success' | 'error';
  sigla: string;
  customerName: string;
  customerEmail: string;
  student?: {
    sigla: string;
    firstName: string;
    lastName: string;
  };
  pendingServices: PendingService[];
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  clientSecret?: string;
  paymentId?: string;
  error?: string;
}

export default function SecretariatPayment() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'input',
    sigla: '',
    customerName: '',
    customerEmail: '',
    pendingServices: [],
    totalAmount: 0
  });

  const [isLoading, setIsLoading] = useState(false);

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
      setPaymentState(prev => ({ ...prev, step: 'success' }));
    }
  }, []);

  const handleFormSubmit = async (data: PaymentFormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/public/services/pending/${data.sigla}`);
      const servicesData = await response.json();

      if (!response.ok) {
        throw new Error(servicesData.message || "Errore nel recupero dei servizi");
      }

      if (servicesData.servicesCount === 0) {
        setPaymentState(prev => ({
          ...prev,
          step: 'error',
          error: 'Nessun servizio in sospeso trovato per questa sigla'
        }));
        return;
      }

      setPaymentState(prev => ({
        ...prev,
        step: 'services',
        sigla: data.sigla,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        student: servicesData.student,
        pendingServices: servicesData.pendingServices,
        totalAmount: servicesData.totalAmount
      }));

    } catch (error: any) {
      console.error("Errore nel recupero servizi:", error);
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Errore nel recupero dei servizi'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentMethodSelection = (method: PaymentMethod) => {
    setPaymentState(prev => ({
      ...prev,
      step: 'method-selection',
      paymentMethod: method
    }));

    if (method === 'stripe') {
      initializeStripePayment();
    } else if (method === 'satispay') {
      initializeSatispayPayment();
    }
  };

  const initializeStripePayment = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/public/secretariat-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sigla: paymentState.sigla,
          customerName: paymentState.customerName,
          customerEmail: paymentState.customerEmail,
          amount: paymentState.totalAmount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nella creazione del pagamento");
      }

      setPaymentState(prev => ({
        ...prev,
        step: 'stripe-payment',
        clientSecret: data.clientSecret
      }));

    } catch (error: any) {
      console.error("Errore nel pagamento Stripe:", error);
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Errore nella creazione del pagamento Stripe'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSatispayPayment = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/public/satispay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sigla: paymentState.sigla,
          amount: paymentState.totalAmount,
          customerName: paymentState.customerName,
          description: `Pagamento servizi ELIS - ${paymentState.sigla}`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nella creazione del pagamento");
      }

      setPaymentState(prev => ({
        ...prev,
        step: 'satispay-payment',
        paymentId: data.paymentId
      }));

    } catch (error: any) {
      console.error("Errore nel pagamento Satispay:", error);
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Errore nella creazione del pagamento Satispay'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const startSatispayPolling = (paymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/public/satispay-status/${paymentId}`);
        const data = await response.json();

        if (data.status === 'ACCEPTED' || data.localStatus === 'completed') {
          clearInterval(pollInterval);
          setPaymentState(prev => ({ ...prev, step: 'success' }));
        } else if (data.status === 'CANCELED' || data.status === 'EXPIRED' || data.localStatus === 'failed') {
          clearInterval(pollInterval);
          setPaymentState(prev => ({
            ...prev,
            step: 'error',
            error: 'Pagamento annullato o scaduto'
          }));
        }
      } catch (error) {
        console.error("Errore nel controllo stato pagamento:", error);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentState.step === 'processing') {
        setPaymentState(prev => ({
          ...prev,
          step: 'error',
          error: 'Timeout del pagamento. Riprova più tardi.'
        }));
      }
    }, 300000);
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case 'siglatura': return 'Siglatura';
      case 'riparazione': return 'Riparazione';
      case 'happyHour': return 'Happy Hour';
      default: return type;
    }
  };

  const renderStep = () => {
    switch (paymentState.step) {
      case 'input':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dati Studente
              </CardTitle>
              <CardDescription>
                Inserisci i tuoi dati per continuare con il pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sigla"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sigla</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="es. ABC123"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
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
                          <Input placeholder="Mario Rossi" {...field} />
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
                          <Input placeholder="mario.rossi@esempio.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifica...
                      </>
                    ) : (
                      "Continua"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        );

      case 'services':
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Riepilogo Servizi</CardTitle>
              <CardDescription>
                Studente: {paymentState.student?.firstName} {paymentState.student?.lastName} ({paymentState.student?.sigla})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {paymentState.pendingServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{getServiceTypeLabel(service.type)}</div>
                      <div className="text-sm text-muted-foreground">
                        {service.description || 'Servizio di sartoria'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(service.date).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(service.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Totale da pagare:</span>
                  <span className="text-primary">{formatCurrency(paymentState.totalAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Button
                  onClick={() => handlePaymentMethodSelection('stripe')}
                  className="flex items-center justify-center gap-2 h-16"
                  variant="outline"
                >
                  <CreditCard className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Carta di Credito</div>
                    <div className="text-sm text-muted-foreground">Visa, Mastercard, PayPal</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handlePaymentMethodSelection('satispay')}
                  className="flex items-center justify-center gap-2 h-16 bg-orange-600 hover:bg-orange-700"
                >
                  <Smartphone className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Satispay</div>
                    <div className="text-sm text-orange-100">Pagamento mobile</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'stripe-payment':
        if (!paymentState.clientSecret) {
          return (
            <Card className="w-full max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamento con Carta
              </CardTitle>
              <CardDescription>
                Totale: {formatCurrency(paymentState.totalAmount)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements 
                stripe={stripePromise} 
                options={{ clientSecret: paymentState.clientSecret }}
              >
                <CheckoutForm
                  clientSecret={paymentState.clientSecret}
                  amount={paymentState.totalAmount}
                  onSuccess={() => setPaymentState(prev => ({ ...prev, step: 'success' }))}
                  onError={(error) => setPaymentState(prev => ({ ...prev, step: 'error', error }))}
                />
              </Elements>
            </CardContent>
          </Card>
        );

      case 'satispay-payment':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-red-500" />
                Pagamento Satispay
              </CardTitle>
              <CardDescription>
                Completa il pagamento tramite l'app Satispay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <div className="text-4xl mb-3">📱</div>
                <p className="font-semibold text-red-800">Apri l'app Satispay</p>
                <p className="text-sm text-red-600 mt-1">
                  Usa la funzione "Paga in negozio" per completare il pagamento
                </p>
              </div>
              
              {/* QR Code Simulation */}
              <div className="flex items-center justify-center">
                <div className="w-40 h-40 bg-white border-2 border-gray-300 flex items-center justify-center rounded-lg shadow-lg">
                  <div className="grid grid-cols-8 gap-1 p-2">
                    {Array.from({length: 64}).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="font-medium text-yellow-800">Istruzioni:</p>
                  <ol className="text-sm text-yellow-700 mt-1 text-left space-y-1">
                    <li>1. Apri l'app Satispay</li>
                    <li>2. Tocca "Paga in negozio"</li>
                    <li>3. Scansiona questo QR code</li>
                    <li>4. Conferma il pagamento di €{paymentState.totalAmount.toFixed(2)}</li>
                  </ol>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground space-y-1 border-t pt-3">
                <p className="font-medium">Importo: €{paymentState.totalAmount.toFixed(2)}</p>
                <p className="text-xs">ID Pagamento: {paymentState.paymentId || 'Generazione...'}</p>
                <p className="text-xs text-orange-600">⏰ Scade tra: 5 minuti</p>
              </div>
              
              <Button 
                onClick={() => {
                  setPaymentState(prev => ({ ...prev, step: 'processing' }));
                  if (paymentState.paymentId) {
                    startSatispayPolling(paymentState.paymentId);
                  }
                }} 
                className="w-full bg-red-500 hover:bg-red-600"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Ho Completato il Pagamento
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setPaymentState(prev => ({ ...prev, step: 'method-selection' }))}
                className="w-full"
              >
                Cambia Metodo di Pagamento
              </Button>
            </CardContent>
          </Card>
        );

      case 'processing':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Elaborazione Pagamento
              </CardTitle>
              <CardDescription>
                Attendere conferma del pagamento...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-pulse p-4 bg-muted rounded-lg">
                <p>Verificando il pagamento di {formatCurrency(paymentState.totalAmount)}</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Pagamento Completato
              </CardTitle>
              <CardDescription>
                I tuoi servizi sono stati pagati con successo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Successo!</AlertTitle>
                <AlertDescription>
                  Pagamento di {formatCurrency(paymentState.totalAmount)} completato con successo.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm">
                <p>✓ {paymentState.pendingServices.length} servizi pagati</p>
                <p>✓ Importo: {formatCurrency(paymentState.totalAmount)}</p>
                <p>✓ Metodo: {paymentState.paymentMethod === 'stripe' ? 'Carta di Credito' : 'Satispay'}</p>
              </div>

              <Button onClick={() => window.location.href = '/'} className="w-full">
                Torna alla Home
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                Errore
              </CardTitle>
              <CardDescription>
                Si è verificato un problema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>
                  {paymentState.error || 'Errore sconosciuto'}
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setPaymentState({
                    step: 'input',
                    sigla: '',
                    customerName: '',
                    customerEmail: '',
                    pendingServices: [],
                    totalAmount: 0
                  })}
                  className="flex-1"
                >
                  Riprova
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pagamento Servizi ELIS
          </h1>
          <p className="text-lg text-gray-600">
            Scegli il metodo di pagamento preferito per i tuoi servizi di sartoria
          </p>
        </div>
        {renderStep()}
      </div>
    </div>
  );
}