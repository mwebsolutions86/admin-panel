/**
 * Hooks React pour le Système de Promotions et Coupons
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Ce module fournit les hooks React pour intégrer le système de promotions :
 * - Hook principal pour les données de promotions
 * - Hook pour les codes promo et validation
 * - Hook pour les analytics de promotions
 * - Hook pour la gestion des campagnes
 * - Hook pour les actions utilisateur (application de codes)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  promotionsService, 
  Promotion, 
  PromotionValidationResult,
  PromotionAnalytics,
  PromotionCampaign
} from '../lib/promotions-service';
import { 
  couponsManager,
  AdvancedCouponCode,
  CouponValidationRequest,
  CouponValidationResponse,
  CouponAnalytics
} from '../lib/coupons-manager';
import { analyticsService } from '../lib/analytics-service';
import { performanceMonitor } from '../lib/performance-monitor';

// Types pour les hooks
export interface UsePromotionsData {
  promotions: Promotion[];
  activePromotions: Promotion[];
  userPromotions: Promotion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  applyPromotion: (promotionId: string, orderData: any) => Promise<PromotionValidationResult>;
}

export interface UseCouponValidationData {
  validationResult: CouponValidationResponse | null;
  isValidating: boolean;
  error: string | null;
  validateCoupon: (request: CouponValidationRequest) => Promise<CouponValidationResponse>;
  clearValidation: () => void;
}

export interface UseCouponAnalyticsData {
  analytics: CouponAnalytics | null;
  performanceReport: any;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  generateReport: (filters?: any) => Promise<any>;
}

export interface UseCampaignData {
  campaigns: PromotionCampaign[];
  activeCampaigns: PromotionCampaign[];
  campaignPromotions: Record<string, Promotion[]>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCampaign: (campaignData: any) => Promise<PromotionCampaign>;
}

export interface UsePromotionsActionsData {
  isProcessing: boolean;
  createPromotion: (promotionData: any) => Promise<Promotion>;
  updatePromotion: (promotionId: string, updates: any) => Promise<Promotion>;
  deactivatePromotion: (promotionId: string, reason?: string) => Promise<void>;
  clonePromotion: (promotionId: string, newName: string) => Promise<Promotion>;
  generateCoupons: (promotionId: string, count: number, options?: any) => Promise<any>;
  distributeCoupons: (couponId: string, channels: any[], options?: any) => Promise<void>;
}

/**
 * Hook principal pour les données de promotions d'un utilisateur
 */
export function usePromotions(userId: string | null, location?: { lat: number; lng: number }): UsePromotionsData {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);
  const [userPromotions, setUserPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setPromotions([]);
      setActivePromotions([]);
      setUserPromotions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [allPromotions, active] = await Promise.all([
        promotionsService.getActivePromotions({ userId }),
        promotionsService.getActivePromotions({ 
          userId, 
          location 
        })
      ]);

      setPromotions(allPromotions);
      setActivePromotions(active);

      // Récupérer les promotions spécifiques à l'utilisateur
      const userSpecificPromotions = allPromotions.filter(promo => 
        promo.targetAudience.type === 'loyalty_members' ||
        promo.targetAudience.type === 'vip' ||
        (promo.targetAudience.type === 'segmented' && promo.targetAudience.segments?.length)
      );

      setUserPromotions(userSpecificPromotions);

      performanceMonitor.debug('Données promotions chargées', { 
        userId, 
        totalPromotions: allPromotions.length,
        activeCount: active.length,
        userSpecificCount: userSpecificPromotions.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement promotions', { userId, error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId, location?.lat, location?.lng]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyPromotion = useCallback(async (
    promotionId: string, 
    orderData: {
      totalAmount: number;
      products: Array<{ id: string; category: string; price: number }>;
      storeId: string;
      location?: { lat: number; lng: number };
    }
  ): Promise<PromotionValidationResult> => {
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      const result = await promotionsService.validatePromotion(
        promotionId,
        userId,
        orderData
      );

      if (result.isValid) {
        // Track analytics
        await analyticsService.trackEvent({
          type: 'promotion_applied',
          category: 'promotion',
          userId,
          metadata: {
            promotionId,
            discount: result.discount,
            finalAmount: result.finalAmount,
            stackingApplied: result.stackingApplied
          }
        });

        performanceMonitor.info('Promotion appliquée', {
          userId,
          promotionId,
          discount: result.discount
        });
      }

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur application promotion';
      performanceMonitor.error('Erreur application promotion', { userId, promotionId, error: err });
      throw new Error(errorMessage);
    }
  }, [userId]);

  return {
    promotions,
    activePromotions,
    userPromotions,
    isLoading,
    error,
    refresh: fetchData,
    applyPromotion
  };
}

