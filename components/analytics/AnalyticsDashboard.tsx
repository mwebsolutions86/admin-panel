/**
 * Dashboard Analytics Principal
 * Universal Eats - Module Analytics Phase 2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useAnalyticsDashboard } from '@/hooks/use-analytics';
import { DateRangePicker } from './DateRangePicker';
import { FilterPanel } from './FilterPanel';
import { MetricsCard } from './MetricsCard';
import { RevenueChart } from './RevenueChart';
import { OrdersChart } from './OrdersChart';
import { CustomerSegmentation } from './CustomerSegmentation';
import { DeliveryPerformance } from './DeliveryPerformance';
import { ProductAnalytics } from './ProductAnalytics';
import { AlertCenter } from './AlertCenter';
import { KPICards } from './KPICards';
import { TrendAnalysis } from './TrendAnalysis';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className = '' }: AnalyticsDashboardProps) {
  const {
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
    dashboardConfig,
    isLoading,
    error,
    lastUpdated,
    refresh,
    updateFilters,
    updateDashboardConfig,
    exportDashboardData
  } = useAnalyticsDashboard();

  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Calculer les KPIs en temps réel
  const kpiSummary = React.useMemo(() => {
    if (!businessMetrics || !customerMetrics || !operationalMetrics) return null;

    return {
      totalRevenue: businessMetrics.totalRevenue,
      totalOrders: businessMetrics.ordersCount,
      averageOrderValue: businessMetrics.averageOrderValue,
      customerSatisfaction: operationalMetrics.customerSatisfaction,
      deliveryTime: operationalMetrics.averageDeliveryTime,
      revenueGrowth: businessMetrics.revenueGrowth.percentage,
      newCustomers: customerMetrics.newCustomers.percentage,
      retentionRate: customerMetrics.customerRetentionRate
    };
  }, [businessMetrics, customerMetrics, operationalMetrics]);

  // Filtrer les alertes non résolues
  const activeAlerts = React.useMemo(() => {
    return alerts.filter(alert => !alert.isResolved).slice(0, 5);
  }, [alerts]);

  const handleRefresh = () => {
    refresh();
  };

  const handleExport = () => {
    exportDashboardData();
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Erreur Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header avec contrôles */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des performances Universal Eats
          </p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Dernière mise à jour: {format(new Date(lastUpdated), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Filtres
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Panel de filtres */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={updateFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Alertes actives */}
      {activeAlerts.length > 0 && (
        <AlertCenter alerts={activeAlerts} />
      )}

      {/* KPIs principaux */}
      {kpiSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICards
            revenue={kpiSummary.totalRevenue}
            orders={kpiSummary.totalOrders}
            avgOrderValue={kpiSummary.averageOrderValue}
            growth={kpiSummary.revenueGrowth}
          />
        </div>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="customers">Clients</TabsTrigger>
          <TabsTrigger value="operations">Opérations</TabsTrigger>
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique du chiffre d'affaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Chiffre d'affaires
                </CardTitle>
                <CardDescription>
                  Évolution du CA sur la période sélectionnée
                </CardDescription>
              </CardHeader>
              <CardContent>
                {businessMetrics ? (
                  <RevenueChart 
                    data={businessMetrics.dailyRevenue}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    {isLoading ? 'Chargement...' : 'Aucune donnée'}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Graphique des commandes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Commandes
                </CardTitle>
                <CardDescription>
                  Volume des commandes dans le temps
                </CardDescription>
              </CardHeader>
              <CardContent>
                {businessMetrics ? (
                  <OrdersChart 
                    data={businessMetrics.dailyRevenue}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    {isLoading ? 'Chargement...' : 'Aucune donnée'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Métriques de satisfaction et performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricsCard
              title="Satisfaction Client"
              value={operationalMetrics?.customerSatisfaction || 0}
              unit="/5"
              trend={operationalMetrics?.customerSatisfaction && operationalMetrics.customerSatisfaction >= 4 ? 'up' : 'down'}
              icon={CheckCircle}
              color="green"
            />
            
            <MetricsCard
              title="Temps de Livraison"
              value={operationalMetrics?.averageDeliveryTime || 0}
              unit="min"
              trend={operationalMetrics?.averageDeliveryTime && operationalMetrics.averageDeliveryTime <= 30 ? 'up' : 'down'}
              icon={Clock}
              color="blue"
            />
            
            <MetricsCard
              title="Clients Nouveaux"
              value={customerMetrics?.newCustomers.current || 0}
              trend={customerMetrics?.newCustomers.trend || 'stable'}
              icon={Users}
              color="purple"
            />
          </div>

          {/* Performance des magasins */}
          {storeMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance par Magasin</CardTitle>
                <CardDescription>
                  Classement des magasins par chiffre d'affaires
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storeMetrics.slice(0, 5).map((store, index) => (
                    <div key={store.storeId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{store.storeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {store.ordersCount} commandes • {store.averageOrderValue.toFixed(2)}€ panier moyen
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{store.totalRevenue.toFixed(2)}€</p>
                        <Badge variant={
                          store.performance === 'excellent' ? 'default' :
                          store.performance === 'good' ? 'secondary' :
                          store.performance === 'average' ? 'outline' : 'destructive'
                        }>
                          {store.performance}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Business */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution du Chiffre d'affaires</CardTitle>
              </CardHeader>
              <CardContent>
                {businessMetrics ? (
                  <RevenueChart 
                    data={businessMetrics.monthlyRevenue}
                    height={400}
                    showTrend={true}
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    {isLoading ? 'Chargement...' : 'Aucune donnée'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparaison Périodes</CardTitle>
              </CardHeader>
              <CardContent>
                {businessMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Cette semaine</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{businessMetrics.periodComparison.thisWeek.toFixed(2)}€</span>
                        {businessMetrics.revenueGrowth.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Semaine dernière</span>
                      <span className="font-bold">{businessMetrics.periodComparison.lastWeek.toFixed(2)}€</span>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center">
                      <span>Ce mois</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{businessMetrics.periodComparison.thisMonth.toFixed(2)}€</span>
                        <Badge variant={businessMetrics.revenueGrowth.percentage > 0 ? 'default' : 'destructive'}>
                          {businessMetrics.revenueGrowth.percentage > 0 ? '+' : ''}{businessMetrics.revenueGrowth.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Mois dernier</span>
                      <span className="font-bold">{businessMetrics.periodComparison.lastMonth.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Marges et rentabilité */}
          {businessMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Analyse des Marges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{businessMetrics.grossMargin.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Marge Brute</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{businessMetrics.netMargin.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Marge Nette</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{businessMetrics.profitMargin.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Marge Bénéficiaire</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Clients */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Segmentation Client</CardTitle>
              </CardHeader>
              <CardContent>
                {customerMetrics ? (
                  <CustomerSegmentation 
                    segments={customerMetrics.customerSegments}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    {isLoading ? 'Chargement...' : 'Aucune donnée'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métriques de Fidélisation</CardTitle>
              </CardHeader>
              <CardContent>
                {customerMetrics && (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Taux de rétention</span>
                      <span className="font-bold">{(customerMetrics.customerRetentionRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valeur vie client</span>
                      <span className="font-bold">{customerMetrics.customerLifetimeValue.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commandes moyennes/client</span>
                      <span className="font-bold">{customerMetrics.averageOrdersPerCustomer.toFixed(1)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span>Membres programme fidélité</span>
                      <span className="font-bold">{customerMetrics.loyaltyMetrics.loyaltyProgramMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taux de conversion points</span>
                      <span className="font-bold">{(customerMetrics.loyaltyMetrics.pointsRedemptionRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Opérations */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance de Livraison</CardTitle>
              </CardHeader>
              <CardContent>
                {operationalMetrics ? (
                  <DeliveryPerformance 
                    data={operationalMetrics}
                    height={300}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    {isLoading ? 'Chargement...' : 'Aucune donnée'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Temps de Préparation</CardTitle>
              </CardHeader>
              <CardContent>
                {operationalMetrics && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{operationalMetrics.averagePreparationTime.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">minutes en moyenne</p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(operationalMetrics.preparationTimeByCategory).map(([category, time]) => (
                        <div key={category} className="flex justify-between">
                          <span className="text-sm">{category}</span>
                          <span className="font-medium">{time.toFixed(1)} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Produits */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Produits</CardTitle>
            </CardHeader>
            <CardContent>
              {productAnalytics ? (
                <ProductAnalytics 
                  data={productAnalytics}
                  height={400}
                />
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  {isLoading ? 'Chargement...' : 'Aucune donnée'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse des tendances */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Tendances</CardTitle>
              <CardDescription>
                Prédictions et tendances sur les principales métriques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendAnalysis />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Indicateur de chargement global */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Actualisation des données...</span>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;