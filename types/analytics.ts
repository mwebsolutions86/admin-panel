/**
 * Types pour le module Analytics
 * Universal Eats
 */

// Définition explicite pour résoudre l'erreur "Property date does not exist"
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  comparison?: 'previous_period' | 'year_over_year' | 'none';
  stores?: string[];
  channels?: ('delivery' | 'pickup' | 'dine_in' | 'aggregator')[];
  categories?: string[];
  products?: string[];
  minOrderValue?: number;
  tags?: string[];
  orderTypes?: string[];
}

export interface BusinessMetrics {
  // KPIs principaux
  totalRevenue: number;
  ordersCount: number;
  averageBasket: number;
  averageOrderValue: number; // Redondant mais demandé pour compatibilité
  
  // Croissance (Pourcentages simples)
  revenueGrowth: number;      
  ordersGrowth: number;       
  averageBasketGrowth: number; 
  
  // Marges
  grossMargin: number;
  netMargin: number;
  profitMargin: number;
  
  // Séries temporelles
  hourlyRevenue: TimeSeriesPoint[];
  dailyRevenue: TimeSeriesPoint[];
  monthlyRevenue: TimeSeriesPoint[];
  
  // Comparaison Périodique
  periodComparison: { 
    thisWeek: number; 
    lastWeek: number; 
    thisMonth: number; 
    lastMonth: number 
  };
  
  // Graphiques (Compatibilité Recharts)
  revenueOverTime: { date: string; value: number }[];
  ordersOverTime: { date: string; value: number }[];
}

// ... (Gardez les autres interfaces existantes: CustomerMetrics, OperationalMetrics, etc.)
export interface CustomerMetrics {
  newCustomers: number;
  activeCustomers: number;
  churnRate: number;
  ltv: number;
}

export interface OperationalMetrics {
  averageDeliveryTime: number;
  customerSatisfaction: number;
  onTimeDeliveryRate?: number;
  orderAccuracyRate?: number;
  averagePreparationTime?: number;
  driverUtilizationRate?: number;
  activeDrivers?: number;
  totalDeliveries?: number;
}

export interface ProductAnalytics {
  topProducts: any[];
}

export interface MarketingMetrics {
  campaigns: any[];
}

export interface PerformanceMetrics {
  uptime: number;
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
  label: string;
  value: number;
  target: number;
  unit: string;
}

export interface AnalyticsAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  isResolved: boolean;
}

export interface ReportConfig {
  id: string;
  name: string;
}

export interface ReportData {
  url: string;
}

export interface TrendAnalysis {
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardConfig {
  layout: string;
}