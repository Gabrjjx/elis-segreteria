import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar, 
  FileText, 
  Tag, 
  FileCheck,
  FileX,
  Wrench,
  InfoIcon, 
  Clock, 
  Loader2, 
  CornerRightDown,
  User,
  MapPin,
  X,
  CreditCard,
  HelpCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getServiceTypeLabel, getPaymentStatusLabel, formatDate, formatAmount } from "@/lib/utils/services";
import { toast } from "@/hooks/use-toast";

// Tipi per i risultati di ricerca
interface SearchResult {
  type: 'service' | 'maintenance';
  item: any;
  matchScore: number;
  highlight?: string;
}

interface SearchResponse {
  results: SearchResult[];
  explanation: string;
}

interface QueryAnalysisResponse {
  naturalLanguageResponse: string;
  searchParams: {
    serviceType?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentStatus?: string;
    sigla?: string;
    minAmount?: number;
    maxAmount?: number;
    maintenanceStatus?: string;
    roomNumber?: string;
    priority?: string;
  }
}

// Frequenze di ricerca predefinite
const PRESET_SEARCHES = [
  { query: "servizi di siglatura dell'ultimo mese", icon: <Tag className="h-4 w-4" /> },
  { query: "pagamenti in attesa", icon: <FileCheck className="h-4 w-4" /> },
  { query: "happy hour non pagati", icon: <CreditCard className="h-4 w-4" /> },
  { query: "servizi di riparazione", icon: <Wrench className="h-4 w-4" /> },
  { query: "servizi dal 15 maggio", icon: <Calendar className="h-4 w-4" /> },
];

