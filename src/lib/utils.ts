import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date) {
  if (!date) return '';
  // If it's a string in YYYY-MM-DD format, add a time component to avoid timezone shifts
  const d = typeof date === 'string' && date.includes('-') && !date.includes('T')
    ? new Date(date + 'T12:00:00')
    : typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR').format(d);
}
