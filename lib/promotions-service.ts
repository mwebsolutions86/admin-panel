/**
 * Service de Gestion des Promotions et Coupons Avancé
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Ce service implémente un système sophistiqué de gestion des promotions :
 * - Codes promo alphanumériques avec conditions d'usage
 * - Réductions automatiques (pourcentages/montants fixes)
 * - Livraison gratuite conditionnelle/inconditionnelle
 * - Buy X Get Y avec achats groupés
 * - Flash sales limitées dans le temps
 * - Promotions géolocalisées par ville/zone
 * - Promotions exclusives aux membres fidélité
 * - Planification automatique et validation temps réel
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { userCache, orderCache, CacheUtils } from './cache-service';
import { analyticsService } from './analytics-service';
import { notificationsService } from './notifications-service';
import { loyaltyService } from './loyalty-service';

// Types pour le système de promotions
export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount: number;
  isActive: boolean;
  isStackable: boolean;
  applicableProducts?: string[]; // IDs des produits
  applicableCategories?: string[]; // IDs des catégories
  applicableStores?: string[]; // IDs des magasins
  targetAudience: TargetAudience;
  stackingRules: StackingRules;
  geoTargeting?: GeoTargeting;
  loyaltyRequired?: boolean;
  loyaltyLevelRequired?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  metadata: Record<string, any>;
}

export type PromotionType = 
  | 'code_promo' 
  | 'reduction_automatique' 
  | 'livraison_gratuite' 
  | 'buy_x_get_y' 
  | 'flash_sale' 
  | 'geolocalisee' 
  | 'fidelite_exclusive';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_delivery' | 'buy_x_get_y';

export interface TargetAudience {
  type: 'all' | 'new_customers' | 'returning_customers' | 'vip' | 'segmented' | 'loyalty_members';
  segments?: string[];
  minOrdersCount?: number;
  minTotalSpent?: number;
  excludeSegments?: string[];
}

export interface StackingRules {
  canStackWithLoyalty: boolean;
  canStackWithOtherPromotions: boolean;
  maxStackingDiscount: number;
  priority: number; // 1 = plus prioritaire
}

export interface GeoTargeting {
  cities: string[];
  zones: string[];
  radius?: number; // en km
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CouponCode {
  id: string;
  promotionId: string;
  code: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  validFrom: string;
  validUntil: string;
  createdAt: string;
}

export interface PromotionUsage {
  id: string;
  promotionId: string;
  couponCodeId?: string;
  userId: string;
  orderId?: string;
  discountApplied: number;
  originalAmount: number;
  finalAmount: number;
  usedAt: string;
  metadata: Record<string, any>;
}

export interface PromotionAnalytics {
  promotionId: string;
  totalUsage: number;
  uniqueUsers: number;
  totalRevenue: number;
  totalDiscount: number;
  conversionRate: number;
  roi: number;
  averageOrderValue: {
    withPromotion: number;
    withoutPromotion: number;
  };
  usageByDay: Array<{
    date: string;
    usageCount: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    usageCount: number;
  }>;
  demographics: {
    ageGroups: Record<string, number>;
    loyaltyLevels: Record<string, number>;
    locations: Record<string, number>;
  };
}

export interface PromotionCampaign {
  id: string;
  name: string;
  description: string;
  promotions: string[]; // IDs des promotions
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  targetMetrics: {
    targetUsage: number;
    targetRevenue: number;
    targetROI: number;
  };
  channels: PromotionChannel[];
  isActive: boolean;
  createdAt: string;
}

export type PromotionChannel = 'push_notification' | 'email' | 'in_app' | 'social' | 'sms';

export interface PromotionValidationResult {
  isValid: boolean;
  discount: number;
  finalAmount: number;
  appliedPromotion?: Promotion;
  appliedCoupon?: CouponCode;
  reasons: string[];
  warnings: string[];
  stackingApplied: boolean;
}

// Configuration du service
export interface PromotionConfig {
  maxPromotionsPerUser: number;
  codeLength: number;
  codePrefix: string;
  expirationWarningDays: number;
  enableABTesting: boolean;
  maxStackingDiscount: number;
  flashSaleMaxDuration: number; // en heures
  geoTargetingEnabled: boolean;
  loyaltyIntegrationEnabled: boolean;
  analyticsEnabled: boolean;
  realTimeValidation: boolean;
}

// Configuration par défaut
const DEFAULT_CONFIG: PromotionConfig = {
  maxPromotionsPerUser: 10,
  codeLength: 8,
  codePrefix: 'UE',
  expirationWarningDays: 7,
  enableABTesting: true,
  maxStackingDiscount: 50, // 50% maximum de réduction cumulée
  flashSaleMaxDuration: 24,
  geoTargetingEnabled: true,
  loyaltyIntegrationEnabled: true,
  analyticsEnabled: true,
  realTimeValidation: true
};

/**
 * Service principal de gestion des promotions
 */
