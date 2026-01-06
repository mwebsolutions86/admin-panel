/**
 * Gestionnaire de Coupons et Codes Promo Avancé
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Ce module gère spécifiquement :
 * - Génération de codes promo uniques et sécurisés
 * - Distribution multi-canal (QR codes, emails, notifications)
 * - Validation et utilisation des codes
 * - Suivi des statistiques d'utilisation
 * - Détection de fraude et sécurité
 * - Codes de parrainage et referral
 * - Batch processing pour les grandes campagnes
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { userCache, CacheUtils } from './cache-service';
import { analyticsService } from './analytics-service';
import { notificationsService } from './notifications-service';
import { promotionsService, CouponCode, PromotionUsage, Promotion } from './promotions-service';

// Types pour la gestion avancée des coupons
export interface AdvancedCouponCode extends CouponCode {
  distributionChannels: DistributionChannel[];
  batchId?: string;
  securityFeatures: SecurityFeatures;
  analytics: CouponAnalytics;
  referralInfo?: ReferralInfo;
  qrCode?: string;
  shortUrl?: string;
}

export interface DistributionChannel {
  type: 'qr_code' | 'email' | 'push_notification' | 'sms' | 'social_media' | 'referral_link' | 'physical_card';
  isActive: boolean;
  distributionCount: number;
  usageCount: number;
  lastDistributedAt?: string;
  metadata: Record<string, any>;
}

export interface SecurityFeatures {
  ipRestriction?: string[];
  deviceFingerprinting: boolean;
  rateLimitPerHour: number;
  requireAuthentication: boolean;
  geoValidation: boolean;
  timeWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  maxRedemptionsPerDevice: number;
  blacklistRules: string[];
}

export interface CouponAnalytics {
  views: number;
  clicks: number;
  redemptions: number;
  conversionRate: number;
  averageTimeToRedemption: number; // en minutes
  fraudAttempts: number;
  deviceTypes: Record<string, number>;
  locations: Record<string, number>;
  peakHours: number[];
  userDemographics: {
    ageGroups: Record<string, number>;
    loyaltyLevels: Record<string, number>;
    newVsReturning: Record<string, number>;
  };
  referralStats?: {
    referredCount: number;
    referralConversionRate: number;
    averageReferralValue: number;
  };
}

export interface ReferralInfo {
  referrerId: string;
  referralCode: string;
  rewardForReferrer: number;
  rewardForReferred: number;
  maxReferrals: number;
  currentReferrals: number;
  referralProgram: string;
}

export interface CouponBatch {
  id: string;
  name: string;
  description: string;
  promotionId: string;
  totalCodes: number;
  generatedCodes: number;
  distributedCodes: number;
  usedCodes: number;
  distributionChannels: DistributionChannel['type'][];
  createdAt: string;
  distributedAt?: string;
  expiresAt: string;
  status: 'generating' | 'ready' | 'distributing' | 'distributed' | 'expired';
  metadata: Record<string, any>;
}

export interface CouponValidationRequest {
  code: string;
  userId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  orderData?: {
    totalAmount: number;
    products: Array<{ id: string; category: string; price: number }>;
    storeId: string;
  };
}

export interface CouponValidationResponse {
  isValid: boolean;
  coupon?: AdvancedCouponCode;
  discount: number;
  finalAmount: number;
  reasons: string[];
  securityChecks: {
    passed: boolean;
    warnings: string[];
    suspicious: boolean;
  };
  rateLimitInfo: {
    remaining: number;
    resetTime: string;
  };
  appliedPromotion?: Promotion;
}

export interface CouponFraudDetection {
  isFraud: boolean;
  riskScore: number;
  reasons: string[];
  actions: Array<{
    type: 'block' | 'flag' | 'require_verification' | 'log_only';
    message: string;
  }>;
  confidence: number;
}

// Configuration du gestionnaire
export interface CouponsManagerConfig {
  maxCodesPerBatch: number;
  defaultCodeLength: number;
  enableQRGeneration: boolean;
  enableShortUrls: boolean;
  qrCodeSize: number;
  fraudDetectionEnabled: boolean;
  rateLimitPerHour: number;
  maxRedemptionsPerHour: number;
  enableGeoValidation: boolean;
  enableDeviceFingerprinting: boolean;
  batchProcessingEnabled: boolean;
  emailTemplatesEnabled: boolean;
  socialMediaIntegration: boolean;
  physicalCardsEnabled: boolean;
}

// Configuration par défaut
const DEFAULT_CONFIG: CouponsManagerConfig = {
  maxCodesPerBatch: 10000,
  defaultCodeLength: 8,
  enableQRGeneration: true,
  enableShortUrls: true,
  qrCodeSize: 256,
  fraudDetectionEnabled: true,
  rateLimitPerHour: 10,
  maxRedemptionsPerHour: 5,
  enableGeoValidation: true,
  enableDeviceFingerprinting: true,
  batchProcessingEnabled: true,
  emailTemplatesEnabled: true,
  socialMediaIntegration: true,
  physicalCardsEnabled: false
};

/**
 * Gestionnaire principal des coupons et codes promo
 */
