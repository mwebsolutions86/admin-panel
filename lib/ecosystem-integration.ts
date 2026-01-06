/**
 * INTÉGRATION ÉCOSYSTÈME UNIVERSAL EATS - Localisation
 * Guide d'intégration pour toutes les applications de l'écosystème
 * Customer App, Delivery App, Web Ordering, POS System
 */

import { localizationService } from './localization-service';
import { RTLSupport } from './rtl-support';
import { localeConfiguration } from './locale-config';

// Configuration d'intégration par application
export interface AppIntegrationConfig {
  appName: string;
  appType: 'customer' | 'delivery' | 'web' | 'pos';
  defaultLanguage: string;
  defaultMarket: string;
  supportedLanguages: string[];
  supportedMarkets: string[];
  features: {
    rtlSupport: boolean;
    geoDetection: boolean;
    offlineMode: boolean;
    pushNotifications: boolean;
  };
  uiConfig: {
    theme: string;
    layout: 'mobile' | 'desktop' | 'tablet';
    components: string[];
  };
}

// Configuration des applications de l'écosystème
export const APP_INTEGRATIONS: Record<string, AppIntegrationConfig> = {
  'customer-app': {
    appName: 'Universal Eats Customer',
    appType: 'customer',
    defaultLanguage: 'fr',
    defaultMarket: 'FR',
    supportedLanguages: ['fr', 'ar', 'en', 'es'],
    supportedMarkets: ['FR', 'MA', 'US', 'ES'],
    features: {
      rtlSupport: true,
      geoDetection: true,
      offlineMode: true,
      pushNotifications: true
    },
    uiConfig: {
      theme: 'modern',
      layout: 'mobile',
      components: ['navigation', 'product-list', 'cart', 'checkout', 'profile']
    }
  },

  'delivery-app': {
    appName: 'Universal Eats Delivery',
    appType: 'delivery',
    defaultLanguage: 'fr',
    defaultMarket: 'FR',
    supportedLanguages: ['fr', 'ar', 'en'],
    supportedMarkets: ['FR', 'MA', 'US'],
    features: {
      rtlSupport: true,
      geoDetection: true,
      offlineMode: false,
      pushNotifications: true
    },
    uiConfig: {
      theme: 'modern',
      layout: 'mobile',
      components: ['navigation', 'orders', 'map', 'profile', 'earnings']
    }
  },

  'web-ordering': {
    appName: 'Universal Eats Web',
    appType: 'web',
    defaultLanguage: 'fr',
    defaultMarket: 'FR',
    supportedLanguages: ['fr', 'ar', 'en', 'es'],
    supportedMarkets: ['FR', 'MA', 'US', 'ES'],
    features: {
      rtlSupport: true,
      geoDetection: true,
      offlineMode: false,
      pushNotifications: false
    },
    uiConfig: {
      theme: 'modern',
      layout: 'desktop',
      components: ['navigation', 'product-grid', 'cart', 'checkout', 'account']
    }
  },

  'universal-eats-pos': {
    appName: 'Universal Eats POS',
    appType: 'pos',
    defaultLanguage: 'fr',
    defaultMarket: 'FR',
    supportedLanguages: ['fr', 'en'],
    supportedMarkets: ['FR', 'MA', 'US'],
    features: {
      rtlSupport: false,
      geoDetection: false,
      offlineMode: true,
      pushNotifications: false
    },
    uiConfig: {
      theme: 'professional',
      layout: 'tablet',
      components: ['pos-interface', 'product-management', 'order-history', 'reports']
    }
  }
};

/**
 * Classe d'intégration pour l'écosystème Universal Eats
 */
export class EcosystemIntegration {
  private static instance: EcosystemIntegration;
  private currentApp: string = '';
  private appConfigs: Map<string, AppIntegrationConfig> = new Map();

  private constructor() {
    this.initializeIntegrations();
  }

  public static getInstance(): EcosystemIntegration {
    if (!EcosystemIntegration.instance) {
      EcosystemIntegration.instance = new EcosystemIntegration();
    }
    return EcosystemIntegration.instance;
  }

  /**
   * Initialise les configurations d'intégration
   */
  private initializeIntegrations(): void {
    Object.entries(APP_INTEGRATIONS).forEach(([appName, config]) => {
      this.appConfigs.set(appName, config);
    });
  }

