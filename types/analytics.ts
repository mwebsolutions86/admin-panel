// types/analytics.ts

// Définition explicite pour les graphiques
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string; 
  timestamp?: string; // Ajout pour compatibilité avec les timestamps bruts
}

// Interface pour les plages de dates (utilisée par les filtres)
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// Filtres globaux
export interface AnalyticsFilters {
  dateRange?: DateRange;
  comparison?: boolean | 'previous_period' | 'year_over_year' | 'none';
  stores?: string[];
  channels?: string[];
  categories?: string[];
  orderTypes?: string[];
}

// Métriques Business (Revenus, Commandes)
export interface BusinessMetrics {
  totalRevenue: number;
  totalOrders: number;
  ordersCount: number; // Alias pour rétro-compatibilité
  averageBasket: number;
  averageOrderValue: number; // Alias
  revenueGrowth: number;
  ordersGrowth: number;
  averageBasketGrowth: number;
  activeUsers: number;
  cancelledOrders: number;
  grossMargin: number;
  netMargin: number;
  profitMargin: number;
  
  // Données graphiques
  revenueOverTime: TimeSeriesPoint[];
  ordersOverTime: TimeSeriesPoint[];
  dailyRevenue: TimeSeriesPoint[];
  hourlyRevenue: TimeSeriesPoint[];
  monthlyRevenue: TimeSeriesPoint[];
  
  periodComparison: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

// Métriques Opérationnelles (Livraison, Cuisine)
export interface OperationalMetrics {
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  customerSatisfaction: number;
  orderAccuracyRate: number;
  averagePreparationTime: number;
  driverUtilizationRate: number;
  activeDrivers: number;
  totalDeliveries: number;
  complaintRate: number;
  
  deliveryTimeDistribution: {
    under30min: number;
    between30to45min: number;
    between45to60min: number;
    over60min: number;
  };
  
  deliveryPersonMetrics: {
    name: string;
    deliveries: number;
    rating: number;
    id?: string;
  }[]; // Typage strict du tableau

  preparationTimeByCategory: any[];
  orderAccuracy: number;
  heatmapData: any[];
  peakHours: any[];
  
  storeAvailability: {
    openStores: number;
    closedStores: number;
    averageOpeningHours: number;
  };
}

// Métriques Clients
export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  repeatRate: number;
  churnRate: number;
  customerLtv: number;
  ltv: number; // Alias
  segments: any[];
  customerRetentionRate?: number;
  customerLifetimeValue?: number;
}

// Métriques Produits (Le point de friction précédent)
export interface ProductAnalytics {
  topSellingProducts: {
    productId: string;
    productName: string;
    revenue: number;
    quantity: number;
    ordersCount?: number;
    trend?: string;
    salesCount?: number; // Alias possible
  }[];
  
  topProducts: any[]; // Alias générique
  trendingProducts: any[];
  categoryPerformance: any[];
  
  menuAnalysis: {
    totalItemsSold: number;
    uniqueProductsSold: number;
    totalProducts: number;
    activeProducts: number;
    outOfStock: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    profitability?: string;
  };
}

// Autres Interfaces (Marketing, Performance, etc.)
export interface MarketingMetrics {
  activeCampaigns: number;
  conversionRate: number;
  cac: number;
  roi: number;
  campaigns: any[];
}

export interface PerformanceMetrics {
  uptime: number | { percentage: number };
  apiLatency?: number;
  errorRate: number | { total: number };
  appCrashes?: number;
  responseTime?: { api: number; database: number; frontend: number };
}

export interface StoreMetrics {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalOrders: number;
  averageBasket: number;
  rating: number;
}

export interface KPIConfig {
  id: string;
  label?: string;
  name?: string;
  value?: number;
  target: number;
  unit: string;
  trend?: number;
  category?: string;
  frequency?: string;
  isAlertEnabled?: boolean;
  alertThresholds?: { warning: number; critical: number };
  description?: string;
}

export interface AnalyticsAlert {
  id: string;
  type: 'info' | 'warning' | 'critical';
  message: string;
  title?: string;
  timestamp?: string;
  metric?: string;
  severity?: 'low' | 'medium' | 'high'; // Alias
  date?: string; // Alias
  isResolved?: boolean;
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'pdf' | 'excel' | 'csv';
  recipients: string[];
  filters: AnalyticsFilters;
  isActive: boolean;
}

export interface ReportData {
  id: string;
  generatedAt: string;
  url: string;
  config: ReportConfig;
  data?: any;
  filename?: string;
}

export interface TrendAnalysis {
  metric: string;
  timeHorizon: string;
  trend: number;
  trendDirection?: 'up' | 'down' | 'stable';
  current?: number;
  predicted?: number;
  confidence?: number;
  factors?: string[];
  recommendations?: string[];
  data: TimeSeriesPoint[];
  forecast?: TimeSeriesPoint[];
  insights: string[];
}

export interface DashboardConfig {
  layout: string;
  refreshInterval: number;
  visibleWidgets: string[];
  filters: AnalyticsFilters;
  notifications?: {
    enableRealTimeAlerts: boolean;
    enableEmailReports: boolean;
    enablePushNotifications: boolean;
  };
}