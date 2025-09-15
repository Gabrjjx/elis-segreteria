import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, CreditCard, Clock } from "lucide-react";

interface PendingService {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
}

interface PaymentState {
  step: 'input' | 'services' | 'payment' | 'processing' | 'success' | 'error';
  sigla: string;
  student?: {
    sigla: string;
    firstName: string;
    lastName: string;
  };
  pendingServices: PendingService[];
  totalAmount: number;
  paymentId?: string;
  error?: string;
}

export default function StripePayment() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/secretariat-payment/stripe/:sigla?");
  const { toast } = useToast();
  
  const [paymentState, setPaymentState] = useState<PaymentState>({
    step: 'input',
    sigla: params?.sigla || '',
    pendingServices: [],
    totalAmount: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  // Auto-load services if sigla is provided in URL
  useEffect(() => {
    if (params?.sigla && paymentState.step === 'input') {
      handleSiglaSubmit(params.sigla);
    }
  }, [params?.sigla]);

  const handleSiglaSubmit = async (sigla?: string) => {
    const targetSigla = sigla || paymentState.sigla;
    
    if (!targetSigla) {
      toast({
        title: "Sigla richiesta",
        description: "Inserisci la tua sigla per continuare",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/public/services/pending/${targetSigla}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nel recupero dei servizi");
      }

      if (data.servicesCount === 0) {
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
        sigla: targetSigla,
        student: data.student,
        pendingServices: data.pendingServices,
        totalAmount: data.totalAmount
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

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // Use correct endpoint with proper metadata for webhook processing
      const response = await fetch('/api/public/secretariat-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sigla: paymentState.sigla,
          customerName: paymentState.student ? `${paymentState.student.firstName} ${paymentState.student.lastName}` : 'N/A',
          customerEmail: `${paymentState.sigla}@student.elis.org` // Default email pattern
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nella creazione del pagamento");
      }

      // Redirect to Stripe Checkout page
      window.location.href = `/checkout?client_secret=${data.clientSecret}&sigla=${paymentState.sigla}`;

    } catch (error: any) {
      console.error("Errore nel pagamento:", error);
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        error: error.message || 'Errore nella creazione del pagamento'
      }));
    } finally {
      setIsLoading(false);
    }
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
                <CreditCard className="h-5 w-5 text-blue-500" />
                Pagamento Stripe
              </CardTitle>
              <CardDescription>
                Inserisci la tua sigla per visualizzare i servizi da pagare
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sigla">Sigla Studente</Label>
                <Input
                  id="sigla"
                  type="text"
                  placeholder="es. ABC123"
                  value={paymentState.sigla}
                  onChange={(e) => setPaymentState(prev => ({ 
                    ...prev, 
                    sigla: e.target.value.toUpperCase() 
                  }))}
                  onKeyPress={(e) => e.key === 'Enter' && handleSiglaSubmit()}
                />
              </div>
              <Button 
                onClick={() => handleSiglaSubmit()} 
                disabled={!paymentState.sigla || isLoading}
                className="w-full"
              >
                {isLoading ? "Caricamento..." : "Continua"}
              </Button>
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
                      <div className="text-sm text-muted-foreground">{service.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(service.date).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {formatCurrency(service.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Totale da pagare:</span>
                <span className="text-blue-600">{formatCurrency(paymentState.totalAmount)}</span>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentState(prev => ({ ...prev, step: 'input' }))}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Indietro
                </Button>
                <Button 
                  onClick={handlePayment}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Reindirizzamento..." : "Paga con Stripe"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Errore
              </CardTitle>
              <CardDescription>
                Si è verificato un problema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">
                  {paymentState.error || 'Errore sconosciuto'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setPaymentState({
                    step: 'input',
                    sigla: '',
                    pendingServices: [],
                    totalAmount: 0
                  })}
                  className="flex-1"
                >
                  Riprova
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Torna alla Home
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pagamento Stripe
          </h1>
          <p className="text-gray-600">
            Completa il pagamento dei tuoi servizi con carta di credito
          </p>
        </div>
        
        {renderStep()}
      </div>
    </div>
  );
}