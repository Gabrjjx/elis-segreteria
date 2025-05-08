import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import QrScanner from "@/components/mobile/QrScanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Camera, Search, User, Package } from "lucide-react";

const QrScannerPage: React.FC = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"student" | "service" | "unknown" | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleScan = async (data: string) => {
    setScannedData(data);
    setScannerOpen(false);
    setLoading(true);

    try {
      // Try to identify what the QR code contains
      if (/^\d{1,4}$/.test(data)) {
        // It looks like a student sigla
        setResultType("student");
        
        // Fetch student data to confirm
        const response = await fetch(`/api/students/by-sigla/${data}`);
        
        if (response.ok) {
          toast({
            title: "Studente trovato",
            description: `Sigla riconosciuta: ${data}`,
          });
          navigate(`/services?sigla=${data}`);
        } else {
          setResultType("unknown");
          toast({
            title: "Sigla non riconosciuta",
            description: "Nessuno studente trovato con questa sigla",
            variant: "destructive",
          });
        }
      } else if (/^[a-zA-Z0-9]{8,}$/.test(data)) {
        // It could be a service ID or something else
        setResultType("service");
        
        const response = await fetch(`/api/services/${data}`);
        
        if (response.ok) {
          toast({
            title: "Servizio trovato",
            description: `ID servizio riconosciuto: ${data}`,
          });
          navigate(`/services/${data}`);
        } else {
          setResultType("unknown");
          toast({
            title: "Codice non riconosciuto",
            description: "Nessun servizio trovato con questo codice",
            variant: "destructive",
          });
        }
      } else {
        // Unknown format
        setResultType("unknown");
        toast({
          title: "Formato sconosciuto",
          description: "Il codice QR non sembra contenere dati riconoscibili",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setResultType("unknown");
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'elaborazione del codice QR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Scanner QR</h1>
      
      <div className="grid gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center py-4">
              <Camera className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-xl font-semibold mb-2">Scanner QR</h2>
              <p className="text-gray-500 mb-6">
                Utilizza la fotocamera per scansionare codici QR di studenti o servizi
              </p>
              
              <Button 
                size="lg" 
                className="w-full max-w-xs"
                onClick={() => setScannerOpen(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Avvia scanner
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {scannedData && (
          <Card className={resultType === "unknown" ? "border-red-200" : "border-green-200"}>
            <CardContent className="p-6">
              <div className="flex flex-col">
                <div className="flex items-center mb-4">
                  {resultType === "student" && <User className="h-6 w-6 text-green-500 mr-2" />}
                  {resultType === "service" && <Package className="h-6 w-6 text-green-500 mr-2" />}
                  {resultType === "unknown" && <Search className="h-6 w-6 text-red-500 mr-2" />}
                  
                  <h3 className="text-lg font-medium">
                    {resultType === "student" && "Sigla studente"}
                    {resultType === "service" && "ID servizio"}
                    {resultType === "unknown" && "Codice sconosciuto"}
                  </h3>
                </div>
                
                <div className="p-3 bg-gray-100 rounded-md mb-4 font-mono break-all">
                  {scannedData}
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {resultType === "student" && (
                      <Button 
                        onClick={() => navigate(`/services?sigla=${scannedData}`)}
                        variant="outline"
                      >
                        Visualizza servizi dello studente
                      </Button>
                    )}
                    
                    {resultType === "service" && (
                      <Button 
                        onClick={() => navigate(`/services/${scannedData}`)}
                        variant="outline"
                      >
                        Visualizza dettagli servizio
                      </Button>
                    )}
                    
                    <Button 
                      onClick={() => setScannerOpen(true)}
                    >
                      Scansiona nuovo codice
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <QrScanner 
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  );
};

export default QrScannerPage;