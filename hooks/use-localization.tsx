/**
 * HOOKS REACT POUR L'INTERNATIONALISATION - Universal Eats
 * Hooks pour utiliser la localisation dans les composants React
 */

"use client";

import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { 
  localizationService, 
  SupportedLanguage, 
  Market,
  LocalizationConfig,
  SUPPORTED_LANGUAGES,
  SUPPORTED_MARKETS
} from '../lib/localization-service'; // Assurez-vous que ce chemin est correct

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
    // On configure le service une seule fois au montage ou quand les props changent
    localizationService.configure({
      currentLanguage,
      currentMarket,
      fallbackLanguage: 'fr',
      enableGeoDetection,
      cacheTranslations,
      enableRTL
    });
  }, [defaultLanguage, defaultMarket, enableGeoDetection, cacheTranslations, enableRTL]);

  // Initialisation et Écouteurs
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if(mounted) setIsLoading(true);
        if(mounted) setError(null);

        // Le service s'auto-initialise, on récupère juste l'état initial
        if(mounted) {
            setCurrentLanguage(localizationService.getCurrentLanguage());
            setCurrentMarket(localizationService.getCurrentMarket());
            // Vérification sécurisée pour la direction RTL
            const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === localizationService.getCurrentLanguage());
            setIsRTL(langInfo?.direction === 'rtl');
        }

        // Écouter les changements venant du service (ex: géolocalisation terminée)
        const handleChange = () => {
          if(!mounted) return;
          setCurrentLanguage(localizationService.getCurrentLanguage());
          setCurrentMarket(localizationService.getCurrentMarket());
          const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === localizationService.getCurrentLanguage());
          setIsRTL(langInfo?.direction === 'rtl');
        };

        localizationService.addListener(handleChange);

        return () => {
          localizationService.removeListener(handleChange);
        };
      } catch (err) {
        if(mounted) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
        }
      } finally {
        if(mounted) setIsLoading(false);
      }
    };

    const cleanup = initialize();
    
    return () => { 
        mounted = false;
        // cleanup si nécessaire
    };
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

// Hook pour les messages localisés (Succès, Erreur, etc.)
export function useLocalizedMessage() {
  const { translate } = useTranslate();

  const showMessage = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    key: string,
    params?: Record<string, any>
  ): string => {
    const messageKey = `msg.${type}.${key}`;
    // Fallback intelligent : si la clé n'existe pas, on affiche la clé ou une valeur par défaut
    const translated = translate(messageKey, params);
    return translated === messageKey ? key : translated;
  }, [translate]);

  const success = useCallback((key: string, params?: Record<string, any>) => showMessage('success', key, params), [showMessage]);
  const error = useCallback((key: string, params?: Record<string, any>) => showMessage('error', key, params), [showMessage]);
  const warning = useCallback((key: string, params?: Record<string, any>) => showMessage('warning', key, params), [showMessage]);
  const info = useCallback((key: string, params?: Record<string, any>) => showMessage('info', key, params), [showMessage]);

  return { success, error, warning, info };
}