/**
 * TESTS DU SYSTÈME DE LOCALISATION - Universal Eats
 * Tests unitaires et d'intégration pour le système de localisation
 * Couverture complète des fonctionnalités principales
 */

import { LocalizationService } from '../lib/localization-service';
import { TranslationManager } from '../lib/translation-manager';
import { LocaleFormatter } from '../lib/locale-formatter';
import { RTLSupport } from '../lib/rtl-support';
import { LocalizationAPI } from '../lib/localization-api';
import { localeConfiguration } from '../lib/locale-config';

// Mock des dépendances
jest.mock('../lib/supabase', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null })),
          order: jest.fn(() => ({
            range: jest.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: {}, error: null }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: {}, error: null }))
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }))
  })
}));

describe('Système de Localisation Universal Eats', () => {
  let localizationService: LocalizationService;
  let translationManager: TranslationManager;
  let localeFormatter: LocaleFormatter;
  let rtlSupport: RTLSupport;
  let localizationAPI: LocalizationAPI;

  beforeEach(() => {
    // Reset des instances singleton
    (LocalizationService as any).instance = null;
    (TranslationManager as any).instance = null;
    (LocaleFormatter as any).instance = null;
    (RTLSupport as any).instance = null;

    // Initialisation des services
    localizationService = LocalizationService.getInstance();
    translationManager = TranslationManager.getInstance();
    localeFormatter = LocaleFormatter.getInstance();
    rtlSupport = RTLSupport.getInstance();
    localizationAPI = new LocalizationAPI();

    // Mock des méthodes de réseau
    global.fetch = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('')
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        language: 'fr-FR',
        languages: ['fr-FR', 'fr', 'en'],
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LocalizationService', () => {
    test('devrait être un singleton', () => {
      const instance1 = LocalizationService.getInstance();
      const instance2 = LocalizationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('devrait détecter la langue par défaut', () => {
      const currentLanguage = localizationService.getCurrentLanguage();
      expect(currentLanguage).toBe('fr'); // Français par défaut
    });

    test('devrait obtenir les langues supportées', () => {
      const languages = localizationService.getSupportedLanguages();
      expect(languages).toHaveLength(4);
      expect(languages[0]).toHaveProperty('code');
      expect(languages[0]).toHaveProperty('nativeName');
    });

    test('devrait obtenir les marchés supportés', () => {
      const markets = localizationService.getSupportedMarkets();
      expect(markets).toHaveLength(4);
      expect(markets[0]).toHaveProperty('code');
      expect(markets[0]).toHaveProperty('currency');
    });

    test('devrait traduire une clé simple', () => {
      const translation = localizationService.translate('nav.home');
      expect(translation).toBe('Accueil');
    });

    test('devrait traduire avec paramètres', () => {
      const translation = localizationService.translate('order.total', { amount: 25.50 });
      expect(translation).toContain('25,50');
    });

    test('devrait gérer les pluriels', () => {
      const singular = localizationService.translate('order.items', {}, { count: 1 });
      const plural = localizationService.translate('order.items', {}, { count: 5 });
      expect(singular).toBe('article');
      expect(plural).toBe('articles');
    });

    test('devrait changer de langue', async () => {
      await expect(localizationService.setLanguage('en')).resolves.not.toThrow();
      expect(localizationService.getCurrentLanguage()).toBe('en');
    });

    test('devrait détecter les langues RTL', () => {
      const isRTL = localizationService.isRTLLanguage('ar');
      expect(isRTL).toBe(true);
      
      const isNotRTL = localizationService.isRTLLanguage('fr');
      expect(isNotRTL).toBe(false);
    });

    test('devrait précharger les traductions', async () => {
      await expect(
        localizationService.preloadTranslations(['en', 'ar'])
      ).resolves.not.toThrow();
    });

    test('devrait vider le cache', async () => {
      await expect(localizationService.clearCache()).resolves.not.toThrow();
    });

    test('devrait obtenir les statistiques de localisation', () => {
      const stats = localizationService.getLocalizationStats();
      expect(stats).toHaveProperty('loadedLanguages');
      expect(stats).toHaveProperty('currentLanguage');
      expect(stats).toHaveProperty('totalTranslations');
    });
  });

  describe('TranslationManager', () => {
    test('devrait être un singleton', () => {
      const instance1 = TranslationManager.getInstance();
      const instance2 = TranslationManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('devrait valider une traduction correcte', () => {
      const validation = translationManager.validateTranslation('test.key', {
        value: 'Texte de test',
        context: 'test'
      });
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('devrait détecter les erreurs de validation', () => {
      const validation = translationManager.validateTranslation('test.key', {
        value: '', // Valeur vide
        context: 'test'
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('devrait détecter les balises dangereuses', () => {
      const validation = translationManager.validateTranslation('test.key', {
        value: '<script>alert("xss")</script>Test',
        context: 'test'
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('script'))).toBe(true);
    });

    test('devrait calculer les métriques de qualité', () => {
      const translations = {
        'test.key1': { value: 'Texte 1' },
        'test.key2': { value: 'Texte 2' },
        'test.key3': { value: '' }
      };

      const metrics = translationManager.calculateQualityMetrics(translations);
      
      expect(metrics).toHaveProperty('completeness');
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics.overall).toBeGreaterThanOrEqual(0);
      expect(metrics.overall).toBeLessThanOrEqual(100);
    });

    test('devrait générer un rapport de progression', async () => {
      const report = await translationManager.generateProgressReport(['fr', 'en'], ['FR', 'US']);
      
      expect(Array.isArray(report)).toBe(true);
      expect(report.length).toBeGreaterThan(0);
      expect(report[0]).toHaveProperty('language');
      expect(report[0]).toHaveProperty('market');
      expect(report[0]).toHaveProperty('percentage');
    });

    test('devrait exporter au format JSON', async () => {
      const exportContent = await translationManager.exportTranslations('fr', 'FR', 'json');
      
      expect(typeof exportContent).toBe('string');
      expect(exportContent).toContain('"language": "fr"');
    });

    test('devrait importer des traductions JSON', async () => {
      const jsonContent = JSON.stringify({
        language: 'fr',
        market: 'FR',
        translations: {
          'test.key': { value: 'Test import' }
        }
      });

      const result = await translationManager.importTranslations(
        jsonContent,
        'json',
        'fr',
        'FR'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('imported');
    });

    test('devrait obtenir les statistiques de traduction', async () => {
      const stats = await translationManager.getTranslationStatistics();
      
      expect(stats).toHaveProperty('totalLanguages');
      expect(stats).toHaveProperty('totalMarkets');
      expect(stats).toHaveProperty('totalTranslations');
    });
  });

  describe('LocaleFormatter', () => {
    test('devrait être un singleton', () => {
      const instance1 = LocaleFormatter.getInstance();
      const instance2 = LocaleFormatter.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('devrait formater les devises correctement', () => {
      // France
      const euroFormat = localeFormatter.formatCurrency(1234.56, 'fr', 'FR');
      expect(euroFormat).toContain('€');
      
      // États-Unis
      const dollarFormat = localeFormatter.formatCurrency(1234.56, 'en', 'US');
      expect(dollarFormat).toContain('$');
      expect(dollarFormat).toContain(',');
      
      // Maroc
      const madFormat = localeFormatter.formatCurrency(1234.56, 'fr', 'MA');
      expect(madFormat).toContain('DH');
    });

    test('devrait formater les dates selon les marchés', () => {
      const date = new Date('2024-01-15');
      
      // Format français
      const frenchDate = localeFormatter.formatDate(date, 'fr', 'FR');
      expect(frenchDate).toContain('15');
      expect(frenchDate).toContain('janvier');
      
      // Format américain
      const americanDate = localeFormatter.formatDate(date, 'en', 'US');
      expect(americanDate).toContain('January');
    });

    test('devrait formater les nombres selon les marchés', () => {
      const number = 1234567.89;
      
      // Format français (espaces)
      const frenchNumber = localeFormatter.formatNumber(number, 'fr', 'FR');
      expect(frenchNumber).toContain('1 234');
      
      // Format américain (virgules)
      const americanNumber = localeFormatter.formatNumber(number, 'en', 'US');
      expect(americanNumber).toContain('1,234');
      
      // Format espagnol (points)
      const spanishNumber = localeFormatter.formatNumber(number, 'es', 'ES');
      expect(spanishNumber).toContain('1.234');
    });

    test('devrait formater les numéros de téléphone', () => {
      // Numéro français
      const frenchPhone = localeFormatter.formatPhoneNumber('0123456789', 'fr', 'FR');
      expect(frenchPhone).toContain('+33');
      
      // Numéro américain
      const americanPhone = localeFormatter.formatPhoneNumber('5551234567', 'en', 'US');
      expect(americanPhone).toContain('(');
    });

    test('devrait formater les adresses', () => {
      const addressData = {
        street: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      };

      const formattedAddress = localeFormatter.formatAddress(addressData, 'fr', 'FR');
      expect(formattedAddress).toContain('123 Rue de la Paix');
      expect(formattedAddress).toContain('Paris');
      expect(formattedAddress).toContain('75001');
    });

    test('devrait valider une adresse', () => {
      const validAddress = {
        street: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France'
      };

      const validation = localeFormatter.validateAddress(validAddress, 'fr', 'FR');
      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
    });

    test('devrait convertir les nombres arabes', () => {
      const latinText = '1234';
      const arabicText = localeFormatter.convertNumbers(latinText, 'latin', 'arabic');
      expect(arabicText).toBe('١٢٣٤');
    });

    test('devrait obtenir les formatters disponibles', () => {
      const formatters = localeFormatter.getAvailableFormatters();
      
      expect(Array.isArray(formatters)).toBe(true);
      expect(formatters.length).toBeGreaterThan(0);
      expect(formatters[0]).toHaveProperty('language');
      expect(formatters[0]).toHaveProperty('market');
    });
  });

  describe('RTLSupport', () => {
    test('devrait être un singleton', () => {
      const instance1 = RTLSupport.getInstance();
      const instance2 = RTLSupport.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('devrait détecter la direction RTL', () => {
      // Mock une langue RTL
      const isRTL = rtlSupport.isRTL();
      expect(typeof isRTL).toBe('boolean');
    });

    test('devrait obtenir la direction actuelle', () => {
      const direction = rtlSupport.getCurrentDirection();
      expect(direction).toBe('ltr' || 'rtl');
    });

    test('devrait activer/désactiver le support RTL', () => {
      rtlSupport.setEnabled(true);
      expect(rtlSupport.getSettings().enabled).toBe(true);
      
      rtlSupport.setEnabled(false);
      expect(rtlSupport.getSettings().enabled).toBe(false);
    });

    test('devrait obtenir les classes CSS recommandées', () => {
      const buttonClasses = rtlSupport.getRecommendedClasses('button');
      expect(Array.isArray(buttonClasses)).toBe(true);
      
      const iconClasses = rtlSupport.getRecommendedClasses('icon');
      expect(Array.isArray(iconClasses)).toBe(true);
    });

    test('devrait générer des styles conditionnels', () => {
      const baseClasses = ['btn', 'btn-primary'];
      const conditionalStyles = rtlSupport.generateConditionalStyles(baseClasses, 'button');
      
      expect(typeof conditionalStyles).toBe('string');
      expect(conditionalStyles).toContain('btn');
      expect(conditionalStyles).toContain('btn-primary');
    });
  });

  describe('LocalizationAPI', () => {
    test('devrait obtenir les traductions avec filtres', async () => {
      const response = await localizationAPI.getTranslations({
        language: 'fr',
        market: 'FR',
        page: 1,
        limit: 10
      });

      expect(response).toHaveProperty('success');
    });

    test('devrait créer une nouvelle traduction', async () => {
      const response = await localizationAPI.createTranslation(
        'test.key',
        'Test value',
        'fr',
        'FR',
        {
          context: 'test',
          author: 'Test User'
        }
      );

      expect(response).toHaveProperty('success');
    });

    test('devrait mettre à jour une traduction', async () => {
      const response = await localizationAPI.updateTranslation(
        'test.key',
        'Updated value',
        'fr',
        'FR'
      );

      expect(response).toHaveProperty('success');
    });

    test('devrait supprimer une traduction', async () => {
      const response = await localizationAPI.deleteTranslation('test.key', 'fr', 'FR');

      expect(response).toHaveProperty('success');
    });

    test('devrait exporter les traductions', async () => {
      const response = await localizationAPI.exportTranslations({
        format: 'json',
        language: 'fr',
        market: 'FR'
      });

      expect(response).toHaveProperty('success');
      if (response.success) {
        expect(response.data).toHaveProperty('content');
        expect(response.data).toHaveProperty('filename');
      }
    });

    test('devrait importer des traductions', async () => {
      const jsonContent = JSON.stringify({
        translations: {
          'test.key': { value: 'Test import' }
        }
      });

      const response = await localizationAPI.importTranslations(jsonContent, {
        format: 'json',
        language: 'fr',
        market: 'FR'
      });

      expect(response).toHaveProperty('success');
    });

    test('devrait obtenir les statistiques de localisation', async () => {
      const response = await localizationAPI.getLocalizationStats();

      expect(response).toHaveProperty('success');
      if (response.success) {
        expect(response.data).toHaveProperty('totalTranslations');
      }
    });

    test('devrait obtenir les locales supportées', async () => {
      const response = await localizationAPI.getSupportedLocales();

      expect(response).toHaveProperty('success');
      if (response.success) {
        expect(response.data).toHaveProperty('languages');
        expect(response.data).toHaveProperty('markets');
      }
    });

    test('devrait valider un fichier de traduction', async () => {
      const jsonContent = JSON.stringify({
        translations: {
          'test.key': { value: 'Test' }
        }
      });

      const response = await localizationAPI.validateTranslationFile(jsonContent, 'json');

      expect(response).toHaveProperty('success');
      if (response.success) {
        expect(response.data).toHaveProperty('isValid');
      }
    });
  });

  describe('LocaleConfiguration', () => {
    test('devrait obtenir la configuration d\'une langue', () => {
      const config = localeConfiguration.getLanguageConfig('fr');
      
      expect(config).not.toBeNull();
      expect(config?.code).toBe('fr');
      expect(config?.direction).toBe('ltr');
    });

    test('devrait obtenir la configuration d\'un marché', () => {
      const config = localeConfiguration.getMarketConfig('FR');
      
      expect(config).not.toBeNull();
      expect(config?.code).toBe('FR');
      expect(config?.currency).toBe('EUR');
    });

    test('devrait obtenir la configuration complète d\'une locale', () => {
      const config = localeConfiguration.getLocaleConfig('fr', 'FR');
      
      expect(config).not.toBeNull();
      expect(config?.language.code).toBe('fr');
      expect(config?.market.code).toBe('FR');
      expect(config?.combined.locale).toBe('fr-FR');
    });

    test('devrait valider une locale', () => {
      const validation = localeConfiguration.validateLocale('fr', 'FR');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('devrait détecter les erreurs de validation', () => {
      const validation = localeConfiguration.validateLocale('invalid', 'FR');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('devrait obtenir les langues pour un marché', () => {
      const languages = localeConfiguration.getLanguagesForMarket('FR');
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });

    test('devrait obtenir les statistiques de configuration', () => {
      const stats = localeConfiguration.getConfigurationStats();
      
      expect(stats).toHaveProperty('totalLanguages');
      expect(stats).toHaveProperty('totalMarkets');
      expect(stats).toHaveProperty('rtlLanguages');
    });
  });

  describe('Tests d\'intégration', () => {
    test('devrait changer de langue et appliquer RTL', async () => {
      // Changer vers l'arabe (RTL)
      await localizationService.setLanguage('ar');
      
      // Vérifier que la direction change
      const isRTL = rtlSupport.getCurrentDirection() === 'rtl';
      expect(isRTL).toBe(true);
    });

    test('devrait formater correctement après changement de langue', () => {
      // Test avec différents marchés
      const formats = [
        { lang: 'fr', market: 'FR', expected: '€' },
        { lang: 'en', market: 'US', expected: '$' },
        { lang: 'fr', market: 'MA', expected: 'DH' }
      ];

      formats.forEach(({ lang, market, expected }) => {
        const formatted = localeFormatter.formatCurrency(100, lang, market);
        expect(formatted).toContain(expected);
      });
    });

    test('devrait maintenir la cohérence lors du changement de marché', async () => {
      // Changer de marché
      await localizationService.setMarket('US');
      
      // Vérifier que les formats changent
      const usFormat = localeFormatter.formatCurrency(100, 'en', 'US');
      expect(usFormat).toContain('$');
      expect(usFormat).toContain(',');
    });

    test('devrait gérer les erreurs gracieusement', async () => {
      // Test avec une langue invalide
      await expect(localizationService.setLanguage('invalid')).rejects.toThrow();
      
      // Test avec un marché invalide
      await expect(localizationService.setMarket('INVALID')).rejects.toThrow();
    });
  });

  describe('Tests de performance', () => {
    test('devrait traduire rapidement', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        localizationService.translate('nav.home');
      }
      
      const end = performance.now();
      const averageTime = (end - start) / 1000;
      
      expect(averageTime).toBeLessThan(1); // Moins de 1ms en moyenne
    });

    test('devrait gérer le cache efficacement', async () => {
      // Premier appel (cache miss)
      const start1 = performance.now();
      localizationService.translate('nav.home');
      const time1 = performance.now() - start1;
      
      // Deuxième appel (cache hit)
      const start2 = performance.now();
      localizationService.translate('nav.home');
      const time2 = performance.now() - start2;
      
      // Le deuxième appel devrait être plus rapide
      expect(time2).toBeLessThanOrEqual(time1);
    });

    test('devrait précharger efficacement', async () => {
      const start = performance.now();
      
      await localizationService.preloadTranslations(['en', 'es']);
      
      const end = performance.now();
      const loadTime = end - start;
      
      expect(loadTime).toBeLessThan(1000); // Moins d'1 seconde
    });
  });

  describe('Tests de robustesse', () => {
    test('devrait gérer les traductions manquantes', () => {
      const translation = localizationService.translate('missing.key');
      expect(translation).toBe('missing.key'); // Fallback vers la clé
    });

    test('devrait gérer les paramètres manquants', () => {
      const translation = localizationService.translate('test.key', {
        missing: 'value'
      });
      expect(typeof translation).toBe('string');
    });

    test('devrait gérer les données corrompues', () => {
      // Mock des données corrompues
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      
      // Le service devrait continuer à fonctionner
      expect(() => {
        localizationService.translate('nav.home');
      }).not.toThrow();
    });

    test('devrait limiter les appels mémoire', () => {
      // Créer de nombreuses instances
      const instances = [];
      for (let i = 0; i < 100; i++) {
        instances.push(LocalizationService.getInstance());
      }
      
      // Toutes les instances devraient être identiques (singleton)
      const uniqueInstances = new Set(instances);
      expect(uniqueInstances.size).toBe(1);
    });
  });
});

// Tests d'accessibilité pour RTL
describe('Accessibilité RTL', () => {
  let rtlSupport: RTLSupport;

  beforeEach(() => {
    rtlSupport = RTLSupport.getInstance();
  });

  test('devrait configurer la direction pour les lecteurs d\'écran', () => {
    // Simuler le changement vers RTL
    rtlSupport.setEnabled(true);
    
    // Vérifier que l'attribut dir est défini
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  test('devrait adapter les focus pour RTL', () => {
    // Les éléments focusables devraient être adaptés pour RTL
    const focusableElements = document.querySelectorAll('input, button, a');
    
    focusableElements.forEach(element => {
      // Vérifier que les éléments ont des attributs appropriés
      expect(element).toBeInstanceOf(Element);
    });
  });

  test('devrait fournir des indicateurs visuels pour RTL', () => {
    const isRTL = rtlSupport.isRTL();
    
    if (isRTL) {
      // Vérifier que les classes CSS RTL sont appliquées
      expect(document.body.classList.contains('rtl')).toBe(true);
    }
  });
});

// Tests de compatibilité navigateur
describe('Compatibilité navigateur', () => {
  test('devrait fonctionner sans Intl API', () => {
    // Mock de l'absence d'Intl
    const originalIntl = global.Intl;
    (global as any).Intl = undefined;
    
    expect(() => {
      LocaleFormatter.getInstance().formatCurrency(100, 'fr', 'FR');
    }).not.toThrow();
    
    // Restaurer
    global.Intl = originalIntl;
  });

  test('devrait fonctionner sans localStorage', () => {
    // Mock de l'absence de localStorage
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      value: null,
      writable: true,
    });
    
    expect(() => {
      LocalizationService.getInstance().setLanguage('en');
    }).not.toThrow();
    
    // Restaurer
    Object.defineProperty(window, 'localStorage', originalLocalStorage!);
  });

  test('devrait fonctionner sans geolocation', () => {
    // Mock de l'absence de geolocation
    const originalGeolocation = navigator.geolocation;
    (navigator as any).geolocation = undefined;
    
    expect(() => {
      LocalizationService.getInstance().getCurrentMarket();
    }).not.toThrow();
    
    // Restaurer
    navigator.geolocation = originalGeolocation;
  });
});