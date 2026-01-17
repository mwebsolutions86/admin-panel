/**
 * SERVICE DE LOCALISATION PRINCIPAL - Universal Eats
 * Système de gestion multi-langues et localisation
 * Support RTL, formats locaux, géolocalisation
 */

import { supabase } from './supabase';

// Types pour la localisation
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  isDefault: boolean; // Ajouté pour éviter l'erreur TS
  marketCode?: string;
}

export interface Market {
  code: string;
  name: string;
  languages: string[];
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  phoneFormat: string;
  addressFormat: string;
}

export interface LocalizationConfig {
  currentLanguage: string;
  currentMarket: string;
  fallbackLanguage: string;
  enableGeoDetection: boolean;
  cacheTranslations: boolean;
  enableRTL: boolean;
}

export interface TranslationValue {
  value: string;
  context?: string;
  gender?: 'masculine' | 'feminine';
  plural?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  variables?: Record<string, any>;
}

export interface TranslationBundle {
  language: string;
  market: string;
  version: string;
  translations: Record<string, TranslationValue>;
  lastUpdated: Date;
}

// Configuration des langues supportées
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
    isDefault: true,
    marketCode: 'FR'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    flag: '🇲🇦',
    isDefault: false,
    marketCode: 'MA'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
    isDefault: false,
    marketCode: 'US'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
    isDefault: false,
    marketCode: 'ES'
  }
];

// Configuration des marchés
export const SUPPORTED_MARKETS: Market[] = [
  {
    code: 'FR',
    name: 'France',
    languages: ['fr'],
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '1 234,56',
    phoneFormat: '+33 1 23 45 67 89',
    addressFormat: 'street,city,postalCode,country'
  },
  {
    code: 'MA',
    name: 'Maroc',
    languages: ['fr', 'ar'],
    currency: 'MAD',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '12 345,67',
    phoneFormat: '+212 5 12 34 56 78',
    addressFormat: 'street,city,postalCode,country'
  },
  {
    code: 'US',
    name: 'United States',
    languages: ['en'],
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: '1,234.56',
    phoneFormat: '(555) 123-4567',
    addressFormat: 'street,city,state,zipCode,country'
  },
  {
    code: 'ES',
    name: 'España',
    languages: ['es'],
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: '1.234,56',
    phoneFormat: '+34 91 123 45 67',
    addressFormat: 'street,city,postalCode,country'
  }
];

export class LocalizationService {
  private static instance: LocalizationService;
  private supabase = supabase;
  // Cache interne simple pour remplacer UniversalCache manquant
  private internalCache: Map<string, { data: TranslationBundle, expires: number }> = new Map();

  private config: LocalizationConfig = {
    currentLanguage: 'fr',
    currentMarket: 'FR',
    fallbackLanguage: 'fr',
    enableGeoDetection: true,
    cacheTranslations: true,
    enableRTL: true
  };
  
