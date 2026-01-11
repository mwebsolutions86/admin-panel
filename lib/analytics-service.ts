import { supabase } from './supabase';
import { 
  BusinessMetrics, StoreMetrics, ProductAnalytics, CustomerMetrics, 
  OperationalMetrics, AnalyticsFilters, TimeSeriesPoint 
} from '@/types/analytics';

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const getPreviousPeriod = (start: Date, end: Date) => {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime()); 
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { prevStart, prevEnd };
};

export class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) AnalyticsService.instance = new AnalyticsService();
    return AnalyticsService.instance;
  }

  async getBusinessMetrics(filters?: AnalyticsFilters): Promise<BusinessMetrics> {
    try {
      const endDate = filters?.dateRange?.end ? new Date(filters.dateRange.end) : new Date();
      const startDate = filters?.dateRange?.start ? new Date(filters.dateRange.start) : new Date(new Date().setDate(endDate.getDate() - 30));
      
      startDate.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);

      const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);

      // Période Actuelle
      let queryCurrent = supabase
        .from('orders')
        .select('id, total_amount, created_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .neq('status', 'cancelled');

      if (filters?.stores && filters.stores.length > 0) {
        queryCurrent = queryCurrent.in('store_id', filters.stores);
      }

      const { data: currentData, error: currError } = await queryCurrent;
      if (currError) throw currError;
      const currentOrders = currentData || [];

      // Période Précédente
      let queryPrev = supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', prevEnd.toISOString())
        .neq('status', 'cancelled');

      if (filters?.stores && filters.stores.length > 0) {
        queryPrev = queryPrev.in('store_id', filters.stores);
      }

      const { data: prevData } = await queryPrev;
      const prevOrders = prevData || [];

      // Calculs
      const currentRevenue = currentOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      const currentCount = currentOrders.length;
      const prevCount = prevOrders.length;

      const currentBasket = currentCount > 0 ? currentRevenue / currentCount : 0;
      const prevBasket = prevCount > 0 ? prevRevenue / prevCount : 0;

      const dailyRevenue = this.aggregateByDay(currentOrders, startDate, endDate, 'total_amount');
      const hourlyRevenue = this.aggregateByHour(currentOrders, 'total_amount');
      const ordersOverTime = this.aggregateByDay(currentOrders, startDate, endDate, 'count');
      const revenueOverTime = dailyRevenue.map(p => ({ date: p.date, value: p.value }));

      return {
        totalRevenue: currentRevenue,
        ordersCount: currentCount,
        totalOrders: currentCount,
        averageBasket: currentBasket,
        averageOrderValue: currentBasket,
        
        revenueGrowth: calculateGrowth(currentRevenue, prevRevenue),
        ordersGrowth: calculateGrowth(currentCount, prevCount),
        averageBasketGrowth: calculateGrowth(currentBasket, prevBasket),
        
        grossMargin: currentRevenue * 0.3, // Estimation
        netMargin: currentRevenue * 0.1, // Estimation
        profitMargin: 10,
        activeUsers: 0, 
        cancelledOrders: 0,
        
        hourlyRevenue,
        dailyRevenue,
        monthlyRevenue: [],
        
        periodComparison: { 
          thisWeek: currentRevenue, 
          lastWeek: prevRevenue, 
          thisMonth: currentRevenue, 
          lastMonth: prevRevenue 
        },
        
        revenueOverTime,
        ordersOverTime
      };

    } catch (e) { 
      console.error("Erreur getBusinessMetrics:", e);
      return this.getEmptyMetrics(); 
    }
  }

  async getProductAnalytics(filters?: AnalyticsFilters): Promise<ProductAnalytics> {
    try {
      const startDate = filters?.dateRange?.start ? new Date(filters.dateRange.start) : new Date(Date.now() - 30*24*60*60*1000);
      const endDate = filters?.dateRange?.end ? new Date(filters.dateRange.end) : new Date();

      let query = supabase
        .from('order_items')
        .select(`
          product_id, 
          product_name, 
          quantity, 
          total_price, 
          orders!inner (
            created_at, 
            store_id,
            status
          )
        `)
        .gte('orders.created_at', startDate.toISOString())
        .lte('orders.created_at', endDate.toISOString())
        .neq('orders.status', 'cancelled');

      if (filters?.stores && filters.stores.length > 0) {
        query = query.in('orders.store_id', filters.stores);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = new Map<string, { name: string; revenue: number; quantity: number }>();

      (data || []).forEach((item: any) => {
        const key = item.product_id || item.product_name || 'unknown';
        const current = stats.get(key) || { name: item.product_name, revenue: 0, quantity: 0 };
        current.revenue += (Number(item.total_price) || 0);
        current.quantity += (Number(item.quantity) || 0);
        stats.set(key, current);
      });

      // CORRECTION ICI : Mapping explicite vers l'interface ProductAnalytics
      const topSellingProducts = Array.from(stats.entries())
        .map(([id, stat]) => ({
          productId: id,
          productName: stat.name,
          revenue: stat.revenue,
          quantity: stat.quantity,
          salesCount: stat.quantity, // Alias pour compatibilité
          trend: 'stable'
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const totalItems = (data || []).reduce((sum: number, i: any) => sum + (Number(i.quantity)||0), 0);
      const totalRevenue = (data || []).reduce((sum: number, i: any) => sum + (Number(i.total_price)||0), 0);

      return {
        topSellingProducts,
        topProducts: topSellingProducts,
        trendingProducts: topSellingProducts.slice(0, 5),
        categoryPerformance: [],
        menuAnalysis: {
          totalItemsSold: totalItems,
          uniqueProductsSold: stats.size,
          totalProducts: stats.size,
          activeProducts: stats.size,
          outOfStock: 0,
          averagePrice: totalItems > 0 ? totalRevenue / totalItems : 0,
          priceRange: { min: 0, max: 0 }
        }
      };

    } catch (e) {
      console.error("Erreur getProductAnalytics:", e);
      return { 
        topSellingProducts: [], 
        topProducts: [], 
        trendingProducts: [], 
        categoryPerformance: [],
        menuAnalysis: { 
            totalItemsSold: 0, 
            uniqueProductsSold: 0,
            totalProducts: 0,
            activeProducts: 0,
            outOfStock: 0,
            averagePrice: 0,
            priceRange: { min: 0, max: 0 }
        } 
      };
    }
  }

  async getCustomerMetrics(filters?: AnalyticsFilters): Promise<CustomerMetrics> {
    try {
      const startDate = filters?.dateRange?.start ? new Date(filters.dateRange.start) : new Date(Date.now() - 30*24*60*60*1000);
      const endDate = filters?.dateRange?.end ? new Date(filters.dateRange.end) : new Date();

      const { count: newCount } = await supabase
        .from('cust_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { count: activeCount } = await supabase
        .from('orders')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('user_id', 'is', null);

      return {
        totalCustomers: 0,
        newCustomers: newCount || 0,
        activeCustomers: activeCount || 0,
        repeatRate: 0,
        churnRate: 0,
        customerLtv: 0,
        ltv: 0,
        segments: []
      };

    } catch (e) {
      console.error("Erreur getCustomerMetrics:", e);
      return { totalCustomers: 0, newCustomers: 0, activeCustomers: 0, repeatRate: 0, churnRate: 0, customerLtv: 0, ltv: 0, segments: [] };
    }
  }

  async getOperationalMetrics(filters?: AnalyticsFilters): Promise<OperationalMetrics> {
    return {
      averageDeliveryTime: 0,
      customerSatisfaction: 0,
      onTimeDeliveryRate: 0,
      orderAccuracyRate: 0,
      averagePreparationTime: 0,
      driverUtilizationRate: 0,
      activeDrivers: 0,
      totalDeliveries: 0,
      complaintRate: 0,
      deliveryTimeDistribution: { 
        under30min: 0, 
        between30to45min: 0, 
        between45to60min: 0, 
        over60min: 0 
      },
      deliveryPersonMetrics: [],
      preparationTimeByCategory: [],
      orderAccuracy: 0,
      heatmapData: [],
      peakHours: [],
      storeAvailability: { openStores: 0, closedStores: 0, averageOpeningHours: 0 }
    };
  }

  async getStoreMetrics(storeIds?: string[]): Promise<StoreMetrics[]> {
    try {
      let storeQuery = supabase.from('stores').select('id, name');
      if (storeIds?.length) storeQuery = storeQuery.in('id', storeIds);
      
      const { data: stores, error: sError } = await storeQuery;
      if (sError) throw sError;

      if (!stores || stores.length === 0) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('store_id, total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());

      const metricsMap = new Map<string, StoreMetrics>();

      stores.forEach(s => {
        metricsMap.set(s.id, {
          storeId: s.id,
          storeName: s.name,
          totalRevenue: 0,
          totalOrders: 0,
          averageBasket: 0,
          rating: 0
        });
      });

      (orders || []).forEach((o: any) => {
        const m = metricsMap.get(o.store_id);
        if (m) {
          m.totalRevenue += (Number(o.total_amount) || 0);
          m.totalOrders += 1;
        }
      });

      return Array.from(metricsMap.values()).map(m => ({
        ...m,
        averageBasket: m.totalOrders > 0 ? m.totalRevenue / m.totalOrders : 0
      }));

    } catch (e) {
      console.error("Erreur getStoreMetrics:", e);
      return [];
    }
  }

  private aggregateByHour(data: any[], valueKey: string): TimeSeriesPoint[] {
    const counts = new Array(24).fill(0);
    data.forEach(item => {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        const val = valueKey === 'count' ? 1 : (Number(item[valueKey]) || 0);
        counts[d.getHours()] += val;
      }
    });
    return counts.map((v, h) => ({ date: `${h}h`, value: v }));
  }

  private aggregateByDay(data: any[], start: Date, end: Date, valueKey: string): TimeSeriesPoint[] {
    const map = new Map<string, number>();
    const current = new Date(start);
    
    let loops = 0;
    while (current <= end && loops < 366) {
      const k = current.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      map.set(k, 0);
      current.setDate(current.getDate() + 1);
      loops++;
    }

    data.forEach(item => {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) {
        const k = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        if (map.has(k)) {
          const val = valueKey === 'count' ? 1 : (Number(item[valueKey]) || 0);
          map.set(k, (map.get(k)||0) + val);
        }
      }
    });

    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }

  private getEmptyMetrics(): BusinessMetrics {
    return { 
      totalRevenue: 0, totalOrders: 0, ordersCount: 0, averageBasket: 0, averageOrderValue: 0, 
      revenueGrowth: 0, ordersGrowth: 0, averageBasketGrowth: 0,
      grossMargin: 0, netMargin: 0, profitMargin: 0, activeUsers: 0, cancelledOrders: 0,
      hourlyRevenue: [], dailyRevenue: [], monthlyRevenue: [], 
      periodComparison: { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0 },
      revenueOverTime: [], ordersOverTime: []
    };
  }

  async getMarketingMetrics() { return { activeCampaigns: 0, conversionRate: 0, cac: 0, roi: 0, campaigns: [] }; }
  async getPerformanceMetrics() { return { uptime: 100, errorRate: { total: 0 } }; }
  async getKPIConfigs() { return []; }
  async updateKPIConfig() { return; }
  async checkKPIThresholds() { return []; }
  async trackEvent() { return; }
  async trackOrderEvent() { return; }
  async trackUserAction() { return; }
  async analyzeTrends() { return { metric: '', timeHorizon: '', trend: 0, data: [], insights: [] }; }
  async generateReport() { return { id: '', generatedAt: '', url: '', config: {} as any }; }
}

export const analyticsService = AnalyticsService.getInstance();