/**
 * Hook pour la validation de codes coupon
 */
export function useCouponValidation(): UseCouponValidationData {
  const [validationResult, setValidationResult] = useState<CouponValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCoupon = useCallback(async (request: CouponValidationRequest): Promise<CouponValidationResponse> => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await couponsManager.validateCoupon(request);
      setValidationResult(result);

      performanceMonitor.debug('Code coupon validé', {
        code: request.code,
        isValid: result.isValid,
        validationTime: Date.now()
      });

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur validation coupon';
      setError(errorMessage);
      performanceMonitor.error('Erreur validation coupon', { code: request.code, error: err });
      throw new Error(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    validationResult,
    isValidating,
    error,
    validateCoupon,
    clearValidation
  };
}

/**
 * Hook pour les analytics de coupons et promotions
 */
export function useCouponAnalytics(couponId?: string): UseCouponAnalyticsData {
  const [analytics, setAnalytics] = useState<CouponAnalytics | null>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!couponId) {
      setAnalytics(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const couponAnalytics = await couponsManager.getCouponAnalytics(couponId);
      setAnalytics(couponAnalytics);

      performanceMonitor.debug('Analytics coupon chargées', { 
        couponId,
        views: couponAnalytics.views,
        redemptions: couponAnalytics.redemptions
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur chargement analytics';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement analytics coupon', { couponId, error: err });
    } finally {
      setIsLoading(false);
    }
  }, [couponId]);

  const generateReport = useCallback(async (filters: any = {}): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const report = await couponsManager.generatePerformanceReport(filters);
      setPerformanceReport(report);

      performanceMonitor.info('Rapport performance généré', {
        couponId,
        filters,
        totalCoupons: report.summary.totalCoupons
      });

      return report;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur génération rapport';
      setError(errorMessage);
      performanceMonitor.error('Erreur génération rapport performance', { filters, error: err });
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [couponId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    performanceReport,
    isLoading,
    error,
    refresh: fetchAnalytics,
    generateReport
  };
}

/**
 * Hook pour la gestion des campagnes de promotions
 */
export function useCampaigns(): UseCampaignData {
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<PromotionCampaign[]>([]);
  const [campaignPromotions, setCampaignPromotions] = useState<Record<string, Promotion[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Récupérer les campagnes depuis le service (implémentation simplifiée)
      // En réalité, il faudrait une méthode getCampaigns dans promotionsService
      const allCampaigns: PromotionCampaign[] = [];
      
      // Filtrer les campagnes actives
      const now = new Date();
      const active = allCampaigns.filter(campaign => 
        new Date(campaign.startDate) <= now && 
        new Date(campaign.endDate) >= now &&
        campaign.isActive
      );

      setCampaigns(allCampaigns);
      setActiveCampaigns(active);

      // Récupérer les promotions pour chaque campagne
      const promotionsMap: Record<string, Promotion[]> = {};
      for (const campaign of active) {
        const campaignPromotionList = await Promise.all(
          campaign.promotions.map(async (promoId) => {
            try {
              return await promotionsService.getPromotion(promoId);
            } catch {
              return null;
            }
          })
        );
        promotionsMap[campaign.id] = campaignPromotionList.filter(Boolean) as Promotion[];
      }

      setCampaignPromotions(promotionsMap);

      performanceMonitor.debug('Données campagnes chargées', {
        totalCampaigns: allCampaigns.length,
        activeCampaigns: active.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur chargement campagnes';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement campagnes', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (campaignData: Omit<PromotionCampaign, 'id' | 'createdAt' | 'spent'>): Promise<PromotionCampaign> => {
    try {
      const campaign = await promotionsService.createCampaign(campaignData);
      
      // Rafraîchir les données
      await fetchData();

      performanceMonitor.info('Campagne créée', {
        campaignId: campaign.id,
        name: campaign.name,
        promotionsCount: campaign.promotions.length
      });

      return campaign;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création campagne';
      performanceMonitor.error('Erreur création campagne', { error: err });
      throw new Error(errorMessage);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    campaigns,
    activeCampaigns,
    campaignPromotions,
    isLoading,
    error,
    refresh: fetchData,
    createCampaign
  };
}

/**
 * Hook pour les actions de promotions (admin)
 */
export function usePromotionsActions(): UsePromotionsActionsData {
  const [isProcessing, setIsProcessing] = useState(false);

  const createPromotion = useCallback(async (promotionData: any): Promise<Promotion> => {
    if (!promotionData.createdBy) {
      throw new Error('Utilisateur requis pour créer une promotion');
    }

    setIsProcessing(true);
    try {
      const promotion = await promotionsService.createPromotion(promotionData);
      
      // Track analytics
      await analyticsService.trackEvent({
        type: 'promotion_created',
        category: 'promotion',
        userId: promotionData.createdBy,
        metadata: {
          promotionId: promotion.id,
          type: promotion.type,
          discountValue: promotion.discountValue
        }
      });

      performanceMonitor.info('Promotion créée via hook', {
        promotionId: promotion.id,
        name: promotion.name
      });

      return promotion;

    } catch (err) {
      performanceMonitor.error('Erreur création promotion via hook', { error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const updatePromotion = useCallback(async (promotionId: string, updates: any): Promise<Promotion> => {
    setIsProcessing(true);
    try {
      const promotion = await promotionsService.updatePromotion(promotionId, updates);
      performanceMonitor.info('Promotion mise à jour via hook', { promotionId });
      return promotion;
    } catch (err) {
      performanceMonitor.error('Erreur mise à jour promotion via hook', { promotionId, error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const deactivatePromotion = useCallback(async (promotionId: string, reason?: string): Promise<void> => {
    setIsProcessing(true);
    try {
      await promotionsService.deactivatePromotion(promotionId, reason);
      performanceMonitor.info('Promotion désactivée via hook', { promotionId, reason });
    } catch (err) {
      performanceMonitor.error('Erreur désactivation promotion via hook', { promotionId, error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clonePromotion = useCallback(async (promotionId: string, newName: string): Promise<Promotion> => {
    if (!newName.trim()) {
      throw new Error('Nom requis pour cloner une promotion');
    }

    setIsProcessing(true);
    try {
      const clonedPromotion = await promotionsService.clonePromotion(
        promotionId, 
        newName, 
        'current_user' // En réalité, récupérer l'utilisateur actuel
      );
      
      performanceMonitor.info('Promotion clonée via hook', {
        originalPromotionId: promotionId,
        clonedPromotionId: clonedPromotion.id,
        newName
      });

      return clonedPromotion;

    } catch (err) {
      performanceMonitor.error('Erreur clonage promotion via hook', { promotionId, error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generateCoupons = useCallback(async (
    promotionId: string, 
    count: number, 
    options: any = {}
  ): Promise<any> => {
    setIsProcessing(true);
    try {
      const batch = await couponsManager.generateCouponBatch(promotionId, count, options);
      
      performanceMonitor.info('Coupons générés via hook', {
        promotionId,
        count,
        batchId: batch.id
      });

      return batch;

    } catch (err) {
      performanceMonitor.error('Erreur génération coupons via hook', { promotionId, count, error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const distributeCoupons = useCallback(async (
    couponId: string, 
    channels: any[], 
    options: any = {}
  ): Promise<void> => {
    setIsProcessing(true);
    try {
      await couponsManager.distributeCoupon(couponId, channels, options);
      
      performanceMonitor.info('Coupons distribués via hook', {
        couponId,
        channels: channels.map(c => c.type)
      });

    } catch (err) {
      performanceMonitor.error('Erreur distribution coupons via hook', { couponId, error: err });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    createPromotion,
    updatePromotion,
    deactivatePromotion,
    clonePromotion,
    generateCoupons,
    distributeCoupons
  };
}

/**
 * Hook combinant toutes les données de promotions
 */
export function usePromotionsComplete(
  userId: string | null, 
  location?: { lat: number; lng: number }
) {
  const promotionsData = usePromotions(userId, location);
  const validationData = useCouponValidation();
  const analyticsData = useCouponAnalytics();
  const campaignsData = useCampaigns();
  const actionsData = usePromotionsActions();

  // État global de chargement
  const isLoading = promotionsData.isLoading || 
                   validationData.isValidating ||
                   analyticsData.isLoading ||
                   campaignsData.isLoading ||
                   actionsData.isProcessing;

  // Erreurs combinées
  const errors = [
    promotionsData.error,
    validationData.error,
    analyticsData.error,
    campaignsData.error
  ].filter(Boolean);

  const error = errors.length > 0 ? errors.join(', ') : null;

  // Fonction de rafraîchissement globale
  const refreshAll = useCallback(async () => {
    await Promise.all([
      promotionsData.refresh(),
      campaignsData.refresh(),
      analyticsData.refresh()
    ]);
  }, [promotionsData.refresh, campaignsData.refresh, analyticsData.refresh]);

  // Données combinées
  const combinedData = useMemo(() => ({
    // Données de base
    promotions: promotionsData.promotions,
    activePromotions: promotionsData.activePromotions,
    userPromotions: promotionsData.userPromotions,
    
    // Validation
    validationResult: validationData.validationResult,
    isValidating: validationData.isValidating,
    
    // Analytics
    couponAnalytics: analyticsData.analytics,
    performanceReport: analyticsData.performanceReport,
    
    // Campagnes
    campaigns: campaignsData.campaigns,
    activeCampaigns: campaignsData.activeCampaigns,
    campaignPromotions: campaignsData.campaignPromotions,
    
    // Actions
    isProcessing: actionsData.isProcessing,
    
    // Méthodes combinées
    applyPromotion: promotionsData.applyPromotion,
    validateCoupon: validationData.validateCoupon,
    clearValidation: validationData.clearValidation,
    generateReport: analyticsData.generateReport,
    createCampaign: campaignsData.createCampaign,
    createPromotion: actionsData.createPromotion,
    updatePromotion: actionsData.updatePromotion,
    deactivatePromotion: actionsData.deactivatePromotion,
    clonePromotion: actionsData.clonePromotion,
    generateCoupons: actionsData.generateCoupons,
    distributeCoupons: actionsData.distributeCoupons
  }), [
    promotionsData.promotions,
    promotionsData.activePromotions,
    promotionsData.userPromotions,
    promotionsData.applyPromotion,
    validationData.validationResult,
    validationData.isValidating,
    validationData.validateCoupon,
    validationData.clearValidation,
    analyticsData.analytics,
    analyticsData.performanceReport,
    analyticsData.generateReport,
    campaignsData.campaigns,
    campaignsData.activeCampaigns,
    campaignsData.campaignPromotions,
    campaignsData.createCampaign,
    actionsData.isProcessing,
    actionsData.createPromotion,
    actionsData.updatePromotion,
    actionsData.deactivatePromotion,
    actionsData.clonePromotion,
    actionsData.generateCoupons,
    actionsData.distributeCoupons
  ]);

  return {
    ...combinedData,
    isLoading,
    error,
    refresh: refreshAll
  };
}

/**
 * Hook pour les promotions recommandées
 */
export function useRecommendedPromotions(userId: string | null) {
  const [recommendations, setRecommendations] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    try {
      const promotions = await promotionsService.getActivePromotions({ userId });
      
      // Filtrer et scorer les promotions recommandées
      const recommended = promotions
        .filter(promo => {
          // Logique de recommandation simplifiée
          return promo.isActive && 
                 new Date(promo.validFrom) <= new Date() &&
                 new Date(promo.validUntil) >= new Date();
        })
        .sort((a, b) => {
          // Prioriser par popularité (usageCount) et date d'expiration
          const scoreA = a.usageCount + (1 / (new Date(a.validUntil).getTime() - Date.now()));
          const scoreB = b.usageCount + (1 / (new Date(b.validUntil).getTime() - Date.now()));
          return scoreB - scoreA;
        })
        .slice(0, 10);

      setRecommendations(recommended);

    } catch (error) {
      performanceMonitor.error('Erreur récupération recommandations promotions', { userId, error });
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    refresh: fetchRecommendations
  };
}

// Export des hooks
export {
  usePromotions,
  useCouponValidation,
  useCouponAnalytics,
  useCampaigns,
  usePromotionsActions,
  useRecommendedPromotions
};