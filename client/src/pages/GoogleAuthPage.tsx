import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, Check, KeyRound, Cloud, Download, Upload, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoading } from "@/contexts/loading-context";

interface AuthStatus {
  hasCredentials: boolean;
  hasValidToken: boolean;
}

export default function GoogleAuthPage() {
  const { toast } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const [authCode, setAuthCode] = useState("");
  const [localAuthStatus, setLocalAuthStatus] = useState<AuthStatus>({
    hasCredentials: false,
    hasValidToken: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Effettua il fetch dello stato di autenticazione all'avvio senza useCallback
  const fetchAuthStatus = async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/google/auth/status");
      const data = await res.json();
      console.log("Auth status fetched:", data);
      setLocalAuthStatus(data);
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch auth status on mount - solo una volta
  useEffect(() => {
    fetchAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ottieni l'URL di autorizzazione
  const fetchAuthUrl = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/google/auth/url");
      const data = await res.json();
      if (data.url) {
        setAuthUrl(data.url);
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to fetch auth URL:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile ottenere l'URL di autorizzazione.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Invia il codice di autorizzazione
  const submitAuthCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "Codice mancante",
        description: "Inserisci il codice di autorizzazione ricevuto da Google.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiRequest("/api/google/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      await res.json();
      
      toast({
        title: "Autenticazione completata",
        description: "Token di accesso Google ottenuto con successo.",
      });
      
      setAuthCode("");
      // Aggiorna lo stato dopo aver ottenuto il token
      fetchAuthStatus();
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Errore di autenticazione",
        description: "Impossibile ottenere il token. Codice non valido o scaduto.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Importa dati da Google Sheets
  const importFromSheets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/maintenance/sync-google-sheets", {
        method: "POST",
      });
      const data = await res.json();
      
      toast({
        title: "Importazione completata",
        description: `Importate ${data.success || 0} richieste di manutenzione da Google Sheets (${data.failed || 0} errori).`,
      });
    } catch (error) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Errore di importazione",
        description: "Impossibile importare le richieste da Google Sheets.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Esporta stati a Google Sheets
  const exportToSheets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/google/sheets/sync-status", {
        method: "POST",
      });
      const data = await res.json();
      
      toast({
        title: "Esportazione completata",
        description: `Aggiornate ${data.updated || 0} richieste di manutenzione in Google Sheets (${data.failed || 0} errori).`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Errore di esportazione",
        description: "Impossibile aggiornare gli stati in Google Sheets.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Gestisci lo stato di loading
  useEffect(() => {
    if (isLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isLoading, startLoading, stopLoading]);

  // Handler functions
  const handleGetAuthUrl = () => fetchAuthUrl();
  const handleSubmitCode = () => submitAuthCode(authCode);
  const handleImportSheets = () => importFromSheets();
  const handleExportStatus = () => exportToSheets();

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Autenticazione Google</h1>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="auth">
            <KeyRound className="h-4 w-4 mr-2" />
            Autenticazione
          </TabsTrigger>
          <TabsTrigger value="sync" disabled={!localAuthStatus.hasValidToken}>
            <Cloud className="h-4 w-4 mr-2" />
            Sincronizzazione
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auth">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stato autenticazione Google</CardTitle>
                <CardDescription>
                  L'autenticazione OAuth2 è necessaria per poter aggiornare i fogli Google Sheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-4">Caricamento stato...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-4 border rounded-lg">
                        <div className={`h-8 w-8 rounded-full mr-3 flex items-center justify-center ${
                          localAuthStatus.hasCredentials ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {localAuthStatus.hasCredentials ? <Check /> : <AlertCircle />}
                        </div>
                        <div>
                          <p className="font-medium">Credenziali OAuth2</p>
                          <p className="text-sm text-gray-500">
                            {localAuthStatus.hasCredentials 
                              ? "Presenti e configurate" 
                              : "Non configurate"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center p-4 border rounded-lg">
                        <div className={`h-8 w-8 rounded-full mr-3 flex items-center justify-center ${
                          localAuthStatus.hasValidToken ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {localAuthStatus.hasValidToken ? <Check /> : <AlertCircle />}
                        </div>
                        <div>
                          <p className="font-medium">Token di accesso</p>
                          <p className="text-sm text-gray-500">
                            {localAuthStatus.hasValidToken 
                              ? "Valido e attivo" 
                              : "Non presente o scaduto"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!localAuthStatus.hasCredentials && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Credenziali mancanti</AlertTitle>
                        <AlertDescription>
                          Le credenziali OAuth2 (client ID e client secret) non sono configurate.
                          Contatta l'amministratore di sistema.
                        </AlertDescription>
                      </Alert>
                    )}

                    {localAuthStatus.hasCredentials && !localAuthStatus.hasValidToken && (
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Autorizzazione richiesta</AlertTitle>
                          <AlertDescription>
                            È necessario ottenere un token di accesso per interagire con Google Sheets.
                            Clicca su "Ottieni autorizzazione" per avviare il processo.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Button onClick={handleGetAuthUrl} disabled={isLoading}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ottieni autorizzazione
                          </Button>

                          {authUrl && (
                            <div className="mt-4 space-y-2">
                              <p className="text-sm">
                                Si aprirà una nuova finestra per l'autorizzazione Google.
                                Dopo l'approvazione, copia il codice fornito e incollalo qui sotto:
                              </p>
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={authCode}
                                  onChange={(e) => setAuthCode(e.target.value)}
                                  placeholder="Codice di autorizzazione"
                                  className="flex-1 p-2 border rounded-md"
                                />
                                <Button onClick={handleSubmitCode} disabled={isLoading}>
                                  Conferma
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {localAuthStatus.hasCredentials && localAuthStatus.hasValidToken && (
                      <Alert className="bg-green-50 border-green-200">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Tutto pronto!</AlertTitle>
                        <AlertDescription className="text-green-700">
                          L'autenticazione con Google è configurata correttamente. 
                          Puoi ora sincronizzare i dati con Google Sheets.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Importa da Google Sheets</CardTitle>
                <CardDescription>
                  Importa nuove richieste di manutenzione dal foglio Google Sheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Questa funzione importerà le richieste di manutenzione dal foglio Google Sheets
                  collegato e le aggiungerà al database del sistema.
                </p>
                <p className="mb-4 text-amber-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Nota: le richieste esistenti non verranno duplicate durante l'importazione.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleImportSheets} 
                  disabled={isLoading || !localAuthStatus.hasValidToken}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Importa dal foglio Google
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Esporta stati a Google Sheets</CardTitle>
                <CardDescription>
                  Aggiorna lo stato delle richieste completate nel foglio Google.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Questa funzione aggiornerà lo stato delle richieste di manutenzione completate 
                  o rifiutate nel foglio Google Sheets, marcandole come "risolto".
                </p>
                <p className="mb-4 text-amber-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Nota: solo le richieste con stato "completato" o "rifiutato" verranno esportate.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleExportStatus} 
                  disabled={isLoading || !localAuthStatus.hasValidToken}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Esporta stati su Google Sheets
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}