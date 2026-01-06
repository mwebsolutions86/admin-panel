/**
 * HOOKS REACT POUR L'INTERNATIONALISATION - Universal Eats
 * Hooks pour utiliser la localisation dans les composants React
 * Support RTL, formats locaux, changements dynamiques
 */

import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { 
  localizationService, 
  SupportedLanguage, 
  Market,
  LocalizationConfig,
  SUPPORTED_LANGUAGES
} from '../lib/localization-service';
import { translationManager, TranslationProgress } from '../lib/translation-manager';

// Contexte de localisation
interface LocalizationContextType {
  currentLanguage: string;
  currentMarket: string;
  isRTL: boolean;
  supportedLanguages: SupportedLanguage[];
  supportedMarkets: Market[];
  config: LocalizationConfig;
  isLoading: boolean;
  error: string | null;
}

const LocalizationContext = createContext<LocalizationContextType | null>(null);

// Provider de localisation
export function LocalizationProvider({ 
  children,
  defaultLanguage = 'fr',
  defaultMarket = 'FR',
  enableGeoDetection = true,
  cacheTranslations = true,
  enableRTL = true
}: {
  children: React.ReactNode;
  defaultLanguage?: string;
  defaultMarket?: string;
  enableGeoDetection?: boolean;
  cacheTranslations?: boolean;
  enableRTL?: boolean;
}) {
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);
  const [currentMarket, setCurrentMarket] = useState(defaultMarket);
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration du service
  useEffect(() => {
    localizationService.configure({
      currentLanguage,
      currentMarket,
      fallbackLanguage: 'fr',
      enableGeoDetection,
      cacheTranslations,
      enableRTL
    });
  }, [defaultLanguage, defaultMarket, enableGeoDetection, cacheTranslations, enableRTL]);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // LocalizationService initializes itself when instantiated; proceed

        // Mettre à jour les états
        setCurrentLanguage(localizationService.getCurrentLanguage());
        setCurrentMarket(localizationService.getCurrentMarket());
        setIsRTL(SUPPORTED_LANGUAGES.find(l => l.code === localizationService.getCurrentLanguage())?.direction === 'rtl');

        // Écouter les changements
        const handleChange = () => {
          setCurrentLanguage(localizationService.getCurrentLanguage());
          setCurrentMarket(localizationService.getCurrentMarket());
          setIsRTL(SUPPORTED_LANGUAGES.find(l => l.code === localizationService.getCurrentLanguage())?.direction === 'rtl');
        };

        localizationService.addListener(handleChange);

        return () => {
          localizationService.removeListener(handleChange);
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const contextValue: LocalizationContextType = {
    currentLanguage,
    currentMarket,
    isRTL,
    supportedLanguages: localizationService.getSupportedLanguages(),
    supportedMarkets: localizationService.getSupportedMarkets(),
    config: {
      currentLanguage,
      currentMarket,
      fallbackLanguage: 'fr',
      enableGeoDetection,
      cacheTranslations,
      enableRTL
    },
    isLoading,
    error
  };

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
}

// Hook pour utiliser le contexte de localisation
export function useLocalization(): LocalizationContextType {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization doit être utilisé dans un LocalizationProvider');
  }
  return context;
}

// Hook principal pour la traduction
export function useTranslate() {
  const { currentLanguage } = useLocalization();

  const translate = useCallback((
    key: string,
    params?: Record<string, any>,
    options?: {
      count?: number;
      gender?: 'masculine' | 'feminine';
      context?: string;
    }
  ): string => {
    return localizationService.translate(key, params, options);
  }, [currentLanguage]);

  return { translate };
}

// Hook pour obtenir la langue actuelle
export function useCurrentLanguage(): string {
  const { currentLanguage } = useLocalization();
  return currentLanguage;
}

// Hook pour obtenir le marché actuel
export function useCurrentMarket(): string {
  const { currentMarket } = useLocalization();
  return currentMarket;
}

// Hook pour vérifier si la direction RTL est active
export function useRTL(): boolean {
  const { isRTL } = useLocalization();
  return isRTL;
}

