import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, FileText, Mail, Settings, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Report {
  fileName: string;
  date: string;
  size: number;
}

export default function ReportsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState("");

  // Query for reports list
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/reports/list"],
    queryFn: async () => {
      const response = await fetch("/api/reports/list");
      return response.json();
    }
  });

  // Mutation for generating new report
  const generateReportMutation = useMutation({
    mutationFn: async (date?: string) => {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date })
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generato",
        description: `Report creato con successo: ${data.filePath}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/list"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: "Impossibile generare il report",
        variant: "destructive",
      });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const downloadReport = (fileName: string) => {
    window.open(`/api/reports/download/${fileName}`, '_blank');
  };

  const generateDailyReport = () => {
    generateReportMutation.mutate();
  };

  const generateCustomReport = () => {
    if (!selectedDate) {
      toast({
        title: "Data Richiesta",
        description: "Seleziona una data per generare il report",
        variant: "destructive",
      });
      return;
    }
    generateReportMutation.mutate(selectedDate);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Report</h1>
          <p className="text-muted-foreground">
            Gestisci i report giornalieri automatici del sistema ELIS
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Report automatico alle 23:00
        </Badge>
      </div>

      {/* Report Generation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Genera Report Oggi
            </CardTitle>
            <CardDescription>
              Genera manualmente il report per la data odierna
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateDailyReport}
              disabled={generateReportMutation.isPending}
              className="w-full"
            >
              {generateReportMutation.isPending ? "Generando..." : "Genera Report Oggi"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Genera Report Personalizzato
            </CardTitle>
            <CardDescription>
              Genera un report per una data specifica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              max={new Date().toISOString().split('T')[0]}
            />
            <Button 
              onClick={generateCustomReport}
              disabled={generateReportMutation.isPending || !selectedDate}
              className="w-full"
              variant="outline"
            >
              {generateReportMutation.isPending ? "Generando..." : "Genera Report"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configurazione Email
          </CardTitle>
          <CardDescription>
            Stato del sistema di invio email automatico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">SendGrid API</p>
              <p className="text-sm text-muted-foreground">
                I report verranno inviati automaticamente via email ogni giorno alle 23:00
              </p>
            </div>
            <Badge variant="secondary">
              Configurato
            </Badge>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Destinatari:</strong> amministrazione@elis.org, segreteria@elis.org<br/>
              <strong>Mittente:</strong> Sistema ELIS<br/>
              <strong>Orario invio:</strong> 23:00 (fuso orario Europa/Roma)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reports History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Storico Report ({reports.length})
          </CardTitle>
          <CardDescription>
            Elenco dei report generati e disponibili per il download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2">Caricamento report...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun report generato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report: Report) => (
                <div
                  key={report.fileName}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{formatDate(report.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(report.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">PDF</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadReport(report.fileName)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Informazioni Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Generazione PDF</p>
              <p className="text-muted-foreground">jsPDF Library</p>
            </div>
            <div>
              <p className="font-medium">Scheduler</p>
              <p className="text-muted-foreground">node-cron (23:00 Europe/Rome)</p>
            </div>
            <div>
              <p className="font-medium">Email Service</p>
              <p className="text-muted-foreground">SendGrid API</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}