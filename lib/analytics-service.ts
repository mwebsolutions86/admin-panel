/**
 * Service d'Analytics et Reporting Avancé
 * Universal Eats - Module Analytics Phase 2
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { productCache, orderCache, userCache, CacheUtils } from './cache-service';
import { dbOptimizer, QueryUtils } from './database-optimizer';
import { 
  AnalyticsEvent, 
  BusinessMetrics, 
  CustomerMetrics, 
  OperationalMetrics, 
  ProductAnalytics, 
  MarketingMetrics, 
  PerformanceMetrics,
  StoreMetrics,
  KPIConfig,
  AnalyticsAlert,
  DateRange,
  TimeSeriesPoint,
  PercentageChange,
  AnalyticsFilters,
  ReportConfig,
  ReportData,
  TrendAnalysis,
  AnalyticsCategory,
  DashboardConfig
} from '@/types/analytics';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: AnalyticsEvent[] = [];
  private kpiConfigs: Map<string, KPIConfig> = new Map();
  private reportConfigs: Map<string, ReportConfig> = new Map();
  private alerts: AnalyticsAlert[] = [];
  private dashboardConfigs: Map<string, DashboardConfig> = new Map();

  // Cache pour les métriques critiques
  private metricsCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeKPIs();
    this.initializeReports();
    this.startEventProcessing();
    this.startAlertMonitoring();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * === COLLECTE D'ÉVÉNEMENTS ===
   */

  /**
   * Enregistre un événement analytics
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };

    // Ajouter à la file d'attente
    this.eventQueue.push(fullEvent);

    // Traitement immédiat pour les événements critiques
    if (this.isCriticalEvent(event.type)) {
      await this.processCriticalEvent(fullEvent);
    }

    performanceMonitor.info('Événement analytics enregistré', { type: event.type, category: event.category });
  }

  /**
   * Traque les événements utilisateur
   */
  async trackUserAction(
    userId: string, 
    action: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      type: this.mapUserActionToEventType(action),
      category: 'user',
      userId,
      sessionId: metadata.sessionId || 'unknown',
      metadata: {
        ...metadata,
        action,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Traque les événements de commande
   */
  async trackOrderEvent(
    orderId: string,
    type: 'order_created' | 'order_completed' | 'order_cancelled',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackEvent({
      type,
      category: 'order',
      orderId,
      sessionId: metadata.sessionId || 'unknown',
      metadata: {
        ...metadata,
        storeId: metadata.storeId
      }
    });

    // Déclencher le recalcul des métriques en temps réel
    if (type === 'order_created' || type === 'order_completed') {
      await this.invalidateMetricsCache(['business', 'operational']);
    }
  }

  /**
   * === MÉTRIQUES BUSINESS ===
   */

  /**
   * Récupère les métriques business complètes
   */
  async getBusinessMetrics(filters?: AnalyticsFilters): Promise<BusinessMetrics> {
    const cacheKey = `business:${this.generateFilterKey(filters)}`;
    
    // Vérifier le cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      performanceMonitor.startTimer('business_metrics_query');

      // Récupérer les données de base
      const ordersData = await this.getOrdersData(filters);
      const revenueData = await this.getRevenueData(filters);
      const orderValueData = await this.getOrderValueData(filters);

      // Calculer les métriques
      const metrics: BusinessMetrics = {
        totalRevenue: revenueData.total,
        revenueGrowth: await this.calculateRevenueGrowth(filters),
        averageOrderValue: orderValueData.average,
        ordersCount: ordersData.count,
        
        grossMargin: await this.calculateGrossMargin(filters),
        netMargin: await this.calculateNetMargin(filters),
        profitMargin: await this.calculateProfitMargin(filters),
        
        hourlyRevenue: await this.getHourlyRevenue(filters),
        dailyRevenue: await this.getDailyRevenue(filters),
        monthlyRevenue: await this.getMonthlyRevenue(filters),
        
        periodComparison: {
          thisWeek: revenueData.thisWeek,
          lastWeek: revenueData.lastWeek,
          thisMonth: revenueData.thisMonth,
          lastMonth: revenueData.lastMonth
        }
      };

      // Mettre en cache
      this.setCache(cacheKey, metrics);
      
      performanceMonitor.endTimer('business_metrics_query');
      performanceMonitor.info('Métriques business calculées', { revenue: metrics.totalRevenue, orders: metrics.ordersCount });

      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur calcul métriques business', { error, filters });
      throw new Error('Impossible de récupérer les métriques business');
    }
  }

  /**
   * Récupère les métriques par magasin
   */
  async getStoreMetrics(storeIds?: string[]): Promise<StoreMetrics[]> {
    const cacheKey = `store_metrics:${storeIds?.join(',') || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer les données des magasins
      const stores = await dbOptimizer.optimizedQuery(
        'active_stores_metrics',
        () => supabase.from('stores').select(`
          id,
          name,
          orders!inner (
            id,
            total_amount,
            status,
            created_at
          ),
          customers (
            id,
            satisfaction_rating
          )
        `).eq('is_active', true),
        10 * 60 * 1000
      );

      if (stores.error) throw stores.error;

      const metrics: StoreMetrics[] = stores.data.map(store => {
        const completedOrders = store.orders.filter((order: any) => 
          order.status === 'delivered' || order.status === 'ready'
        );
        
        const totalRevenue = completedOrders.reduce((sum: number, order: any) => 
          sum + order.total_amount, 0
        );

        const averageOrderValue = completedOrders.length > 0 ? 
          totalRevenue / completedOrders.length : 0;

        const customerSatisfaction = store.customers.length > 0 ?
          store.customers.reduce((sum: number, customer: any) => 
            sum + (customer.satisfaction_rating || 0), 0) / store.customers.length : 0;

        return {
          storeId: store.id,
          storeName: store.name,
          totalRevenue,
          ordersCount: completedOrders.length,
          averageOrderValue,
          customerSatisfaction,
          deliveryTime: 0, // À calculer avec les données de livraison
          performance: this.calculateStorePerformance(totalRevenue, averageOrderValue, customerSatisfaction)
        };
      });

      this.setCache(cacheKey, metrics, 15 * 60 * 1000);
      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur métriques magasin', { error });
      throw error;
    }
  }

  /**
   * === MÉTRIQUES CLIENT ===
   */

  /**
   * Récupère les métriques client
   */
  async getCustomerMetrics(filters?: AnalyticsFilters): Promise<CustomerMetrics> {
    const cacheKey = `customer:${this.generateFilterKey(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Récupérer les données clients
      const customersData = await this.getCustomersData(filters);
      const retentionData = await this.getCustomerRetentionData(filters);
      const segmentData = await this.getCustomerSegmentsData(filters);

      const metrics: CustomerMetrics = {
        totalCustomers: customersData.total,
        newCustomers: await this.calculateNewCustomersChange(filters),
        returningCustomers: await this.calculateReturningCustomersChange(filters),
        customerRetentionRate: retentionData.rate,
        customerLifetimeValue: customersData.averageCLV,
        averageOrdersPerCustomer: customersData.averageOrders,
        
        customerSegments: {
          vip: segmentData.vip,
          regular: segmentData.regular,
          occasional: segmentData.occasional,
          atRisk: segmentData.atRisk
        },
        
        loyaltyMetrics: {
          loyaltyProgramMembers: customersData.loyaltyMembers,
          averagePointsEarned: customersData.averagePoints,
          pointsRedemptionRate: customersData.redemptionRate,
          memberRetentionRate: retentionData.memberRetentionRate
        }
      };

      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur métriques client', { error });
      throw error;
    }
  }

  /**
   * === MÉTRIQUES OPÉRATIONNELLES ===
   */

  /**
   * Récupère les métriques opérationnelles
   */
  async getOperationalMetrics(filters?: AnalyticsFilters): Promise<OperationalMetrics> {
    const cacheKey = `operational:${this.generateFilterKey(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const deliveryData = await this.getDeliveryData(filters);
      const preparationData = await this.getPreparationData(filters);
      const qualityData = await this.getQualityData(filters);

      const metrics: OperationalMetrics = {
        averageDeliveryTime: deliveryData.averageTime,
        deliveryTimeDistribution: deliveryData.distribution,
        deliveryPersonMetrics: {
          totalActive: deliveryData.activeDeliveryPersons,
          averageDeliveriesPerDay: deliveryData.averageDeliveriesPerDay,
          averageDeliveryTime: deliveryData.averageTime,
          customerRating: deliveryData.averageRating
        },
        averagePreparationTime: preparationData.averageTime,
        preparationTimeByCategory: preparationData.byCategory,
        orderAccuracy: qualityData.accuracy,
        customerSatisfaction: qualityData.satisfaction,
        complaintRate: qualityData.complaintRate,
        storeAvailability: {
          openStores: qualityData.openStores,
          closedStores: qualityData.closedStores,
          averageOpeningHours: qualityData.averageOpeningHours
        }
      };

      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur métriques opérationnelles', { error });
      throw error;
    }
  }

  /**
   * === ANALYTICS PRODUIT ===
   */

  /**
   * Récupère l'analyse des produits
   */
  async getProductAnalytics(filters?: AnalyticsFilters): Promise<ProductAnalytics> {
    const cacheKey = `product:${this.generateFilterKey(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const topProducts = await this.getTopSellingProducts(filters);
      const categoryPerformance = await this.getCategoryPerformance(filters);
      const menuAnalysis = await this.getMenuAnalysis(filters);
      const trendingProducts = await this.getTrendingProducts(filters);

      const analytics: ProductAnalytics = {
        topSellingProducts: topProducts,
        categoryPerformance,
        menuAnalysis,
        trendingProducts
      };

      this.setCache(cacheKey, analytics);
      return analytics;

    } catch (error) {
      performanceMonitor.error('Erreur analytics produit', { error });
      throw error;
    }
  }

  /**
   * === ANALYTICS MARKETING ===
   */

  /**
   * Récupère les métriques marketing
   */
  async getMarketingMetrics(filters?: AnalyticsFilters): Promise<MarketingMetrics> {
    const cacheKey = `marketing:${this.generateFilterKey(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const campaignData = await this.getCampaignData(filters);
      const channelData = await this.getChannelData(filters);
      const promotionData = await this.getPromotionData(filters);

      const metrics: MarketingMetrics = {
        campaignPerformance: campaignData,
        channelPerformance: channelData,
        promotionEffectiveness: promotionData
      };

      this.setCache(cacheKey, metrics);
      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur métriques marketing', { error });
      throw error;
    }
  }

  /**
   * === ANALYTICS PERFORMANCE ===
   */

  /**
   * Récupère les métriques de performance technique
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheKey = 'performance:technical';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const performanceData = performanceMonitor.getCurrentMetrics();
      const cacheStats = {
        product: productCache.getStats(),
        order: orderCache.getStats(),
        user: userCache.getStats()
      };

      const metrics: PerformanceMetrics = {
        responseTime: {
          api: performanceData.averageResponseTime,
          database: performanceData.averageDatabaseTime,
          frontend: performanceData.averageFrontendTime || 0
        },
        uptime: {
          percentage: 99.9, // À calculer avec un vrai监控系统
          incidents: 0,
          averageDowntime: 0
        },
        errorRate: {
          api: performanceData.errorRate,
          frontend: 0, // À implémenter
          total: performanceData.errorRate
        },
        resourceUtilization: {
          cpu: 0, // À implémenter avec un监控系统 système
          memory: 0,
          database: 0,
          cache: {
            hitRate: (cacheStats.product.hitRate + cacheStats.order.hitRate + cacheStats.user.hitRate) / 3,
            size: cacheStats.product.hits + cacheStats.order.hits + cacheStats.user.hits
          }
        }
      };

      this.setCache(cacheKey, metrics, 60 * 1000); // 1 minute pour les métriques de performance
      return metrics;

    } catch (error) {
      performanceMonitor.error('Erreur métriques performance', { error });
      throw error;
    }
  }

  /**
   * === GESTION DES KPIs ===
   */

  /**
   * Récupère la configuration des KPIs
   */
  getKPIConfigs(): KPIConfig[] {
    return Array.from(this.kpiConfigs.values());
  }

  /**
   * Met à jour un KPI
   */
  async updateKPIConfig(config: KPIConfig): Promise<void> {
    this.kpiConfigs.set(config.id, config);
    performanceMonitor.info('KPI mis à jour', { id: config.id, name: config.name });
  }

  /**
   * Vérifie les seuils des KPIs
   */
  async checkKPIThresholds(): Promise<AnalyticsAlert[]> {
    const alerts: AnalyticsAlert[] = [];

    for (const kpi of this.kpiConfigs.values()) {
      const currentValue = await this.getKPICurrentValue(kpi);
      
      if (kpi.isAlertEnabled) {
        if (currentValue <= kpi.alertThresholds.critical) {
          alerts.push(this.createAlert('critical', kpi, currentValue, kpi.alertThresholds.critical));
        } else if (currentValue <= kpi.alertThresholds.warning) {
          alerts.push(this.createAlert('warning', kpi, currentValue, kpi.alertThresholds.warning));
        }
      }
    }

    this.alerts.push(...alerts);
    return alerts;
  }

  /**
   * === GESTION DES RAPPORTS ===
   */

  /**
   * Génère un rapport
   */
  async generateReport(configId: string, customFilters?: AnalyticsFilters): Promise<ReportData> {
    const config = this.reportConfigs.get(configId);
    if (!config) {
      throw new Error(`Configuration de rapport non trouvée: ${configId}`);
    }

    try {
      performanceMonitor.info('Génération rapport débutée', { configId });

      const filters = customFilters || config.filters;
      
      // Récupérer toutes les métriques
      const [business, customer, operational, product, marketing, performance] = await Promise.all([
        this.getBusinessMetrics(filters),
        this.getCustomerMetrics(filters),
        this.getOperationalMetrics(filters),
        this.getProductAnalytics(filters),
        this.getMarketingMetrics(filters),
        this.getPerformanceMetrics()
      ]);

      const report: ReportData = {
        reportId: configId,
        title: config.name,
        generatedAt: new Date().toISOString(),
        dateRange: filters.dateRange || this.getDefaultDateRange(),
        metrics: {
          business,
          customer,
          operational,
          product,
          marketing,
          performance
        },
        summary: {
          totalRevenue: business.totalRevenue,
          totalOrders: business.ordersCount,
          totalCustomers: customer.totalCustomers,
          averageOrderValue: business.averageOrderValue,
          customerSatisfaction: operational.customerSatisfaction
        },
        insights: await this.generateInsights(business, customer, operational),
        recommendations: await this.generateRecommendations(business, customer, operational)
      };

      // Mettre à jour la dernière exécution
      config.lastRun = new Date().toISOString();
      this.reportConfigs.set(configId, config);

      performanceMonitor.info('Rapport généré avec succès', { configId });
      return report;

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport', { configId, error });
      throw error;
    }
  }

  /**
   * === ANALYSE DES TENDANCES ===
   */

  /**
   * Analyse les tendances d'une métrique
   */
  async analyzeTrends(metric: string, timeHorizon: string): Promise<TrendAnalysis> {
    try {
      // Récupérer l'historique de la métrique
      const historicalData = await this.getHistoricalMetricData(metric, timeHorizon);
      
      // Calculer la prédiction (simplifié - à remplacer par un vrai modèle ML)
      const prediction = this.calculateSimplePrediction(historicalData);
      
      return {
        metric,
        current: historicalData[historicalData.length - 1]?.value || 0,
        predicted: prediction.value,
        confidence: prediction.confidence,
        trendDirection: prediction.direction,
        timeHorizon: timeHorizon as any,
        factors: prediction.factors,
        recommendations: prediction.recommendations
      };

    } catch (error) {
      performanceMonitor.error('Erreur analyse tendances', { metric, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private initializeKPIs(): void {
    const defaultKPIs: KPIConfig[] = [
      {
        id: 'revenue_daily',
        name: 'Chiffre d\'affaires journalier',
        category: 'business',
        target: 50000, // 50k par jour
        current: 0,
        unit: 'currency',
        frequency: 'daily',
        isAlertEnabled: true,
        alertThresholds: {
          warning: 40000,
          critical: 30000
        },
        description: 'Objectif de chiffre d\'affaires quotidien'
      },
      {
        id: 'customer_satisfaction',
        name: 'Satisfaction client',
        category: 'customer',
        target: 4.5,
        current: 0,
        unit: 'number',
        frequency: 'daily',
        isAlertEnabled: true,
        alertThresholds: {
          warning: 4.0,
          critical: 3.5
        },
        description: 'Note moyenne de satisfaction client (1-5)'
      },
      {
        id: 'delivery_time',
        name: 'Temps de livraison moyen',
        category: 'operational',
        target: 30, // 30 minutes
        current: 0,
        unit: 'time',
        frequency: 'hourly',
        isAlertEnabled: true,
        alertThresholds: {
          warning: 35,
          critical: 45
        },
        description: 'Temps moyen de livraison en minutes'
      }
    ];

    defaultKPIs.forEach(kpi => {
      this.kpiConfigs.set(kpi.id, kpi);
    });

    performanceMonitor.info('KPIs initialisés', { count: defaultKPIs.length });
  }

  private initializeReports(): void {
    const defaultReports: ReportConfig[] = [
      {
        id: 'daily_summary',
        name: 'Résumé quotidien',
        description: 'Rapport quotidien des performances',
        type: 'daily',
        frequency: 'daily',
        format: 'pdf',
        recipients: ['admin@universaleats.com'],
        filters: {},
        isActive: true
      },
      {
        id: 'weekly_analysis',
        name: 'Analyse hebdomadaire',
        description: 'Rapport hebdomadaire avec tendances',
        type: 'weekly',
        frequency: 'weekly',
        format: 'excel',
        recipients: ['manager@universaleats.com'],
        filters: {},
        isActive: true
      }
    ];

    defaultReports.forEach(report => {
      this.reportConfigs.set(report.id, report);
    });

    performanceMonitor.info('Rapports initialisés', { count: defaultReports.length });
  }

  private startEventProcessing(): void {
    setInterval(() => {
      this.processEventQueue();
    }, 5000); // Traiter la file toutes les 5 secondes
  }

  private startAlertMonitoring(): void {
    setInterval(() => {
      this.checkKPIThresholds().then(alerts => {
        if (alerts.length > 0) {
          performanceMonitor.info('Alertes KPI générées', { count: alerts.length });
        }
      }).catch(error => {
        performanceMonitor.error('Erreur surveillance KPI', { error });
      });
    }, 60000); // Vérifier toutes les minutes
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Sauvegarder les événements en base (batch)
      await this.saveEventsBatch(events);
      
      // Traiter les événements pour mettre à jour les métriques en temps réel
      await this.processEventsForMetrics(events);

    } catch (error) {
      performanceMonitor.error('Erreur traitement file événements', { error });
      // Remettre les événements dans la file en cas d'erreur
      this.eventQueue.unshift(...events);
    }
  }

  private async saveEventsBatch(events: AnalyticsEvent[]): Promise<void> {
    const { error } = await supabase
      .from('analytics_events')
      .insert(events);

    if (error) {
      throw new Error(`Erreur sauvegarde événements: ${error.message}`);
    }
  }

  private async processEventsForMetrics(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case 'order_created':
          await this.updateOrderMetrics(event);
          break;
        case 'order_completed':
          await this.updateCompletionMetrics(event);
          break;
        case 'user_registration':
          await this.updateUserMetrics(event);
          break;
      }
    }
  }

  private isCriticalEvent(type: string): boolean {
    return ['order_created', 'order_completed', 'user_registration'].includes(type);
  }

  private async processCriticalEvent(event: AnalyticsEvent): Promise<void> {
    await this.trackEvent(event); // Assure que l'événement est traité immédiatement
  }

  private mapUserActionToEventType(action: string): AnalyticsEvent['type'] {
    const actionMap: Record<string, AnalyticsEvent['type']> = {
      'page_view': 'page_view',
      'button_click': 'button_click',
      'search': 'search',
      'product_view': 'product_view',
      'cart_add': 'cart_action',
      'cart_remove': 'cart_action',
      'checkout_start': 'order_created'
    };

    return actionMap[action] || 'button_click';
  }

  // Méthodes de calcul des métriques (simplifiées pour l'exemple)
  private async getOrdersData(filters?: AnalyticsFilters): Promise<{ count: number }> {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    const { count, error } = await query;
    
    if (error) throw error;
    return { count: count || 0 };
  }

  private async getRevenueData(filters?: AnalyticsFilters): Promise<{
    total: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  }> {
    // Simplifié - à implémenter avec de vraies requêtes SQL complexes
    return {
      total: 125000,
      thisWeek: 25000,
      lastWeek: 22000,
      thisMonth: 95000,
      lastMonth: 88000
    };
  }

  private async getOrderValueData(filters?: AnalyticsFilters): Promise<{ average: number }> {
    // Simplifié
    return { average: 35.50 };
  }

  private async calculateRevenueGrowth(filters?: AnalyticsFilters): Promise<PercentageChange> {
    // Simplifié
    return {
      current: 25000,
      previous: 22000,
      percentage: 13.6,
      trend: 'up'
    };
  }

  private async calculateGrossMargin(filters?: AnalyticsFilters): Promise<number> {
    // Simplifié
    return 65.5;
  }

  private async calculateNetMargin(filters?: AnalyticsFilters): Promise<number> {
    // Simplifié
    return 18.3;
  }

  private async calculateProfitMargin(filters?: AnalyticsFilters): Promise<number> {
    // Simplifié
    return 15.2;
  }

  private async getHourlyRevenue(filters?: AnalyticsFilters): Promise<TimeSeriesPoint[]> {
    // Générer des données horaires pour aujourd'hui
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return Array.from({ length: 24 }, (_, hour) => ({
      timestamp: new Date(today.getTime() + hour * 60 * 60 * 1000).toISOString(),
      value: Math.random() * 5000 + 1000, // Simulé
      label: `${hour}:00`
    }));
  }

  private async getDailyRevenue(filters?: AnalyticsFilters): Promise<TimeSeriesPoint[]> {
    // Générer les 7 derniers jours
    return Array.from({ length: 7 }, (_, day) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - day));
      
      return {
        timestamp: date.toISOString(),
        value: Math.random() * 20000 + 10000,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' })
      };
    });
  }

  private async getMonthlyRevenue(filters?: AnalyticsFilters): Promise<TimeSeriesPoint[]> {
    // Générer les 12 derniers mois
    return Array.from({ length: 12 }, (_, month) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - month));
      
      return {
        timestamp: date.toISOString(),
        value: Math.random() * 100000 + 50000,
        label: date.toLocaleDateString('fr-FR', { month: 'short' })
      };
    });
  }

  private calculateStorePerformance(revenue: number, avgOrderValue: number, satisfaction: number): StoreMetrics['performance'] {
    const score = (revenue / 1000) + (avgOrderValue * 2) + (satisfaction * 10);
    
    if (score > 150) return 'excellent';
    if (score > 100) return 'good';
    if (score > 50) return 'average';
    return 'poor';
  }

  // Méthodes utilitaires
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateFilterKey(filters?: AnalyticsFilters): string {
    if (!filters) return 'default';
    
    const parts = [];
    if (filters.dateRange) {
      parts.push(`date:${filters.dateRange.start.toISOString()}_${filters.dateRange.end.toISOString()}`);
    }
    if (filters.stores) {
      parts.push(`stores:${filters.stores.join(',')}`);
    }
    if (filters.categories) {
      parts.push(`categories:${filters.categories.join(',')}`);
    }
    
    return parts.join('_') || 'default';
  }

  private getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // 30 derniers jours
    
    return { start, end };
  }

  private getFromCache(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.metricsCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL
    });
  }

  private async invalidateMetricsCache(categories: AnalyticsCategory[]): Promise<void> {
    for (const [key] of this.metricsCache.entries()) {
      if (categories.some(category => key.startsWith(category))) {
        this.metricsCache.delete(key);
      }
    }
  }

  private async getKPICurrentValue(kpi: KPIConfig): Promise<number> {
    // Implémentation simplifiée
    switch (kpi.id) {
      case 'revenue_daily':
        const business = await this.getBusinessMetrics();
        return business.totalRevenue;
      case 'customer_satisfaction':
        const operational = await this.getOperationalMetrics();
        return operational.customerSatisfaction;
      case 'delivery_time':
        const ops = await this.getOperationalMetrics();
        return ops.averageDeliveryTime;
      default:
        return 0;
    }
  }

  private createAlert(
    type: 'warning' | 'critical' | 'info',
    kpi: KPIConfig,
    currentValue: number,
    threshold: number
  ): AnalyticsAlert {
    return {
      id: this.generateId(),
      type,
      category: kpi.category as any,
      title: `Alerte ${type}: ${kpi.name}`,
      message: `Valeur actuelle: ${currentValue}, Seuil: ${threshold}`,
      kpiId: kpi.id,
      currentValue,
      thresholdValue: threshold,
      timestamp: new Date().toISOString(),
      isRead: false,
      isResolved: false
    };
  }

  private async generateInsights(business: BusinessMetrics, customer: CustomerMetrics, operational: OperationalMetrics): Promise<string[]> {
    return [
      `Le chiffre d'affaires a augmenté de ${business.revenueGrowth.percentage}% par rapport à la période précédente`,
      `La valeur moyenne des commandes est de ${business.averageOrderValue.toFixed(2)}€`,
      `Le taux de satisfaction client est de ${operational.customerSatisfaction.toFixed(1)}/5`,
      `${customer.customerSegments.vip} clients VIP représentent une part importante du CA`
    ];
  }

  private async generateRecommendations(business: BusinessMetrics, customer: CustomerMetrics, operational: OperationalMetrics): Promise<string[]> {
    const recommendations = [];

    if (business.revenueGrowth.trend === 'down') {
      recommendations.push('Analyser les causes de la baisse du chiffre d\'affaires et mettre en place des actions correctives');
    }

    if (operational.averageDeliveryTime > 35) {
      recommendations.push('Optimiser les routes de livraison pour réduire les temps de livraison');
    }

    if (customer.customerSegments.atRisk > customer.customerSegments.regular * 0.3) {
      recommendations.push('Mettre en place une campagne de rétention pour les clients à risque');
    }

    if (business.averageOrderValue < 30) {
      recommendations.push('Promouvoir les produits à forte valeur ajoutée pour augmenter le panier moyen');
    }

    return recommendations;
  }

  // Méthodes simplifiées pour les autres métriques
  private async getCustomersData(filters?: AnalyticsFilters): Promise<any> {
    return {
      total: 1250,
      averageCLV: 150.50,
      averageOrders: 3.2,
      loyaltyMembers: 850,
      averagePoints: 125,
      redemptionRate: 0.75
    };
  }

  private async getCustomerRetentionData(filters?: AnalyticsFilters): Promise<any> {
    return {
      rate: 0.68,
      memberRetentionRate: 0.82
    };
  }

  private async getCustomerSegmentsData(filters?: AnalyticsFilters): Promise<any> {
    return {
      vip: 125,
      regular: 750,
      occasional: 300,
      atRisk: 75
    };
  }

  private async calculateNewCustomersChange(filters?: AnalyticsFilters): Promise<PercentageChange> {
    return {
      current: 85,
      previous: 72,
      percentage: 18.1,
      trend: 'up'
    };
  }

  private async calculateReturningCustomersChange(filters?: AnalyticsFilters): Promise<PercentageChange> {
    return {
      current: 320,
      previous: 310,
      percentage: 3.2,
      trend: 'up'
    };
  }

  private async getDeliveryData(filters?: AnalyticsFilters): Promise<any> {
    return {
      averageTime: 28.5,
      distribution: {
        under30min: 65,
        between30to45min: 25,
        between45to60min: 8,
        over60min: 2
      },
      activeDeliveryPersons: 15,
      averageDeliveriesPerDay: 12,
      averageRating: 4.3
    };
  }

  private async getPreparationData(filters?: AnalyticsFilters): Promise<any> {
    return {
      averageTime: 15.2,
      byCategory: {
        'Plats chauds': 18.5,
        'Desserts': 8.2,
        'Boissons': 3.1,
        'Entrées': 12.4
      }
    };
  }

  private async getQualityData(filters?: AnalyticsFilters): Promise<any> {
    return {
      accuracy: 0.97,
      satisfaction: 4.2,
      complaintRate: 0.03,
      openStores: 8,
      closedStores: 2,
      averageOpeningHours: 11.5
    };
  }

  private async getTopSellingProducts(filters?: AnalyticsFilters): Promise<any[]> {
    return [
      { productId: '1', productName: 'Burger Classique', salesCount: 245, revenue: 3675, profitMargin: 25, category: 'Burgers' },
      { productId: '2', productName: 'Pizza Margherita', salesCount: 198, revenue: 2772, profitMargin: 30, category: 'Pizzas' },
      { productId: '3', productName: 'Salade César', salesCount: 156, revenue: 2028, profitMargin: 35, category: 'Salades' }
    ];
  }

  private async getCategoryPerformance(filters?: AnalyticsFilters): Promise<any[]> {
    return [
      { categoryId: '1', categoryName: 'Burgers', salesCount: 450, revenue: 6750, averageOrderValue: 15, growthRate: 12 },
      { categoryId: '2', categoryName: 'Pizzas', salesCount: 380, revenue: 5320, averageOrderValue: 14, growthRate: 8 },
      { categoryId: '3', categoryName: 'Salades', salesCount: 290, revenue: 3770, averageOrderValue: 13, growthRate: 15 }
    ];
  }

  private async getMenuAnalysis(filters?: AnalyticsFilters): Promise<any> {
    return {
      totalProducts: 150,
      activeProducts: 142,
      outOfStock: 8,
      averagePrice: 12.50,
      priceRange: { min: 5.99, max: 25.99 }
    };
  }

  private async getTrendingProducts(filters?: AnalyticsFilters): Promise<any[]> {
    return [
      { productId: '4', productName: 'Bowl Vegan', trendDirection: 'rising', growthRate: 45, reason: 'Tendance végétarienne' },
      { productId: '5', productName: 'Pizza Truffe', trendDirection: 'rising', growthRate: 32, reason: 'Produit premium' }
    ];
  }

  private async getCampaignData(filters?: AnalyticsFilters): Promise<any[]> {
    return [
      {
        campaignId: '1',
        campaignName: 'Promo Été',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        status: 'active',
        impressions: 15000,
        clicks: 1200,
        conversions: 180,
        ctr: 8.0,
        conversionRate: 15.0,
        cost: 500,
        roi: 3.2
      }
    ];
  }

  private async getChannelData(filters?: AnalyticsFilters): Promise<any> {
    return {
      push: { impressions: 5000, conversions: 150, roi: 2.8 },
      email: { impressions: 3000, conversions: 90, roi: 3.1 },
      social: { impressions: 4000, conversions: 60, roi: 1.9 },
      inApp: { impressions: 8000, conversions: 200, roi: 3.5 }
    };
  }

  private async getPromotionData(filters?: AnalyticsFilters): Promise<any[]> {
    return [
      {
        promotionId: '1',
        promotionName: '2x1 sur les burgers',
        discount: 50,
        usageCount: 245,
        revenue: 1837.50,
        profitImpact: -245.50
      }
    ];
  }

  private async updateOrderMetrics(event: AnalyticsEvent): Promise<void> {
    // Implémentation pour mettre à jour les métriques en temps réel
    await this.invalidateMetricsCache(['business']);
  }

  private async updateCompletionMetrics(event: AnalyticsEvent): Promise<void> {
    // Implémentation pour mettre à jour les métriques de completion
    await this.invalidateMetricsCache(['business', 'operational']);
  }

  private async updateUserMetrics(event: AnalyticsEvent): Promise<void> {
    // Implémentation pour mettre à jour les métriques utilisateur
    await this.invalidateMetricsCache(['customer']);
  }

  private async getHistoricalMetricData(metric: string, timeHorizon: string): Promise<TimeSeriesPoint[]> {
    // Générer des données historiques simulées
    const points = timeHorizon === '1month' ? 30 : timeHorizon === '1week' ? 7 : 24;
    
    return Array.from({ length: points }, (_, i) => ({
      timestamp: new Date(Date.now() - (points - i) * 60 * 60 * 1000).toISOString(),
      value: Math.random() * 1000 + 500
    }));
  }

  private calculateSimplePrediction(data: TimeSeriesPoint[]): { value: number; confidence: number; direction: 'up' | 'down' | 'stable'; factors: string[]; recommendations: string[] } {
    const values = data.map(d => d.value);
    const recent = values.slice(-7);
    const older = values.slice(-14, -7);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    const direction = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable';
    
    return {
      value: recentAvg * (1 + change),
      confidence: 75,
      direction,
      factors: ['Saisonnalité', 'Tendances récentes'],
      recommendations: direction === 'up' ? ['Maintenir la dynamique'] : ['Analyser les causes du déclin']
    };
  }
}

// Instance singleton
export const analyticsService = AnalyticsService.getInstance();

// Export pour utilisation dans les hooks
export default analyticsService;