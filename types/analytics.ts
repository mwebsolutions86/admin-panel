/**
 * Types pour le module Analytics
 * Universal Eats
 */

// Définition explicite pour résoudre l'erreur "Property date does not exist"
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string; // Ajouté pour flexibilité
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

export interface CustomerMetrics {
  newCustomers: number;
  activeCustomers: number;
  churnRate: number;
  ltv: number;
  // Ajout pour compatibilité future si nécessaire
  customerRetentionRate?: number;
}

export interface OperationalMetrics {
  averageDeliveryTime: number;
  customerSatisfaction: number;
  
  // CORRECTION : Réintégration des objets requis par DeliveryPerformance.tsx
  deliveryTimeDistribution: {
    under30min: number;
    between30to45min: number;
    between45to60min: number;
    over60min: number;
  };
  
  deliveryPersonMetrics: {
    totalActive: number;
    averageDeliveriesPerDay: number;
    averageDeliveryTime?: number;
    customerRating: number;
  };

  // Champs optionnels existants
  onTimeDeliveryRate?: number;
  orderAccuracyRate?: number;
  averagePreparationTime?: number;
  driverUtilizationRate?: number;
  activeDrivers?: number;
  totalDeliveries?: number;
}

export interface ProductAnalytics {
  topProducts: any[];
  // Ajout pour éviter des erreurs si d'autres composants cherchent ces champs
  categoryPerformance?: any[];
  menuAnalysis?: any;
}

export interface MarketingMetrics {
  campaigns: any[];
  // Ajout pour compatibilité
  channelPerformance?: any;
}

export interface PerformanceMetrics {
  uptime: number;
  responseTime?: {
    api: number;
    database: number;
    frontend: number;
  };
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
  category?: string; // Ajouté pour compatibilité
}

export interface AnalyticsAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
  isResolved: boolean;
  type?: string; // Ajouté pour compatibilité
}

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

export interface ReportData {
  url: string;
  // Ajout pour compatibilité avec le hook useAnalytics qui pourrait renvoyer plus
  generatedAt?: string;
}

export interface TrendAnalysis {
  trend: 'up' | 'down' | 'stable';
  current?: number;
  predicted?: number;
}

export interface DashboardConfig {
  layout: string;
  refreshInterval?: number;
}