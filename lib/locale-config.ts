/**
 * CONFIGURATION DES LANGUES ET MARCHÉS - Universal Eats
 * Configuration centralisée de toutes les langues et marchés supportés
 * Définition des paramètres régionaux, formats et règles
 */

import { SupportedLanguage, Market } from './localization-service';

// Configuration détaillée des langues
export interface LanguageConfig extends SupportedLanguage {
  // Métadonnées linguistiques
  unicodeRange?: string[];
  fontFamily?: string[];
  textDirection: 'ltr' | 'rtl';
  
  // Règles linguistiques
  pluralRules: {
    zero?: string;
    one: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
  };
  
  // Formats de date et heure
  dateFormats: {
    short: string;
    medium: string;
    long: string;
    full: string;
  };
  
  timeFormats: {
    short: string;
    medium: string;
    long: string;
  };
  
  // Règles de capitalisation
  capitalization: {
    sentenceStart: boolean;
    properNouns: boolean;
    acronyms: boolean;
  };
  
  // Validation des données
  validation: {
    phonePattern: RegExp;
    postalCodePattern: RegExp;
    addressFormat: string[];
  };
  
  // Configuration UI
  ui: {
    defaultFontSize: number;
    lineHeight: number;
    characterSpacing: number;
    wordSpacing: number;
  };
}

// Configuration détaillée des marchés
export interface MarketConfig extends Market {
  // Métadonnées géographiques
  region: string;
  subRegion: string;
  flag: string;
  callingCode: string;
  
  // Configuration économique
  taxRates: {
    vat: number;
    service: number;
  };
  
  // Formats d'adresse
  addressValidation: {
    requiredFields: string[];
    optionalFields: string[];
    patterns: Record<string, RegExp>;
  };
  
  // Formats de données
  dataFormats: {
    date: string;
    time: string;
    datetime: string;
    number: string;
    currency: string;
    phone: string;
    postalCode: string;
  };
  
  // Règles commerciales
  business: {
    currency: string;
    decimalPlaces: number;
    thousandsSeparator: string;
    decimalSeparator: string;
    currencyPosition: 'before' | 'after';
    currencySymbol: string;
  };
  
  // Configuration légale
  legal: {
    gdprCompliant: boolean;
    privacyPolicyUrl: string;
    termsUrl: string;
    cookiePolicyUrl: string;
  };
}

// Configuration complète des localisations
export interface LocaleConfig {
  language: LanguageConfig;
  market: MarketConfig;
  combined: {
    locale: string;
    rtl: boolean;
    defaultTimezone: string;
    businessHours: {
      start: string;
      end: string;
      days: number[];
    };
    holidays: string[];
    workingDays: number[];
  };
}

