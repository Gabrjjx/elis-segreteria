import { format } from "date-fns";
import { ServiceType, PaymentStatus, Service } from "@shared/schema";

// Get a display-friendly label for service types
export function getServiceTypeLabel(type: string): string {
  switch (type) {
    case ServiceType.SIGLATURA:
      return "Siglatura";
    case ServiceType.HAPPY_HOUR:
      return "Happy Hour";
    case ServiceType.RIPARAZIONE:
      return "Riparazione";
    default:
      return type;
  }
}

// Get a display-friendly label for payment status
export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case PaymentStatus.PAID:
      return "Pagato";
    case PaymentStatus.UNPAID:
      return "Da pagare";
    default:
      return status;
  }
}

// Format a date to a user-friendly string (DD/MM/YYYY)
export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy");
}

// Format a monetary amount
export function formatAmount(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

// Calculate total amount for a list of services
export function calculateTotalAmount(services: Service[]): number {
  return services.reduce((total, service) => total + service.amount, 0);
}

// Filter services by date range
export function filterServicesByDateRange(
  services: Service[],
  startDate?: Date,
  endDate?: Date
): Service[] {
  return services.filter((service) => {
    const serviceDate = new Date(service.date);
    if (startDate && serviceDate < startDate) return false;
    if (endDate && serviceDate > endDate) return false;
    return true;
  });
}

// Group services by type
export function groupServicesByType(
  services: Service[]
): Record<string, Service[]> {
  return services.reduce((groups, service) => {
    const type = service.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(service);
    return groups;
  }, {} as Record<string, Service[]>);
}

// Count services by payment status
export function countServicesByStatus(
  services: Service[]
): { paid: number; unpaid: number } {
  return services.reduce(
    (counts, service) => {
      if (service.status === PaymentStatus.PAID) {
        counts.paid += 1;
      } else if (service.status === PaymentStatus.UNPAID) {
        counts.unpaid += 1;
      }
      return counts;
    },
    { paid: 0, unpaid: 0 }
  );
}

// Calculate total pending payments
export function calculatePendingAmount(services: Service[]): number {
  return services
    .filter((service) => service.status === PaymentStatus.UNPAID)
    .reduce((total, service) => total + service.amount, 0);
}
