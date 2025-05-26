import { useState } from "react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ServiceWithStudent, ServiceType } from "@shared/schema";

interface PendingPaymentsProps {
  pendingPayments: ServiceWithStudent[];
  filterPeriod?: { startDate: Date; endDate: Date };
}

export default function PendingPayments({ pendingPayments, filterPeriod }: PendingPaymentsProps) {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: async (id: number) => {
      setProcessingId(id);
      const response = await apiRequest("PATCH", `/api/services/${id}/mark-paid`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics', filterPeriod] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/pending-payments', filterPeriod] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-services', filterPeriod] });
      
      toast({
        title: "Pagamento registrato",
        description: "Il servizio è stato contrassegnato come pagato.",
        variant: "default",
      });
      
      setProcessingId(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const handleMarkAsPaid = (id: number) => {
    mutation.mutate(id);
  };

  if (!pendingPayments || pendingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pagamenti Pendenti</CardTitle>
          <CardDescription>Servizi che necessitano di pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Non ci sono pagamenti pendenti al momento.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const serviceTypeLabels = {
    [ServiceType.SIGLATURA]: "Siglatura",
    [ServiceType.HAPPY_HOUR]: "Happy Hour",
    [ServiceType.RIPARAZIONE]: "Riparazione",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamenti Pendenti</CardTitle>
        <CardDescription>Servizi che necessitano di pagamento</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingPayments.map((payment) => (
          <div key={payment.id} className="border rounded-lg overflow-hidden mb-4 last:mb-0">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="text-destructive mr-2 h-4 w-4" />
                <span className="font-medium text-gray-900">Servizio non pagato</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm">
                  {format(new Date(payment.date), "dd/MM/yyyy")}
                </span>
              </div>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Sigla</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {payment.sigla}
                    {payment.student ? (
                      <div className="text-xs text-gray-500">
                        {payment.student.firstName} {payment.student.lastName}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        Nessun studente associato
                      </div>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Tipologia</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {serviceTypeLabels[payment.type as keyof typeof serviceTypeLabels] || payment.type}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">N. Pezzi</dt>
                  <dd className="mt-1 text-sm text-gray-900">{payment.pieces}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Importo</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">€{payment.amount.toFixed(2)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleMarkAsPaid(payment.id)}
                  disabled={processingId === payment.id}
                >
                  {processingId === payment.id ? (
                    <span className="animate-spin mr-2">⟳</span>
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Segna come pagato
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
