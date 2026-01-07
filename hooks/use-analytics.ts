/**
 * Hooks React pour l'Analytics
 * Universal Eats - Module Analytics Phase 2
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsService } from '@/lib/analytics-service';
import { 
  AnalyticsFilters, 
  BusinessMetrics, 
  CustomerMetrics, 
  OperationalMetrics, 
  ProductAnalytics, 
  MarketingMetrics, 
  PerformanceMetrics,
  KPIConfig,
  AnalyticsAlert,
  ReportConfig,
  ReportData,
  TrendAnalysis,
  StoreMetrics,
  DashboardConfig
} from '@/types/analytics';

export interface UseAnalyticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
  cacheTTL?: number;
}

/**
 * Hook principal pour l'analytics
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [marketingMetrics, setMarketingMetrics] = useState<MarketingMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [kpiConfigs, setKpiConfigs] = useState<KPIConfig[]>([]);
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);

  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes
    enableRealtime = false,
    cacheTTL = 300000 // 5 minutes
  } = options;

  // Charger toutes les métriques
  const loadAllMetrics = useCallback(async (currentFilters?: AnalyticsFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const [business, customer, operational, product, marketing, performance, stores, kpis] = await Promise.all([
        analyticsService.getBusinessMetrics(currentFilters),
        // analyticsService currently exposes parameter-less implementations for these metrics
        analyticsService.getCustomerMetrics(),
        analyticsService.getOperationalMetrics(),
        analyticsService.getProductAnalytics(),
        // Marketing/performance/kpi methods may not exist on the concrete service (use defensive calls)
        (analyticsService as any).getMarketingMetrics ? (analyticsService as any).getMarketingMetrics(currentFilters) : null,
        (analyticsService as any).getPerformanceMetrics ? (analyticsService as any).getPerformanceMetrics() : null,
        // getStoreMetrics expects an array of store ids
        analyticsService.getStoreMetrics(currentFilters?.stores),
        (analyticsService as any).getKPIConfigs ? (analyticsService as any).getKPIConfigs() : []
      ]);

      setBusinessMetrics(business);
      setCustomerMetrics(customer);
      setOperationalMetrics(operational);
      setProductAnalytics(product);
      if (marketing != null) setMarketingMetrics(marketing);
      if (performance != null) setPerformanceMetrics(performance);
      setStoreMetrics(stores || []);
      setKpiConfigs(kpis || []);
      setLastUpdated(new Date().toISOString());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Erreur chargement métriques analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger une métrique spécifique
  const loadMetric = useCallback(async (
    type: 'business' | 'customer' | 'operational' | 'product' | 'marketing' | 'performance',
    currentFilters?: AnalyticsFilters
  ) => {
    try {
      let data;
      switch (type) {
        case 'business':
          data = await analyticsService.getBusinessMetrics(currentFilters);
          setBusinessMetrics(data);
          break;
        case 'customer':
          data = await analyticsService.getCustomerMetrics();
          setCustomerMetrics(data);
          break;
        case 'operational':
          data = await analyticsService.getOperationalMetrics();
          setOperationalMetrics(data);
          break;
        case 'product':
          data = await analyticsService.getProductAnalytics();
          setProductAnalytics(data);
          break;
        case 'marketing':
          data = (analyticsService as any).getMarketingMetrics ? await (analyticsService as any).getMarketingMetrics(currentFilters) : null;
          if (data != null) setMarketingMetrics(data);
          break;
        case 'performance':
          data = (analyticsService as any).getPerformanceMetrics ? await (analyticsService as any).getPerformanceMetrics() : null;
          if (data != null) setPerformanceMetrics(data);
          break;
      }
    } catch (err) {
      console.error(`Erreur chargement métrique ${type}:`, err);
    }
  }, []);

  // Actualiser les données
  const refresh = useCallback(() => {
    loadAllMetrics(filters);
  }, [loadAllMetrics, filters]);

  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    loadAllMetrics(updatedFilters);
  }, [filters, loadAllMetrics]);

  // Actualisation automatique
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (!isLoading) {
          refresh();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh, isLoading]);

  // Chargement initial
  useEffect(() => {
    loadAllMetrics(filters);
  }, [loadAllMetrics]); // Load on mount (loadAllMetrics is stable)


  // Surveiller les alertes
  useEffect(() => {
    if (enableRealtime) {
      const checkAlerts = async () => {
        try {
          const newAlerts = (analyticsService as any).checkKPIThresholds ? await (analyticsService as any).checkKPIThresholds() : [];
          if (newAlerts && newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Garder max 50 alertes
          }
        } catch (err) {
          console.error('Erreur vérification alertes:', err);
        }
      };

      const alertInterval = setInterval(checkAlerts, 60000); // Vérifier toutes les minutes
      return () => clearInterval(alertInterval);
    }
  }, [enableRealtime]);

  return {
    // Données
    businessMetrics,
    customerMetrics,
    operationalMetrics,
    productAnalytics,
    marketingMetrics,
    performanceMetrics,
    storeMetrics,
    kpiConfigs,
    alerts,
    filters,
    
    // État
    isLoading,
    error,
    lastUpdated,
    
    // Actions
    refresh,
    updateFilters,
    loadMetric,
    
    // Utilitaires
    hasData: !!(businessMetrics || customerMetrics || operationalMetrics || productAnalytics || marketingMetrics),
    isReady: !isLoading && !error
  };
}

/**
 * Hook pour les métriques business uniquement
 */