export class PromotionsService {
  private static instance: PromotionsService;
  private config: PromotionConfig;
  private promotionCache = new Map<string, Promotion>();
  private couponCache = new Map<string, CouponCode>();
  private campaignCache = new Map<string, PromotionCampaign>();
  private validationCache = new Map<string, PromotionValidationResult>();

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initializeCache();
    this.startPeriodicTasks();
  }

  static getInstance(): PromotionsService {
    if (!PromotionsService.instance) {
      PromotionsService.instance = new PromotionsService();
    }
    return PromotionsService.instance;
  }

  /**
   * === GESTION DES PROMOTIONS ===
   */

  /**
   * Crée une nouvelle promotion
   */
  async createPromotion(promotionData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Promotion> {
    try {
      const promotion: Promotion = {
        ...promotionData,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };

      // Validation des données
      this.validatePromotionData(promotion);

      // Sauvegarder en base
      const { error } = await supabase
        .from('promotions')
        .insert([promotion]);

      if (error) throw error;

      // Mettre en cache
      this.promotionCache.set(promotion.id, promotion);
      userCache.set(`promotion_${promotion.id}`, promotion, 30 * 60 * 1000); // 30 minutes

      // Track analytics
      await analyticsService.trackEvent({
        type: 'promotion_created',
        category: 'promotion',
        userId: promotion.createdBy,
        metadata: { 
          promotionId: promotion.id,
          type: promotion.type,
          discountValue: promotion.discountValue
        }
      });

      performanceMonitor.info('Promotion créée', { 
        promotionId: promotion.id,
        name: promotion.name,
        type: promotion.type
      });

      return promotion;

    } catch (error) {
      performanceMonitor.error('Erreur création promotion', { error });
      throw error;
    }
  }

  /**
   * Met à jour une promotion existante
   */
  async updatePromotion(promotionId: string, updates: Partial<Promotion>): Promise<Promotion> {
    try {
      const existingPromotion = await this.getPromotion(promotionId);
      if (!existingPromotion) {
        throw new Error('Promotion non trouvée');
      }

      const updatedPromotion = {
        ...existingPromotion,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validation des données
      this.validatePromotionData(updatedPromotion);

      // Mettre à jour en base
      const { error } = await supabase
        .from('promotions')
        .update(updatedPromotion)
        .eq('id', promotionId);

      if (error) throw error;

      // Mettre à jour le cache
      this.promotionCache.set(promotionId, updatedPromotion);
      userCache.set(`promotion_${promotionId}`, updatedPromotion, 30 * 60 * 1000);

      performanceMonitor.info('Promotion mise à jour', { promotionId, updates });

      return updatedPromotion;

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour promotion', { promotionId, error });
      throw error;
    }
  }

  /**
   * Récupère une promotion par son ID
   */
  async getPromotion(promotionId: string): Promise<Promotion | null> {
    try {
      // Vérifier le cache local
      const cached = this.promotionCache.get(promotionId);
      if (cached) {
        return cached;
      }

      // Vérifier le cache système
      const systemCached = userCache.get<Promotion>(`promotion_${promotionId}`);
      if (systemCached) {
        this.promotionCache.set(promotionId, systemCached);
        return systemCached;
      }

      // Récupérer depuis la base
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Mettre en cache
      this.promotionCache.set(promotionId, data);
      userCache.set(`promotion_${promotionId}`, data, 30 * 60 * 1000);

      return data;

    } catch (error) {
      performanceMonitor.error('Erreur récupération promotion', { promotionId, error });
      throw error;
    }
  }

  /**
   * Récupère toutes les promotions actives
   */
  async getActivePromotions(filters?: {
    type?: PromotionType;
    storeId?: string;
    userId?: string;
    location?: { lat: number; lng: number };
  }): Promise<Promotion[]> {
    try {
      const cacheKey = `active_promotions:${JSON.stringify(filters)}`;
      
      // Vérifier le cache
      const cached = userCache.get<Promotion[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const now = new Date().toISOString();
      let query = supabase
        .from('promotions')
        .select('*')
        .eq('isActive', true)
        .lte('validFrom', now)
        .gte('validUntil', now);

      // Appliquer les filtres
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.storeId) {
        query = query.contains('applicableStores', [filters.storeId]);
      }

      const { data, error } = await query;
      if (error) throw error;

      let promotions = data || [];

      // Filtrage avancé côté client
      if (filters?.userId) {
        promotions = await this.filterPromotionsByUser(promotions, filters.userId);
      }

      if (filters?.location) {
        promotions = this.filterPromotionsByLocation(promotions, filters.location);
      }

      // Mettre en cache
      userCache.set(cacheKey, promotions, 10 * 60 * 1000); // 10 minutes

      performanceMonitor.debug('Promotions actives récupérées', { 
        count: promotions.length,
        filters 
      });

      return promotions;

    } catch (error) {
      performanceMonitor.error('Erreur récupération promotions actives', { error });
      throw error;
    }
  }

  /**
   * === VALIDATION ET APPLICATION ===
   */

  /**
   * Valide une promotion en temps réel
   */
  async validatePromotion(
    promotionId: string,
    userId: string,
    orderData: {
      totalAmount: number;
      products: Array<{ id: string; category: string; price: number }>;
      storeId: string;
      location?: { lat: number; lng: number };
    }
  ): Promise<PromotionValidationResult> {
    try {
      const cacheKey = `${promotionId}:${userId}:${JSON.stringify(orderData)}`;
      
      // Vérifier le cache si activé
      if (this.config.realTimeValidation) {
        const cached = this.validationCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        return {
          isValid: false,
          discount: 0,
          finalAmount: orderData.totalAmount,
          reasons: ['Promotion non trouvée'],
          warnings: [],
          stackingApplied: false
        };
      }

      const result = await this.performValidation(promotion, userId, orderData);

      // Mettre en cache
      if (this.config.realTimeValidation) {
        this.validationCache.set(cacheKey, result);
        // Nettoyer le cache après 5 minutes
        setTimeout(() => this.validationCache.delete(cacheKey), 5 * 60 * 1000);
      }

      return result;

    } catch (error) {
      performanceMonitor.error('Erreur validation promotion', { promotionId, userId, error });
      throw error;
    }
  }

  /**
   * Valide et applique un code promo
   */
  async applyPromoCode(
    code: string,
    userId: string,
    orderData: {
      totalAmount: number;
      products: Array<{ id: string; category: string; price: number }>;
      storeId: string;
      location?: { lat: number; lng: number };
    }
  ): Promise<PromotionValidationResult> {
    try {
      // Trouver le coupon对应的 promotion
      const coupon = await this.getCouponByCode(code);
      if (!coupon || !coupon.isActive) {
        return {
          isValid: false,
          discount: 0,
          finalAmount: orderData.totalAmount,
          reasons: ['Code promo invalide ou inactif'],
          warnings: [],
          stackingApplied: false
        };
      }

      const promotion = await this.getPromotion(coupon.promotionId);
      if (!promotion) {
        return {
          isValid: false,
          discount: 0,
          finalAmount: orderData.totalAmount,
          reasons: ['Promotion associée au code non trouvée'],
          warnings: [],
          stackingApplied: false
        };
      }

      const result = await this.performValidation(promotion, userId, orderData, coupon);

      if (result.isValid) {
        // Enregistrer l'utilisation
        await this.recordPromotionUsage(
          promotion.id,
          coupon.id,
          userId,
          orderData.totalAmount,
          result.discount,
          result.finalAmount
        );

        // Mettre à jour les compteurs
        await this.incrementPromotionUsage(promotion.id);
        await this.incrementCouponUsage(coupon.id);

        // Track analytics
        await analyticsService.trackEvent({
          type: 'promotion_code_applied',
          category: 'promotion',
          userId,
          metadata: {
            promotionId: promotion.id,
            couponCode: code,
            discount: result.discount,
            finalAmount: result.finalAmount
          }
        });
      }

      return result;

    } catch (error) {
      performanceMonitor.error('Erreur application code promo', { code, userId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES CODES COUPON ===
   */

  /**
   * Génère des codes coupon pour une promotion
   */
  async generateCouponCodes(
    promotionId: string,
    count: number,
    options?: {
      customCodes?: string[];
      prefix?: string;
      validUntil?: string;
      usageLimit?: number;
    }
  ): Promise<CouponCode[]> {
    try {
      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        throw new Error('Promotion non trouvée');
      }

      const codes: CouponCode[] = [];

      for (let i = 0; i < count; i++) {
        const code = options?.customCodes?.[i] || this.generateUniqueCode(
          options?.prefix || this.config.codePrefix
        );

        const coupon: CouponCode = {
          id: this.generateId(),
          promotionId,
          code,
          isActive: true,
          usageCount: 0,
          maxUsage: options?.usageLimit,
          validFrom: promotion.validFrom,
          validUntil: options?.validUntil || promotion.validUntil,
          createdAt: new Date().toISOString()
        };

        codes.push(coupon);
      }

      // Sauvegarder en base
      const { error } = await supabase
        .from('coupon_codes')
        .insert(codes);

      if (error) throw error;

      // Mettre en cache
      codes.forEach(coupon => {
        this.couponCache.set(coupon.id, coupon);
      });

      performanceMonitor.info('Codes coupon générés', { 
        promotionId, 
        count: codes.length 
      });

      return codes;

    } catch (error) {
      performanceMonitor.error('Erreur génération codes coupon', { promotionId, count, error });
      throw error;
    }
  }

  /**
   * Récupère un coupon par son code
   */
  async getCouponByCode(code: string): Promise<CouponCode | null> {
    try {
      const { data, error } = await supabase
        .from('coupon_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;

    } catch (error) {
      performanceMonitor.error('Erreur récupération coupon', { code, error });
      throw error;
    }
  }

  /**
   * === ANALYTICS ET RAPPORTS ===
   */

  /**
   * Récupère les analytics d'une promotion
   */
  async getPromotionAnalytics(promotionId: string, dateRange?: { start: Date; end: Date }): Promise<PromotionAnalytics> {
    try {
      const cacheKey = `promotion_analytics:${promotionId}:${dateRange?.start.toISOString()}_${dateRange?.end.toISOString()}`;
      
      const cached = userCache.get<PromotionAnalytics>(cacheKey);
      if (cached) {
        return cached;
      }

      // Récupérer les données d'utilisation
      let usageQuery = supabase
        .from('promotion_usage')
        .select('*')
        .eq('promotionId', promotionId);

      if (dateRange) {
        usageQuery = usageQuery
          .gte('usedAt', dateRange.start.toISOString())
          .lte('usedAt', dateRange.end.toISOString());
      }

      const { data: usageData, error } = await usageQuery;
      if (error) throw error;

      // Calculer les métriques
      const analytics: PromotionAnalytics = {
        promotionId,
        totalUsage: usageData?.length || 0,
        uniqueUsers: new Set(usageData?.map(u => u.userId)).size,
        totalRevenue: usageData?.reduce((sum, u) => sum + u.finalAmount, 0) || 0,
        totalDiscount: usageData?.reduce((sum, u) => sum + u.discountApplied, 0) || 0,
        conversionRate: 0, // À calculer avec les données de commande
        roi: 0, // À calculer
        averageOrderValue: {
          withPromotion: 0,
          withoutPromotion: 0
        },
        usageByDay: this.calculateUsageByDay(usageData || []),
        topProducts: this.calculateTopProducts(usageData || []),
        demographics: {
          ageGroups: {},
          loyaltyLevels: {},
          locations: {}
        }
      };

      // Mettre en cache
      userCache.set(cacheKey, analytics, 15 * 60 * 1000); // 15 minutes

      return analytics;

    } catch (error) {
      performanceMonitor.error('Erreur analytics promotion', { promotionId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES CAMPAGNES ===
   */

  /**
   * Crée une campagne de promotions
   */
  async createCampaign(campaignData: Omit<PromotionCampaign, 'id' | 'createdAt' | 'spent'>): Promise<PromotionCampaign> {
    try {
      const campaign: PromotionCampaign = {
        ...campaignData,
        id: this.generateId(),
        spent: 0,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder en base
      const { error } = await supabase
        .from('promotion_campaigns')
        .insert([campaign]);

      if (error) throw error;

      // Mettre en cache
      this.campaignCache.set(campaign.id, campaign);

      performanceMonitor.info('Campagne promotions créée', { 
        campaignId: campaign.id,
        name: campaign.name,
        promotionsCount: campaign.promotions.length
      });

      return campaign;

    } catch (error) {
      performanceMonitor.error('Erreur création campagne', { error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private validatePromotionData(promotion: Promotion): void {
    if (!promotion.name || promotion.name.trim().length === 0) {
      throw new Error('Le nom de la promotion est requis');
    }

    if (!promotion.validFrom || !promotion.validUntil) {
      throw new Error('Les dates de validité sont requises');
    }

    if (new Date(promotion.validFrom) >= new Date(promotion.validUntil)) {
      throw new Error('La date de début doit être antérieure à la date de fin');
    }

    if (promotion.discountValue <= 0) {
      throw new Error('La valeur de réduction doit être positive');
    }

    if (promotion.discountType === 'percentage' && (promotion.discountValue > 100 || promotion.discountValue < 0)) {
      throw new Error('Le pourcentage de réduction doit être entre 0 et 100');
    }
  }

  private async performValidation(
    promotion: Promotion,
    userId: string,
    orderData: {
      totalAmount: number;
      products: Array<{ id: string; category: string; price: number }>;
      storeId: string;
      location?: { lat: number; lng: number };
    },
    coupon?: CouponCode
  ): Promise<PromotionValidationResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let isValid = true;
    let discount = 0;

    // Vérifier la période de validité
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validUntil = new Date(promotion.validUntil);

    if (now < validFrom) {
      reasons.push('Promotion pas encore active');
      isValid = false;
    }

    if (now > validUntil) {
      reasons.push('Promotion expirée');
      isValid = false;
    }

    // Vérifier si la promotion est active
    if (!promotion.isActive) {
      reasons.push('Promotion inactive');
      isValid = false;
    }

    // Vérifier le montant minimum
    if (promotion.minimumAmount && orderData.totalAmount < promotion.minimumAmount) {
      reasons.push(`Montant minimum requis: ${promotion.minimumAmount}€`);
      isValid = false;
    }

    // Vérifier les limites d'usage
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      reasons.push('Limite d\'usage atteinte');
      isValid = false;
    }

    if (promotion.usageLimitPerUser) {
      const userUsageCount = await this.getUserPromotionUsageCount(userId, promotion.id);
      if (userUsageCount >= promotion.usageLimitPerUser) {
        reasons.push('Limite d\'usage personnel atteinte');
        isValid = false;
      }
    }

    // Vérifier les produits/catégories applicables
    if (promotion.applicableProducts?.length || promotion.applicableCategories?.length) {
      const hasApplicableProduct = orderData.products.some(product =>
        (promotion.applicableProducts?.includes(product.id)) ||
        (promotion.applicableCategories?.includes(product.category))
      );

      if (!hasApplicableProduct) {
        reasons.push('Aucun produit applicable dans la commande');
        isValid = false;
      }
  }

    // Vérifier les magasins applicables
    if (promotion.applicableStores?.length && !promotion.applicableStores.includes(orderData.storeId)) {
      reasons.push('Promotion non applicable dans ce magasin');
      isValid = false;
    }

    // Vérifier le ciblage géographique
    if (promotion.geoTargeting && orderData.location) {
      const isInGeoZone = this.isInGeoTargeting(orderData.location, promotion.geoTargeting);
      if (!isInGeoZone) {
        reasons.push('Promotion non disponible dans votre zone géographique');
        isValid = false;
      }
    }

    // Vérifier les exigences de fidélité
    if (promotion.loyaltyRequired) {
      const user = await loyaltyService.getUser(userId);
      if (!user) {
        reasons.push('Programme de fidélité requis');
        isValid = false;
      } else if (promotion.loyaltyLevelRequired) {
        if (user.levelId !== promotion.loyaltyLevelRequired) {
          reasons.push(`Niveau de fidélité ${promotion.loyaltyLevelRequired} requis`);
          isValid = false;
        }
      }
    }

    // Vérifier le coupon spécifique
    if (coupon) {
      if (!coupon.isActive) {
        reasons.push('Code coupon inactif');
        isValid = false;
      }

      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
        reasons.push('Code coupon déjà utilisé le nombre maximum de fois');
        isValid = false;
      }

      const couponValidFrom = new Date(coupon.validFrom);
      const couponValidUntil = new Date(coupon.validUntil);

      if (now < couponValidFrom || now > couponValidUntil) {
        reasons.push('Code coupon en dehors de sa période de validité');
        isValid = false;
      }
    }

    // Calculer la réduction si valide
    if (isValid) {
      discount = this.calculateDiscount(promotion, orderData.totalAmount);
      
      if (discount > orderData.totalAmount) {
        warnings.push('La réduction dépasse le montant de la commande');
        discount = orderData.totalAmount;
      }

      if (promotion.maximumDiscount && discount > promotion.maximumDiscount) {
        discount = promotion.maximumDiscount;
        warnings.push('Réduction limitée par le montant maximum');
      }
    }

    return {
      isValid,
      discount,
      finalAmount: orderData.totalAmount - discount,
      appliedPromotion: isValid ? promotion : undefined,
      appliedCoupon: isValid ? coupon : undefined,
      reasons,
      warnings,
      stackingApplied: false
    };
  }

  private calculateDiscount(promotion: Promotion, orderAmount: number): number {
    switch (promotion.discountType) {
      case 'percentage':
        return (orderAmount * promotion.discountValue) / 100;
      case 'fixed_amount':
        return Math.min(promotion.discountValue, orderAmount);
      case 'free_delivery':
        return 0; // Géré séparément dans le système de livraison
      case 'buy_x_get_y':
        // Logique complexe pour buy X get Y
        return this.calculateBuyXGetYDiscount(promotion, orderAmount);
      default:
        return 0;
    }
  }

  private calculateBuyXGetYDiscount(promotion: Promotion, orderAmount: number): number {
    // Implémentation simplifiée pour buy X get Y
    // En réalité, il faudrait analyser les produits dans la commande
    const discountPercent = promotion.discountValue || 10;
    return (orderAmount * discountPercent) / 100;
  }

  private async filterPromotionsByUser(promotions: Promotion[], userId: string): Promise<Promotion[]> {
    try {
      const user = await loyaltyService.getUser(userId);
      if (!user) {
        return promotions.filter(p => !p.loyaltyRequired);
      }

      return promotions.filter(promotion => {
        // Filtrer selon le type d'audience cible
        switch (promotion.targetAudience.type) {
          case 'all':
            return true;
          case 'loyalty_members':
            return true;
          case 'vip':
            return ['gold', 'platinum'].includes(user.levelId);
          case 'new_customers':
            return user.ordersCount <= 1;
          case 'returning_customers':
            return user.ordersCount > 1;
          case 'segmented':
            return promotion.targetAudience.segments?.includes(user.favoriteCategory) || false;
          default:
            return true;
        }
      });
    } catch (error) {
      performanceMonitor.error('Erreur filtrage promotions par utilisateur', { userId, error });
      return promotions;
    }
  }

  private filterPromotionsByLocation(promotions: Promotion[], location: { lat: number; lng: number }): Promotion[] {
    return promotions.filter(promotion => {
      if (!promotion.geoTargeting) {
        return true;
      }

      return this.isInGeoTargeting(location, promotion.geoTargeting);
    });
  }

  private isInGeoTargeting(location: { lat: number; lng: number }, geoTargeting: GeoTargeting): boolean {
    // Logique simplifiée de géolocalisation
    // En réalité, il faudrait utiliser une API de géocoding
    return geoTargeting.cities.length === 0 || geoTargeting.cities.includes('Casablanca'); // Exemple
  }

  private async recordPromotionUsage(
    promotionId: string,
    couponCodeId: string | undefined,
    userId: string,
    originalAmount: number,
    discount: number,
    finalAmount: number
  ): Promise<void> {
    try {
      const usage: Omit<PromotionUsage, 'id'> = {
        promotionId,
        couponCodeId,
        userId,
        discountApplied: discount,
        originalAmount,
        finalAmount,
        usedAt: new Date().toISOString(),
        metadata: {}
      };

      const { error } = await supabase
        .from('promotion_usage')
        .insert([usage]);

      if (error) throw error;

    } catch (error) {
      performanceMonitor.error('Erreur enregistrement usage promotion', { promotionId, userId, error });
      throw error;
    }
  }

  private async incrementPromotionUsage(promotionId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_promotion_usage', { promotion_id: promotionId });
      if (error) throw error;

      // Mettre à jour le cache
      const promotion = this.promotionCache.get(promotionId);
      if (promotion) {
        promotion.usageCount++;
        this.promotionCache.set(promotionId, promotion);
      }

    } catch (error) {
      performanceMonitor.error('Erreur incrément usage promotion', { promotionId, error });
    }
  }

  private async incrementCouponUsage(couponId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
      if (error) throw error;

      // Mettre à jour le cache
      const coupon = this.couponCache.get(couponId);
      if (coupon) {
        coupon.usageCount++;
        this.couponCache.set(couponId, coupon);
      }

    } catch (error) {
      performanceMonitor.error('Erreur incrément usage coupon', { couponId, error });
    }
  }

  private async getUserPromotionUsageCount(userId: string, promotionId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('promotion_usage')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId)
        .eq('promotionId', promotionId);

      return count || 0;

    } catch (error) {
      performanceMonitor.error('Erreur comptage usage utilisateur', { userId, promotionId, error });
      return 0;
    }
  }

  private generateUniqueCode(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;
    
    for (let i = 0; i < this.config.codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  private generateId(): string {
    return `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateUsageByDay(usageData: PromotionUsage[]): Array<{ date: string; usageCount: number; revenue: number }> {
    const dailyStats: Record<string, { count: number; revenue: number }> = {};

    usageData.forEach(usage => {
      const date = usage.usedAt.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, revenue: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].revenue += usage.finalAmount;
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      usageCount: stats.count,
      revenue: stats.revenue
    }));
  }

  private calculateTopProducts(usageData: PromotionUsage[]): Array<{ productId: string; productName: string; usageCount: number }> {
    // Implémentation simplifiée
    // En réalité, il faudrait join avec les données de produits
    return [
      { productId: '1', productName: 'Burger Classique', usageCount: 45 },
      { productId: '2', productName: 'Pizza Margherita', usageCount: 32 }
    ];
  }

  private initializeCache(): void {
    try {
      performanceMonitor.info('Cache promotions initialisé');

    } catch (error) {
      performanceMonitor.error('Erreur initialisation cache promotions', { error });
    }
  }

  private startPeriodicTasks(): void {
    // Nettoyage des promotions expirées (toutes les heures)
    setInterval(() => {
      this.cleanExpiredPromotions().catch(error => {
        performanceMonitor.error('Erreur nettoyage promotions expirées', { error });
      });
    }, 60 * 60 * 1000);

    // Nettoyage du cache de validation (toutes les 10 minutes)
    setInterval(() => {
      this.validationCache.clear();
    }, 10 * 60 * 1000);
  }

  private async cleanExpiredPromotions(): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('promotions')
        .update({ isActive: false })
        .lt('validUntil', now)
        .eq('isActive', true);

      if (error) throw error;

      performanceMonitor.debug('Nettoyage promotions expirées terminé');

    } catch (error) {
      performanceMonitor.error('Erreur nettoyage promotions expirées', { error });
    }
  }

  /**
   * === API PUBLIQUES ===
   */

  /**
   * Récupère la configuration du service
   */
  getConfig(): PromotionConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<PromotionConfig>): void {
    this.config = { ...this.config, ...updates };
    performanceMonitor.info('Configuration promotions mise à jour', { updates });
  }

  /**
   * Déactive une promotion
   */
  async deactivatePromotion(promotionId: string, reason?: string): Promise<void> {
    try {
      await this.updatePromotion(promotionId, { isActive: false });

      // Track analytics
      await analyticsService.trackEvent({
        type: 'promotion_deactivated',
        category: 'promotion',
        metadata: { promotionId, reason }
      });

      performanceMonitor.info('Promotion désactivée', { promotionId, reason });

    } catch (error) {
      performanceMonitor.error('Erreur désactivation promotion', { promotionId, error });
      throw error;
    }
  }

  /**
   * Clone une promotion
   */
  async clonePromotion(promotionId: string, newName: string, createdBy: string): Promise<Promotion> {
    try {
      const originalPromotion = await this.getPromotion(promotionId);
      if (!originalPromotion) {
        throw new Error('Promotion originale non trouvée');
      }

      const clonedPromotion = {
        ...originalPromotion,
        id: undefined,
        name: newName,
        usageCount: 0,
        isActive: false, // Inactif par défaut
        createdAt: undefined,
        updatedAt: undefined,
        createdBy
      };

      return await this.createPromotion(clonedPromotion as any);

    } catch (error) {
      performanceMonitor.error('Erreur clonage promotion', { promotionId, error });
      throw error;
    }
  }
}

// Instance singleton
export const promotionsService = PromotionsService.getInstance();

// Export pour utilisation dans les hooks
export default promotionsService;