  /**
   * Configure l'intégration pour une application spécifique
   */
  public configureForApp(appName: string, options?: {
    overrideLanguage?: string;
    overrideMarket?: string;
    features?: Partial<AppIntegrationConfig['features']>;
  }): void {
    const config = this.appConfigs.get(appName);
    if (!config) {
      throw new Error(`Configuration non trouvée pour l'application: ${appName}`);
    }

    this.currentApp = appName;

    // Configuration de base
    const finalConfig = {
      ...config,
      defaultLanguage: options?.overrideLanguage || config.defaultLanguage,
      defaultMarket: options?.overrideMarket || config.defaultMarket,
      features: {
        ...config.features,
        ...options?.features
      }
    };

    // Initialiser le service de localisation
    this.initializeLocalizationService(finalConfig);

    // Configurer les fonctionnalités spécifiques
    this.configureFeatures(finalConfig);

    // Adapter l'interface utilisateur
    this.configureUI(finalConfig);

    console.log(`🌍 Localisation configurée pour ${appName}:`, {
      language: finalConfig.defaultLanguage,
      market: finalConfig.defaultMarket,
      features: finalConfig.features
    });
  }

  /**
   * Initialise le service de localisation pour l'application
   */
  private initializeLocalizationService(config: AppIntegrationConfig): void {
    // Configuration du service selon l'application
    localizationService.config = {
      currentLanguage: config.defaultLanguage,
      currentMarket: config.defaultMarket,
      fallbackLanguage: 'fr',
      enableGeoDetection: config.features.geoDetection,
      cacheTranslations: true,
      enableRTL: config.features.rtlSupport
    };

    // Charger les traductions de base
    this.loadBaseTranslations(config);
  }

  /**
   * Charge les traductions de base selon l'application
   */
  private async loadBaseTranslations(config: AppIntegrationConfig): Promise<void> {
    try {
      // Traductions spécifiques par type d'application
      const appSpecificKeys = this.getAppSpecificTranslationKeys(config.appType);
      
      // Précharger les traductions pour les langues supportées
      await localizationService.preloadTranslations(config.supportedLanguages);
      
      console.log(`📝 Traductions chargées pour ${config.appName}`);
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
    }
  }

  /**
   * Obtient les clés de traduction spécifiques à une application
   */
  private getAppSpecificTranslationKeys(appType: string): string[] {
    const baseKeys = [
      'nav.home', 'nav.menu', 'nav.cart', 'nav.orders', 'nav.profile',
      'ui.loading', 'ui.error', 'ui.success', 'ui.cancel', 'ui.confirm',
      'product.addToCart', 'product.outOfStock', 'product.price',
      'order.status.pending', 'order.status.confirmed', 'order.status.delivered',
      'cart.empty', 'cart.total', 'cart.checkout', 'payment.methods'
    ];

    const appSpecificKeys: Record<string, string[]> = {
      'customer': [
        'customer.welcome', 'customer.orderHistory', 'customer.rewards',
        'customer.addresses', 'customer.paymentMethods', 'customer.settings',
        'loyalty.points', 'loyalty.rewards', 'promotions.active'
      ],
      'delivery': [
        'delivery.availableOrders', 'delivery.inProgress', 'delivery.completed',
        'delivery.earnings', 'delivery.rating', 'delivery.navigation',
        'delivery.callCustomer', 'delivery.deliveryAddress', 'delivery.estimatedTime'
      ],
      'web': [
        'web.categories', 'web.search', 'web.filters', 'web.sortBy',
        'web.pagination', 'web.breadcrumb', 'web.sitemap'
      ],
      'pos': [
        'pos.products', 'pos.categories', 'pos.inventory', 'pos.reports',
        'pos.cashRegister', 'pos.customers', 'pos.settings', 'pos.backup'
      ]
    };

    return [...baseKeys, ...(appSpecificKeys[appType] || [])];
  }

  /**
   * Configure les fonctionnalités spécifiques à l'application
   */
  private configureFeatures(config: AppIntegrationConfig): void {
    // Configuration RTL
    if (config.features.rtlSupport) {
      rtlSupport.setEnabled(true);
      rtlSupport.updateSettings({
        mirrorIcons: true,
        swapMargins: true,
        adaptPadding: true
      });
    }

    // Configuration offline si supportée
    if (config.features.offlineMode) {
      this.setupOfflineMode(config);
    }

    // Configuration des notifications push
    if (config.features.pushNotifications) {
      this.setupPushNotifications(config);
    }
  }

