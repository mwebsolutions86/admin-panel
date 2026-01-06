/**
 * SÉLECTEUR DE LANGUE LOCALISÉ - Universal Eats
 * Composant pour sélectionner la langue avec support RTL
 * et affichage des drapeaux
 */

import React, { useState } from 'react';
import { 
  useLocalization, 
  useSetLanguage, 
  useLocaleInfo 
} from '../../hooks/use-localization';
import { LocalizedText } from './LocalizedText';

interface LanguageSelectorProps {
  /**
   * Variante d'affichage
   */
  variant?: 'dropdown' | 'inline' | 'tabs' | 'flags';
  
  /**
   * Position du dropdown (pour la variante dropdown)
   */
  position?: 'top' | 'bottom' | 'bottom-right' | 'bottom-left';
  
  /**
   * Taille du composant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Classes CSS personnalisées
   */
  className?: string;
  
  /**
   * Inclure le marché dans la sélection
   */
  includeMarket?: boolean;
  
  /**
   * Langues à afficher (vide = toutes les langues supportées)
   */
  languages?: string[];
  
  /**
   * Callback lors du changement de langue
   */
  onLanguageChange?: (language: string) => void;
  
  /**
   * Désactiver les animations
   */
  disableAnimations?: boolean;
}

/**
 * Sélecteur de langue principal
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'dropdown',
  position = 'bottom-right',
  size = 'md',
  className,
  includeMarket = false,
  languages = [],
  onLanguageChange,
  disableAnimations = false
}) => {
  const { supportedLanguages, currentLanguage, currentMarket } = useLocalization();
  const { setLanguage } = useSetLanguage();
  const { getLanguageByCode, getCurrentMarketInfo } = useLocaleInfo();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const availableLanguages = languages.length > 0 
    ? supportedLanguages.filter(lang => languages.includes(lang.code))
    : supportedLanguages;
  
  const currentLangInfo = getLanguageByCode(currentLanguage);
  const currentMarketInfo = getCurrentMarketInfo();
  
  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;
    
    try {
      setIsLoading(true);
      await setLanguage(languageCode);
      onLanguageChange?.(languageCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur lors du changement de langue:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  const dropdownPositions = {
    'top': 'bottom-full left-0 mb-2',
    'bottom': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
    'bottom-left': 'top-full left-0 mt-2'
  };
  
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className || ''}`}>
        {availableLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            disabled={isLoading}
            className={`
              ${sizeClasses[size]}
              ${lang.code === currentLanguage 
                ? 'font-semibold text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              transition-colors duration-200
              ${disableAnimations ? '' : 'hover:scale-105'}
            `}
          >
            <span className="mr-1">{lang.flag}</span>
            <LocalizedText 
              translationKey={`lang.${lang.code}`}
              options={{ fallback: lang.nativeName }}
            />
          </button>
        ))}
      </div>
    );
  }
  
  if (variant === 'tabs') {
    return (
      <div className={`inline-flex rounded-lg border border-gray-200 p-1 ${className || ''}`}>
        {availableLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            disabled={isLoading}
            className={`
              ${sizeClasses[size]}
              px-3 py-1.5 rounded-md transition-all duration-200
              ${lang.code === currentLanguage 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${disableAnimations ? '' : 'hover:scale-105'}
            `}
          >
            <span className="mr-1">{lang.flag}</span>
            <LocalizedText 
              translationKey={`lang.${lang.code}`}
              options={{ fallback: lang.nativeName }}
            />
          </button>
        ))}
      </div>
    );
  }
  
  if (variant === 'flags') {
    return (
      <div className={`inline-flex space-x-1 ${className || ''}`}>
        {availableLanguages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            disabled={isLoading}
            title={lang.nativeName}
            className={`
              p-2 rounded-md transition-all duration-200
              ${lang.code === currentLanguage 
                ? 'bg-blue-100 ring-2 ring-blue-200' 
                : 'hover:bg-gray-100'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${disableAnimations ? '' : 'hover:scale-110'}
            `}
          >
            <span className="text-2xl">{lang.flag}</span>
          </button>
        ))}
      </div>
    );
  }
  
  // Variante dropdown par défaut
  return (
    <div className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          ${sizeClasses[size]}
          flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md
          bg-white text-gray-700 hover:bg-gray-50 transition-colors duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${disableAnimations ? '' : 'hover:scale-105'}
        `}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span className="text-lg">{currentLangInfo?.flag}</span>
        )}
        
        <span className="font-medium">
          <LocalizedText 
            translationKey={`lang.${currentLanguage}`}
            options={{ fallback: currentLangInfo?.nativeName }}
          />
        </span>
        
        {includeMarket && currentMarketInfo && (
          <span className="text-sm text-gray-500">
            ({currentMarketInfo.code})
          </span>
        )}
        
        <svg 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200
            ${dropdownPositions[position]}
            ${disableAnimations ? '' : 'animate-fade-in'}
          `}
        >
          <div className="py-1">
            {availableLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                disabled={isLoading}
                className={`
                  w-full text-left px-4 py-2 text-sm hover:bg-gray-100
                  ${lang.code === currentLanguage ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  transition-colors duration-150
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{lang.flag}</span>
                  <div>
                    <div className="font-medium">
                      <LocalizedText 
                        translationKey={`lang.${lang.code}`}
                        options={{ fallback: lang.nativeName }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {lang.nativeName}
                    </div>
                  </div>
                  {lang.isDefault && (
                    <span className="text-xs text-blue-600 font-medium">
                      <LocalizedText translationKey="ui.default" />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {includeMarket && (
            <>
              <div className="border-t border-gray-100"></div>
              <div className="px-4 py-2 text-xs text-gray-500">
                <LocalizedText translationKey="ui.currentMarket" />: {currentMarketInfo?.name}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Overlay pour fermer le dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Sélecteur de marché
 */
