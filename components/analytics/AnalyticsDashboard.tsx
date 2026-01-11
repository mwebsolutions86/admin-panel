"use client";

import React, { useState } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, ArrowDownRight, Minus, Users, Clock, Smile, TrendingUp, DollarSign, ShoppingBag, Filter, Download, RefreshCw
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

import { DeliveryPerformance } from "./DeliveryPerformance";
import { ProductAnalytics } from "./ProductAnalytics";
import { BusinessAnalytics } from "./BusinessAnalytics";
import { AdvancedFilters } from "./AdvancedFilters";
import { OrdersChart } from "./OrdersChart";
import { RevenueChart } from "./RevenueChart";

const DEFAULT_OPS_DATA = {
  averageDeliveryTime: 0,
  onTimeDeliveryRate: 0,
  customerSatisfaction: 0,
  orderAccuracyRate: 0,
  averagePreparationTime: 0,
  driverUtilizationRate: 0,
  activeDrivers: 0,
  totalDeliveries: 0,
  complaintRate: 0,
  deliveryTimeDistribution: { 
    under30min: 0, between30to45min: 0, between45to60min: 0, over60min: 0 
  },
  deliveryPersonMetrics: [],
  preparationTimeByCategory: [],
  orderAccuracy: 0,
  heatmapData: [],
  peakHours: [],
  storeAvailability: { openStores: 0, closedStores: 0, averageOpeningHours: 0 }
};

const DEFAULT_PROD_DATA = {
  topSellingProducts: [],
  topProducts: [],
  trendingProducts: [],
  categoryPerformance: [],
  menuAnalysis: { 
    totalItemsSold: 0,     // Requis
    uniqueProductsSold: 0, // Requis
    totalProducts: 0, 
    activeProducts: 0, 
    outOfStock: 0, 
    averagePrice: 0, 
    priceRange: { min: 0, max: 0 } 
  }
};

const TrendIndicator = ({ value, label = "période préc." }: { value?: number, label?: string }) => {
  if (value === undefined || value === null) return <span className="text-xs text-gray-400 mt-1 flex items-center"><Minus className="h-3 w-3 mr-1" /> Pas de données</span>;
  
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const colorClass = isPositive ? "text-green-600" : isNeutral ? "text-gray-500" : "text-red-600";
  const Icon = isPositive ? ArrowUpRight : isNeutral ? Minus : ArrowDownRight;
  const sign = isPositive ? "+" : "";

  return (
    <p className={`text-xs ${colorClass} flex items-center mt-1`}>
      <Icon className="h-3 w-3 mr-1" />
      {sign}{value.toFixed(1)}% vs {label}
    </p>
  );
};

const fmtMoney = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(val);

const getPeriodLabel = (filters: any) => {
  if (!filters?.dateRange?.start || !filters?.dateRange?.end) return "période préc.";
  const start = new Date(filters.dateRange.start);
  const end = new Date(filters.dateRange.end);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return "hier";
  if (diffDays <= 7) return "7 derniers jours";
  if (diffDays <= 30) return "mois dernier";
  return "période préc.";
};