  /**
   * Configure le mode hors ligne
   */
  private setupOfflineMode(config: AppIntegrationConfig): void {
    // Stratégie de cache pour mode hors ligne
    const offlineStrategy = {
      translations: 'cache-first',
      products: 'network-first',
      orders: 'network-only'
    };

    // Configuration du cache
    localizationService.config.cacheTranslations = true;

    console.log(`📱 Mode hors ligne configuré pour ${config.appName}`);
  }

  /**
   * Configure les notifications push localisées
   */
  private setupPushNotifications(config: AppIntegrationConfig): void {
    // Templates de notifications par langue
    const notificationTemplates = {
      'fr': {
        'order.confirmed': 'Votre commande #{orderId} a été confirmée',
        'order.ready': 'Votre commande #{orderId} est prête',
        'delivery.arriving': 'Votre livreur arrive dans {estimatedTime} minutes'
      },
      'ar': {
        'order.confirmed': 'تم تأكيد طلبك #{orderId}',
        'order.ready': 'طلبك #{orderId} جاهز',
        'delivery.arriving': 'سيصل مندوب التوصيل خلال {estimatedTime} دقيقة'
      },
      'en': {
        'order.confirmed': 'Your order #{orderId} has been confirmed',
        'order.ready': 'Your order #{orderId} is ready',
        'delivery.arriving': 'Your delivery person is arriving in {estimatedTime} minutes'
      }
    };

    console.log(`🔔 Notifications push configurées pour ${config.appName}`);
  }

  /**
   * Configure l'interface utilisateur selon l'application
   */
  private configureUI(config: AppIntegrationConfig): void {
    // Classes CSS selon le layout
    const layoutClasses = {
      'mobile': 'mobile-layout',
      'desktop': 'desktop-layout',
      'tablet': 'tablet-layout'
    };

    // Configuration RTL pour l'UI
    if (config.features.rtlSupport && localizationService.isRTLLanguage(localizationService.getCurrentLanguage())) {
      document.body.classList.add('rtl-layout');
      document.body.classList.remove('ltr-layout');
    } else {
      document.body.classList.add('ltr-layout');
      document.body.classList.remove('rtl-layout');
    }

    // Classes d'application
    document.body.classList.add(`app-${config.appType}`);
    document.body.classList.add(`layout-${config.uiConfig.layout}`);
    document.body.class.add(`theme-${config.uiConfig.theme}`);

    console.log(`🎨 Interface configurée pour ${config.appName}:`, config.uiConfig);
  }

  /**
   * Détecte automatiquement l'application en cours
   */
  public detectCurrentApp(): string {
    // Détection basée sur l'URL ou le contexte
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;

      if (pathname.includes('/customer') || hostname.includes('customer')) {
        return 'customer-app';
      }
      if (pathname.includes('/delivery') || hostname.includes('delivery')) {
        return 'delivery-app';
      }
      if (pathname.includes('/pos') || hostname.includes('pos')) {
        return 'universal-eats-pos';
      }
      if (pathname.includes('/order') || hostname.includes('order')) {
        return 'web-ordering';
      }
    }