// Hook pour changer la langue
export function useSetLanguage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLanguage = useCallback(async (language: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await localizationService.setLanguage(language);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { setLanguage, isLoading, error };
}

// Hook pour changer le marché
export function useSetMarket() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMarket = useCallback(async (market: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await localizationService.setMarket(market);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { setMarket, isLoading, error };
}

// Hook pour les formats locaux
export function useLocaleFormat() {
  const { currentLanguage, currentMarket } = useLocalization();

  const formatCurrency = useCallback((
    amount: number,
    currency?: string,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      locale?: string;
    }
  ): string => {
    const market = localizationService.getCurrentMarketInfo();
    const finalCurrency = currency || market?.currency || 'EUR';
    
    const locale = getLocaleCode(currentLanguage, currentMarket);
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: finalCurrency,
      minimumFractionDigits: options?.minimumFractionDigits,
      maximumFractionDigits: options?.maximumFractionDigits
    }).format(amount);
  }, [currentLanguage, currentMarket]);

  const formatDate = useCallback((
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const market = localizationService.getCurrentMarketInfo();
    const locale = getLocaleCode(currentLanguage, currentMarket);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const dateObj = date instanceof Date ? date : new Date(date);
    
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  }, [currentLanguage, currentMarket]);

  const formatTime = useCallback((
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const locale = getLocaleCode(currentLanguage, currentMarket);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };

    const dateObj = date instanceof Date ? date : new Date(date);
    
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  }, [currentLanguage, currentMarket]);

  const formatNumber = useCallback((
    number: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    const locale = getLocaleCode(currentLanguage, currentMarket);
    
    return new Intl.NumberFormat(locale, options).format(number);
  }, [currentLanguage, currentMarket]);

  const formatPhoneNumber = useCallback((phoneNumber: string): string => {
    const market = localizationService.getCurrentMarketInfo();
    if (!market) return phoneNumber;

    // Formatage basique selon le marché
    switch (market.code) {
      case 'FR':
        return phoneNumber.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
      case 'MA':
        return phoneNumber.replace(/(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
      case 'US':
        return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      case 'ES':
        return phoneNumber.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
      default:
        return phoneNumber;
    }
  }, [currentMarket]);

  return {
    formatCurrency,
    formatDate,
    formatTime,
    formatNumber,
    formatPhoneNumber
  };
}

// Hook pour les informations de localisation
export function useLocaleInfo() {
  const { currentLanguage, currentMarket, supportedLanguages, supportedMarkets } = useLocalization();

  const getCurrentLanguageInfo = useCallback((): SupportedLanguage | undefined => {
    return supportedLanguages.find(lang => lang.code === currentLanguage);
  }, [currentLanguage, supportedLanguages]);

  const getCurrentMarketInfo = useCallback((): Market | undefined => {
    return supportedMarkets.find(market => market.code === currentMarket);
  }, [currentMarket, supportedMarkets]);

  const getLanguageByCode = useCallback((code: string): SupportedLanguage | undefined => {
    return supportedLanguages.find(lang => lang.code === code);
  }, [supportedLanguages]);

  const getMarketByCode = useCallback((code: string): Market | undefined => {
    return supportedMarkets.find(market => market.code === code);
  }, [supportedMarkets]);

  return {
    currentLanguage,
    currentMarket,
    supportedLanguages,
    supportedMarkets,
    getCurrentLanguageInfo,
    getCurrentMarketInfo,
    getLanguageByCode,
    getMarketByCode
  };
}

// Hook pour les messages localisés
export function useLocalizedMessage() {
  const { translate } = useTranslate();

  const showMessage = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    key: string,
    params?: Record<string, any>
  ): string => {
    const messageKey = `msg.${type}.${key}`;
    return translate(messageKey, params);
  }, [translate]);

  const success = useCallback((key: string, params?: Record<string, any>): string => {
    return showMessage('success', key, params);
  }, [showMessage]);

  const error = useCallback((key: string, params?: Record<string, any>): string => {
    return showMessage('error', key, params);
  }, [showMessage]);

  const warning = useCallback((key: string, params?: Record<string, any>): string => {
    return showMessage('warning', key, params);
  }, [showMessage]);

  const info = useCallback((key: string, params?: Record<string, any>): string => {
    return showMessage('info', key, params);
  }, [showMessage]);

  return { success, error, warning, info };
}

// Hook pour les composants avec changement de langue dynamique
export function useTranslationKey(key: string, params?: Record<string, any>) {
  const [translatedValue, setTranslatedValue] = useState('');
  const { translate } = useTranslate();

  useEffect(() => {
    setTranslatedValue(translate(key, params));
  }, [key, params, translate]);

  return translatedValue;
}

// Hook pour les statistiques de traduction
export function useTranslationStats() {
  const [stats, setStats] = useState<TranslationProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const languages = localizationService.getSupportedLanguages().map(l => l.code);
      const markets = localizationService.getSupportedMarkets().map(m => m.code);
      
      const progressReports = await translationManager.generateProgressReport(languages, markets);
      setStats(progressReports);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return { stats, refreshStats, isLoading, error };
}

// Hook pour la préchargement des traductions
export function usePreloadTranslations() {
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadLanguages = useCallback(async (languages: string[]) => {
    try {
      setIsPreloading(true);
      await localizationService.preloadTranslations(languages);
    } catch (error) {
      console.error('Erreur lors du préchargement:', error);
    } finally {
      setIsPreloading(false);
    }
  }, []);

  return { preloadLanguages, isPreloading };
}

// Hook pour la gestion du cache de traduction
export function useTranslationCache() {
  const clearCache = useCallback(async () => {
    await localizationService.clearCache();
  }, []);

  const getStats = useCallback(() => {
    return localizationService.getLocalizationStats();
  }, []);

  return { clearCache, getStats };
}

// Hook pour l'accès direct au service de localisation
export function useLocalizationService() {
  return localizationService;
}

// Fonction utilitaire pour obtenir le code de locale
function getLocaleCode(language: string, market: string): string {
  const localeMap: Record<string, string> = {
    'fr_FR': 'fr-FR',
    'fr_MA': 'fr-MA',
    'ar_MA': 'ar-MA',
    'en_US': 'en-US',
    'es_ES': 'es-ES'
  };

  return localeMap[`${language}_${market}`] || `${language}-${market}`;
}

// Hook pour les métriques de performance
export function useLocalizationPerformance() {
  const [performanceData, setPerformanceData] = useState<{
    loadTime: number;
    cacheHitRate: number;
    translationCount: number;
  }>({
    loadTime: 0,
    cacheHitRate: 0,
    translationCount: 0
  });

  useEffect(() => {
    const measurePerformance = () => {
      const stats = localizationService.getLocalizationStats();
      setPerformanceData({
        loadTime: Date.now(), // Dans une implémentation complète, mesurer le temps réel
        cacheHitRate: 85, // Simulation
        translationCount: stats.totalTranslations
      });
    };

    measurePerformance();
    const interval = setInterval(measurePerformance, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  return performanceData;
}