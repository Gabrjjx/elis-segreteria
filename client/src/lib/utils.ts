import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function that merges Tailwind CSS classes and handles conflicts
 * through the use of clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to a readable format: 'DD/MM/YYYY HH:MM'
 */
export function formatDate(date: Date | string): string {
  if (!date) return "N/D";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Data non valida";
  
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format date and time to a readable format: 'DD/MM/YYYY HH:MM'
 */
export function formatDateTime(date: Date | string): string {
  if (!date) return "N/D";
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Data non valida";
  
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}