// Base de données des langues configurées
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    isDefault: true,
    marketCode: 'FR',
    unicodeRange: ['U+0020', 'U+007E', 'U+00A0', 'U+00C0', 'U+00FF'],
    fontFamily: ['Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
    textDirection: 'ltr',
    
    pluralRules: {
      one: 'n >= 0 && n < 2',
      other: 'n >= 2'
    },
    
    dateFormats: {
      short: 'dd/MM/yyyy',
      medium: 'dd MMM yyyy',
      long: 'dd MMMM yyyy',
      full: 'EEEE d MMMM yyyy'
    },
    
    timeFormats: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
      long: 'HH:mm:ss z'
    },
    
    capitalization: {
      sentenceStart: true,
      properNouns: true,
      acronyms: false
    },
    
    validation: {
      phonePattern: /^(\+33|0)[1-9](\d{2}){4}$/,
      postalCodePattern: /^[0-9]{5}$/,
      addressFormat: ['street', 'postalCode', 'city', 'country']
    },
    
    ui: {
      defaultFontSize: 16,
      lineHeight: 1.5,
      characterSpacing: 0,
      wordSpacing: 0
    }
  },

  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇲🇦',
    marketCode: 'MA',
    unicodeRange: ['U+0600', 'U+06FF', 'U+0750', 'U+077F', 'U+08A0', 'U+08FF'],
    fontFamily: ['Tahoma', 'Arial', 'sans-serif'],
    textDirection: 'rtl',
    
    pluralRules: {
      zero: 'n == 0',
      one: 'n == 1',
      two: 'n == 2',
      few: 'n >= 3 && n <= 10',
      many: 'n >= 11',
      other: 'everything else'
    },
    
    dateFormats: {
      short: 'dd/MM/yyyy',
      medium: 'dd MMM yyyy',
      long: 'dd MMMM yyyy',
      full: 'EEEE d MMMM yyyy'
    },
    
    timeFormats: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
      long: 'HH:mm:ss z'
    },
    
    capitalization: {
      sentenceStart: true,
      properNouns: true,
      acronyms: false
    },
    
    validation: {
      phonePattern: /^(\+212|0)[5-7](\d{2}){4}$/,
      postalCodePattern: /^[0-9]{5}$/,
      addressFormat: ['street', 'city', 'postalCode', 'country']
    },
    
    ui: {
      defaultFontSize: 18,
      lineHeight: 1.8,
      characterSpacing: 0.5,
      wordSpacing: 1
    }
  },

  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
    marketCode: 'US',
    unicodeRange: ['U+0020', 'U+007E'],
    fontFamily: ['Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
    textDirection: 'ltr',
    
    pluralRules: {
      one: 'n == 1',
      other: 'n != 1'
    },
    
    dateFormats: {
      short: 'MM/dd/yyyy',
      medium: 'MMM dd, yyyy',
      long: 'MMMM dd, yyyy',
      full: 'EEEE, MMMM dd, yyyy'
    },
    
    timeFormats: {
      short: 'h:mm a',
      medium: 'h:mm:ss a',
      long: 'h:mm:ss a z'
    },
    
    capitalization: {
      sentenceStart: true,
      properNouns: true,
      acronyms: true
    },
    
    validation: {
      phonePattern: /^(\+1|1)?[2-9][0-8][0-9][2-9][0-9]{6}$/,
      postalCodePattern: /^[0-9]{5}(-[0-9]{4})?$/,
      addressFormat: ['street', 'city', 'state', 'postalCode', 'country']
    },
    
    ui: {
      defaultFontSize: 16,
      lineHeight: 1.5,
      characterSpacing: 0,
      wordSpacing: 0
    }
  },

  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
    marketCode: 'ES',
    unicodeRange: ['U+0020', 'U+007E', 'U+00A0', 'U+00C0', 'U+00FF'],
    fontFamily: ['Segoe UI', 'Arial', 'Helvetica', 'sans-serif'],
    textDirection: 'ltr',
    
    pluralRules: {
      one: 'n == 1',
      other: 'n != 1'
    },
    
    dateFormats: {
      short: 'dd/MM/yyyy',
      medium: 'dd MMM yyyy',
      long: 'dd MMMM yyyy',
      full: 'EEEE d MMMM yyyy'
    },
    
    timeFormats: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
      long: 'HH:mm:ss z'
    },
    
    capitalization: {
      sentenceStart: true,
      properNouns: true,
      acronyms: false
    },
    
    validation: {
      phonePattern: /^(\+34|34)?[6-9](\d{2}){3}$/,
      postalCodePattern: /^[0-9]{5}$/,
      addressFormat: ['street', 'postalCode', 'city', 'country']
    },
    
    ui: {
      defaultFontSize: 16,
      lineHeight: 1.5,
      characterSpacing: 0,
      wordSpacing: 0
    }
  }
};

