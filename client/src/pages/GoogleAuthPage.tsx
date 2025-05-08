import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, Check, KeyRound, Cloud, Download, Upload, RefreshCw, Smartphone, Clock } from "lucide-react";
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
  
  // State per Device Flow
  const [deviceCodeInfo, setDeviceCodeInfo] = useState<{
    user_code: string;
    verification_url: string;
    expires_in: number;
    interval: number;
  } | null>(null);
  const [deviceFlowStatus, setDeviceFlowStatus] = useState<string>("idle"); // idle, pending, complete, error
  const [deviceFlowError, setDeviceFlowError] = useState<string>("");

  // Utilizziamo useState per lo stato di autenticazione con dati iniziali predefiniti
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ 
    hasCredentials: false, 
    hasValidToken: false
  });
  // Inizia con false per evitare caricamenti automatici che possono causare loop
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  // Funzione per caricare manualmente lo stato di autenticazione
  const fetchAuthStatus = async () => {
    try {
      // Imposta il caricamento
      setIsStatusLoading(true);
      console.log("Inizio fetchAuthStatus");
      
      // Utilizzare fetch diretto con cache busting per evitare problemi di caching
      const cacheBuster = Date.now();
      const response = await fetch(`/api/google/auth/status?t=${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`Errore nella richiesta: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Risultato API fetchAuthStatus:", data);
      
      // Aggiorniamo lo stato solo se i dati sono diversi da quelli attuali
      // per evitare loop di ri-rendering inutili
      setAuthStatus(prevStatus => {
        if (prevStatus.hasCredentials !== data.hasCredentials || 
            prevStatus.hasValidToken !== data.hasValidToken) {
          return data;
        }
        return prevStatus;
      });
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
  
  // Carica lo stato solo all'avvio del componente, usando unmounted flag
  // Usiamo useEffect con useRef per gestire il caricamento iniziale
  // Questo approccio previene il problema di loop di aggiornamenti
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    // Eseguiamo solo al primo montaggio
    if (isInitialMount.current) {
      console.log("useEffect eseguito - PRIMO MOUNT");
      isInitialMount.current = false;
      
      const loadAuthStatus = async () => {
        try {
          // Imposta il caricamento
          setIsStatusLoading(true);
          
          // Utilizzare fetch diretto con cache busting
          const cacheBuster = Date.now();
          const response = await fetch(`/api/google/auth/status?t=${cacheBuster}`, {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            },
            credentials: 'same-origin'
          });
          
          if (!response.ok) {
            throw new Error(`Errore nella richiesta: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Risultato API fetchAuthStatus:", data);
          
          // Aggiorniamo lo stato solo se il componente è ancora montato
          setAuthStatus(data);
          setIsStatusLoading(false);
        } catch (error) {
          console.error("Errore nel caricamento dello stato:", error);
          toast({
            variant: "destructive",
            title: "Errore di connessione",
            description: "Impossibile verificare lo stato dell'autenticazione Google.",
          });
          setIsStatusLoading(false);
        }
      };
      
      loadAuthStatus();
    }
  }, []);

  // Mutation per ottenere l'URL di autorizzazione (metodo classico)
  const getAuthUrlMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/google/auth/url", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      const data = await res.json();
      return data.url as string;
    },
    onSuccess: (url) => {
      setAuthUrl(url);
      // Invece di aprire automaticamente, mostriamo il link per copiare e incollare
      toast({
        title: "URL di autorizzazione generato",
        description: "Copia e incolla l'URL nel browser per autorizzare l'applicazione.",
        duration: 8000
      });
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
  
  // Mutation per avviare il Device Flow (metodo consigliato)
  const startDeviceFlowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/google/auth/device", {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setDeviceCodeInfo(data);
      setDeviceFlowStatus("pending");
      // Mostra le istruzioni per l'utente
      toast({
        title: "Codice di autenticazione generato",
        description: `Vai su ${data.verification_url} e inserisci il codice ${data.user_code}`,
        duration: 10000
      });
      
      // Avvia il polling per controllare lo stato
      checkDeviceFlowStatus();
    },
    onError: (error) => {
      console.error("Failed to start Device Flow:", error);
      setDeviceFlowStatus("error");
      setDeviceFlowError(error instanceof Error ? error.message : "Errore sconosciuto");
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile avviare il processo di autenticazione.",
      });
    }
  });
  
  // Funzione di polling per controllare lo stato del Device Flow
  const checkDeviceFlowStatus = async () => {
    if (deviceFlowStatus !== "pending") return;
    
    try {
      const res = await fetch("/api/google/auth/device/status", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Device Flow status check:", data);
      
      if (data.status === "complete") {
        setDeviceFlowStatus("complete");
        toast({
          title: "Autenticazione completata",
          description: "Token di accesso Google ottenuto con successo.",
        });
        // Aggiorniamo manualmente lo stato dopo l'autorizzazione
        setTimeout(() => {
          fetchAuthStatus();
        }, 500);
      } else if (data.status === "error") {
        setDeviceFlowStatus("error");
        setDeviceFlowError(data.error || "Errore sconosciuto");
        toast({
          variant: "destructive",
          title: "Errore di autenticazione",
          description: data.error || "Si è verificato un errore durante l'autenticazione.",
        });
      } else {
        // Continuiamo il polling
        setTimeout(checkDeviceFlowStatus, 5000); // Controlla ogni 5 secondi
      }
    } catch (error) {
      console.error("Error checking Device Flow status:", error);
      setDeviceFlowStatus("error");
      setDeviceFlowError(error instanceof Error ? error.message : "Errore sconosciuto");
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile verificare lo stato dell'autenticazione.",
      });
    }
  };

  // Mutation per inviare il codice di autorizzazione
  const submitCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/google/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ code }),
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Autenticazione completata",
        description: "Token di accesso Google ottenuto con successo.",
      });
      setAuthCode("");
      // Aggiorniamo manualmente lo stato dopo l'autorizzazione
      setTimeout(() => {
        fetchAuthStatus();
      }, 500);
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
      const res = await fetch("/api/maintenance/sync-google-sheets", {
        method: "POST",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Importazione completata",
        description: `Importate ${data.success || 0} richieste di manutenzione da Google Sheets (${data.failed || 0} errori).`,
      });
      setTimeout(() => {
        fetchAuthStatus();
      }, 500);
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
      const res = await fetch("/api/google/sheets/sync-status", {
        method: "POST",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      if (!res.ok) {
        throw new Error(`Errore nella richiesta: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Esportazione completata",
        description: `Aggiornate ${data.updated || 0} richieste di manutenzione in Google Sheets (${data.failed || 0} errori).`,
      });
      setTimeout(() => {
        fetchAuthStatus();
      }, 500);
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
                            exportStatusMutation.isPending ||
                            startDeviceFlowMutation.isPending;

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
  // Utilizziamo sintassi ref per evitare dipendenze che cambiano tra i render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyMutationPending]);

  // Handler functions
  function handleGetAuthUrl() {
    getAuthUrlMutation.mutate();
  }

  function handleStartDeviceFlow() {
    setDeviceFlowStatus("idle"); // Reset
    setDeviceFlowError("");
    startDeviceFlowMutation.mutate();
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
                    
                    {/* Pulsante per ricaricare manualmente lo stato */}
                    <div className="flex justify-end mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fetchAuthStatus()}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Aggiorna stato
                      </Button>
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

                        <div className="space-y-6">
                          <Tabs defaultValue="device-flow">
                            <TabsList className="mb-4">
                              <TabsTrigger value="device-flow">
                                <Smartphone className="h-4 w-4 mr-2" />
                                Metodo semplificato (consigliato)
                              </TabsTrigger>
                              <TabsTrigger value="redirect">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Metodo con URL
                              </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="device-flow">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Autorizzazione con Device Flow</CardTitle>
                                  <CardDescription>
                                    Metodo di autorizzazione semplificato senza necessità di URL di redirect.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {deviceFlowStatus === "idle" && !deviceCodeInfo && (
                                    <div className="flex flex-col items-center space-y-4">
                                      <div className="text-center mb-4">
                                        <p className="text-sm text-gray-600 mb-2">
                                          Clicca sul pulsante per ottenere un codice di autenticazione.
                                        </p>
                                      </div>
                                      <Button onClick={handleStartDeviceFlow} disabled={isLoading}>
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        Avvia autenticazione
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {deviceCodeInfo && deviceFlowStatus === "pending" && (
                                    <div className="space-y-4">
                                      <Alert className="bg-blue-50 border-blue-100">
                                        <AlertCircle className="h-4 w-4 text-blue-600" />
                                        <AlertTitle className="text-blue-800">Codice generato</AlertTitle>
                                        <AlertDescription className="text-blue-700">
                                          Segui le istruzioni per completare l'autenticazione.
                                        </AlertDescription>
                                      </Alert>
                                      
                                      <div className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="text-center mb-4">
                                          <h3 className="font-semibold text-lg mb-1">Codice di autenticazione</h3>
                                          <div className="text-2xl font-bold tracking-wider my-3 py-2 bg-white border rounded-md">
                                            {deviceCodeInfo.user_code}
                                          </div>
                                        </div>
                                        
                                        <ol className="list-decimal list-inside space-y-3 text-sm">
                                          <li>Vai su <a href={deviceCodeInfo.verification_url} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer" 
                                                      className="text-blue-600 underline font-medium">
                                                {deviceCodeInfo.verification_url}
                                              </a>
                                          </li>
                                          <li>Inserisci il codice mostrato sopra: <strong>{deviceCodeInfo.user_code}</strong></li>
                                          <li>Accedi con il tuo account Google e concedi le autorizzazioni richieste</li>
                                          <li>Attendi il completamento automatico dell'autorizzazione</li>
                                        </ol>
                                        
                                        <div className="mt-4 text-center">
                                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Scade tra {Math.round(deviceCodeInfo.expires_in / 60)} minuti
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-center">
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => fetchAuthStatus()}
                                        >
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                          Verifica stato
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {deviceFlowStatus === "complete" && (
                                    <Alert className="bg-green-50 border-green-100">
                                      <Check className="h-4 w-4 text-green-600" />
                                      <AlertTitle className="text-green-800">Autenticazione completata</AlertTitle>
                                      <AlertDescription className="text-green-700">
                                        Token di accesso ottenuto con successo.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
                                  {deviceFlowStatus === "error" && (
                                    <Alert variant="destructive">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertTitle>Errore di autenticazione</AlertTitle>
                                      <AlertDescription>
                                        {deviceFlowError || "Si è verificato un errore durante l'autenticazione. Riprova."}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </CardContent>
                              </Card>
                            </TabsContent>
                            
                            <TabsContent value="redirect">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Autorizzazione con URL</CardTitle>
                                  <CardDescription>
                                    Metodo di autorizzazione alternativo con URL e codice manuale.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <Button onClick={handleGetAuthUrl} disabled={isLoading} className="w-full">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ottieni URL di autorizzazione
                                  </Button>

                                  {authUrl && (
                                    <div className="mt-4 space-y-2">
                                      <p className="text-sm">
                                        URL di autorizzazione Google:
                                      </p>
                                      <div className="p-2 bg-gray-50 border rounded-md text-xs font-mono break-all mb-3">
                                        {authUrl}
                                      </div>
                                      <p className="text-sm mb-2">
                                        Copia e incolla l'URL qui sopra in una nuova finestra del browser. 
                                        Dopo l'approvazione, copia il codice fornito da Google e incollalo qui sotto:
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
                                </CardContent>
                              </Card>
                            </TabsContent>
                          </Tabs>
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