export function useBusinessMetrics(filters?: AnalyticsFilters, options?: UseAnalyticsOptions) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (currentFilters?: AnalyticsFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getBusinessMetrics(currentFilters || filters);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: () => loadMetrics()
  };
}

/**
 * Hook pour les métriques client
 */
export function useCustomerMetrics(filters?: AnalyticsFilters, options?: UseAnalyticsOptions) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (currentFilters?: AnalyticsFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getCustomerMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: () => loadMetrics()
  };
}

/**
 * Hook pour les métriques opérationnelles
 */
export function useOperationalMetrics(filters?: AnalyticsFilters, options?: UseAnalyticsOptions) {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (currentFilters?: AnalyticsFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getOperationalMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refresh: () => loadMetrics()
  };
}

/**
 * Hook pour les KPIs
 */
export function useKPIs() {
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadKPIs = useCallback(async () => {
    setIsLoading(true);
    try {
      const kpiConfigs = (analyticsService as any).getKPIConfigs ? await (analyticsService as any).getKPIConfigs() : [];
      setKpis(kpiConfigs);

      // Vérifier les alertes
      const newAlerts = (analyticsService as any).checkKPIThresholds ? await (analyticsService as any).checkKPIThresholds() : [];
      setAlerts(newAlerts);

    } catch (err) {
      console.error('Erreur chargement KPIs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateKPI = useCallback(async (config: KPIConfig) => {
    try {
      if (!(analyticsService as any).updateKPIConfig) throw new Error('updateKPIConfig not implemented');
      await (analyticsService as any).updateKPIConfig(config);
      setKpis(prev => prev.map(kpi => kpi.id === config.id ? config : kpi));
    } catch (err) {
      console.error('Erreur mise à jour KPI:', err);
      throw err;
    }
  }, []);

  const checkThresholds = useCallback(async () => {
    try {
      const newAlerts = (analyticsService as any).checkKPIThresholds ? await (analyticsService as any).checkKPIThresholds() : [];
      if (newAlerts && newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev]);
      }
    } catch (err) {
      console.error('Erreur vérification seuils:', err);
    }
  }, []);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);


  return {
    kpis,
    alerts,
    isLoading,
    updateKPI,
    checkThresholds,
    refresh: loadKPIs
  };
}

/**
 * Hook pour les rapports
 */