// Base de données des marchés configurés
export const MARKET_CONFIGS: Record<string, MarketConfig> = {
  FR: {
    code: 'FR',
    name: 'France',
    languages: ['fr'],
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '1 234,56',
    phoneFormat: '+33 1 23 45 67 89',
    addressFormat: 'street,city,postalCode,country',
    
    region: 'Europe',
    subRegion: 'Western Europe',
    flag: '🇫🇷',
    callingCode: '+33',
    
    taxRates: {
      vat: 20,
      service: 0
    },
    
    addressValidation: {
      requiredFields: ['street', 'city', 'postalCode', 'country'],
      optionalFields: ['region', 'building', 'floor', 'apartment'],
      patterns: {
        postalCode: /^[0-9]{5}$/,
        phone: /^(\+33|0)[1-9](\d{2}){4}$/
      }
    },
    
    dataFormats: {
      date: 'dd/MM/yyyy',
      time: 'HH:mm',
      datetime: 'dd/MM/yyyy HH:mm',
      number: '1 234,56',
      currency: '1 234,56 €',
      phone: '+33 1 23 45 67 89',
      postalCode: '12345'
    },
    
    business: {
      currency: 'EUR',
      decimalPlaces: 2,
      thousandsSeparator: ' ',
      decimalSeparator: ',',
      currencyPosition: 'after',
      currencySymbol: '€'
    },
    
    legal: {
      gdprCompliant: true,
      privacyPolicyUrl: 'https://example.com/privacy/fr',
      termsUrl: 'https://example.com/terms/fr',
      cookiePolicyUrl: 'https://example.com/cookies/fr'
    }
  },

  MA: {
    code: 'MA',
    name: 'Maroc',
    languages: ['fr', 'ar'],
    currency: 'MAD',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '12 345,67',
    phoneFormat: '+212 5 12 34 56 78',
    addressFormat: 'street,city,postalCode,country',
    
    region: 'Africa',
    subRegion: 'Northern Africa',
    flag: '🇲🇦',
    callingCode: '+212',
    
    taxRates: {
      vat: 20,
      service: 0
    },
    
    addressValidation: {
      requiredFields: ['street', 'city', 'postalCode', 'country'],
      optionalFields: ['region', 'building', 'floor', 'apartment'],
      patterns: {
        postalCode: /^[0-9]{5}$/,
        phone: /^(\+212|0)[5-7](\d{2}){4}$/
      }
    },
    
    dataFormats: {
      date: 'dd/MM/yyyy',
      time: 'HH:mm',
      datetime: 'dd/MM/yyyy HH:mm',
      number: '12 345,67',
      currency: '12 345,67 DH',
      phone: '+212 5 12 34 56 78',
      postalCode: '12345'
    },
    
    business: {
      currency: 'MAD',
      decimalPlaces: 2,
      thousandsSeparator: ' ',
      decimalSeparator: ',',
      currencyPosition: 'after',
      currencySymbol: 'DH'
    },
    
    legal: {
      gdprCompliant: false,
      privacyPolicyUrl: 'https://example.com/privacy/ma',
      termsUrl: 'https://example.com/terms/ma',
      cookiePolicyUrl: 'https://example.com/cookies/ma'
    }
  },

  US: {
    code: 'US',
    name: 'United States',
    languages: ['en'],
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: '1,234.56',
    phoneFormat: '(555) 123-4567',
    addressFormat: 'street,city,state,zipCode,country',
    
    region: 'Americas',
    subRegion: 'Northern America',
    flag: '🇺🇸',
    callingCode: '+1',
    
    taxRates: {
      vat: 0,
      service: 0
    },
    
    addressValidation: {
      requiredFields: ['street', 'city', 'state', 'postalCode', 'country'],
      optionalFields: ['apartment', 'building'],
      patterns: {
        postalCode: /^[0-9]{5}(-[0-9]{4})?$/,
        phone: /^(\+1|1)?[2-9][0-8][0-9][2-9][0-9]{6}$/
      }
    },
    
    dataFormats: {
      date: 'MM/dd/yyyy',
      time: 'h:mm a',
      datetime: 'MM/dd/yyyy h:mm a',
      number: '1,234.56',
      currency: '$1,234.56',
      phone: '(555) 123-4567',
      postalCode: '12345'
    },
    
    business: {
      currency: 'USD',
      decimalPlaces: 2,
      thousandsSeparator: ',',
      decimalSeparator: '.',
      currencyPosition: 'before',
      currencySymbol: '$'
    },
    
    legal: {
      gdprCompliant: false,
      privacyPolicyUrl: 'https://example.com/privacy/us',
      termsUrl: 'https://example.com/terms/us',
      cookiePolicyUrl: 'https://example.com/cookies/us'
    }
  },

  ES: {
    code: 'ES',
    name: 'España',
    languages: ['es'],
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '1.234,56',
    phoneFormat: '+34 91 123 45 67',
    addressFormat: 'street,city,postalCode,country',
    
    region: 'Europe',
    subRegion: 'Southern Europe',
    flag: '🇪🇸',
    callingCode: '+34',
    
    taxRates: {
      vat: 21,
      service: 0
    },
    
    addressValidation: {
      requiredFields: ['street', 'city', 'postalCode', 'country'],
      optionalFields: ['region', 'building', 'floor', 'apartment'],
      patterns: {
        postalCode: /^[0-9]{5}$/,
        phone: /^(\+34|34)?[6-9](\d{2}){3}$/
      }
    },
    
    dataFormats: {
      date: 'dd/MM/yyyy',
      time: 'HH:mm',
      datetime: 'dd/MM/yyyy HH:mm',
      number: '1.234,56',
      currency: '1.234,56 €',
      phone: '+34 91 123 45 67',
      postalCode: '12345'
    },
    
    business: {
      currency: 'EUR',
      decimalPlaces: 2,
      thousandsSeparator: '.',
      decimalSeparator: ',',
      currencyPosition: 'after',
      currencySymbol: '€'
    },
    
    legal: {
      gdprCompliant: true,
      privacyPolicyUrl: 'https://example.com/privacy/es',
      termsUrl: 'https://example.com/terms/es',
      cookiePolicyUrl: 'https://example.com/cookies/es'
    }
  }
};