  private currentTranslations: Map<string, TranslationBundle> = new Map();
  private listeners: Set<() => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeLocalization();
    }
  }

  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  /**
   * ✅ MÉTHODE AJOUTÉE : Configure le service depuis le Provider React
   * C'est cette méthode qui manquait et causait le crash "configure is not a function"
   */
  public configure(config: Partial<LocalizationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Appliquer les effets de bord de la configuration si nécessaire
    if (this.config.enableRTL) {
      this.setupRTLSupport();
    }
  }

  /**
   * Initialise la localisation avec détection automatique
   */
  private async initializeLocalization(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const preferredLanguage = await this.detectUserLanguage();
      
      if (this.config.enableGeoDetection) {
        const detectedMarket = await this.detectUserMarket();
        if (detectedMarket) {
          this.config.currentMarket = detectedMarket;
        }
      }

      await this.loadTranslations(preferredLanguage);
      
      if (this.config.enableRTL) {
        this.setupRTLSupport();
      }

      console.log('🌍 Localisation initialisée:', {
        language: this.config.currentLanguage,
        market: this.config.currentMarket
      });
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la localisation:', error);
    }
  }

  /**
   * Détecte la langue préférée de l'utilisateur
   */
  private async detectUserLanguage(): Promise<string> {
    if (typeof window === 'undefined') return 'fr';

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang && this.isLanguageSupported(urlLang)) {
        return urlLang;
      }

      const storedLang = localStorage.getItem('ue-language');
      if (storedLang && this.isLanguageSupported(storedLang)) {
        return storedLang;
      }

      const browserLang = navigator.language.split('-')[0];
      if (this.isLanguageSupported(browserLang)) {
        return browserLang;
      }
    } catch (e) {
      // Ignorer les erreurs
    }

    return 'fr';
  }

  /**
   * Détecte le marché de l'utilisateur par géolocalisation
   */
  private async detectUserMarket(): Promise<string | null> {
    if (typeof window === 'undefined') return 'MA';

    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 300000 
          });
        });

        const { latitude, longitude } = position.coords;
        const market = await this.reverseGeocode(latitude, longitude);
        return market;
      }
    } catch (error) {
      console.warn('Géolocalisation indisponible:', error);
    }

    return 'MA';
  }

  /**
   * Géocodage inversé simulé
   */
  private async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (lat >= 30 && lat <= 36 && lng >= -12 && lng <= -1) return 'MA';
    if (lat >= 42 && lat <= 51 && lng >= -5 && lng <= 8) return 'FR';
    if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) return 'US';
    if (lat >= 35 && lat <= 44 && lng >= -10 && lng <= 4) return 'ES';
    return null;
  }

  private isLanguageSupported(langCode: string): boolean {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === langCode);
  }

  /**
   * Charge les traductions
   */
  private async loadTranslations(language: string): Promise<void> {
    try {
      const cacheKey = `translations_${language}_${this.config.currentMarket}`;
      
      let translations: TranslationBundle | null = null;

      // Vérification du cache interne
      if (this.config.cacheTranslations) {
        const cached = this.internalCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
          translations = cached.data;
        }
      }

      if (!translations) {
        const { data, error } = await this.supabase
          .from('localization_translations')
          .select('*')
          .eq('language', language)
          .eq('market', this.config.currentMarket)
          .eq('is_active', true);

        // Si erreur ou pas de données, ne pas throw mais utiliser le fallback
        if (error || !data) {
           translations = this.getDefaultTranslations(language);
        } else {
            translations = {
              language,
              market: this.config.currentMarket,
              version: '1.0.0',
              translations: this.processDatabaseTranslations(data || []),
              lastUpdated: new Date()
            };
        }

        if (this.config.cacheTranslations && translations) {
          this.internalCache.set(cacheKey, { 
            data: translations, 
            expires: Date.now() + 3600 * 1000 // 1 heure
          });
        }
      }

      this.currentTranslations.set(language, translations);
      this.config.currentLanguage = language;
      this.notifyListeners();
      
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
      const defaultTranslations = this.getDefaultTranslations(language);
      this.currentTranslations.set(language, defaultTranslations);
    }
  }

  private processDatabaseTranslations(data: any[]): Record<string, TranslationValue> {
    const translations: Record<string, TranslationValue> = {};
    data.forEach(item => {
      translations[item.key] = {
        value: item.value,
        context: item.context,
        gender: item.gender,
        plural: item.plural,
        variables: item.variables ? JSON.parse(item.variables) : undefined
      };
    });
    return translations;
  }

  private getDefaultTranslations(language: string): TranslationBundle {
    const defaults = this.getDefaultTranslationData(language);
    return {
      language,
      market: this.config.currentMarket,
      version: '1.0.0',
      translations: defaults,
      lastUpdated: new Date()
    };
  }

  private getDefaultTranslationData(language: string): Record<string, TranslationValue> {
    const baseTranslations = {
      'nav.home': { value: 'Accueil' },
      'nav.menu': { value: 'Menu' },
      'nav.cart': { value: 'Panier' },
      'nav.orders': { value: 'Commandes' },
      'nav.profile': { value: 'Profil' },
      'nav.loyalty': { value: 'Fidélité' },
      'nav.promotions': { value: 'Promotions' },
      'ui.loading': { value: 'Chargement...' },
      'ui.error': { value: 'Erreur' },
      'ui.success': { value: 'Succès' },
      'ui.cancel': { value: 'Annuler' },
      'ui.confirm': { value: 'Confirmer' },
      'ui.save': { value: 'Enregistrer' },
      'ui.edit': { value: 'Modifier' },
      'ui.delete': { value: 'Supprimer' },
      'ui.search': { value: 'Rechercher' },
      'ui.filter': { value: 'Filtrer' },
      'ui.sort': { value: 'Trier' },
      'product.addToCart': { value: 'Ajouter au panier' },
      'product.outOfStock': { value: 'Rupture de stock' },
      'product.price': { value: 'Prix' },
      'product.description': { value: 'Description' },
      'product.ingredients': { value: 'Ingrédients' },
      'product.allergens': { value: 'Allergènes' },
      'order.status.pending': { value: 'En attente' },
      'order.status.confirmed': { value: 'Confirmée' },
      'order.status.preparing': { value: 'En préparation' },
      'order.status.ready': { value: 'Prête' },
      'order.status.delivering': { value: 'En livraison' },
      'order.status.delivered': { value: 'Livrée' },
      'order.status.cancelled': { value: 'Annulée' },
      'cart.empty': { value: 'Votre panier est vide' },
      'cart.total': { value: 'Total' },
      'cart.subtotal': { value: 'Sous-total' },
      'cart.tax': { value: 'TVA' },
      'cart.delivery': { value: 'Livraison' },
      'cart.checkout': { value: 'Passer commande' },
      'payment.methods': { value: 'Moyens de paiement' },
      'payment.card': { value: 'Carte bancaire' },
      'payment.cash': { value: 'Espèces' },
      'payment.mobile': { value: 'Paiement mobile' },
      'payment.processing': { value: 'Traitement en cours...' },
      'payment.success': { value: 'Paiement réussi' },
      'payment.failed': { value: 'Paiement échoué' },
      'delivery.address': { value: 'Adresse de livraison' },
      'delivery.time': { value: 'Heure de livraison' },
      'delivery.fee': { value: 'Frais de livraison' },
      'delivery.tracking': { value: 'Suivi de livraison' },
      'loyalty.points': { value: 'Points de fidélité' },
      'loyalty.rewards': { value: 'Récompenses' },
      'loyalty.levels': { value: 'Niveaux' },
      'loyalty.history': { value: 'Historique' },
      'promotions.active': { value: 'Promotions en cours' },
      'promotions.code': { value: 'Code promo' },
      'promotions.discount': { value: 'Remise' },
      'promotions.expires': { value: 'Expire le' },
      'msg.welcome': { value: 'Bienvenue sur Universal Eats' },
      'msg.thankYou': { value: 'Merci pour votre commande' },
      'msg.goodbye': { value: 'À bientôt !' },
      'msg.languageChanged': { value: 'Langue changée avec succès' },
      'msg.marketChanged': { value: 'Marché changé avec succès' }
    };

    if (language === 'ar') return this.mapTranslations(baseTranslations, this.getArabicTranslation);
    if (language === 'en') return this.mapTranslations(baseTranslations, this.getEnglishTranslation);
    if (language === 'es') return this.mapTranslations(baseTranslations, this.getSpanishTranslation);

    return baseTranslations;
  }

  private mapTranslations(base: Record<string, TranslationValue>, translator: (key: string) => string | null) {
    const newTranslations: Record<string, TranslationValue> = {};
    Object.entries(base).forEach(([key, value]) => {
      newTranslations[key] = {
        ...value,
        value: translator.call(this, key) || value.value
      };
    });
    return newTranslations;
  }

  private getArabicTranslation(key: string): string | null {
    const translations: Record<string, string> = {
      'nav.home': 'الرئيسية',
      'nav.menu': 'القائمة',
      'nav.cart': 'السلة',
      'nav.orders': 'الطلبات',
      'nav.profile': 'الملف الشخصي',
      'nav.loyalty': 'برنامج الولاء',
      'nav.promotions': 'العروض',
      'ui.loading': 'جاري التحميل...',
      'ui.error': 'خطأ',
      'ui.success': 'نجح',
      'ui.cancel': 'إلغاء',
      'ui.confirm': 'تأكيد',
      'ui.save': 'حفظ',
      'ui.edit': 'تعديل',
      'ui.delete': 'حذف',
      'ui.search': 'بحث',
      'ui.filter': 'تصفية',
      'ui.sort': 'ترتيب',
      'product.addToCart': 'أضف إلى السلة',
      'product.outOfStock': 'نفدت الكمية',
      'product.price': 'السعر',
      'product.description': 'الوصف',
      'product.ingredients': 'المكونات',
      'product.allergens': 'مسببات الحساسية',
      'order.status.pending': 'في الانتظار',
      'order.status.confirmed': 'مؤكد',
      'order.status.preparing': 'قيد التحضير',
      'order.status.ready': 'جاهز',
      'order.status.delivering': 'جاري التوصيل',
      'order.status.delivered': 'تم التوصيل',
      'order.status.cancelled': 'ملغى',
      'cart.empty': 'سلة التسوق فارغة',
      'cart.total': 'المجموع',
      'cart.subtotal': 'المجموع الفرعي',
      'cart.tax': 'الضريبة',
      'cart.delivery': 'التوصيل',
      'cart.checkout': 'إتمام الطلب',
      'payment.methods': 'وسائل الدفع',
      'payment.card': 'بطاقة ائتمان',
      'payment.cash': 'نقد',
      'payment.mobile': 'دفع عبر الهاتف',
      'payment.processing': 'جاري المعالجة...',
      'payment.success': 'تم الدفع بنجاح',
      'payment.failed': 'فشل الدفع',
      'delivery.address': 'عنوان التوصيل',
      'delivery.time': 'وقت التوصيل',
      'delivery.fee': 'رسوم التوصيل',
      'delivery.tracking': 'تتبع التوصيل',
      'loyalty.points': 'نقاط الولاء',
      'loyalty.rewards': 'المكافآت',
      'loyalty.levels': 'المستويات',
      'loyalty.history': 'التاريخ',
      'promotions.active': 'العروض النشطة',
      'promotions.code': 'كود الخصم',
      'promotions.discount': 'الخصم',
      'promotions.expires': 'ينتهي في',
      'msg.welcome': 'مرحبا بكم في Universal Eats',
      'msg.thankYou': 'شكرا لطلبكم',
      'msg.goodbye': 'إلى اللقاء!',
      'msg.languageChanged': 'تم تغيير اللغة بنجاح',
      'msg.marketChanged': 'تم تغيير السوق بنجاح'
    };
    return translations[key] || null;
  }

  private getEnglishTranslation(key: string): string | null {
    const translations: Record<string, string> = {
      'nav.home': 'Home', 'nav.menu': 'Menu', 'nav.cart': 'Cart', 'nav.orders': 'Orders',
      'nav.profile': 'Profile', 'nav.loyalty': 'Loyalty', 'nav.promotions': 'Promotions',
      'ui.loading': 'Loading...', 'ui.error': 'Error', 'ui.success': 'Success',
      'ui.cancel': 'Cancel', 'ui.confirm': 'Confirm', 'ui.save': 'Save',
      'ui.edit': 'Edit', 'ui.delete': 'Delete', 'ui.search': 'Search',
      'ui.filter': 'Filter', 'ui.sort': 'Sort', 'product.addToCart': 'Add to Cart',
      'product.outOfStock': 'Out of Stock', 'product.price': 'Price',
      'product.description': 'Description', 'product.ingredients': 'Ingredients',
      'product.allergens': 'Allergens', 'order.status.pending': 'Pending',
      'order.status.confirmed': 'Confirmed', 'order.status.preparing': 'Preparing',
      'order.status.ready': 'Ready', 'order.status.delivering': 'Delivering',
      'order.status.delivered': 'Delivered', 'order.status.cancelled': 'Cancelled',
      'cart.empty': 'Your cart is empty', 'cart.total': 'Total', 'cart.subtotal': 'Subtotal',
      'cart.tax': 'Tax', 'cart.delivery': 'Delivery', 'cart.checkout': 'Checkout',
      'payment.methods': 'Payment Methods', 'payment.card': 'Credit Card', 'payment.cash': 'Cash',
      'payment.mobile': 'Mobile Payment', 'payment.processing': 'Processing...',
      'payment.success': 'Payment successful', 'payment.failed': 'Payment failed',
      'delivery.address': 'Delivery Address', 'delivery.time': 'Delivery Time',
      'delivery.fee': 'Delivery Fee', 'delivery.tracking': 'Delivery Tracking',
      'loyalty.points': 'Loyalty Points', 'loyalty.rewards': 'Rewards',
      'loyalty.levels': 'Levels', 'loyalty.history': 'History',
      'promotions.active': 'Active Promotions', 'promotions.code': 'Promo Code',
      'promotions.discount': 'Discount', 'promotions.expires': 'Expires on',
      'msg.welcome': 'Welcome to Universal Eats', 'msg.thankYou': 'Thank you for your order',
      'msg.goodbye': 'See you soon!', 'msg.languageChanged': 'Language changed successfully',
      'msg.marketChanged': 'Market changed successfully'
    };
    return translations[key] || null;
  }

  private getSpanishTranslation(key: string): string | null {
    const translations: Record<string, string> = {
      'nav.home': 'Inicio', 'nav.menu': 'Menú', 'nav.cart': 'Carrito', 'nav.orders': 'Pedidos',
      'nav.profile': 'Perfil', 'nav.loyalty': 'Fidelidad', 'nav.promotions': 'Promociones',
      'ui.loading': 'Cargando...', 'ui.error': 'Error', 'ui.success': 'Éxito',
      'ui.cancel': 'Cancelar', 'ui.confirm': 'Confirmar', 'ui.save': 'Guardar',
      'ui.edit': 'Editar', 'ui.delete': 'Eliminar', 'ui.search': 'Buscar',
      'ui.filter': 'Filtrar', 'ui.sort': 'Ordenar', 'product.addToCart': 'Agregar al carrito',
      'product.outOfStock': 'Agotado', 'product.price': 'Precio', 'product.description': 'Descripción',
      'product.ingredients': 'Ingredientes', 'product.allergens': 'Alérgenos',
      'order.status.pending': 'Pendiente', 'order.status.confirmed': 'Confirmado',
      'order.status.preparing': 'Preparando', 'order.status.ready': 'Listo',
      'order.status.delivering': 'Entregando', 'order.status.delivered': 'Entregado',
      'order.status.cancelled': 'Cancelado', 'cart.empty': 'Tu carrito está vacío',
      'cart.total': 'Total', 'cart.subtotal': 'Subtotal', 'cart.tax': 'Impuesto',
      'cart.delivery': 'Entrega', 'cart.checkout': 'Pagar',
      'payment.methods': 'Métodos de pago', 'payment.card': 'Tarjeta de crédito',
      'payment.cash': 'Efectivo', 'payment.mobile': 'Pago móvil',
      'payment.processing': 'Procesando...', 'payment.success': 'Pago exitoso',
      'payment.failed': 'Pago fallido', 'delivery.address': 'Dirección de entrega',
      'delivery.time': 'Hora de entrega', 'delivery.fee': 'Costo de entrega',
      'delivery.tracking': 'Seguimiento de entrega', 'loyalty.points': 'Puntos de fidelidad',
      'loyalty.rewards': 'Recompensas', 'loyalty.levels': 'Niveles',
      'loyalty.history': 'Historial', 'promotions.active': 'Promociones activas',
      'promotions.code': 'Código promocional', 'promotions.discount': 'Descuento',
      'promotions.expires': 'Expira el', 'msg.welcome': 'Bienvenido a Universal Eats',
      'msg.thankYou': 'Gracias por tu pedido', 'msg.goodbye': '¡Hasta pronto!',
      'msg.languageChanged': 'Idioma cambiado exitosamente',
      'msg.marketChanged': 'Mercado cambiado exitosamente'
    };
    return translations[key] || null;
  }

  private setupRTLSupport(): void {
    if (typeof window === 'undefined') return;

    const currentLanguage = this.getCurrentLanguage();
    const isRTL = this.isRTLLanguage(currentLanguage);
    
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
    
    if (isRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }

  private isRTLLanguage(language: string): boolean {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
    return lang?.direction === 'rtl';
  }

  public translate(
    key: string, 
    params?: Record<string, any>, 
    options?: {
      count?: number;
      gender?: 'masculine' | 'feminine';
      context?: string;
    }
  ): string {
    try {
      const currentLang = this.getCurrentLanguage();
      const bundle = this.currentTranslations.get(currentLang);
      
      if (!bundle) return key;

      let translation: TranslationValue | undefined = bundle.translations[key];
      
      if (!translation && currentLang !== this.config.fallbackLanguage) {
        const fallbackBundle = this.currentTranslations.get(this.config.fallbackLanguage);
        translation = fallbackBundle?.translations[key];
      }

      if (!translation) return key;

      let value = translation.value;

      if (options?.count !== undefined) {
        const pluralForm = this.getPluralForm(options.count, currentLang);
        value = this.applyPlural(value, pluralForm);
      }

      if (params || translation.variables) {
        const variables = { ...translation.variables, ...params };
        value = this.interpolateVariables(value, variables);
      }

      return value;
      
    } catch (error) {
      console.error('Erreur lors de la traduction:', error);
      return key;
    }
  }

  private getPluralForm(count: number, language: string): 'zero' | 'one' | 'two' | 'few' | 'many' | 'other' {
    switch (language) {
      case 'fr': return count <= 1 ? 'one' : 'other';
      case 'ar': 
        if (count === 0) return 'zero';
        if (count === 1) return 'one';
        if (count === 2) return 'two';
        if (count >= 3 && count <= 10) return 'few';
        if (count >= 11) return 'many';
        return 'other';
      case 'en': 
      case 'es': return count === 1 ? 'one' : 'other';
      default: return 'other';
    }
  }

  private applyPlural(value: string, pluralForm: string): string {
    if (pluralForm === 'one' && value.endsWith('s')) return value.slice(0, -1);
    if (pluralForm !== 'one' && !value.endsWith('s')) return value + 's';
    return value;
  }

  private interpolateVariables(value: string, variables: Record<string, any>): string {
    return value.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  public async setLanguage(language: string): Promise<void> {
    if (!this.isLanguageSupported(language)) throw new Error(`Langue non supportée: ${language}`);

    try {
      this.config.currentLanguage = language;
      if (typeof window !== 'undefined') localStorage.setItem('ue-language', language);
      
      await this.loadTranslations(language);
      this.setupRTLSupport();
      this.notifyListeners();
      
      console.log('🌍 Langue changée:', language);
    } catch (error) {
      console.error('Erreur lors du changement de langue:', error);
      throw error;
    }
  }

  public async setMarket(marketCode: string): Promise<void> {
    const market = SUPPORTED_MARKETS.find(m => m.code === marketCode);
    if (!market) throw new Error(`Marché non supporté: ${marketCode}`);

    try {
      this.config.currentMarket = marketCode;
      if (typeof window !== 'undefined') localStorage.setItem('ue-market', marketCode);
      
      await this.loadTranslations(this.config.currentLanguage);
      this.notifyListeners();
      
      console.log('🌍 Marché changé:', marketCode);
    } catch (error) {
      console.error('Erreur lors du changement de marché:', error);
      throw error;
    }
  }

  public getCurrentLanguage(): string { return this.config.currentLanguage; }
  public getCurrentMarket(): string { return this.config.currentMarket; }
  public getSupportedLanguages(): SupportedLanguage[] { return SUPPORTED_LANGUAGES; }
  public getSupportedMarkets(): Market[] { return SUPPORTED_MARKETS; }
  
  public getCurrentLanguageInfo(): SupportedLanguage | undefined {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === this.config.currentLanguage);
  }

  public getCurrentMarketInfo(): Market | undefined {
    return SUPPORTED_MARKETS.find(market => market.code === this.config.currentMarket);
  }

  public addListener(callback: () => void): void { this.listeners.add(callback); }
  public removeListener(callback: () => void): void { this.listeners.delete(callback); }
  private notifyListeners(): void { this.listeners.forEach(callback => callback()); }

  public async preloadTranslations(languages: string[]): Promise<void> {
    const promises = languages.map(lang => this.loadTranslations(lang));
    await Promise.all(promises);
  }

  public async clearCache(): Promise<void> {
    this.internalCache.clear();
    this.currentTranslations.clear();
  }

  public getLocalizationStats() {
    const loadedLanguages = Array.from(this.currentTranslations.keys());
    const currentBundle = this.currentTranslations.get(this.config.currentLanguage);
    return {
      loadedLanguages,
      currentLanguage: this.config.currentLanguage,
      currentMarket: this.config.currentMarket,
      totalTranslations: currentBundle ? Object.keys(currentBundle.translations).length : 0,
      missingTranslations: [] 
    };
  }
}

export const localizationService = LocalizationService.getInstance();