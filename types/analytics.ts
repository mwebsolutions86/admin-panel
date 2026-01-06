/**
 * Types et Interfaces pour l'Analytics
 * Universal Eats - Module Analytics et Reporting Avancé
 */

// === TYPES DE DONNÉES FONDAMENTAUX ===

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface PercentageChange {
  current: number;
  previous: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// === MÉTRIQUES BUSINESS ===

export interface BusinessMetrics {
  // Chiffre d'affaires
  totalRevenue: number;
  revenueGrowth: PercentageChange;
  averageOrderValue: number;
  ordersCount: number;
  
  // Marges et rentabilité
  grossMargin: number;
  netMargin: number;
  profitMargin: number;
  
  // Performance par période
  hourlyRevenue: TimeSeriesPoint[];
  dailyRevenue: TimeSeriesPoint[];
  monthlyRevenue: TimeSeriesPoint[];
  
  // Comparaisons
  periodComparison: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  deliveryTime: number;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

// === ANALYTICS CLIENT ===

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: PercentageChange;
  returningCustomers: PercentageChange;
  customerRetentionRate: number;
  customerLifetimeValue: number;
  averageOrdersPerCustomer: number;
  
  // Segmentation
  customerSegments: {
    vip: number;
    regular: number;
    occasional: number;
    atRisk: number;
  };
  
  // Fidélisation
  loyaltyMetrics: {
    loyaltyProgramMembers: number;
    averagePointsEarned: number;
    pointsRedemptionRate: number;
    memberRetentionRate: number;
  };
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  averageOrderValue: number;
  retentionRate: number;
  preferredCategories: string[];
  behavior: {
    averageOrdersPerMonth: number;
    preferredDeliveryTime: string;
    paymentMethod: string;
  };
}

// === ANALYTICS OPÉRATIONNELLE ===

export interface OperationalMetrics {
  // Temps de livraison
  averageDeliveryTime: number;
  deliveryTimeDistribution: {
    under30min: number;
    between30to45min: number;
    between45to60min: number;
    over60min: number;
  };
  
  // Performance des livreurs
  deliveryPersonMetrics: {
    totalActive: number;
    averageDeliveriesPerDay: number;
    averageDeliveryTime: number;
    customerRating: number;
  };
  
  // Préparation des commandes
  averagePreparationTime: number;
  preparationTimeByCategory: Record<string, number>;
  
  // Qualité
  orderAccuracy: number;
  customerSatisfaction: number;
  complaintRate: number;
  
  // Disponibilité
  storeAvailability: {
    openStores: number;
    closedStores: number;
    averageOpeningHours: number;
  };
}

export interface DeliveryPerformance {
  deliveryPersonId: string;
  deliveryPersonName: string;
  deliveriesToday: number;
  averageTime: number;
  customerRating: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  onTimeRate: number;
}

// === ANALYTICS PRODUIT ===

export interface ProductAnalytics {
  // Performance des produits
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    salesCount: number;
    revenue: number;
    profitMargin: number;
    category: string;
  }>;
  
  // Analyse des catégories
  categoryPerformance: Array<{
    categoryId: string;
    categoryName: string;
    salesCount: number;
    revenue: number;
    averageOrderValue: number;
    growthRate: number;
  }>;
  
  // Analyse des menus
  menuAnalysis: {
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
  
  // Tendances
  trendingProducts: Array<{
    productId: string;
    productName: string;
    trendDirection: 'rising' | 'falling' | 'stable';
    growthRate: number;
    reason: string;
  }>;
}

// === ANALYTICS MARKETING ===

export interface MarketingMetrics {
  // Performance des campagnes
  campaignPerformance: Array<{
    campaignId: string;
    campaignName: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'paused';
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number; // Click-through rate
    conversionRate: number;
    cost: number;
    roi: number;
  }>;
  
  // Analyse des canaux
  channelPerformance: {
    push: { impressions: number; conversions: number; roi: number };
    email: { impressions: number; conversions: number; roi: number };
    social: { impressions: number; conversions: number; roi: number };
    inApp: { impressions: number; conversions: number; roi: number };
  };
  
  // Performance des promotions
  promotionEffectiveness: Array<{
    promotionId: string;
    promotionName: string;
    discount: number;
    usageCount: number;
    revenue: number;
    profitImpact: number;
  }>;
}

// === ANALYTICS PERFORMANCE ===

export interface PerformanceMetrics {
  // Performance technique
  responseTime: {
    api: number;
    database: number;
    frontend: number;
  };
  
  // Disponibilité
  uptime: {
    percentage: number;
    incidents: number;
    averageDowntime: number;
  };
  
  // Erreurs
  errorRate: {
    api: number;
    frontend: number;
    total: number;
  };
  
  // Utilisation des ressources
  resourceUtilization: {
    cpu: number;
    memory: number;
    database: number;
    cache: {
      hitRate: number;
      size: number;
    };
  };
}

// === CONFIGURATION DES KPIs ===

export interface KPIConfig {
  id: string;
  name: string;
  category: 'business' | 'customer' | 'operational' | 'product' | 'marketing';
  target: number;
  current: number;
  unit: 'currency' | 'percentage' | 'number' | 'time';
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  isAlertEnabled: boolean;
  alertThresholds: {
    warning: number;
    critical: number;
  };
  description: string;
}

// === ALERTES ET NOTIFICATIONS ===

export interface AnalyticsAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  category: 'revenue' | 'performance' | 'customer' | 'operational';
  title: string;
  message: string;
  kpiId?: string;
  currentValue: number;
  thresholdValue: number;
  timestamp: string;
  isRead: boolean;
  isResolved: boolean;
}