/**
 * Classe de gestion de la configuration des localisations
 */
export class LocaleConfiguration {
  private static instance: LocaleConfiguration;
  private languageConfigs: Map<string, LanguageConfig> = new Map();
  private marketConfigs: Map<string, MarketConfig> = new Map();

  private constructor() {
    this.initializeConfigurations();
  }

  public static getInstance(): LocaleConfiguration {
    if (!LocaleConfiguration.instance) {
      LocaleConfiguration.instance = new LocaleConfiguration();
    }
    return LocaleConfiguration.instance;
  }

  /**
   * Initialise les configurations
   */
  private initializeConfigurations(): void {
    // Charger les configurations de langues
    Object.entries(LANGUAGE_CONFIGS).forEach(([code, config]) => {
      this.languageConfigs.set(code, config);
    });

    // Charger les configurations de marchés
    Object.entries(MARKET_CONFIGS).forEach(([code, config]) => {
      this.marketConfigs.set(code, config);
    });
  }

  /**
   * Obtient la configuration d'une langue
   */
  public getLanguageConfig(languageCode: string): LanguageConfig | null {
    return this.languageConfigs.get(languageCode) || null;
  }

  /**
   * Obtient la configuration d'un marché
   */
  public getMarketConfig(marketCode: string): MarketConfig | null {
    return this.marketConfigs.get(marketCode) || null;
  }

  /**
   * Obtient la configuration complète d'une localisation
   */
  public getLocaleConfig(languageCode: string, marketCode: string): LocaleConfig | null {
    const languageConfig = this.getLanguageConfig(languageCode);
    const marketConfig = this.getMarketConfig(marketCode);

    if (!languageConfig || !marketConfig) {
      return null;
    }

    // Vérifier si la langue est supportée par le marché
    if (!marketConfig.languages.includes(languageCode)) {
      return null;
    }

    return {
      language: languageConfig,
      market: marketConfig,
      combined: {
        locale: `${languageCode}-${marketCode}`,
        rtl: languageConfig.direction === 'rtl',
        defaultTimezone: this.getTimezoneForMarket(marketCode),
        businessHours: {
          start: '09:00',
          end: '18:00',
          days: [1, 2, 3, 4, 5] // Lundi à Vendredi
        },
        holidays: this.getHolidaysForMarket(marketCode),
        workingDays: [1, 2, 3, 4, 5]
      }
    };
  }