export function AnalyticsDashboard() {
  const { 
    businessMetrics, 
    operationalMetrics, 
    customerMetrics, 
    productAnalytics,
    storeMetrics,
    isLoading,
    refresh,
    filters,       
    updateFilters  
  } = useAnalytics({ enableRealtime: true });

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleApplyFilters = (newFilters: any) => {
    updateFilters(newFilters);
    setIsFiltersOpen(false);
  };

  const sMetrics = storeMetrics as any[];
  const totalRevenue = businessMetrics?.totalRevenue || 0;
  const ordersCount = businessMetrics?.ordersCount || 0;
  const averageBasket = businessMetrics?.averageBasket || businessMetrics?.averageOrderValue || 0;
  const revenueGrowth = businessMetrics?.revenueGrowth || 0;
  const ordersGrowth = businessMetrics?.ordersGrowth || 0;
  const averageBasketGrowth = businessMetrics?.averageBasketGrowth || 0;
  const globalGrowth = revenueGrowth;
  const periodLabel = getPeriodLabel(filters);

  if (isLoading && !businessMetrics) {
    return <div className="flex h-96 items-center justify-center"><RefreshCw className="animate-spin text-primary h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6">
      <AdvancedFilters 
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        currentFilters={filters}
        onApply={handleApplyFilters}
      />

      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Vue d'ensemble des performances Universal Eats</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFiltersOpen(true)}
            className={filters?.comparison ? "border-blue-500 text-blue-600 bg-blue-50" : ""}
          >
            <Filter className="mr-2 h-4 w-4" /> 
            {filters?.comparison ? "Filtres (Actifs)" : "Filtres"}
          </Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exporter</Button>
          <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{fmtMoney(totalRevenue)}</div>
            <TrendIndicator value={revenueGrowth} label={periodLabel} />
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Commandes</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{ordersCount}</div>
            <TrendIndicator value={ordersGrowth} label={periodLabel} />
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 border-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Panier Moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{fmtMoney(averageBasket)}</div>
            <TrendIndicator value={averageBasketGrowth} label={periodLabel} />
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Croissance</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{globalGrowth.toFixed(1)}%</div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" /> vs période précédente
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 rounded-none h-auto overflow-x-auto">
          <TabsTrigger value="overview" className="px-6 py-2">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="business" className="px-6 py-2">Business</TabsTrigger>
          <TabsTrigger value="clients" className="px-6 py-2">Clients</TabsTrigger>
          <TabsTrigger value="operations" className="px-6 py-2">Opérations</TabsTrigger>
          <TabsTrigger value="produits" className="px-6 py-2">Produits</TabsTrigger>
          <TabsTrigger value="tendances" className="px-6 py-2">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {businessMetrics && <RevenueChart data={businessMetrics} filters={filters} />}
            {businessMetrics && <OrdersChart data={businessMetrics} filters={filters} />}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50/30 border-green-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700 flex items-center gap-2"><Smile className="h-4 w-4" /> Satisfaction Client</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{operationalMetrics?.customerSatisfaction || '0.0'} <span className="text-sm text-gray-400 font-normal">/5</span></div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>
            <Card className="bg-blue-50/30 border-blue-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 flex items-center gap-2"><Clock className="h-4 w-4" /> Temps de Livraison</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{operationalMetrics?.averageDeliveryTime || '0.0'} <span className="text-sm text-gray-400 font-normal">min</span></div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>
            <Card className="bg-purple-50/30 border-purple-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 flex items-center gap-2"><Users className="h-4 w-4" /> Clients Nouveaux</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{String(customerMetrics?.newCustomers || '0')}</div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Performance par Magasin</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sMetrics && sMetrics.length > 0 ? sMetrics.map((store: any, index: number) => (
                  <div key={store.storeId || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0 ? 'bg-yellow-500' : 'bg-gray-400'}`}>{index + 1}</div>
                      <div>
                        <p className="font-medium text-gray-900">{store.storeName}</p>
                        <p className="text-sm text-gray-500">{store.totalOrders || 0} commandes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{fmtMoney(store.totalRevenue || 0)}</p>
                    </div>
                  </div>
                )) : <div className="text-center py-8 text-gray-500">Aucune donnée magasin disponible</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="pt-4"><BusinessAnalytics data={businessMetrics} /></TabsContent>
        <TabsContent value="operations" className="pt-4"><DeliveryPerformance data={operationalMetrics || DEFAULT_OPS_DATA} /></TabsContent>
        <TabsContent value="produits" className="pt-4"><ProductAnalytics data={productAnalytics || DEFAULT_PROD_DATA} /></TabsContent>
        <TabsContent value="clients"><div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">Module Clients à venir</div></TabsContent>
        <TabsContent value="tendances"><div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">Module Tendances à venir</div></TabsContent>
      </Tabs>
    </div>
  );
}