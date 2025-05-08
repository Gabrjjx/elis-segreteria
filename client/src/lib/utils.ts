import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: it })
}

export function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm", { locale: it })
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(amount)
}
