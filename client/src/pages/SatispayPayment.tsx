import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Euro, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface PendingService {
  id: number;
  type: string;
  description: string;
  amount: number;
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

export default function SatispayPayment() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/satispay-payment/:sigla?");
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
      const response = await fetch('/api/public/satispay-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sigla: paymentState.sigla,
          amount: paymentState.totalAmount,
          customerName: `${paymentState.student?.firstName} ${paymentState.student?.lastName}`,
          description: `Pagamento servizi ELIS - ${paymentState.sigla}`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Errore nella creazione del pagamento");
      }

      setPaymentState(prev => ({
        ...prev,
        step: 'payment',
        paymentId: data.paymentId
      }));

      // Start polling for payment status
      startPaymentPolling(data.paymentId);

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

  const startPaymentPolling = (paymentId: string) => {
    setPaymentState(prev => ({ ...prev, step: 'processing' }));
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/public/satispay-status/${paymentId}`);
        const data = await response.json();

        if (data.status === 'ACCEPTED' || data.localStatus === 'completed') {
          clearInterval(pollInterval);
          setPaymentState(prev => ({ ...prev, step: 'success' }));
          
          toast({
            title: "Pagamento completato!",
            description: "I tuoi servizi sono stati pagati con successo",
          });
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
                <Smartphone className="h-5 w-5 text-orange-500" />
                Pagamento Satispay
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
                <span className="text-orange-600">{formatCurrency(paymentState.totalAmount)}</span>
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
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? "Creazione..." : "Paga con Satispay"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'payment':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-orange-500" />
                Completa il Pagamento
              </CardTitle>
              <CardDescription>
                Apri l'app Satispay per completare il pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="p-6 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-2">
                  {formatCurrency(paymentState.totalAmount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  ID Pagamento: {paymentState.paymentId}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  1. Apri l'app Satispay sul tuo smartphone
                </p>
                <p className="text-sm">
                  2. Cerca il pagamento ELIS
                </p>
                <p className="text-sm">
                  3. Conferma il pagamento di {formatCurrency(paymentState.totalAmount)}
                </p>
              </div>

              <Button 
                variant="outline" 
                onClick={() => startPaymentPolling(paymentState.paymentId!)}
                className="w-full"
              >
                Controlla Stato Pagamento
              </Button>
            </CardContent>
          </Card>
        );

      case 'processing':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 animate-spin" />
                Elaborazione Pagamento
              </CardTitle>
              <CardDescription>
                Attendere conferma del pagamento...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="animate-pulse p-6 bg-orange-50 rounded-lg">
                <div className="text-lg text-orange-600">
                  Verificando il pagamento di {formatCurrency(paymentState.totalAmount)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Non chiudere questa pagina
              </p>
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
              <div className="p-6 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {formatCurrency(paymentState.totalAmount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Pagamento elaborato con successo
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  ✓ {paymentState.pendingServices.length} servizi pagati
                </p>
                <p className="text-sm">
                  ✓ Importo: {formatCurrency(paymentState.totalAmount)}
                </p>
                <p className="text-sm">
                  ✓ Metodo: Satispay
                </p>
              </div>

              <Button 
                onClick={() => navigate('/')}
                className="w-full"
              >
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {renderStep()}
      </div>
    </div>
  );
}