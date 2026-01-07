export interface AnalyticsFilters {
  dateRange?: DateRange;
  stores?: string[];
  category?: string;
  // Ajout pour compatibilité avec code existant
  categories?: string[];
  orderTypes?: string[];
}

export interface DateRange {
  start: Date;
  end: Date;
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
  location?: { lat: number; lng: number; address: string };
}

export interface BusinessMetrics {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  revenueGrowth: PercentageChange;
  grossMargin: number;
  netMargin: number;
  profitMargin: number;
  hourlyRevenue: TimeSeriesPoint[];
  dailyRevenue: TimeSeriesPoint[];
  monthlyRevenue: TimeSeriesPoint[];
  periodComparison: { thisWeek: number; lastWeek: number; thisMonth: number; lastMonth: number };
}

export interface PercentageChange {
  current: number;
  previous: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label: string;
}

export interface ProductAnalytics {
  topSellingProducts: any[];
  categoryPerformance: any[];
  menuAnalysis: any;
  trendingProducts: any[];
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: PercentageChange;
  returningCustomers: PercentageChange;
  customerRetentionRate: number;
  customerLifetimeValue: number;
  averageOrdersPerCustomer: number;
  customerSegments: any;
  loyaltyMetrics: any;
}

export interface MarketingMetrics {
  campaignPerformance: any[];
  channelPerformance: { push: any; email: any; social: any; inApp: any };
  promotionEffectiveness: any[];
}

export interface OperationalMetrics {
  averageDeliveryTime: number;
  deliveryTimeDistribution: any;
  deliveryPersonMetrics: any;
  averagePreparationTime: number;
  preparationTimeByCategory: any;
  orderAccuracy: number;
  customerSatisfaction: number;
  complaintRate: number;
  storeAvailability: any;
}

export type AnalyticsAlert = any;
export type ReportConfig = any;
export type ReportData = any;
export type TrendAnalysis = any;
export type AnalyticsEvent = any;
export type KPIConfig = any;

export interface PerformanceMetrics {
  uptime?: number;
  responseTime?: number;
  errorRate?: number;
  cpuUsage?: number;
}

export interface DashboardConfig {
  layout?: 'grid' | 'list';
  refreshInterval?: number;
  visibleWidgets?: string[];
  filters?: AnalyticsFilters;
  notifications?: {
    enableRealTimeAlerts?: boolean;
    enableEmailReports?: boolean;
    enablePushNotifications?: boolean;
  };
}