export class CouponsManager {
  private static instance: CouponsManager;
  private config: CouponsManagerConfig;
  private activeCoupons = new Map<string, AdvancedCouponCode>();
  private fraudPatterns = new Map<string, number>();
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  private batchQueue: CouponBatch[] = [];

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initializeFraudPatterns();
    this.startPeriodicTasks();
  }

  static getInstance(): CouponsManager {
    if (!CouponsManager.instance) {
      CouponsManager.instance = new CouponsManager();
    }
    return CouponsManager.instance;
  }

  /**
   * === GÉNÉRATION DE CODES ===
   */

  /**
   * Génère un batch de codes coupon
   */
  async generateCouponBatch(
    promotionId: string,
    count: number,
    options: {
      codePattern?: string;
      customPrefix?: string;
      validUntil?: string;
      usageLimit?: number;
      distributionChannels?: DistributionChannel['type'][];
      securityFeatures?: Partial<SecurityFeatures>;
      batchName?: string;
      description?: string;
    } = {}
  ): Promise<CouponBatch> {
    try {
      if (count > this.config.maxCodesPerBatch) {
        throw new Error(`Nombre de codes dépasse la limite de ${this.config.maxCodesPerBatch}`);
      }

      // Créer le batch
      const batch: CouponBatch = {
        id: this.generateBatchId(),
        name: options.batchName || `Batch ${Date.now()}`,
        description: options.description || '',
        promotionId,
        totalCodes: count,
        generatedCodes: 0,
        distributedCodes: 0,
        usedCodes: 0,
        distributionChannels: options.distributionChannels || ['qr_code'],
        createdAt: new Date().toISOString(),
        expiresAt: options.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'generating',
        metadata: {
          codePattern: options.codePattern,
          customPrefix: options.customPrefix,
          securityFeatures: options.securityFeatures
        }
      };

      // Sauvegarder le batch
      const { error: batchError } = await supabase
        .from('coupon_batches')
        .insert([batch]);

      if (batchError) throw batchError;

      // Générer les codes
      const codes = await this.generateCodesForBatch(
        batch,
        count,
        options
      );

      // Mettre à jour le statut du batch
      batch.status = 'ready';
      batch.generatedCodes = codes.length;

      const { error: updateError } = await supabase
        .from('coupon_batches')
        .update({ 
          status: batch.status,
          generatedCodes: batch.generatedCodes
        })
        .eq('id', batch.id);

      if (updateError) throw updateError;

      // Générer QR codes et URLs courtes si activé
      if (this.config.enableQRGeneration || this.config.enableShortUrls) {
        await this.enhanceCouponsWithDistributionData(codes);
      }

      performanceMonitor.info('Batch de coupons généré', {
        batchId: batch.id,
        promotionId,
        count: codes.length
      });

      return batch;

    } catch (error) {
      performanceMonitor.error('Erreur génération batch coupons', { promotionId, count, error });
      throw error;
    }
  }

  /**
   * Génère un code coupon unique individuel
   */
  async generateSingleCoupon(
    promotionId: string,
    options: {
      customCode?: string;
      validUntil?: string;
      usageLimit?: number;
      distributionChannels?: DistributionChannel['type'][];
      securityFeatures?: Partial<SecurityFeatures>;
      referralInfo?: ReferralInfo;
    } = {}
  ): Promise<AdvancedCouponCode> {
    try {
      const code = options.customCode || this.generateSecureCode();

      // Vérifier l'unicité du code
      const existing = await this.getCouponByCode(code);
      if (existing) {
        return await this.generateSingleCoupon(promotionId, options);
      }

      const coupon: AdvancedCouponCode = {
        id: this.generateCouponId(),
        promotionId,
        code,
        isActive: true,
        usageCount: 0,
        maxUsage: options.usageLimit,
        validFrom: new Date().toISOString(),
        validUntil: options.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        distributionChannels: this.initializeDistributionChannels(options.distributionChannels || ['qr_code']),
        securityFeatures: this.initializeSecurityFeatures(options.securityFeatures),
        analytics: this.initializeCouponAnalytics(),
        referralInfo: options.referralInfo
      };

      // Enrichir avec QR code et URL courte
      if (this.config.enableQRGeneration) {
        coupon.qrCode = await this.generateQRCode(coupon.code);
      }

      if (this.config.enableShortUrls) {
        coupon.shortUrl = await this.generateShortUrl(coupon.code);
      }

      // Sauvegarder en base
      const { error } = await supabase
        .from('advanced_coupon_codes')
        .insert([coupon]);

      if (error) throw error;

      // Mettre en cache
      this.activeCoupons.set(coupon.id, coupon);

      performanceMonitor.info('Coupon individuel généré', {
        couponId: coupon.id,
        code: coupon.code,
        promotionId
      });

      return coupon;

    } catch (error) {
      performanceMonitor.error('Erreur génération coupon individuel', { promotionId, error });
      throw error;
    }
  }

  /**
   * === VALIDATION ET SÉCURITÉ ===
   */

  /**
   * Valide un code coupon avec vérifications de sécurité avancées
   */
  async validateCoupon(request: CouponValidationRequest): Promise<CouponValidationResponse> {
    try {
      const startTime = Date.now();

      // Vérifications de base
      const basicValidation = await this.performBasicValidation(request);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Vérifications de sécurité
      const securityChecks = await this.performSecurityChecks(request);
      if (!securityChecks.passed) {
        return {
          isValid: false,
          discount: 0,
          finalAmount: request.orderData?.totalAmount || 0,
          reasons: securityChecks.warnings,
          securityChecks,
          rateLimitInfo: this.getRateLimitInfo(request)
        };
      }

      // Détection de fraude
      const fraudDetection = await this.detectFraud(request);
      if (fraudDetection.isFraud) {
        await this.handleFraudAttempt(request, fraudDetection);
        
        return {
          isValid: false,
          discount: 0,
          finalAmount: request.orderData?.totalAmount || 0,
          reasons: ['Utilisation frauduleuse détectée'],
          securityChecks: {
            passed: false,
            warnings: fraudDetection.reasons,
            suspicious: true
          },
          rateLimitInfo: this.getRateLimitInfo(request)
        };
      }

      // Récupérer le coupon avec données complètes
      const coupon = await this.getCouponWithAnalytics(request.code);
      if (!coupon) {
        return {
          isValid: false,
          discount: 0,
          finalAmount: request.orderData?.totalAmount || 0,
          reasons: ['Code coupon non trouvé'],
          securityChecks,
          rateLimitInfo: this.getRateLimitInfo(request)
        };
      }

      // Validation business logic
      const businessValidation = await this.performBusinessValidation(coupon, request);
      if (!businessValidation.isValid) {
        return businessValidation;
      }

      // Mettre à jour les analytics
      await this.updateCouponAnalytics(coupon.id, request);

      const validationTime = Date.now() - startTime;
      performanceMonitor.debug('Validation coupon réussie', {
        code: request.code,
        validationTime,
        securityScore: securityChecks.passed ? 100 : 0
      });

      return {
        isValid: true,
        coupon,
        discount: businessValidation.discount,
        finalAmount: businessValidation.finalAmount,
        reasons: [],
        securityChecks,
        rateLimitInfo: this.getRateLimitInfo(request)
      };

    } catch (error) {
      performanceMonitor.error('Erreur validation coupon', { code: request.code, error });
      throw error;
    }
  }

  /**
   * === DISTRIBUTION ===
   */

  /**
   * Distribue un coupon via différents canaux
   */
  async distributeCoupon(
    couponId: string,
    channels: Array<{
      type: DistributionChannel['type'];
      targetAudience?: string[];
      scheduledAt?: string;
      metadata?: Record<string, any>;
    }>,
    options: {
      batchDistribution?: boolean;
      trackOpens?: boolean;
      customMessage?: string;
    } = {}
  ): Promise<void> {
    try {
      const coupon = await this.getCouponWithAnalytics(couponId);
      if (!coupon) {
        throw new Error('Coupon non trouvé');
      }

      for (const channel of channels) {
        await this.distributeViaChannel(coupon, channel, options);
      }

      // Mettre à jour les statistiques de distribution
      await this.updateDistributionStats(couponId, channels);

      performanceMonitor.info('Coupon distribué', {
        couponId,
        channels: channels.map(c => c.type),
        count: channels.length
      });

    } catch (error) {
      performanceMonitor.error('Erreur distribution coupon', { couponId, error });
      throw error;
    }
  }

  /**
   * Génère et distribue des QR codes en masse
   */
  async generateAndDistributeQRCodes(
    promotionId: string,
    count: number,
    distributionConfig: {
      printFormat?: 'individual' | 'sheet' | 'booklet';
      includeBranding?: boolean;
      customDesign?: string;
      printSettings?: {
        dpi: number;
        format: 'PNG' | 'SVG' | 'PDF';
        size: number;
      };
    } = {}
  ): Promise<{
    batchId: string;
    qrCodes: Array<{
      code: string;
      qrCode: string;
      downloadUrl: string;
    }>;
    printableSheet?: string;
  }> {
    try {
      // Générer le batch de codes
      const batch = await this.generateCouponBatch(promotionId, count, {
        distributionChannels: ['qr_code'],
        batchName: 'QR Codes Batch',
        description: `Génération de ${count} QR codes pour promotion ${promotionId}`
      });

      // Récupérer tous les codes du batch
      const codes = await this.getCouponsByBatchId(batch.id);

      // Générer les QR codes
      const qrCodes = await Promise.all(
        codes.map(async (coupon) => ({
          code: coupon.code,
          qrCode: await this.generateQRCode(coupon.code),
          downloadUrl: await this.generateDownloadUrl(coupon.code, 'qr')
        }))
      );

      // Générer une feuille imprimable si demandé
      let printableSheet;
      if (distributionConfig.printFormat === 'sheet') {
        printableSheet = await this.generatePrintableSheet(qrCodes, distributionConfig);
      }

      return {
        batchId: batch.id,
        qrCodes,
        printableSheet
      };

    } catch (error) {
      performanceMonitor.error('Erreur génération QR codes', { promotionId, count, error });
      throw error;
    }
  }

  /**
   * === ANALYTICS ET RAPPORTS ===
   */

  /**
   * Récupère les analytics détaillés d'un coupon
   */
  async getCouponAnalytics(couponId: string): Promise<CouponAnalytics> {
    try {
      const coupon = await this.getCouponWithAnalytics(couponId);
      if (!coupon) {
        throw new Error('Coupon non trouvé');
      }

      // Calculer les métriques en temps réel
      const realTimeMetrics = await this.calculateRealTimeMetrics(couponId);
      
      // Enrichir avec les analytics existantes
      const enrichedAnalytics = {
        ...coupon.analytics,
        ...realTimeMetrics,
        conversionRate: coupon.analytics.views > 0 ? 
          (coupon.analytics.redemptions / coupon.analytics.views) * 100 : 0,
        averageTimeToRedemption: await this.calculateAverageTimeToRedemption(couponId)
      };

      return enrichedAnalytics;

    } catch (error) {
      performanceMonitor.error('Erreur récupération analytics coupon', { couponId, error });
      throw error;
    }
  }

  /**
   * Génère un rapport de performance des coupons
   */
  async generatePerformanceReport(
    filters: {
      promotionId?: string;
      batchId?: string;
      dateRange?: { start: Date; end: Date };
      channels?: string[];
      includeFraudData?: boolean;
    } = {}
  ): Promise<{
    summary: {
      totalCoupons: number;
      totalUses: number;
      totalRevenue: number;
      fraudAttempts: number;
      averageConversionRate: number;
    };
    topPerforming: Array<{
      couponId: string;
      code: string;
      uses: number;
      revenue: number;
      conversionRate: number;
    }>;
    channelPerformance: Record<string, {
      distributed: number;
      used: number;
      conversionRate: number;
      revenue: number;
    }>;
    fraudAnalysis?: {
      totalAttempts: number;
      blockedAttempts: number;
      riskScore: number;
      commonPatterns: string[];
    };
    timeSeriesData: Array<{
      date: string;
      uses: number;
      revenue: number;
      fraudAttempts: number;
    }>;
  }> {
    try {
      // Récupérer les données selon les filtres
      const couponData = await this.getCouponDataByFilters(filters);
      
      // Calculer les métriques de résumé
      const summary = await this.calculateSummaryMetrics(couponData);
      
      // Identifier les top performers
      const topPerforming = await this.calculateTopPerformingCoupons(couponData);
      
      // Analyser la performance par canal
      const channelPerformance = await this.calculateChannelPerformance(couponData);
      
      // Analyser la fraude si demandé
      let fraudAnalysis;
      if (filters.includeFraudData) {
        fraudAnalysis = await this.generateFraudAnalysis(filters);
      }
      
      // Générer les données de série temporelle
      const timeSeriesData = await this.generateTimeSeriesData(couponData, filters.dateRange);

      return {
        summary,
        topPerforming,
        channelPerformance,
        fraudAnalysis,
        timeSeriesData
      };

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport performance', { filters, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private async generateCodesForBatch(
    batch: CouponBatch,
    count: number,
    options: any
  ): Promise<AdvancedCouponCode[]> {
    const codes: AdvancedCouponCode[] = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateSecureCode(options.codePattern, options.customPrefix);
      
      const coupon: AdvancedCouponCode = {
        id: this.generateCouponId(),
        promotionId: batch.promotionId,
        code,
        isActive: true,
        usageCount: 0,
        maxUsage: options.usageLimit,
        validFrom: new Date().toISOString(),
        validUntil: options.validUntil || batch.expiresAt,
        createdAt: new Date().toISOString(),
        distributionChannels: this.initializeDistributionChannels(batch.distributionChannels),
        securityFeatures: this.initializeSecurityFeatures(options.securityFeatures),
        analytics: this.initializeCouponAnalytics(),
        batchId: batch.id
      };

      codes.push(coupon);
    }

    // Sauvegarder en base par batch
    const { error } = await supabase
      .from('advanced_coupon_codes')
      .insert(codes);

    if (error) throw error;

    // Mettre en cache
    codes.forEach(coupon => {
      this.activeCoupons.set(coupon.id, coupon);
    });

    return codes;
  }

  private generateSecureCode(pattern?: string, prefix?: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix || 'UE';

    // Ajouter des caractères aléatoires selon le pattern
    const codeLength = this.config.defaultCodeLength;
    for (let i = 0; i < codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ajouter un checksum pour la validation
    const checksum = this.calculateChecksum(code);
    code += checksum;

    return code;
  }

  private calculateChecksum(code: string): string {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
      sum += code.charCodeAt(i);
    }
    return (sum % 100).toString().padStart(2, '0');
  }

  private async performBasicValidation(request: CouponValidationRequest): Promise<CouponValidationResponse> {
    if (!request.code || request.code.length < 6) {
      return {
        isValid: false,
        discount: 0,
        finalAmount: request.orderData?.totalAmount || 0,
        reasons: ['Code invalide'],
        securityChecks: { passed: false, warnings: [], suspicious: false },
        rateLimitInfo: this.getRateLimitInfo(request)
      };
    }

    // Vérifier le checksum
    if (!this.validateChecksum(request.code)) {
      return {
        isValid: false,
        discount: 0,
        finalAmount: request.orderData?.totalAmount || 0,
        reasons: ['Code corrompu'],
        securityChecks: { passed: false, warnings: [], suspicious: false },
        rateLimitInfo: this.getRateLimitInfo(request)
      };
    }

    return {
      isValid: true,
      discount: 0,
      finalAmount: request.orderData?.totalAmount || 0,
      reasons: [],
      securityChecks: { passed: true, warnings: [], suspicious: false },
      rateLimitInfo: this.getRateLimitInfo(request)
    };
  }

  private validateChecksum(code: string): boolean {
    if (code.length < 3) return false;
    
    const mainCode = code.slice(0, -2);
    const checksum = code.slice(-2);
    const calculatedChecksum = this.calculateChecksum(mainCode);
    
    return checksum === calculatedChecksum;
  }

  private async performSecurityChecks(request: CouponValidationRequest): Promise<{
    passed: boolean;
    warnings: string[];
    suspicious: boolean;
  }> {
    const warnings: string[] = [];
    let suspicious = false;

    // Vérifier le rate limiting
    const rateLimitInfo = this.getRateLimitInfo(request);
    if (rateLimitInfo.remaining <= 0) {
      warnings.push('Limite de tentatives atteinte');
      suspicious = true;
    }

    // Vérifier les restrictions IP si configurées
    if (request.ipAddress && await this.isIPBlocked(request.ipAddress)) {
      warnings.push('Adresse IP bloquée');
      suspicious = true;
    }

    // Vérifier les heures d'utilisation autorisées
    if (await this.isOutsideAllowedHours()) {
      warnings.push('Utilisation en dehors des heures autorisées');
      suspicious = true;
    }

    // Vérifier la géolocalisation si activée
    if (this.config.enableGeoValidation && request.location) {
      const geoCheck = await this.validateGeographicRestrictions(request);
      if (!geoCheck.allowed) {
        if (geoCheck.reason) warnings.push(geoCheck.reason);
        suspicious = true;
      }
    }

    return {
      passed: warnings.length === 0,
      warnings,
      suspicious
    };
  }

  private async detectFraud(request: CouponValidationRequest): Promise<CouponFraudDetection> {
    const reasons: string[] = [];
    let riskScore = 0;
    const actions: Array<{ type: 'block' | 'flag' | 'require_verification' | 'log_only'; message: string }> = [];

    // Détecter les patterns suspects
    if (await this.isBotActivity(request)) {
      reasons.push('Activité automatisée détectée');
      riskScore += 40;
      actions.push({ type: 'block', message: 'Activité bot bloquée' });
    }

    // Vérifier la vitesse d'utilisation
    if (await this.isUnusualUsageSpeed(request)) {
      reasons.push('Vitesse d\'utilisation inhabituelle');
      riskScore += 30;
      actions.push({ type: 'flag', message: 'Flag pour révision manuelle' });
    }

    // Détecter les tentatives multiples
    const recentAttempts = await this.getRecentFailedAttempts(request);
    if (recentAttempts > 3) {
      reasons.push('Trop de tentatives récentes');
      riskScore += 35;
      actions.push({ type: 'require_verification', message: 'Vérification supplémentaire requise' });
    }

    // Vérifier les anomalies géographiques
    if (await this.isGeographicAnomaly(request)) {
      reasons.push('Anomalie géographique détectée');
      riskScore += 25;
    }

    const isFraud = riskScore >= 50;
    const confidence = Math.min(riskScore, 100);

    return {
      isFraud,
      riskScore,
      reasons,
      actions,
      confidence
    };
  }

  private async handleFraudAttempt(request: CouponValidationRequest, detection: CouponFraudDetection): Promise<void> {
    // Enregistrer la tentative de fraude
    await supabase.from('fraud_attempts').insert([{
      id: this.generateId(),
      code: request.code,
      userId: request.userId,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      riskScore: detection.riskScore,
      reasons: detection.reasons,
      detectedAt: new Date().toISOString(),
      metadata: request
    }]);

    // Mettre à jour les patterns de fraude
    await this.updateFraudPatterns(request);

    // Actions selon le niveau de risque
    if (detection.riskScore >= 70 && request.ipAddress) {
      // Bloquer l'IP temporairement
      await this.blockIP(request.ipAddress, 24 * 60 * 60 * 1000); // 24h
    }

    // Track analytics
    await analyticsService.trackEvent({
      type: 'fraud_attempt_detected' as any,
      category: 'security' as any,
      userId: request.userId,
      metadata: {
        code: request.code,
        riskScore: detection.riskScore,
        reasons: detection.reasons,
        actions: detection.actions
      }
    });

    performanceMonitor.warn('Tentative de fraude détectée', {
      code: request.code,
      riskScore: detection.riskScore,
      reasons: detection.reasons
    });
  }

  // Méthodes utilitaires supplémentaires
  private initializeDistributionChannels(types: DistributionChannel['type'][]): DistributionChannel[] {
    return types.map(type => ({
      type,
      isActive: true,
      distributionCount: 0,
      usageCount: 0,
      metadata: {}
    }));
  }

  private initializeSecurityFeatures(features?: Partial<SecurityFeatures>): SecurityFeatures {
    return {
      deviceFingerprinting: this.config.enableDeviceFingerprinting,
      rateLimitPerHour: this.config.rateLimitPerHour,
      requireAuthentication: false,
      geoValidation: this.config.enableGeoValidation,
      maxRedemptionsPerDevice: 3,
      blacklistRules: [],
      ...features
    };
  }

  private initializeCouponAnalytics(): CouponAnalytics {
    return {
      views: 0,
      clicks: 0,
      redemptions: 0,
      conversionRate: 0,
      averageTimeToRedemption: 0,
      fraudAttempts: 0,
      deviceTypes: {},
      locations: {},
      peakHours: [],
      userDemographics: {
        ageGroups: {},
        loyaltyLevels: {},
        newVsReturning: {}
      }
    };
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCouponId(): string {
    return `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getRateLimitInfo(request: CouponValidationRequest): { remaining: number; resetTime: string } {
    const key = request.userId || request.ipAddress || 'anonymous';
    const tracker = this.rateLimitTracker.get(key);
    
    if (!tracker) {
      return { remaining: this.config.rateLimitPerHour, resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    }

    if (Date.now() > tracker.resetTime) {
      // Reset the counter
      const newTracker = { count: 0, resetTime: Date.now() + 60 * 60 * 1000 };
      this.rateLimitTracker.set(key, newTracker);
      return { remaining: this.config.rateLimitPerHour, resetTime: new Date(newTracker.resetTime).toISOString() };
    }

    return {
      remaining: Math.max(0, this.config.rateLimitPerHour - tracker.count),
      resetTime: new Date(tracker.resetTime).toISOString()
    };
  }

  private initializeFraudPatterns(): void {
    // Initialiser avec des patterns de fraude connus
    this.fraudPatterns.set('rapid_requests', 0);
    this.fraudPatterns.set('multiple_ips', 0);
    this.fraudPatterns.set('suspicious_user_agents', 0);
  }

  private startPeriodicTasks(): void {
    // Nettoyer les données de rate limiting (toutes les heures)
    setInterval(() => {
      this.cleanupRateLimitData();
    }, 60 * 60 * 1000);

    // Mettre à jour les analytics (toutes les 5 minutes)
    setInterval(() => {
      this.updateRealTimeAnalytics();
    }, 5 * 60 * 1000);

    // Nettoyer les coupons expirés (tous les jours)
    setInterval(() => {
      this.cleanExpiredCoupons();
    }, 24 * 60 * 60 * 1000);
  }

  // Méthodes stubs pour les fonctionnalités avancées
  private async enhanceCouponsWithDistributionData(codes: AdvancedCouponCode[]): Promise<void> {
    // Implémentation pour enrichir les codes avec QR et URLs
  }

  private async generateQRCode(code: string): Promise<string> {
    // Implémentation de génération QR code
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private async generateShortUrl(code: string): Promise<string> {
    // Implémentation de génération d'URL courte
    return `https://ue.to/${code}`;
  }

  private async getCouponByCode(code: string): Promise<AdvancedCouponCode | null> {
    const { data, error } = await supabase
      .from('advanced_coupon_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  private async getCouponWithAnalytics(code: string): Promise<AdvancedCouponCode | null> {
    // Récupérer le coupon avec ses analytics complètes
    return await this.getCouponByCode(code);
  }

  private async performBusinessValidation(coupon: AdvancedCouponCode, request: CouponValidationRequest): Promise<CouponValidationResponse> {
    // Validation des règles business
    return {
      isValid: true,
      discount: 0,
      finalAmount: request.orderData?.totalAmount || 0,
      reasons: [],
      securityChecks: { passed: true, warnings: [], suspicious: false },
      rateLimitInfo: this.getRateLimitInfo(request)
    };
  }

  private async updateCouponAnalytics(couponId: string, request: CouponValidationRequest): Promise<void> {
    // Mettre à jour les analytics du coupon
  }

  private async distributeViaChannel(coupon: AdvancedCouponCode, channel: any, options: any): Promise<void> {
    // Distribuer via un canal spécifique
  }

  private async updateDistributionStats(couponId: string, channels: any[]): Promise<void> {
    // Mettre à jour les statistiques de distribution
  }

  private async generatePrintableSheet(qrCodes: any[], config: any): Promise<string> {
    // Générer une feuille imprimable
    return 'printable_sheet_url';
  }

  private async generateDownloadUrl(code: string, type: string): Promise<string> {
    // Générer une URL de téléchargement
    return `https://downloads.universaleats.com/${type}/${code}`;
  }

  private async calculateRealTimeMetrics(couponId: string): Promise<Partial<CouponAnalytics>> {
    // Calculer les métriques en temps réel
    return {};
  }

  private async calculateAverageTimeToRedemption(couponId: string): Promise<number> {
    // Calculer le temps moyen jusqu'à utilisation
    return 0;
  }

  private async getCouponDataByFilters(filters: any): Promise<any[]> {
    // Récupérer les données de coupons selon les filtres
    return [];
  }

  private async calculateSummaryMetrics(data: any[]): Promise<any> {
    // Calculer les métriques de résumé
    return {};
  }

  private async calculateTopPerformingCoupons(data: any[]): Promise<any[]> {
    // Calculer les top performers
    return [];
  }

  private async calculateChannelPerformance(data: any[]): Promise<any> {
    // Calculer la performance par canal
    return {};
  }

  private async generateFraudAnalysis(filters: any): Promise<any> {
    // Générer l'analyse de fraude
    return {};
  }

  private async generateTimeSeriesData(data: any[], dateRange?: any): Promise<any[]> {
    // Générer les données de série temporelle
    return [];
  }

  // Méthodes de sécurité supplémentaires (stubs)
  private async isIPBlocked(ip: string): Promise<boolean> {
    return false;
  }

  private async isOutsideAllowedHours(): Promise<boolean> {
    return false;
  }

  private async validateGeographicRestrictions(request: CouponValidationRequest): Promise<{ allowed: boolean; reason?: string }> {
    return { allowed: true };
  }

  private async isBotActivity(request: CouponValidationRequest): Promise<boolean> {
    return false;
  }

  private async isUnusualUsageSpeed(request: CouponValidationRequest): Promise<boolean> {
    return false;
  }

  private async getRecentFailedAttempts(request: CouponValidationRequest): Promise<number> {
    return 0;
  }

  private async isGeographicAnomaly(request: CouponValidationRequest): Promise<boolean> {
    return false;
  }

  private async updateFraudPatterns(request: CouponValidationRequest): Promise<void> {
    // Mettre à jour les patterns de fraude
  }

  private async blockIP(ip: string, duration: number): Promise<void> {
    // Bloquer une IP temporairement
  }

  private async getCouponsByBatchId(batchId: string): Promise<AdvancedCouponCode[]> {
    // Récupérer les coupons d'un batch
    return [];
  }

  private cleanupRateLimitData(): void {
    // Nettoyer les données de rate limiting expirées
  }

  private updateRealTimeAnalytics(): void {
    // Mettre à jour les analytics en temps réel
  }

  private async cleanExpiredCoupons(): Promise<void> {
    // Nettoyer les coupons expirés
  }
}

// Instance singleton
export const couponsManager = CouponsManager.getInstance();

// Export pour utilisation dans les hooks
export default couponsManager;