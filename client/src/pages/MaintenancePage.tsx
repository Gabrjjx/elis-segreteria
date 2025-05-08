import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, UploadCloud } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="border border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold text-amber-800 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
            Funzionalità temporaneamente sospesa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4">
            <p className="text-amber-700 mb-4">
              La gestione delle richieste di manutenzione è stata temporaneamente sospesa su richiesta dell'amministrazione.
            </p>
            <p className="text-amber-700 mb-4">
              Questa funzionalità sarà nuovamente disponibile in futuro. Nel frattempo, continuare a utilizzare il modulo Google per segnalare le richieste di manutenzione.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSfCJ_8dlDtjRLZ9U6h7eK4cZ-36MKxwUJuCbFI8G4Kzx8lq-g/viewform" target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Vai al modulo Google Forms
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}