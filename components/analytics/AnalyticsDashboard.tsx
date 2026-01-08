"use client";

import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from "recharts";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Users, 
  Clock, 
  Smile, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

// --- IMPORTS DES COMPOSANTS MÉTIERS ---
import { DeliveryPerformance } from "./DeliveryPerformance";
import { ProductAnalytics } from "./ProductAnalytics";
import { AdvancedFilters } from "./AdvancedFilters";

// --- DONNÉES DE REPLI (FALLBACK) ---
const DEFAULT_OPS_DATA = {
  averageDeliveryTime: 0,
  onTimeDeliveryRate: 0,
  customerSatisfaction: 0,
  orderAccuracyRate: 0,
  averagePreparationTime: 0,
  driverUtilizationRate: 0,
  activeDrivers: 0,
  totalDeliveries: 0,
  deliveryTimeDistribution: [],
  deliveryPersonMetrics: [],
  preparationTimeByCategory: [],
  orderAccuracy: 0,
  heatmapData: [],
  peakHours: [],
  complaintRate: 0,
  storeAvailability: { openStores: 0, closedStores: 0, averageOpeningHours: 0 }
};

const DEFAULT_PROD_DATA = {
  topProducts: [],
  categoryPerformance: [],
  stockAlerts: [],
  totalRevenue: 0,
  totalItemsSold: 0,
  topSellingProducts: [],
  menuAnalysis: { totalProducts: 0, activeProducts: 0, outOfStock: 0, averagePrice: 0, priceRange: { min: 0, max: 0 } },
  trendingProducts: []
};

// --- COMPOSANT UTILITAIRE POUR L'AFFICHAGE DES TENDANCES ---
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

// Helper pour formater l'argent
const fmtMoney = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

// Helper pour le label de période dynamique
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
  // Connexion aux données réelles
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

  // Accès typé ou permissif aux métriques
  // Note: businessMetrics correspond maintenant à l'interface mise à jour
  const sMetrics = storeMetrics as any[];

  // Extraction des valeurs clés (avec fallback)
  const totalRevenue = businessMetrics?.totalRevenue || 0;
  const ordersCount = businessMetrics?.ordersCount || 0;
  const averageBasket = businessMetrics?.averageBasket || businessMetrics?.averageOrderValue || 0;
  
  const revenueGrowth = businessMetrics?.revenueGrowth || 0;
  const ordersGrowth = businessMetrics?.ordersGrowth || 0;
  const averageBasketGrowth = businessMetrics?.averageBasketGrowth || 0;
  
  // Utilisation de revenueGrowth comme proxy pour la croissance globale si non dispo
  const globalGrowth = revenueGrowth;

  // Données pour les graphiques
  const revenueData = businessMetrics?.revenueOverTime || businessMetrics?.dailyRevenue?.map(p => ({ date: p.date, value: p.value })) || [];
  const ordersData = businessMetrics?.ordersOverTime || [];

  // Label dynamique
  const periodLabel = getPeriodLabel(filters);

  if (isLoading && !businessMetrics) {
    return <div className="flex h-96 items-center justify-center"><RefreshCw className="animate-spin text-primary h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6">
      
      {/* INTEGRATION DU COMPOSANT FILTRES */}
      <AdvancedFilters 
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        currentFilters={filters}
        onApply={handleApplyFilters}
      />

      {/* En-tête Interne */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble des performances Universal Eats
          </p>
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
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Exporter
          </Button>
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
        </div>
      </div>

      {/* 4 Cartes KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Chiffre d'affaires */}
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

        {/* Commandes */}
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

        {/* Panier Moyen */}
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

        {/* Croissance */}
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

      {/* SYSTÈME D'ONGLETS */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 rounded-none h-auto overflow-x-auto">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="business" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Business
          </TabsTrigger>
          <TabsTrigger value="clients" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Clients
          </TabsTrigger>
          <TabsTrigger value="operations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Opérations
          </TabsTrigger>
          <TabsTrigger value="produits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Produits
          </TabsTrigger>
          <TabsTrigger value="tendances" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2">
            Tendances
          </TabsTrigger>
        </TabsList>

        {/* --- ONGLET VUE D'ENSEMBLE --- */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Graphique Chiffre d'Affaires */}
            <Card>
              <CardHeader>
                <CardTitle>Chiffre d'affaires</CardTitle>
                <CardDescription>Évolution du CA sur la période sélectionnée</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      // Formatter pour les dates si nécessaire
                      tickFormatter={(val) => val.includes('-') ? val.split('-').slice(1).join('/') : val}
                    />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}k€`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique Commandes */}
            <Card>
              <CardHeader>
                <CardTitle>Commandes</CardTitle>
                <CardDescription>Volume des commandes dans le temps</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => val.includes('-') ? val.split('-').slice(1).join('/') : val}
                    />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* KPI Secondaires */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50/30 border-green-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700 flex items-center gap-2">
                    <Smile className="h-4 w-4" /> Satisfaction Client
                  </span>
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Smile className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {operationalMetrics?.customerSatisfaction || '0.0'} <span className="text-sm text-gray-400 font-normal">/5</span>
                </div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>

            <Card className="bg-blue-50/30 border-blue-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Temps de Livraison
                  </span>
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {operationalMetrics?.averageDeliveryTime || '0.0'} <span className="text-sm text-gray-400 font-normal">min</span>
                </div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>

            <Card className="bg-purple-50/30 border-purple-100 flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Clients Nouveaux
                  </span>
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {String(customerMetrics?.newCustomers || '0')}
                </div>
                <TrendIndicator value={0} label={periodLabel} />
              </CardContent>
            </Card>
          </div>

          {/* Liste des Magasins */}
          <Card>
            <CardHeader>
              <CardTitle>Performance par Magasin</CardTitle>
              <CardDescription>Classement des magasins par chiffre d'affaires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sMetrics && sMetrics.length > 0 ? sMetrics.map((store: any, index: number) => (
                  <div key={store.storeId || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full font-bold text-white
                        ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{store.storeName}</p>
                        <p className="text-sm text-gray-500">
                          {store.totalOrders || 0} commandes • Panier moyen {fmtMoney(store.averageBasket || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{fmtMoney(store.totalRevenue || 0)}</p>
                      <Badge variant={(store.rating || 0) >= 4.5 ? 'default' : 'secondary'} className="text-xs">
                        {(store.rating || 0) >= 4.5 ? 'Excellent' : 'Moyen'}
                      </Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">Aucune donnée magasin disponible</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- AUTRES ONGLETS --- */}
        
        {/* Onglet Opérations ACTIVÉ */}
        <TabsContent value="operations" className="pt-4">
           <DeliveryPerformance data={operationalMetrics || DEFAULT_OPS_DATA} />
        </TabsContent>

        {/* Onglet Produits ACTIVÉ */}
        <TabsContent value="produits" className="pt-4">
           <ProductAnalytics data={productAnalytics || DEFAULT_PROD_DATA} />
        </TabsContent>

        {/* Onglets restants à développer */}
        <TabsContent value="business">
           <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">Module Business à venir</div>
        </TabsContent>
        <TabsContent value="clients">
           <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">Module Clients à venir</div>
        </TabsContent>
        <TabsContent value="tendances">
           <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">Module Tendances à venir</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}