  /**
   * Obtient toutes les langues supportées
   */
  public getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languageConfigs.values());
  }

  /**
   * Obtient tous les marchés supportés
   */
  public getSupportedMarkets(): MarketConfig[] {
    return Array.from(this.marketConfigs.values());
  }

  /**
   * Obtient les langues supportées par un marché
   */
  public getLanguagesForMarket(marketCode: string): LanguageConfig[] {
    const marketConfig = this.getMarketConfig(marketCode);
    if (!marketConfig) {
      return [];
    }

    return marketConfig.languages
      .map(langCode => this.getLanguageConfig(langCode))
      .filter(config => config !== null) as LanguageConfig[];
  }

  /**
   * Obtient les marchés supportant une langue
   */
  public getMarketsForLanguage(languageCode: string): MarketConfig[] {
    return this.getSupportedMarkets().filter(market => 
      market.languages.includes(languageCode)
    );
  }

  /**
   * Valide une localisation
   */
  public validateLocale(languageCode: string, marketCode: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const languageConfig = this.getLanguageConfig(languageCode);
    const marketConfig = this.getMarketConfig(marketCode);

    if (!languageConfig) {
      errors.push(`Langue non supportée: ${languageCode}`);
    }

    if (!marketConfig) {
      errors.push(`Marché non supporté: ${marketCode}`);
    }

    if (languageConfig && marketConfig) {
      if (!marketConfig.languages.includes(languageCode)) {
        errors.push(`La langue ${languageCode} n'est pas supportée par le marché ${marketCode}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Obtient le fuseau horaire par défaut pour un marché
   */
  private getTimezoneForMarket(marketCode: string): string {
    const timezones: Record<string, string> = {
      'FR': 'Europe/Paris',
      'MA': 'Africa/Casablanca',
      'US': 'America/New_York',
      'ES': 'Europe/Madrid'
    };

    return timezones[marketCode] || 'UTC';
  }

  /**
   * Obtient les jours fériés pour un marché
   */
  private getHolidaysForMarket(marketCode: string): string[] {
    const holidays: Record<string, string[]> = {
      'FR': [
        '2024-01-01', // Nouvel An
        '2024-05-01', // Fête du travail
        '2024-05-08', // Victoire 1945
        '2024-07-14', // Fête nationale
        '2024-08-15', // Assomption
        '2024-11-01', // Toussaint
        '2024-11-11', // Armistice
        '2024-12-25'  // Noël
      ],
      'MA': [
        '2024-01-01', // Nouvel An
        '2024-05-01', // Fête du travail
        '2024-07-30', // Fête du Trône
        '2024-08-14', // Fête de l'allégeance
        '2024-08-20', // Révolution du Roi et du Peuple
        '2024-11-06', // Marche Verte
        '2024-11-18', // Indépendance
        '2024-12-25'  // Noël
      ],
      'US': [
        '2024-01-01', // New Year's Day
        '2024-01-15', // Martin Luther King Jr. Day
        '2024-02-19', // Presidents' Day
        '2024-05-27', // Memorial Day
        '2024-07-04', // Independence Day
        '2024-09-02', // Labor Day
        '2024-10-14', // Columbus Day
        '2024-11-11', // Veterans Day
        '2024-11-28', // Thanksgiving
        '2024-12-25'  // Christmas Day
      ],
      'ES': [
        '2024-01-01', // Año Nuevo
        '2024-01-06', // Reyes Magos
        '2024-05-01', // Día del Trabajo
        '2024-08-15', // Asunción
        '2024-10-12', // Día de la Hispanidad
        '2024-11-01', // Todos los Santos
        '2024-12-06', // Día de la Constitución
        '2024-12-08', // Inmaculada Concepción
        '2024-12-25'  // Navidad
      ]
    };

    return holidays[marketCode] || [];
  }

  /**
   * Ajoute une nouvelle langue
   */
  public addLanguage(config: LanguageConfig): void {
    this.languageConfigs.set(config.code, config);
    LANGUAGE_CONFIGS[config.code] = config;
  }

  /**
   * Ajoute un nouveau marché
   */
  public addMarket(config: MarketConfig): void {
    this.marketConfigs.set(config.code, config);
    MARKET_CONFIGS[config.code] = config;
  }

  /**
   * Met à jour une langue existante
   */
  public updateLanguage(code: string, updates: Partial<LanguageConfig>): void {
    const existing = this.languageConfigs.get(code);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.languageConfigs.set(code, updated);
      LANGUAGE_CONFIGS[code] = updated;
    }
  }

  /**
   * Met à jour un marché existant
   */
  public updateMarket(code: string, updates: Partial<MarketConfig>): void {
    const existing = this.marketConfigs.get(code);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.marketConfigs.set(code, updated);
      MARKET_CONFIGS[code] = updated;
    }
  }

  /**
   * Supprime une langue
   */
  public removeLanguage(code: string): void {
    this.languageConfigs.delete(code);
    delete LANGUAGE_CONFIGS[code];
  }

  /**
   * Supprime un marché
   */
  public removeMarket(code: string): void {
    this.marketConfigs.delete(code);
    delete MARKET_CONFIGS[code];
  }

  /**
   * Obtient les statistiques de configuration
   */
  public getConfigurationStats(): {
    totalLanguages: number;
    totalMarkets: number;
    totalLocales: number;
    rtlLanguages: number;
    languagesByRegion: Record<string, number>;
    marketsByRegion: Record<string, number>;
  } {
    const languages = this.getSupportedLanguages();
    const markets = this.getSupportedMarkets();

    const rtlLanguages = languages.filter(lang => lang.direction === 'rtl').length;

    const languagesByRegion: Record<string, number> = {};
    const marketsByRegion: Record<string, number> = {};

    languages.forEach(lang => {
      const market = this.getMarketConfig(lang.marketCode!);
      if (market) {
        languagesByRegion[market.region] = (languagesByRegion[market.region] || 0) + 1;
      }
    });

    markets.forEach(market => {
      marketsByRegion[market.region] = (marketsByRegion[market.region] || 0) + 1;
    });

    return {
      totalLanguages: languages.length,
      totalMarkets: markets.length,
      totalLocales: languages.length * markets.length,
      rtlLanguages,
      languagesByRegion,
      marketsByRegion
    };
  }
}

// Export de l'instance singleton
export const localeConfiguration = LocaleConfiguration.getInstance();