interface MarketSelectorProps {
  variant?: 'dropdown' | 'inline';
  position?: 'top' | 'bottom' | 'bottom-right' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  markets?: string[];
  onMarketChange?: (market: string) => void;
  disableAnimations?: boolean;
}

export const MarketSelector: React.FC<MarketSelectorProps> = ({
  variant = 'dropdown',
  position = 'bottom-right',
  size = 'md',
  className,
  markets = [],
  onMarketChange,
  disableAnimations = false
}) => {
  const { supportedMarkets, currentMarket } = useLocalization();
  const { setMarket } = useLocalization();
  const { getMarketByCode } = useLocaleInfo();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const availableMarkets = markets.length > 0 
    ? supportedMarkets.filter(market => markets.includes(market.code))
    : supportedMarkets;
  
  const currentMarketInfo = getMarketByCode(currentMarket);
  
  const handleMarketSelect = async (marketCode: string) => {
    if (marketCode === currentMarket) return;
    
    try {
      setIsLoading(true);
      await setMarket(marketCode);
      onMarketChange?.(marketCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Erreur lors du changement de marché:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  const dropdownPositions = {
    'top': 'bottom-full left-0 mb-2',
    'bottom': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
    'bottom-left': 'top-full left-0 mt-2'
  };
  
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className || ''}`}>
        {availableMarkets.map(market => (
          <button
            key={market.code}
            onClick={() => handleMarketSelect(market.code)}
            disabled={isLoading}
            className={`
              ${sizeClasses[size]}
              ${market.code === currentMarket 
                ? 'font-semibold text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              transition-colors duration-200
              ${disableAnimations ? '' : 'hover:scale-105'}
            `}
          >
            {market.code}
          </button>
        ))}
      </div>
    );
  }
  
  // Variante dropdown
  return (
    <div className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          ${sizeClasses[size]}
          flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md
          bg-white text-gray-700 hover:bg-gray-50 transition-colors duration-200
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${disableAnimations ? '' : 'hover:scale-105'}
        `}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span className="font-medium">{currentMarketInfo?.code}</span>
        )}
        
        <span className="text-sm text-gray-500">
          {currentMarketInfo?.name}
        </span>
        
        <svg 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200
            ${dropdownPositions[position]}
            ${disableAnimations ? '' : 'animate-fade-in'}
          `}
        >
          <div className="py-1">
            {availableMarkets.map(market => (
              <button
                key={market.code}
                onClick={() => handleMarketSelect(market.code)}
                disabled={isLoading}
                className={`
                  w-full text-left px-4 py-2 text-sm hover:bg-gray-100
                  ${market.code === currentMarket ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  transition-colors duration-150
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{market.code}</div>
                    <div className="text-xs text-gray-500">{market.name}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {market.currency}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Composant combiné pour langue et marché
 */
interface LocaleSelectorProps {
  layout?: 'horizontal' | 'vertical';
  showFlags?: boolean;
  showMarkets?: boolean;
  className?: string;
  onLocaleChange?: (language: string, market: string) => void;
}

export const LocaleSelector: React.FC<LocaleSelectorProps> = ({
  layout = 'horizontal',
  showFlags = true,
  showMarkets = true,
  className,
  onLocaleChange
}) => {
  const handleLanguageChange = (language: string) => {
    onLocaleChange?.(language, '');
  };
  
  const handleMarketChange = (market: string) => {
    onLocaleChange?.('', market);
  };
  
  return (
    <div className={`
      ${layout === 'horizontal' ? 'flex items-center space-x-4' : 'flex flex-col space-y-2'}
      ${className || ''}
    `}>
      <div>
        <LocalizedText 
          translationKey="ui.language"
          className="text-sm font-medium text-gray-700 mb-1"
        />
        <LanguageSelector
          variant={showFlags ? 'flags' : 'inline'}
          onLanguageChange={handleLanguageChange}
        />
      </div>
      
      {showMarkets && (
        <div>
          <LocalizedText 
            translationKey="ui.market"
            className="text-sm font-medium text-gray-700 mb-1"
          />
          <MarketSelector
            variant="inline"
            onMarketChange={handleMarketChange}
          />
        </div>
      )}
    </div>
  );
};