// === CONFIGURATION DU DASHBOARD ===

export interface DashboardConfig {
  layout: 'grid' | 'list' | 'mixed';
  refreshInterval: number; // en secondes
  visibleWidgets: string[];
  filters: {
    dateRange: DateRange;
    stores: string[];
    categories: string[];
    orderTypes: string[];
  };
  notifications: {
    enableRealTimeAlerts: boolean;
    enableEmailReports: boolean;
    enablePushNotifications: boolean;
  };
}

// === RAPPORTS ===

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  recipients: string[];
  filters: {
    stores?: string[];
    categories?: string[];
    dateRange?: DateRange;
  };
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface ReportData {
  reportId: string;
  title: string;
  generatedAt: string;
  dateRange: DateRange;
  metrics: {
    business: BusinessMetrics;
    customer: CustomerMetrics;
    operational: OperationalMetrics;
    product: ProductAnalytics;
    marketing: MarketingMetrics;
    performance: PerformanceMetrics;
  };
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    customerSatisfaction: number;
  };
  insights: string[];
  recommendations: string[];
}

// === API RESPONSES ===

export interface AnalyticsAPIResponse<T> {
  data: T;
  success: boolean;
  message: string;
  timestamp: string;
  executionTime: number;
}

export interface PaginatedAnalyticsResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
  message: string;
  timestamp: string;
}

// === ÉVÉNEMENTS ANALYTICS ===

export interface AnalyticsEvent {
  id: string;
  type: 'page_view' | 'button_click' | 'order_created' | 'order_completed' | 'user_registration' | 'search' | 'product_view' | 'cart_action';
  category: 'user' | 'order' | 'product' | 'system';
  timestamp: string;
  userId?: string;
  sessionId: string;
  metadata: Record<string, any>;
  storeId?: string;
  orderId?: string;
  productId?: string;
}

// === PRÉDICTIONS ET TENDANCES ===

export interface TrendAnalysis {
  metric: string;
  current: number;
  predicted: number;
  confidence: number; // 0-100%
  trendDirection: 'up' | 'down' | 'stable';
  timeHorizon: '1day' | '1week' | '1month' | '3months' | '6months' | '1year';
  factors: string[];
  recommendations: string[];
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'revenue' | 'demand' | 'churn' | 'inventory';
  accuracy: number;
  lastTrained: string;
  nextTraining: string;
  inputs: string[];
  output: string;
  model: any; // Le modèle ML réel (simplifié pour TypeScript)
}

// === EXPORT POUR UTILISATION ===

export type AnalyticsCategory = 'business' | 'customer' | 'operational' | 'product' | 'marketing' | 'performance';

export interface AnalyticsFilters {
  dateRange?: DateRange;
  stores?: string[];
  categories?: string[];
  orderTypes?: string[];
  customers?: string[];
  products?: string[];
  metrics?: AnalyticsCategory[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  data?: any;
  lastUpdated?: string;
}