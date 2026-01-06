/**
 * SYSTÈME DE FORMATS LOCAUX - Universal Eats
 * Gestionnaire des formats de devises, dates, nombres et autres formats
 * Support automatique selon la langue et le marché
 */

import { Market } from './localization-service';

export interface CurrencyFormat {
  symbol: string;
  code: string;
  position: 'before' | 'after';
  decimals: number;
  thousands: string;
  decimal: string;
  example: string;
}

export interface DateFormat {
  short: string;
  medium: string;
  long: string;
  full: string;
  custom?: string;
  example: Date;
}

export interface NumberFormat {
  decimal: string;
  thousands: string;
  precision: number;
  example: number;
}

export interface AddressFormat {
  template: string;
  fields: string[];
  order: string[];
  requiredFields: string[];
}

export interface PhoneFormat {
  countryCode: string;
  template: string;
  mask: string;
  example: string;
}

export interface LocaleFormatterConfig {
  language: string;
  market: string;
  currency: CurrencyFormat;
  date: DateFormat;
  number: NumberFormat;
  address: AddressFormat;
  phone: PhoneFormat;
}

export class LocaleFormatter {
  private static instance: LocaleFormatter;
  private formatters: Map<string, LocaleFormatterConfig> = new Map();

  private constructor() {
    this.initializeFormatters();
  }

  public static getInstance(): LocaleFormatter {
    if (!LocaleFormatter.instance) {
      LocaleFormatter.instance = new LocaleFormatter();
    }
    return LocaleFormatter.instance;
  }

