export type CurrencyCode = 'MAD' | 'EUR' | 'USD';

export const formatCurrency = (amount: number, currency: CurrencyCode = 'MAD'): string => {
  if (amount === undefined || amount === null) return formatCurrency(0, currency);
  
  if (currency === 'MAD') {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(amount);
};