/**
 * Utilitaires Généraux
 * Universal Eats - Module Analytics
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine les classes CSS avec clsx et tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// lib/formatters.ts

export type CurrencyCode = 'MAD' | 'EUR' | 'USD';

export const formatCurrency = (amount: number, currency: CurrencyCode = 'MAD'): string => {
  // Configuration spécifique pour le Maroc (Agadir)
  if (currency === 'MAD') {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Autres devises
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Formate un nombre avec séparateurs de milliers
 */
export function formatNumber(
  value: number,
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formate un pourcentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Formate une durée en minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }
}

/**
 * Calcule le pourcentage de variation
 */
export function calculatePercentageChange(current: number, previous: number): {
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  if (previous === 0) {
    return { percentage: 0, trend: 'stable' };
  }
  
  const percentage = ((current - previous) / previous) * 100;
  
  if (Math.abs(percentage) < 0.1) {
    return { percentage: 0, trend: 'stable' };
  }
  
  return {
    percentage,
    trend: percentage > 0 ? 'up' : 'down'
  };
}

/**
 * Tronque un texte
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Génère une couleur basée sur un hash
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Détermine la couleur en fonction de la performance
 */
export function getPerformanceColor(
  value: number,
  thresholds: { good: number; warning: number }
): 'green' | 'yellow' | 'red' | 'gray' {
  if (value >= thresholds.good) return 'green';
  if (value >= thresholds.warning) return 'yellow';
  return 'red';
}

/**
 * Calcule l'âge d'une date
 */
export function getTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'À l\'instant';
  } else if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`;
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`;
  } else if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  } else {
    return past.toLocaleDateString('fr-FR');
  }
}

/**
 * Valide une adresse email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Génère un ID unique
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce une fonction
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Deep clone un objet
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const copy: any = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

/**
 * Calcule la moyenne d'un tableau de nombres
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

/**
 * Calcule la médiane d'un tableau de nombres
 */
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

/**
 * Groupe un tableau d'objets par une propriété
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Télécharge un fichier blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copie du texte dans le presse-papier
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback pour les anciens navigateurs
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Vérifie si le code s'exécute côté client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Vérifie si le code s'exécute côté serveur
 */
export function isServer(): boolean {
  return !isClient();
}

/**
 * Convertit une chaîne en slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Supprime les caractères spéciaux
    .replace(/[\s_-]+/g, '-') // Remplace les espaces et underscores par des tirets
    .replace(/^-+|-+$/g, ''); // Supprime les tirets au début et à la fin
}