  /**
   * Initialise tous les formateurs locaux
   */
  private initializeFormatters(): void {
    // France
    this.formatters.set('fr_FR', {
      language: 'fr',
      market: 'FR',
      currency: {
        symbol: '€',
        code: 'EUR',
        position: 'after',
        decimals: 2,
        thousands: ' ',
        decimal: ',',
        example: '1 234,56 €'
      },
      date: {
        short: 'dd/MM/yyyy',
        medium: 'dd MMM yyyy',
        long: 'dd MMMM yyyy',
        full: 'EEEE d MMMM yyyy',
        example: new Date('2024-01-15')
      },
      number: {
        decimal: ',',
        thousands: ' ',
        precision: 2,
        example: 1234567.89
      },
      address: {
        template: '{street}\n{postalCode} {city}\n{country}',
        fields: ['street', 'city', 'postalCode', 'country'],
        order: ['street', 'city', 'postalCode', 'country'],
        requiredFields: ['street', 'city', 'postalCode']
      },
      phone: {
        countryCode: '+33',
        template: '+33 {aa} {bb} {cc} {dd} {ee}',
        mask: '+33 1 23 45 67 89',
        example: '+33 1 23 45 67 89'
      }
    });

    // Maroc
    this.formatters.set('fr_MA', {
      language: 'fr',
      market: 'MA',
      currency: {
        symbol: 'DH',
        code: 'MAD',
        position: 'after',
        decimals: 2,
        thousands: ' ',
        decimal: ',',
        example: '1 234,56 DH'
      },
      date: {
        short: 'dd/MM/yyyy',
        medium: 'dd MMM yyyy',
        long: 'dd MMMM yyyy',
        full: 'EEEE d MMMM yyyy',
        example: new Date('2024-01-15')
      },
      number: {
        decimal: ',',
        thousands: ' ',
        precision: 2,
        example: 1234567.89
      },
      address: {
        template: '{street}\n{city} {postalCode}\n{country}',
        fields: ['street', 'city', 'postalCode', 'country'],
        order: ['street', 'city', 'postalCode', 'country'],
        requiredFields: ['street', 'city', 'postalCode']
      },
      phone: {
        countryCode: '+212',
        template: '+212 {aa} {bb} {cc} {dd} {ee}',
        mask: '+212 5 12 34 56 78',
        example: '+212 5 12 34 56 78'
      }
    });

    // États-Unis
    this.formatters.set('en_US', {
      language: 'en',
      market: 'US',
      currency: {
        symbol: '$',
        code: 'USD',
        position: 'before',
        decimals: 2,
        thousands: ',',
        decimal: '.',
        example: '$1,234.56'
      },
      date: {
        short: 'MM/dd/yyyy',
        medium: 'MMM dd, yyyy',
        long: 'MMMM dd, yyyy',
        full: 'EEEE, MMMM dd, yyyy',
        example: new Date('2024-01-15')
      },
      number: {
        decimal: '.',
        thousands: ',',
        precision: 2,
        example: 1234567.89
      },
      address: {
        template: '{street}\n{city}, {state} {postalCode}\n{country}',
        fields: ['street', 'city', 'state', 'postalCode', 'country'],
        order: ['street', 'city', 'state', 'postalCode', 'country'],
        requiredFields: ['street', 'city', 'state', 'postalCode']
      },
      phone: {
        countryCode: '+1',
        template: '+1 ({aaa}) {bb}-{cccc}',
        mask: '+1 (555) 123-4567',
        example: '+1 (555) 123-4567'
      }
    });

    // Espagne
    this.formatters.set('es_ES', {
      language: 'es',
      market: 'ES',
      currency: {
        symbol: '€',
        code: 'EUR',
        position: 'after',
        decimals: 2,
        thousands: '.',
        decimal: ',',
        example: '1.234,56 €'
      },
      date: {
        short: 'dd/MM/yyyy',
        medium: 'dd MMM yyyy',
        long: 'dd MMMM yyyy',
        full: 'EEEE d MMMM yyyy',
        example: new Date('2024-01-15')
      },
      number: {
        decimal: ',',
        thousands: '.',
        precision: 2,
        example: 1234567.89
      },
      address: {
        template: '{street}\n{postalCode} {city}\n{country}',
        fields: ['street', 'city', 'postalCode', 'country'],
        order: ['street', 'postalCode', 'city', 'country'],
        requiredFields: ['street', 'city', 'postalCode']
      },
      phone: {
        countryCode: '+34',
        template: '+34 {aa} {bb} {cc} {dd}',
        mask: '+34 91 123 45 67',
        example: '+34 91 123 45 67'
      }
    });

    // Arabe (Maroc)
    this.formatters.set('ar_MA', {
      language: 'ar',
      market: 'MA',
      currency: {
        symbol: 'درهم',
        code: 'MAD',
        position: 'after',
        decimals: 2,
        thousands: '،',
        decimal: '٫',
        example: '١٬٢٣٤٫٥٦ درهم'
      },
      date: {
        short: 'dd/MM/yyyy',
        medium: 'dd MMM yyyy',
        long: 'dd MMMM yyyy',
        full: 'EEEE d MMMM yyyy',
        example: new Date('2024-01-15')
      },
      number: {
        decimal: '٫',
        thousands: '،',
        precision: 2,
        example: 1234567.89
      },
      address: {
        template: '{street}\n{postalCode} {city}\n{country}',
        fields: ['street', 'city', 'postalCode', 'country'],
        order: ['street', 'city', 'postalCode', 'country'],
        requiredFields: ['street', 'city', 'postalCode']
      },
      phone: {
        countryCode: '+212',
        template: '+212 {aa} {bb} {cc} {dd} {ee}',
        mask: '+212 5 12 34 56 78',
        example: '+212 5 12 34 56 78'
      }
    });
  }

  /**
   * Obtient le formateur pour une langue et un marché donné
   */
  public getFormatter(language: string, market: string): LocaleFormatterConfig | null {
    const key = `${language}_${market}`;
    return this.formatters.get(key) || null;
  }

  /**
   * Formate une devise
   */
  public formatCurrency(
    amount: number,
    language: string,
    market: string,
    options?: {
      currency?: string;
      showCode?: boolean;
      showSymbol?: boolean;
      decimals?: number;
      compact?: boolean;
    }
  ): string {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return amount.toFixed(2);
    }

    const {
      currency,
      showCode = false,
      showSymbol = true,
      decimals,
      compact = false
    } = options || {};

    const format = formatter.currency;
    const actualDecimals = decimals ?? format.decimals;
    
