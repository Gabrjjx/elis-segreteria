import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Building } from "lucide-react";

export default function PaymentSelection() {
  const [, navigate] = useLocation();
  const [sigla, setSigla] = useState("");

  const handlePaymentMethod = (method: 'stripe' | 'satispay') => {
    if (!sigla) {
      return;
    }
    
    if (method === 'stripe') {
      navigate(`/secretariat-payment?sigla=${sigla}`);
    } else if (method === 'satispay') {
      navigate(`/satispay-payment/${sigla}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Pagamento Servizi ELIS
          </h1>
          <p className="text-lg text-gray-600">
            Scegli il metodo di pagamento per i tuoi servizi di sartoria
          </p>
        </div>

        {/* Sigla Input */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Inserisci la tua Sigla</CardTitle>
            <CardDescription>
              Inserisci la sigla per visualizzare i servizi da pagare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla Studente</Label>
              <Input
                id="sigla"
                type="text"
                placeholder="es. ABC123"
                value={sigla}
                onChange={(e) => setSigla(e.target.value.toUpperCase())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Stripe Payment */}
          <Card className={`cursor-pointer transition-all hover:shadow-lg ${!sigla ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                Carta di Credito/Debito
              </CardTitle>
              <CardDescription>
                Paga con carta di credito, debito o PayPal tramite Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Secure SSL
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Pagamento istantaneo
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Tutte le principali carte
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-2 py-2">
                <div className="text-xs bg-blue-100 px-2 py-1 rounded">VISA</div>
                <div className="text-xs bg-red-100 px-2 py-1 rounded">MASTERCARD</div>
                <div className="text-xs bg-blue-100 px-2 py-1 rounded">PAYPAL</div>
              </div>

              <Button 
                onClick={() => handlePaymentMethod('stripe')}
                disabled={!sigla}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Paga con Carta
              </Button>
            </CardContent>
          </Card>

          {/* Satispay Payment */}
          <Card className={`cursor-pointer transition-all hover:shadow-lg ${!sigla ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-orange-500" />
                Satispay
              </CardTitle>
              <CardDescription>
                Paga con l'app Satispay dal tuo smartphone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Pagamento mobile
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Senza commissioni
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  ✓ Veloce e sicuro
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="text-xs bg-orange-100 px-3 py-2 rounded-lg font-medium text-orange-700">
                  Richiede app Satispay
                </div>
              </div>

              <Button 
                onClick={() => handlePaymentMethod('satispay')}
                disabled={!sigla}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Paga con Satispay
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informazioni sui Pagamenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Servizi Pagabili:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Siglatura abiti</li>
                  <li>• Riparazioni sartoriali</li>
                  <li>• Servizi Happy Hour</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Sicurezza:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Pagamenti sicuri e crittografati</li>
                  <li>• Conformità PCI DSS</li>
                  <li>• Supporto clienti dedicato</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground text-center">
                Per assistenza contatta la segreteria ELIS o scrivi a amministrazione@elis.org
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}