export function useReports() {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<ReportData | null>(null);

  const generateReport = useCallback(async (configId: string, filters?: AnalyticsFilters) => {
    setIsGenerating(true);
    try {
      if (!(analyticsService as any).generateReport) throw new Error('generateReport not implemented');
      const report = await (analyticsService as any).generateReport(configId, filters);
      setLastReport(report);
      return report;
    } catch (err) {
      console.error('Erreur génération rapport:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Note: Dans une implémentation complète, on chargerait les configs de rapport depuis le service
  const loadReportConfigs = useCallback(async () => {
    // Simulation des configurations de rapport
    const mockReports: ReportConfig[] = [
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
    setReports(mockReports);
  }, []);

  useEffect(() => {
    loadReportConfigs();
  }, [loadReportConfigs]);

  return {
    reports,
    isGenerating,
    lastReport,
    generateReport,
    refreshConfigs: loadReportConfigs
  };
}

/**
 * Hook pour l'analyse des tendances
 */
export function useTrends() {
  const [trends, setTrends] = useState<TrendAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeTrend = useCallback(async (metric: string, timeHorizon: string) => {
    setIsLoading(true);
    try {
      if (!(analyticsService as any).analyzeTrends) throw new Error('analyzeTrends not implemented');
      const analysis = await (analyticsService as any).analyzeTrends(metric, timeHorizon);
      setTrends(prev => {
        const filtered = prev.filter(t => !(t.metric === metric && t.timeHorizon === timeHorizon));
        return [...filtered, analysis];
      });
      return analysis;
    } catch (err) {
      console.error('Erreur analyse tendances:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTrend = useCallback((metric: string, timeHorizon: string) => {
    return trends.find(t => t.metric === metric && t.timeHorizon === timeHorizon) || null;
  }, [trends]);

  return {
    trends,
    isLoading,
    analyzeTrend,
    getTrend
  };
}

/**
 * Hook pour le suivi des événements
 */
export function useAnalyticsTracking() {
  const trackEvent = useCallback(async (
    type: 'page_view' | 'button_click' | 'order_created' | 'order_completed' | 'user_registration' | 'search' | 'product_view' | 'cart_action',
    category: 'user' | 'order' | 'product' | 'system',
    metadata: Record<string, any> = {}
  ) => {
    try {
      if ((analyticsService as any).trackEvent) {
        await (analyticsService as any).trackEvent({
          type,
          category,
          sessionId: metadata.sessionId || 'default',
          metadata,
          userId: metadata.userId,
          storeId: metadata.storeId,
          orderId: metadata.orderId,
          productId: metadata.productId
        });
      } else {
        // Fallback: log event when no tracking implementation exists
        console.debug('trackEvent called (noop):', { type, category, metadata });
      }
    } catch (err) {
      console.error('Erreur tracking événement:', err);
    }
  }, []);

  const trackUserAction = useCallback(async (
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ) => {
    try {
      if ((analyticsService as any).trackUserAction) {
        await (analyticsService as any).trackUserAction(userId, action, metadata);
      } else {
        console.debug('trackUserAction called (noop):', { userId, action, metadata });
      }
    } catch (err) {
      console.error('Erreur tracking action utilisateur:', err);
    }
  }, []);

  const trackOrderEvent = useCallback(async (
    orderId: string,
    type: 'order_created' | 'order_completed' | 'order_cancelled',
    metadata: Record<string, any> = {}
  ) => {
    try {
      if ((analyticsService as any).trackOrderEvent) {
        await (analyticsService as any).trackOrderEvent(orderId, type, metadata);
      } else {
        console.debug('trackOrderEvent called (noop):', { orderId, type, metadata });
      }
    } catch (err) {
      console.error('Erreur tracking événement commande:', err);
    }
  }, []);

  return {
    trackEvent,
    trackUserAction,
    trackOrderEvent
  };
}

/**
 * Hook pour le dashboard analytics
 */
export function useAnalyticsDashboard(config?: Partial<DashboardConfig>) {
  const analytics = useAnalytics({
    autoRefresh: config?.refreshInterval ? config.refreshInterval > 0 : true,
    refreshInterval: config?.refreshInterval || 300000,
    enableRealtime: config?.notifications?.enableRealTimeAlerts || false
  });

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    layout: 'grid',
    refreshInterval: 300000,
    visibleWidgets: ['business', 'customer', 'operational', 'alerts'],
    filters: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
        end: new Date()
      },
      stores: [],
      categories: [],
      orderTypes: []
    },
    notifications: {
      enableRealTimeAlerts: true,
      enableEmailReports: false,
      enablePushNotifications: true
    },
    ...config
  });

  const updateDashboardConfig = useCallback((newConfig: Partial<DashboardConfig>) => {
    setDashboardConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const exportDashboardData = useCallback(() => {
    const data = {
      business: analytics.businessMetrics,
      customer: analytics.customerMetrics,
      operational: analytics.operationalMetrics,
      product: analytics.productAnalytics,
      marketing: analytics.marketingMetrics,
      performance: analytics.performanceMetrics,
      storeMetrics: analytics.storeMetrics,
      kpis: analytics.kpiConfigs,
      alerts: analytics.alerts,
      config: dashboardConfig,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analytics, dashboardConfig]);

  return {
    ...analytics,
    dashboardConfig,
    updateDashboardConfig,
    exportDashboardData
  };
}

// Hook utilitaire pour les métriques formatées
export function useFormattedMetrics(metrics: any) {
  return useMemo(() => {
    if (!metrics) return null;

    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(value);

    const formatPercentage = (value: number) => 
      `${(value * 100).toFixed(1)}%`;

    const formatNumber = (value: number) => 
      new Intl.NumberFormat('fr-FR').format(value);

    const formatTime = (minutes: number) => {
      if (minutes < 60) {
        return `${Math.round(minutes)}min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
      }
    };

    return {
      formatCurrency,
      formatPercentage,
      formatNumber,
      formatTime
    };
  }, [metrics]);
}

// Fix pour une erreur de typo dans useAnalytics
export function useOperatiolMetrics(filters?: AnalyticsFilters, options?: UseAnalyticsOptions) {
  // Wrapper déprécié pour compatibilité ascendante - utiliser `useOperationalMetrics` à la place.
  // Log once to help devs migrate.
  if (typeof console !== 'undefined' && (console as any)._warned_useOperatiolMetrics !== true) {
    console.warn('[DEPRECATION] `useOperatiolMetrics` is deprecated. Use `useOperationalMetrics` instead.');
    (console as any)._warned_useOperatiolMetrics = true;
  }
  return useOperationalMetrics(filters, options);
}