    // Arrondir le montant
    const roundedAmount = Math.round(amount * Math.pow(10, actualDecimals)) / Math.pow(10, actualDecimals);
    
    // Formater les nombres avec les séparateurs locaux
    const formattedNumber = this.formatNumber(roundedAmount, language, market, {
      decimals: actualDecimals,
      compact
    });

    let result = '';
    
    // Positionner la devise
    if (showSymbol) {
      result = format.position === 'before' 
        ? `${format.symbol}${formattedNumber}`
        : `${formattedNumber} ${format.symbol}`;
    } else {
      result = formattedNumber;
    }

    // Ajouter le code de devise
    if (showCode && currency) {
      result += ` (${currency})`;
    }

    return result;
  }

  /**
   * Formate un nombre
   */
  public formatNumber(
    number: number,
    language: string,
    market: string,
    options?: {
      decimals?: number;
      compact?: boolean;
      style?: 'decimal' | 'percent' | 'currency';
    }
  ): string {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return number.toString();
    }

    const { decimals, compact = false, style = 'decimal' } = options || {};
    const numberFormat = formatter.number;

    if (compact && number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else if (compact && number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    }

    // Utiliser Intl.NumberFormat pour un formatage robuste
    const locale = this.getLocaleCode(language, market);
    const formatOptions: Intl.NumberFormatOptions = {
      style,
      minimumFractionDigits: decimals ?? numberFormat.precision,
      maximumFractionDigits: decimals ?? numberFormat.precision
    };

    return new Intl.NumberFormat(locale, formatOptions).format(number);
  }

  /**
   * Formate une date
   */
  public formatDate(
    date: Date | string | number,
    language: string,
    market: string,
    options?: {
      format?: 'short' | 'medium' | 'long' | 'full' | 'custom';
      customFormat?: string;
      includeTime?: boolean;
      timeFormat?: '12h' | '24h';
      timezone?: string;
    }
  ): string {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return new Date(date).toLocaleDateString();
    }

    const { 
      format = 'medium',
      customFormat,
      includeTime = false,
      timeFormat = '24h',
      timezone
    } = options || {};

    const dateObj = date instanceof Date ? date : new Date(date);
    const locale = this.getLocaleCode(language, market);

    if (customFormat) {
      // Format personnalisé simple
      return this.formatCustomDate(dateObj, customFormat, formatter, language);
    }

    // Utiliser les formats prédéfinis
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone
    };

    switch (format) {
      case 'short':
        formatOptions.year = '2-digit';
        formatOptions.month = 'numeric';
        formatOptions.day = 'numeric';
        break;
      case 'medium':
        formatOptions.year = 'numeric';
        formatOptions.month = 'short';
        formatOptions.day = 'numeric';
        break;
      case 'long':
        formatOptions.year = 'numeric';
        formatOptions.month = 'long';
        formatOptions.day = 'numeric';
        break;
      case 'full':
        formatOptions.year = 'numeric';
        formatOptions.month = 'long';
        formatOptions.day = 'numeric';
        formatOptions.weekday = 'long';
        break;
    }

    if (includeTime) {
      if (timeFormat === '12h') {
        formatOptions.hour = 'numeric';
        formatOptions.minute = '2-digit';
        formatOptions.hour12 = true;
      } else {
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
        formatOptions.hour12 = false;
      }
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  }

  /**
   * Formate une heure
   */
  public formatTime(
    time: Date | string | number,
    language: string,
    market: string,
    options?: {
      format?: 'short' | 'medium' | 'long';
      hour12?: boolean;
      includeSeconds?: boolean;
      timezone?: string;
    }
  ): string {
    const { format = 'short', hour12, includeSeconds = false, timezone } = options || {};
    const dateObj = time instanceof Date ? time : new Date(time);
    const locale = this.getLocaleCode(language, market);

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    };

    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }

    if (hour12 !== undefined) {
      formatOptions.hour12 = hour12;
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  }

  /**
   * Formate un numéro de téléphone
   */
  public formatPhoneNumber(
    phoneNumber: string,
    language: string,
    market: string,
    options?: {
      includeCountryCode?: boolean;
      mask?: boolean;
    }
  ): string {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return phoneNumber;
    }

    const { includeCountryCode = true, mask = false } = options || {};
    const phoneFormat = formatter.phone;

    // Nettoyer le numéro (garder seulement les chiffres)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (mask) {
      return phoneFormat.mask;
    }

    // Appliquer le format selon le pays
    switch (phoneFormat.countryCode) {
      case '+33': // France
        if (cleanNumber.length === 9) {
          return `+33 ${cleanNumber.slice(0, 1)} ${cleanNumber.slice(1, 3)} ${cleanNumber.slice(3, 5)} ${cleanNumber.slice(5, 7)} ${cleanNumber.slice(7)}`;
        }
        break;
        
      case '+212': // Maroc
        if (cleanNumber.length === 9) {
          return `+212 ${cleanNumber.slice(0, 1)} ${cleanNumber.slice(1, 3)} ${cleanNumber.slice(3, 5)} ${cleanNumber.slice(5, 7)} ${cleanNumber.slice(7)}`;
        }
        break;
        
      case '+1': // États-Unis
        if (cleanNumber.length === 10) {
          return `+1 (${cleanNumber.slice(0, 3)}) ${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6)}`;
        }
        break;
        
      case '+34': // Espagne
        if (cleanNumber.length === 9) {
          return `+34 ${cleanNumber.slice(0, 2)} ${cleanNumber.slice(2, 5)} ${cleanNumber.slice(5, 7)} ${cleanNumber.slice(7)}`;
        }
        break;
    }

    // Format par défaut
    return includeCountryCode ? `${phoneFormat.countryCode} ${cleanNumber}` : cleanNumber;
  }

  /**
   * Formate une adresse
   */
  public formatAddress(
    addressData: Record<string, string>,
    language: string,
    market: string,
    options?: {
      template?: string;
      includeCountry?: boolean;
      multiline?: boolean;
    }
  ): string {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return JSON.stringify(addressData);
    }

    const { template, includeCountry = true, multiline = true } = options || {};
    const addressFormat = formatter.address;

    // Utiliser le template fourni ou celui par défaut
    const template_str = template || addressFormat.template;

    // Remplacer les variables dans le template
    let formatted = template_str;
    
    Object.entries(addressData).forEach(([key, value]) => {
      if (value) {
        const placeholder = `{${key}}`;
        formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
      }
    });

    // Nettoyer les placeholders non remplis
    formatted = formatted.replace(/\{[^}]+\}/g, '');

    // Supprimer les lignes vides si multiline
    if (multiline) {
      formatted = formatted.split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');
    }

    return formatted.trim();
  }

  /**
   * Formate un pourcentage
   */
  public formatPercentage(
    value: number,
    language: string,
    market: string,
    options?: {
      decimals?: number;
      showSymbol?: boolean;
    }
  ): string {
    const { decimals = 1, showSymbol = true } = options || {};
    const locale = this.getLocaleCode(language, market);

    const formatted = new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);

    return showSymbol ? formatted : formatted.replace('%', '').trim();
  }

  /**
   * Convertit les nombres arabes en nombres latins et vice versa
   */
  public convertNumbers(text: string, from: 'arabic' | 'latin' = 'latin', to: 'arabic' | 'latin' = 'arabic'): string {
    if (from === to) return text;

    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const latinNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    if (from === 'latin' && to === 'arabic') {
      return text.replace(/[0-9]/g, (digit) => {
        const index = parseInt(digit);
        return arabicNumbers[index];
      });
    } else if (from === 'arabic' && to === 'latin') {
      return text.replace(/[٠-٩]/g, (digit) => {
        const index = arabicNumbers.indexOf(digit);
        return latinNumbers[index];
      });
    }

    return text;
  }

  /**
   * Formate une date personnalisée simple
   */
  private formatCustomDate(date: Date, format: string, formatter: LocaleFormatterConfig, language: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return format
      .replace('yyyy', year.toString())
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('dd', day.toString().padStart(2, '0'))
      .replace('HH', hours.toString().padStart(2, '0'))
      .replace('mm', minutes.toString().padStart(2, '0'))
      .replace('ss', seconds.toString().padStart(2, '0'));
  }

  /**
   * Obtient le code de locale pour Intl
   */
  private getLocaleCode(language: string, market: string): string {
    const localeMap: Record<string, string> = {
      'fr_FR': 'fr-FR',
      'fr_MA': 'fr-MA',
      'ar_MA': 'ar-MA',
      'en_US': 'en-US',
      'es_ES': 'es-ES'
    };

    const key = `${language}_${market}`;
    return localeMap[key] || `${language}-${market}`;
  }

  /**
   * Obtient les informations de formatage pour une langue et un marché
   */
  public getFormatInfo(language: string, market: string): {
    currency: CurrencyFormat;
    date: DateFormat;
    number: NumberFormat;
    address: AddressFormat;
    phone: PhoneFormat;
  } | null {
    const formatter = this.getFormatter(language, market);
    if (!formatter) return null;

    return {
      currency: formatter.currency,
      date: formatter.date,
      number: formatter.number,
      address: formatter.address,
      phone: formatter.phone
    };
  }

  /**
   * Valide une adresse selon le format du marché
   */
  public validateAddress(address: Record<string, string>, language: string, market: string): {
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  } {
    const formatter = this.getFormatter(language, market);
    if (!formatter) {
      return {
        isValid: false,
        missingFields: [],
        errors: ['Format de marché non supporté']
      };
    }

    const requiredFields = formatter.address.requiredFields;
    const missingFields = requiredFields.filter(field => !address[field] || address[field].trim() === '');
    const errors: string[] = [];

    // Validation basique des champs
    Object.entries(address).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        switch (key) {
          case 'postalCode':
            if (!this.isValidPostalCode(value, market)) {
              errors.push(`Code postal invalide pour ${market}`);
            }
            break;
          case 'phone':
            if (!this.isValidPhoneNumber(value, market)) {
              errors.push(`Numéro de téléphone invalide`);
            }
            break;
          case 'email':
            if (!this.isValidEmail(value)) {
              errors.push(`Adresse email invalide`);
            }
            break;
        }
      }
    });

    return {
      isValid: missingFields.length === 0 && errors.length === 0,
      missingFields,
      errors
    };
  }

  /**
   * Valide un code postal
   */
  private isValidPostalCode(code: string, market: string): boolean {
    const patterns: Record<string, RegExp> = {
      'FR': /^[0-9]{5}$/,
      'MA': /^[0-9]{5}$/,
      'US': /^[0-9]{5}(-[0-9]{4})?$/,
      'ES': /^[0-9]{5}$/
    };

    const pattern = patterns[market];
    return pattern ? pattern.test(code.trim()) : true;
  }

  /**
   * Valide un numéro de téléphone
   */
  private isValidPhoneNumber(phone: string, market: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    const patterns: Record<string, RegExp> = {
      'FR': /^33[1-9][0-9]{8}$/,
      'MA': /^212[1-9][0-9]{8}$/,
      'US': /^1[2-9][0-9]{9}$/,
      'ES': /^34[6-9][0-9]{8}$/
    };

    const pattern = patterns[market];
    return pattern ? pattern.test(cleanPhone) : cleanPhone.length >= 10;
  }

  /**
   * Valide un email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Obtient tous les formatters disponibles
   */
  public getAvailableFormatters(): Array<{ language: string; market: string; name: string }> {
    return Array.from(this.formatters.keys()).map(key => {
      const [language, market] = key.split('_');
      const formatter = this.formatters.get(key)!;
      return {
        language,
        market,
        name: `${this.getLanguageName(language)} (${market})`
      };
    });
  }

  /**
   * Obtient le nom de la langue
   */
  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'fr': 'Français',
      'ar': 'العربية',
      'en': 'English',
      'es': 'Español'
    };
    return names[code] || code;
  }
}

// Export de l'instance singleton
export const localeFormatter = LocaleFormatter.getInstance();