    // Détection par environnement React Native
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return 'customer-app'; // Par défaut pour React Native
    }

    return 'web-ordering'; // Par défaut
  }

  /**
   * Configure automatiquement selon l'application détectée
   */
  public autoConfigure(): void {
    const detectedApp = this.detectCurrentApp();
    this.configureForApp(detectedApp);
  }

  /**
   * Obtient la configuration de l'application actuelle
   */
  public getCurrentConfig(): AppIntegrationConfig | null {
    return this.appConfigs.get(this.currentApp) || null;
  }

  /**
   * Obtient la liste des applications supportées
   */
  public getSupportedApps(): string[] {
    return Array.from(this.appConfigs.keys());
  }

  /**
   * Obtient les statistiques d'intégration
   */
  public getIntegrationStats(): {
    configuredApps: number;
    supportedLanguages: number;
    supportedMarkets: number;
    rtlSupport: number;
    geoDetection: number;
    offlineSupport: number;
  } {
    const configs = Array.from(this.appConfigs.values());
    
    return {
      configuredApps: configs.length,
      supportedLanguages: new Set(configs.flatMap(c => c.supportedLanguages)).size,
      supportedMarkets: new Set(configs.flatMap(c => c.supportedMarkets)).size,
      rtlSupport: configs.filter(c => c.features.rtlSupport).length,
      geoDetection: configs.filter(c => c.features.geoDetection).length,
      offlineSupport: configs.filter(c => c.features.offlineMode).length
    };
  }

  /**
   * Vérifie la compatibilité d'une fonctionnalité
   */
  public isFeatureSupported(feature: keyof AppIntegrationConfig['features']): boolean {
    const config = this.getCurrentConfig();
    return config?.features[feature] || false;
  }

  /**
   * Obtient les langues supportées par l'application actuelle
   */
  public getCurrentSupportedLanguages(): string[] {
    const config = this.getCurrentConfig();
    return config?.supportedLanguages || [];
  }

  /**
   * Obtient les marchés supportés par l'application actuelle
   */
  public getCurrentSupportedMarkets(): string[] {
    const config = this.getCurrentConfig();
    return config?.supportedMarkets || [];
  }

  /**
   * Adapte une clé de traduction pour l'application
   */
  public adaptTranslationKey(baseKey: string): string {
    const config = this.getCurrentConfig();
    if (!config) return baseKey;

    // Ajouter un préfixe spécifique à l'application
    const appPrefix = config.appType;
    return `${appPrefix}.${baseKey}`;
  }

  /**
   * Valide la configuration pour une application
   */
  public validateConfig(appName: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const config = this.appConfigs.get(appName);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push(`Configuration manquante pour l'application: ${appName}`);
      return { isValid: false, errors, warnings };
    }

    // Validation de la langue par défaut
    if (!config.supportedLanguages.includes(config.defaultLanguage)) {
      warnings.push(`Langue par défaut ${config.defaultLanguage} non dans les langues supportées`);
    }

    // Validation du marché par défaut
    if (!config.supportedMarkets.includes(config.defaultMarket)) {
      warnings.push(`Marché par défaut ${config.defaultMarket} non dans les marchés supportés`);
    }

    // Validation RTL avec layout
    if (config.features.rtlSupport && config.uiConfig.layout === 'tablet') {
      warnings.push('Support RTL limité sur tablette');
    }

    // Validation offline avec appType
    if (config.features.offlineMode && !['customer', 'pos'].includes(config.appType)) {
      warnings.push('Mode hors ligne non recommandé pour cette application');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Migre la configuration d'une application vers une nouvelle version
   */
  public migrateConfig(appName: string, fromVersion: string, toVersion: string): void {
    const config = this.appConfigs.get(appName);
    if (!config) {
      throw new Error(`Configuration non trouvée pour ${appName}`);
    }

    // Logique de migration selon les versions
    console.log(`🔄 Migration de ${appName} de ${fromVersion} vers ${toVersion}`);
    
    // Exemple de migration: ajout de nouvelles langues
    if (toVersion === '2.0.0') {
      if (!config.supportedLanguages.includes('es')) {
        config.supportedLanguages.push('es');
        config.supportedMarkets.push('ES');
      }
    }

    console.log(`✅ Migration terminée pour ${appName}`);
  }

  /**
   * Exporte la configuration pour debug
   */
  public exportConfig(): string {
    const configs = Object.fromEntries(this.appConfigs);
    const stats = this.getIntegrationStats();
    
    return JSON.stringify({
      configs,
      stats,
      currentApp: this.currentApp,
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}

/**
 * Hook React pour l'intégration écosystème
 */
export function useEcosystemIntegration() {
  const integration = EcosystemIntegration.getInstance();

  return {
    currentConfig: integration.getCurrentConfig(),
    supportedApps: integration.getSupportedApps(),
    stats: integration.getIntegrationStats(),
    isFeatureSupported: integration.isFeatureSupported.bind(integration),
    adaptTranslationKey: integration.adaptTranslationKey.bind(integration),
    validateConfig: integration.validateConfig.bind(integration)
  };
}

// Export de l'instance singleton
export const ecosystemIntegration = EcosystemIntegration.getInstance();