import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { startLoading, stopLoading } = useLoading();
  const [authCode, setAuthCode] = useState("");
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Utilizziamo useState invece di useQuery per lo stato di autenticazione
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ 
    hasCredentials: false, 
    hasValidToken: false
  });
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Funzione per caricare manualmente lo stato di autenticazione
  const fetchAuthStatus = async () => {
    try {
      setIsStatusLoading(true);
      // Utilizziamo direttamente fetch con headers per prevenire caching
      const cacheBuster = `?nocache=${Date.now()}`;
      const response = await fetch(`/api/google/auth/status${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore nella richiesta: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetch diretta API: /api/google/auth/status", data);
      
      // Aggiorniamo lo stato manualmente
      setAuthStatus(data);
    } catch (error) {
      console.error("Errore nel caricamento dello stato:", error);
      toast({
        variant: "destructive",
        title: "Errore di connessione",
        description: "Impossibile verificare lo stato dell'autenticazione Google.",
      });
    } finally {
      setIsStatusLoading(false);
    }
  };
  
  // Carica lo stato all'avvio del componente
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  // Mutation per ottenere l'URL di autorizzazione
  const getAuthUrlMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/google/auth/url");
      const data = await res.json();
      return data.url as string;
    },
    onSuccess: (url) => {
      setAuthUrl(url);
      window.open(url, "_blank");
    },
    onError: (error) => {
      console.error("Failed to fetch auth URL:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile ottenere l'URL di autorizzazione.",
      });
    }
  });

  // Mutation per inviare il codice di autorizzazione
  const submitCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("/api/google/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Autenticazione completata",
        description: "Token di accesso Google ottenuto con successo.",
      });
      setAuthCode("");
      queryClient.invalidateQueries({ queryKey: ['googleAuthStatus'] });
    },
    onError: (error) => {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Errore di autenticazione",
        description: "Impossibile ottenere il token. Codice non valido o scaduto.",
      });
    }
  });

  // Mutation per importare dati da Google Sheets
  const importSheetsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/maintenance/sync-google-sheets", {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importazione completata",
        description: `Importate ${data.success || 0} richieste di manutenzione da Google Sheets (${data.failed || 0} errori).`,
      });
    },
    onError: (error) => {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Errore di importazione",
        description: "Impossibile importare le richieste da Google Sheets.",
      });
    }
  });

  // Mutation per esportare stati a Google Sheets
  const exportStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/google/sheets/sync-status", {
        method: "POST",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Esportazione completata",
        description: `Aggiornate ${data.updated || 0} richieste di manutenzione in Google Sheets (${data.failed || 0} errori).`,
      });
    },
    onError: (error) => {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Errore di esportazione",
        description: "Impossibile aggiornare gli stati in Google Sheets.",
      });
    }
  });

  // Gestisci lo stato di loading globale
  const anyMutationPending = getAuthUrlMutation.isPending || 
                            submitCodeMutation.isPending ||
                            importSheetsMutation.isPending ||
                            exportStatusMutation.isPending;

  // Utilizziamo una variabile di stato per lo status di caricamento
  const [localLoading, setLocalLoading] = useState(false);
  const isLoading = localLoading || anyMutationPending;
  
  // Gestiamo lo stato solo quando cambia anyMutationPending
  // Questo evita i loop di aggiornamento continui
  useEffect(() => {
    if (anyMutationPending) {
      startLoading();
      setLocalLoading(true);
    } else {
      stopLoading();
      setLocalLoading(false);
    }
  }, [anyMutationPending, startLoading, stopLoading]);

  // Handler functions
  function handleGetAuthUrl() {
    getAuthUrlMutation.mutate();
  }

  function handleSubmitCode() {
    if (!authCode.trim()) {
      toast({
        variant: "destructive",
        title: "Codice mancante",
        description: "Inserisci il codice di autorizzazione ricevuto da Google.",
      });
      return;
    }
    submitCodeMutation.mutate(authCode);
  }

  function handleImportSheets() {
    importSheetsMutation.mutate();
  }

  function handleExportStatus() {
    exportStatusMutation.mutate();
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Autenticazione Google</h1>

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="auth">
            <KeyRound className="h-4 w-4 mr-2" />
            Autenticazione
          </TabsTrigger>
          <TabsTrigger value="sync" disabled={!authStatus.hasValidToken}>
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
                    {/* DEBUG INFO */}
                    <div className="bg-gray-100 p-2 text-xs font-mono mb-4 rounded">
                      <p>Debug info:</p>
                      <p>authStatus = {JSON.stringify(authStatus)}</p>
                      <p>hasCredentials = {String(authStatus.hasCredentials)}</p>
                      <p>hasValidToken = {String(authStatus.hasValidToken)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-4 border rounded-lg">
                        <div className={`h-8 w-8 rounded-full mr-3 flex items-center justify-center ${
                          authStatus.hasCredentials ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {authStatus.hasCredentials ? <Check /> : <AlertCircle />}
                        </div>
                        <div>
                          <p className="font-medium">Credenziali OAuth2</p>
                          <p className="text-sm text-gray-500">
                            {authStatus.hasCredentials 
                              ? "Presenti e configurate" 
                              : "Non configurate"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center p-4 border rounded-lg">
                        <div className={`h-8 w-8 rounded-full mr-3 flex items-center justify-center ${
                          authStatus.hasValidToken ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                        }`}>
                          {authStatus.hasValidToken ? <Check /> : <AlertCircle />}
                        </div>
                        <div>
                          <p className="font-medium">Token di accesso</p>
                          <p className="text-sm text-gray-500">
                            {authStatus.hasValidToken 
                              ? "Valido e attivo" 
                              : "Non presente o scaduto"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!authStatus.hasCredentials && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Credenziali mancanti</AlertTitle>
                        <AlertDescription>
                          Le credenziali OAuth2 (client ID e client secret) non sono configurate.
                          Contatta l'amministratore di sistema.
                        </AlertDescription>
                      </Alert>
                    )}

                    {authStatus.hasCredentials && !authStatus.hasValidToken && (
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

                    {authStatus.hasCredentials && authStatus.hasValidToken && (
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
                  disabled={isLoading || !authStatus.hasValidToken}
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
                  disabled={isLoading || !authStatus.hasValidToken}
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