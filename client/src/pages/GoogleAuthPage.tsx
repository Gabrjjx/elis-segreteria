import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AuthStatus {
  hasCredentials: boolean;
  hasValidToken: boolean;
}

export default function GoogleAuthPage() {
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Funzione per verificare lo stato di autenticazione
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest("/api/google/auth/status");
      const status = await response.json();
      
      setAuthStatus(status);
      
      // Se abbiamo le credenziali ma non un token valido, otteniamo l'URL di autorizzazione
      if (status.hasCredentials && !status.hasValidToken) {
        await getAuthUrl();
      }
    } catch (err) {
      console.error("Errore nel controllo dello stato di autenticazione:", err);
      setError("Errore nel controllo dello stato di autenticazione");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per ottenere l'URL di autorizzazione
  const getAuthUrl = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiRequest("/api/google/auth/url");
      const data = await response.json();
      
      if (data.url) {
        setAuthUrl(data.url);
      } else {
        setError("Impossibile ottenere l'URL di autorizzazione");
      }
    } catch (err) {
      console.error("Errore nell'ottenimento dell'URL di autorizzazione:", err);
      setError("Errore nell'ottenimento dell'URL di autorizzazione");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funzione per inviare il codice di autorizzazione
  const sendAuthCode = async () => {
    if (!authCode) {
      setError("Inserire il codice di autorizzazione");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await apiRequest("/api/google/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: authCode }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Autenticazione completata con successo");
        setAuthCode("");
        // Aggiorniamo lo stato di autenticazione
        await checkAuthStatus();
        
        toast({
          title: "Autenticazione completata",
          description: "Le credenziali OAuth2 sono state salvate con successo",
        });
      } else {
        setError(data.message || "Errore nell'invio del codice di autorizzazione");
      }
    } catch (err) {
      console.error("Errore nell'invio del codice di autorizzazione:", err);
      setError("Errore nell'invio del codice di autorizzazione");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Recupera lo stato di autenticazione all'avvio
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Configurazione Google Sheets</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stato autenticazione Google Sheets</CardTitle>
            <CardDescription>
              Questa pagina permette di gestire l'autenticazione OAuth2 per Google Sheets, necessaria per aggiornare lo stato delle richieste di manutenzione direttamente sul foglio Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !authStatus ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-full ${authStatus?.hasCredentials ? 'bg-green-500' : 'bg-red-500'}`}>
                    {authStatus?.hasCredentials ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Credenziali OAuth2</p>
                    <p className="text-sm text-muted-foreground">
                      {authStatus?.hasCredentials 
                        ? "Credenziali configurate correttamente" 
                        : "Credenziali mancanti. Configurare GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded-full ${authStatus?.hasValidToken ? 'bg-green-500' : 'bg-red-500'}`}>
                    {authStatus?.hasValidToken ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Token di accesso</p>
                    <p className="text-sm text-muted-foreground">
                      {authStatus?.hasValidToken 
                        ? "Token di accesso valido" 
                        : "Token di accesso mancante o non valido"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={checkAuthStatus} 
              disabled={isLoading}
              variant="outline"
              className="mr-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aggiornamento...
                </>
              ) : (
                "Aggiorna stato"
              )}
            </Button>
            
            {authStatus?.hasCredentials && !authStatus?.hasValidToken && (
              <Button 
                onClick={getAuthUrl} 
                disabled={isLoading}
              >
                Avvia autorizzazione
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {authUrl && !authStatus?.hasValidToken && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Autorizzazione OAuth2</CardTitle>
              <CardDescription>
                Segui questi passi per completare l'autorizzazione con Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal pl-4 space-y-2">
                <li>
                  <span className="font-medium">Apri il link di autorizzazione:</span>
                  <div className="mt-1">
                    <Button variant="outline" size="sm" onClick={() => window.open(authUrl, '_blank')}>
                      Apri link di autorizzazione
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </li>
                <li>
                  <span className="font-medium">Accedi con il tuo account Google e concedi le autorizzazioni richieste</span>
                </li>
                <li>
                  <span className="font-medium">Copia il codice di autorizzazione che ricevi alla fine e incollalo qui sotto:</span>
                  <div className="mt-2">
                    <Input 
                      placeholder="Incolla qui il codice di autorizzazione" 
                      value={authCode} 
                      onChange={(e) => setAuthCode(e.target.value)}
                    />
                  </div>
                </li>
              </ol>
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errore</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mt-4 bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700">Successo</AlertTitle>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={sendAuthCode} 
                disabled={isLoading || !authCode}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  "Completa autorizzazione"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {authStatus?.hasValidToken && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Autenticazione completata</AlertTitle>
            <AlertDescription className="text-green-600">
              L'autenticazione OAuth2 con Google Sheets è stata completata con successo. 
              Ora il sistema può aggiornare direttamente il foglio Google quando una richiesta di manutenzione viene completata.
            </AlertDescription>
          </Alert>
        )}
        
      </div>
    </div>
  );
}