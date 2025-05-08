import { format } from "date-fns";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Service, ServiceType, PaymentStatus } from "@shared/schema";
import { Pencil, Receipt, Trash2 } from "lucide-react";

interface ServiceCardProps {
  service: Service;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onMarkAsPaid?: (id: number) => void;
  onGenerateReceipt?: (id: number) => void;
}

export default function ServiceCard({ 
  service, 
  onEdit, 
  onDelete, 
  onMarkAsPaid, 
  onGenerateReceipt 
}: ServiceCardProps) {
  // Helper function to generate badge variant based on service type
  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case ServiceType.SIGLATURA:
        return <Badge variant="secondary">Siglatura</Badge>;
      case ServiceType.HAPPY_HOUR:
        return <Badge variant="warning">Happy Hour</Badge>;
      case ServiceType.RIPARAZIONE:
        return <Badge variant="outline">Riparazione</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Helper function to generate badge variant based on payment status
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case PaymentStatus.PAID:
        return <Badge variant="success">Pagato</Badge>;
      case PaymentStatus.UNPAID:
        return <Badge variant="destructive">Da pagare</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">Sigla: {service.sigla}</h3>
            <p className="text-sm text-gray-500">
              {format(new Date(service.date), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="flex flex-col items-end">
            {getServiceTypeBadge(service.type)}
            <p className="font-semibold mt-1">€{service.amount.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div>
            <p className="text-sm">
              <span className="text-gray-500">Pezzi:</span> {service.pieces}
            </p>
            <div className="mt-1">{getPaymentStatusBadge(service.status)}</div>
          </div>
          {service.notes && (
            <p className="text-sm text-gray-600 italic">{service.notes}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-4 py-3 bg-gray-50 border-t flex justify-end space-x-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(service.id)}>
          <Pencil className="h-4 w-4 mr-1" />
          Modifica
        </Button>
        {service.status === PaymentStatus.UNPAID && onMarkAsPaid ? (
          <Button variant="outline" size="sm" onClick={() => onMarkAsPaid(service.id)}>
            <Receipt className="h-4 w-4 mr-1" />
            Segna Pagato
          </Button>
        ) : onGenerateReceipt ? (
          <Button variant="outline" size="sm" onClick={() => onGenerateReceipt(service.id)}>
            <Receipt className="h-4 w-4 mr-1" />
            Ricevuta
          </Button>
        ) : null}
        <Button variant="destructive" size="sm" onClick={() => onDelete(service.id)}>
          <Trash2 className="h-4 w-4 mr-1" />
          Elimina
        </Button>
      </CardFooter>
    </Card>
  );
}