// Componente per il risultato della ricerca
function SearchResultItem({ result, onClose }: { result: SearchResult, onClose: () => void }) {
  const [_, setLocation] = useLocation();
  
  const handleClick = () => {
    if (result.type === 'service') {
      setLocation(`/services/${result.item.id}`);
    } else if (result.type === 'maintenance') {
      setLocation(`/maintenance/${result.item.id}`);
    }
    onClose();
  };
  
  return (
    <div 
      onClick={handleClick}
      className="p-3 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex gap-2 items-center">
          {result.type === 'service' ? (
            <>
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium text-gray-900">
                {result.item.sigla} - {getServiceTypeLabel(result.item.type)}
              </span>
            </>
          ) : (
            <>
              <Wrench className="h-5 w-5 text-primary" />
              <span className="font-medium text-gray-900">
                Manutenzione - Stanza {result.item.roomNumber}
              </span>
            </>
          )}
        </div>
        
        <Badge variant={result.type === 'service' ? 'default' : 'secondary'}>
          {result.type === 'service' ? 'Servizio' : 'Manutenzione'}
        </Badge>
      </div>
      
      {result.type === 'service' ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span>{formatDate(result.item.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span>{result.item.sigla}</span>
          </div>
          <div className="flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5 text-gray-500" />
            <span>{formatAmount(result.item.amount)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5 text-gray-500" />
            <span>{getPaymentStatusLabel(result.item.status)}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span>{formatDate(result.item.requestDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span>{result.item.requesterName}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-gray-500" />
            <span>Stanza {result.item.roomNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-gray-500" />
            <span>{result.item.status}</span>
          </div>
        </div>
      )}
      
      {result.highlight && (
        <div className="mt-2 text-sm text-gray-500 line-clamp-2">
          {result.highlight}
        </div>
      )}
    </div>
  );
}

export default function AiSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysisResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus on input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    
    // Reset state when dialog is closed
    if (!open) {
      setQuery("");
      setResults(null);
      setQueryAnalysis(null);
    }
  }, [open]);
  
  // Keyboard shortcut for searching (Shift+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Analyze query while typing to offer suggestions
  useEffect(() => {
    const analyzeQueryDebounced = setTimeout(() => {
      if (query.trim().length >= 3) {
        analyzeQuery();
      } else {
        setQueryAnalysis(null);
      }
    }, 600);
    
    return () => clearTimeout(analyzeQueryDebounced);
  }, [query]);
  
  const analyzeQuery = async () => {
    if (!query.trim() || query.trim().length < 3) return;
    
    try {
      setIsAnalyzing(true);
      
      const response = await apiRequest("POST", "/api/analyze-query", { query });
      const data = await response.json();
      
      setQueryAnalysis(data);
    } catch (error) {
      console.error("Errore durante l'analisi della query:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    try {
      setIsLoading(true);
      setResults(null);
      
      const response = await apiRequest("POST", "/api/search", { query });
      const data = await response.json();
      
      setResults(data);
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      toast({
        title: "Errore durante la ricerca",
        description: "Si è verificato un errore durante la ricerca. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  
  const usePresetSearch = (preset: string) => {
    setQuery(preset);
    handleSearch();
  };
  
  return (
    <div>
      {/* Search Button */}
      <Button
        variant="outline"
        className="w-full md:w-auto lg:w-72 justify-between"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span className="text-gray-500">Cerca servizi, richieste...</span>
        </div>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      
      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] p-0">
          <div className="p-4">
            <div className="flex gap-2 items-center">
              <Search className="h-5 w-5 text-gray-500" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyUp={handleKeyUp}
                placeholder="Cerca qualsiasi cosa..."
                className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              />
              {query && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setQuery("")}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button 
                onClick={handleSearch} 
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
              </Button>
            </div>
            
            {/* Query Analysis */}
            {isAnalyzing && query.trim() && !results && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analizzando la richiesta...</span>
              </div>
            )}
            
            {queryAnalysis && !results && (
              <div className="mt-3 p-2 rounded-md bg-gray-50 text-sm">
                <div className="flex gap-2">
                  <InfoIcon className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-gray-700">{queryAnalysis.naturalLanguageResponse}</p>
                    {Object.keys(queryAnalysis.searchParams).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {queryAnalysis.searchParams.serviceType && (
                          <Badge variant="outline" className="text-xs">
                            Tipo: {getServiceTypeLabel(queryAnalysis.searchParams.serviceType)}
                          </Badge>
                        )}
                        {queryAnalysis.searchParams.paymentStatus && (
                          <Badge variant="outline" className="text-xs">
                            Stato: {getPaymentStatusLabel(queryAnalysis.searchParams.paymentStatus)}
                          </Badge>
                        )}
                        {queryAnalysis.searchParams.dateFrom && (
                          <Badge variant="outline" className="text-xs">
                            Da: {new Date(queryAnalysis.searchParams.dateFrom).toLocaleDateString()}
                          </Badge>
                        )}
                        {queryAnalysis.searchParams.dateTo && (
                          <Badge variant="outline" className="text-xs">
                            A: {new Date(queryAnalysis.searchParams.dateTo).toLocaleDateString()}
                          </Badge>
                        )}
                        {queryAnalysis.searchParams.minAmount && (
                          <Badge variant="outline" className="text-xs">
                            Min: €{queryAnalysis.searchParams.minAmount}
                          </Badge>
                        )}
                        {queryAnalysis.searchParams.maxAmount && (
                          <Badge variant="outline" className="text-xs">
                            Max: €{queryAnalysis.searchParams.maxAmount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Navigation */}
          {!results && (
            <>
              <Separator />
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ricerche Frequenti
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PRESET_SEARCHES.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start"
                      onClick={() => usePresetSearch(preset.query)}
                    >
                      {preset.icon}
                      <span className="ml-2">{preset.query}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              <Separator />
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Come usare la ricerca avanzata
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="flex items-start gap-2">
                    <CornerRightDown className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Scrivi in linguaggio naturale, ad esempio "mostrami tutti i servizi di siglatura di maggio"</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CornerRightDown className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Puoi filtrare per tipo di servizio, stato di pagamento, date, importi, ecc.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <CornerRightDown className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span>Premi <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Invio</kbd> per cercare o <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> per chiudere</span>
                  </p>
                </div>
              </div>
            </>
          )}
          
          {/* Search Results */}
          {results && (
            <>
              <Separator />
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Risultati della ricerca - {results.results.length} trovati
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setResults(null)}
                    className="h-8 text-xs"
                  >
                    Nuova ricerca
                  </Button>
                </div>
                
                {results.explanation && (
                  <div className="mb-4 p-2 rounded-md bg-gray-50 text-sm">
                    <div className="flex gap-2">
                      <InfoIcon className="h-4 w-4 text-primary mt-0.5" />
                      <p className="text-gray-700">{results.explanation}</p>
                    </div>
                  </div>
                )}
                
                {results.results.length === 0 ? (
                  <div className="text-center py-6">
                    <FileX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nessun risultato trovato per questa ricerca</p>
                    <p className="text-sm text-gray-400 mt-1">Prova con termini diversi o meno specifici</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {results.results.map((result, index) => (
                      <React.Fragment key={`${result.type}-${result.item.id}-${index}`}>
                        <SearchResultItem result={result} onClose={() => setOpen(false)} />
                        {index < results.results.length - 1 && <Separator />}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}