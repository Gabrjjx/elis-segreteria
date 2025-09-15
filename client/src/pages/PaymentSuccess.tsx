import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface PaymentSuccessData {
  paymentId: string;
  method: string;
  amount: number;
  services: Array<{
    id: number;
    sigla: string;
    serviceType: string;
    price: number;
    description: string;
  }>;
  timestamp: string;
}

export default function PaymentSuccess() {
  const [location, navigate] = useLocation();
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);

  useEffect(() => {
    // Estrai i parametri dall'URL
    const [path, search] = location.split('?');
    const urlParams = new URLSearchParams(search || '');
    const paymentId = urlParams.get('payment_id');
    const method = urlParams.get('method');
    const amount = urlParams.get('amount');
    
    // Recupera i dati dal localStorage se disponibili
    const storedData = localStorage.getItem('paymentSuccessData');
    if (storedData) {
      setPaymentData(JSON.parse(storedData));
      // Pulisci il localStorage dopo aver recuperato i dati
      localStorage.removeItem('paymentSuccessData');
    } else if (paymentId && method && amount) {
      // Crea dati minimi se non sono disponibili nel localStorage
      setPaymentData({
        paymentId,
        method,
        amount: parseFloat(amount),
        services: [],
        timestamp: new Date().toISOString()
      });
    }
  }, [location]);

  const getMethodBadge = (method: string) => {
    const methodColors = {
      stripe: "bg-purple-100 text-purple-800",
      satispay: "bg-red-100 text-red-800", 
      revolut: "bg-blue-100 text-blue-800",
      sumup: "bg-green-100 text-green-800"
    };
    
    const methodNames = {
      stripe: "Carta di Credito",
      satispay: "Satispay",
      revolut: "Revolut",
      sumup: "SumUp"
    };

    return (
      <Badge className={methodColors[method as keyof typeof methodColors] || "bg-gray-100 text-gray-800"}>
        {methodNames[method as keyof typeof methodNames] || method}
      </Badge>
    );
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Caricamento dati pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="w-16 h-16" />
              </motion.div>
            </div>
            <CardTitle className="text-center text-2xl font-bold">
              Pagamento Completato!
            </CardTitle>
            <p className="text-center text-green-100 mt-2">
              La transazione è stata elaborata con successo
            </p>
          </CardHeader>

          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Dettagli Pagamento */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Dettagli Pagamento
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">ID Transazione</p>
                    <p className="font-mono text-sm bg-white p-2 rounded border">
                      {paymentData.paymentId}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Metodo di Pagamento</p>
                    <div className="mt-1">
                      {getMethodBadge(paymentData.method)}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Importo Totale</p>
                    <p className="text-2xl font-bold text-green-600">
                      €{paymentData.amount.toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Data e Ora</p>
                    <p className="text-sm">
                      {new Date(paymentData.timestamp).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Servizi Pagati */}
              {paymentData.services && paymentData.services.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Servizi Pagati
                  </h3>
                  
                  <div className="space-y-3">
                    {paymentData.services.map((service, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{service.serviceType}</p>
                            <p className="text-sm text-gray-600">
                              Sigla: {service.sigla}
                            </p>
                            {service.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              €{service.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Azioni */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  onClick={() => navigate('/secretariat-payment')}
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Nuovo Pagamento
                </Button>
                
                <Button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Stampa Ricevuta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}