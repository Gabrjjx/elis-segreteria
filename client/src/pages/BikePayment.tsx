import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bike, CreditCard, Euro, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const paymentSchema = z.object({
  sigla: z.string().min(1, "La sigla è obbligatoria"),
  customerName: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  customerEmail: z.string().email("Inserisci un indirizzo email valido"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function BikePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      sigla: "",
      customerName: "",
      customerEmail: "",
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/public/bike-payment", data);
      setPaymentData(response);
    } catch (err: any) {
      setError(err.message || "Errore durante la creazione del pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentData?.paymentUrl) {
      // In production, this would redirect to Nexi payment page
      window.open(paymentData.paymentUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bike className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Servizio Bici ELIS</h1>
          </div>
          <p className="text-lg text-gray-600">
            Prenotazione e pagamento per il servizio bici
          </p>
        </div>

        {!paymentData ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Dati per il Pagamento
              </CardTitle>
              <CardDescription>
                Inserisci i tuoi dati per procedere con il pagamento di 2.50 €
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
                        2.50
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isProcessing}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Creazione ordine...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Procedi al Pagamento
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Ordine Creato con Successo
              </CardTitle>
              <CardDescription>
                Il tuo ordine di pagamento è stato generato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-900">ID Ordine:</span>
                    <p className="text-green-700">{paymentData.orderId}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-900">Importo:</span>
                    <p className="text-green-700">{paymentData.amount}</p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  {paymentData.message}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button onClick={handlePayment} className="w-full" size="lg">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Vai al Pagamento Nexi
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setPaymentData(null);
                    form.reset();
                  }}
                >
                  Nuovo Pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Pagamento sicuro tramite Nexi • Servizio Bici ELIS
          </p>
          <p className="mt-1">
            Per assistenza contatta l'amministrazione ELIS
          </p>
        </div>
      </div>
    </div>
  );
}