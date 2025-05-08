import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/ui/icons";
import { PayPalButton } from "@/components/payments/PayPalButton";
import { Service, ServiceType } from "@shared/schema";

export default function PublicPaymentPage() {
  const [sigla, setSigla] = useState("");
  const [searchedSigla, setSearchedSigla] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  // Query per recuperare i servizi non pagati con una certa sigla
  const { data: services, isLoading, error, refetch } = useQuery<{ services: Service[], total: number }>({
    queryKey: ["/api/services", { sigla: searchedSigla, status: "unpaid" }],
    queryFn: async () => {
      if (!searchedSigla) return { services: [], total: 0 };
      
      const response = await fetch(`/api/services?sigla=${searchedSigla}&status=unpaid&limit=50`);
      if (!response.ok) throw new Error("Errore durante il recupero dei servizi");
      return response.json();
    },
    enabled: searchedSigla !== "", // La query viene eseguita solo quando si cerca una sigla
  });
  
  const handleSearch = () => {
    if (!sigla.trim()) return;
    setSearchedSigla(sigla.trim());
    setSearchAttempted(true);
  };
  
  const handlePaymentComplete = () => {
    // Aggiorna la lista dei servizi dopo un pagamento completato
    refetch();
  };
  
  // Calcola il totale dei servizi non pagati
  const totalAmount = services?.services.reduce((sum, service) => sum + service.amount, 0) || 0;
  
  // Helper per mostrare il tipo di servizio in italiano
  const getServiceTypeLabel = (type: string) => {
    switch (type) {
      case ServiceType.SIGLATURA:
        return "Siglatura";
      case ServiceType.HAPPY_HOUR:
        return "Happy Hour";
      case ServiceType.RIPARAZIONE:
        return "Riparazione";
      default:
        return type;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Pagamento Servizi</h1>
          <p className="mt-2 text-gray-600">
            Inserisci la tua sigla per visualizzare e pagare i servizi non ancora saldati
          </p>
        </div>
        
        <Card className="w-full shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle>Cerca i tuoi servizi</CardTitle>
            <CardDescription>
              Inserisci la tua sigla per visualizzare i servizi in attesa di pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input 
                type="text" 
                placeholder="Inserisci la tua sigla" 
                value={sigla}
                onChange={(e) => setSigla(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !sigla.trim()}
              >
                {isLoading ? (
                  <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Icons.search className="h-4 w-4 mr-2" />
                )}
                Cerca
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {searchAttempted && !isLoading && (
          <>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>
                  Si è verificato un errore durante la ricerca. Riprova più tardi.
                </AlertDescription>
              </Alert>
            ) : services?.services.length === 0 ? (
              <Alert>
                <AlertTitle>Nessun servizio da pagare</AlertTitle>
                <AlertDescription>
                  Non sono stati trovati servizi non pagati per la sigla "{searchedSigla}".
                </AlertDescription>
              </Alert>
            ) : (
              <Card className="w-full shadow-lg border-green-100">
                <CardHeader>
                  <CardTitle>Servizi da pagare</CardTitle>
                  <CardDescription>
                    Sono stati trovati {services?.services.length} servizi non pagati per la sigla "{searchedSigla}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services?.services.map((service) => (
                      <div 
                        key={service.id} 
                        className="p-4 border rounded-lg bg-white shadow-sm flex justify-between items-center"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">Sigla: {service.sigla}</h3>
                            <Badge variant="outline">{getServiceTypeLabel(service.type)}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {format(new Date(service.date), "dd MMMM yyyy", { locale: it })}
                          </p>
                          {service.type === ServiceType.SIGLATURA && (
                            <p className="text-sm text-gray-600">Pezzi: {service.pieces}</p>
                          )}
                          {service.notes && (
                            <p className="text-sm text-gray-600 italic mt-1">{service.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">€{service.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-lg">Totale da pagare:</span>
                      <span className="font-bold text-xl">€{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 flex justify-end">
                  <PayPalButton 
                    serviceId={-1} // Speciale valore per indicare pagamento multiplo
                    amount={totalAmount} 
                    onPaymentComplete={handlePaymentComplete}
                    className="w-full md:w-auto"
                  />
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}