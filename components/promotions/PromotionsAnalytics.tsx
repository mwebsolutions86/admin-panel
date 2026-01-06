/**
 * Dashboard Analytics des Promotions
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Interface d'analytics avancée pour les promotions :
 * - Métriques de performance en temps réel
 * - Graphiques d'utilisation et ROI
 * - Comparaisons et tendances
 * - Rapports exportables
 * - Alertes et notifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCouponAnalytics } from '@/hooks/use-promotions';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Gift,
  Download,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PromotionsAnalyticsProps {
  promotionId?: string;
}

// Données simulées pour la démonstration
const mockAnalyticsData = {
  summary: {
    totalPromotions: 24,
    activePromotions: 8,
    totalUsage: 1247,
    totalRevenue: 45680.50,
    averageConversionRate: 12.5,
    roi: 3.2,
    fraudAttempts: 23
  },
  topPromotions: [
    {
      id: '1',
      name: 'Réduction Été 2024',
      usageCount: 234,
      revenue: 8950.75,
      conversionRate: 15.2,
      roi: 4.1,
      status: 'active'
    },
    {
      id: '2', 
      name: 'Livraison Gratuite Weekend',
      usageCount: 189,
      revenue: 6780.25,
      conversionRate: 13.8,
      roi: 2.9,
      status: 'active'
    },
    {
      id: '3',
      name: 'Fidélité Gold Exclusive',
      usageCount: 156,
      revenue: 12450.00,
      conversionRate: 22.1,
      roi: 5.8,
      status: 'active'
    }
  ],
  usageTrends: [
    { date: '2024-01-01', usage: 45, revenue: 1650 },
    { date: '2024-01-02', usage: 52, revenue: 1890 },
    { date: '2024-01-03', usage: 48, revenue: 1720 },
    { date: '2024-01-04', usage: 61, revenue: 2150 },
    { date: '2024-01-05', usage: 58, revenue: 2050 },
    { date: '2024-01-06', usage: 67, revenue: 2380 },
    { date: '2024-01-07', usage: 73, revenue: 2650 }
  ],
  channelPerformance: {
    'push_notification': { distributed: 5000, used: 234, conversionRate: 4.68 },
    'email': { distributed: 3200, used: 189, conversionRate: 5.91 },
    'in_app': { distributed: 8000, used: 456, conversionRate: 5.70 },
    'social_media': { distributed: 1500, used: 67, conversionRate: 4.47 }
  },
  fraudAnalysis: {
    totalAttempts: 89,
    blockedAttempts: 23,
    riskScore: 15.2,
    commonPatterns: [
      'Trop de tentatives rapides',
      'IP suspecte',
      'Device fingerprinting'
    ]
  }
};

export default function PromotionsAnalytics({ promotionId }: PromotionsAnalyticsProps) {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('usage');
  const [isExporting, setIsExporting] = useState(false);
  
  const { analytics, performanceReport, isLoading, generateReport } = useCouponAnalytics(promotionId);

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      await generateReport({
        dateRange: getDateRangeFilter(dateRange),
        includeFraudData: true
      });
      
      // Simulation d'export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En réalité, déclencher le téléchargement du fichier
      console.log('Rapport exporté');
      
    } catch (error) {
      console.error('Erreur export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getDateRangeFilter = (range: string) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), parseInt(range.replace('d', ''))));
    return { start, end };
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = (trend: number) => {
    return trend > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics des Promotions</h2>
          <p className="text-gray-600">
            Performance et métriques en temps réel
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="365d">1 an</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportReport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Export...' : 'Exporter'}
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Utilisations</p>
                <p className="text-2xl font-bold">{mockAnalyticsData.summary.totalUsage.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(8.5)}
                  <span className={`text-sm ml-1 ${getTrendColor(8.5)}`}>
                    +8.5% vs période précédente
                  </span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenus Générés</p>
                <p className="text-2xl font-bold">{formatCurrency(mockAnalyticsData.summary.totalRevenue)}</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(12.3)}
                  <span className={`text-sm ml-1 ${getTrendColor(12.3)}`}>
                    +12.3% vs période précédente
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de Conversion</p>
                <p className="text-2xl font-bold">{mockAnalyticsData.summary.averageConversionRate}%</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(-2.1)}
                  <span className={`text-sm ml-1 ${getTrendColor(-2.1)}`}>
                    -2.1% vs période précédente
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ROI Moyen</p>
                <p className="text-2xl font-bold">{mockAnalyticsData.summary.roi}x</p>
                <div className="flex items-center mt-1">
                  {getTrendIcon(15.7)}
                  <span className={`text-sm ml-1 ${getTrendColor(15.7)}`}>
                    +15.7% vs période précédente
                  </span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets d'analyse */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="promotions">Top Promotions</TabsTrigger>
          <TabsTrigger value="channels">Canaux</TabsTrigger>
          <TabsTrigger value="fraud">Fraude</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graphique d'utilisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Tendances d'Utilisation</span>
                </CardTitle>
                <CardDescription>
                  Évolution des utilisations et revenus sur la période
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Graphique des tendances</p>
                    <p className="text-sm text-gray-400">
                      Intégration avec Chart.js ou Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Répartition par type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Répartition par Type</span>
                </CardTitle>
                <CardDescription>
                  Distribution des promotions par catégorie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'Codes Promo', count: 8, percentage: 33.3, color: 'bg-blue-500' },
                    { type: 'Réductions Auto', count: 6, percentage: 25.0, color: 'bg-green-500' },
                    { type: 'Livraison Gratuite', count: 4, percentage: 16.7, color: 'bg-purple-500' },
                    { type: 'Flash Sales', count: 3, percentage: 12.5, color: 'bg-orange-500' },
                    { type: 'Exclusivité Fidélité', count: 3, percentage: 12.5, color: 'bg-red-500' }
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded ${item.color}`} />
                        <span className="text-sm">{item.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{item.count}</span>
                        <span className="text-xs text-gray-500">({item.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métriques de performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance en Temps Réel</CardTitle>
              <CardDescription>
                Métriques clés mises à jour automatiquement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {mockAnalyticsData.summary.activePromotions}
                  </div>
                  <div className="text-sm text-gray-600">Promotions Actives</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {mockAnalyticsData.summary.totalPromotions} au total
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {Math.round(mockAnalyticsData.summary.totalUsage / mockAnalyticsData.summary.activePromotions)}
                  </div>
                  <div className="text-sm text-gray-600">Usage Moyen/Promo</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Par promotion active
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {formatCurrency(mockAnalyticsData.summary.totalRevenue / mockAnalyticsData.summary.totalUsage)}
                  </div>
                  <div className="text-sm text-gray-600">Revenue/Utilisation</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Valeur moyenne par usage
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Promotions */}
        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Promotions les plus performantes sur la période
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promotion</TableHead>
                    <TableHead>Utilisations</TableHead>
                    <TableHead>Revenus</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>ROI</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAnalyticsData.topPromotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium">
                        {promotion.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Gift className="h-4 w-4 text-gray-400" />
                          <span>{promotion.usageCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(promotion.revenue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(promotion.conversionRate * 4, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{promotion.conversionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(promotion.roi > 3 ? 5 : -2)}
                          <span className={`font-medium ${promotion.roi > 3 ? 'text-green-600' : 'text-red-600'}`}>
                            {promotion.roi}x
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={promotion.status === 'active' ? 'default' : 'secondary'}>
                          {promotion.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance des canaux */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(mockAnalyticsData.channelPerformance).map(([channel, data]) => (
              <Card key={channel}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">
                    {channel.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {data.distributed.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Distribués</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {data.used}
                      </div>
                      <div className="text-sm text-gray-600">Utilisés</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Taux de conversion</span>
                      <span className="font-medium">{data.conversionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(data.conversionRate * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analyse de fraude */}
        <TabsContent value="fraud" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span>Détection de Fraude</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {mockAnalyticsData.fraudAnalysis.totalAttempts}
                    </div>
                    <div className="text-sm text-gray-600">Tentatives Totales</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {mockAnalyticsData.fraudAnalysis.blockedAttempts}
                    </div>
                    <div className="text-sm text-gray-600">Bloquées</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-lg font-bold mb-2">
                    Score de Risque: {mockAnalyticsData.fraudAnalysis.riskScore}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ width: `${mockAnalyticsData.fraudAnalysis.riskScore}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patterns de Fraude Détectés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAnalyticsData.fraudAnalysis.commonPatterns.map((pattern, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{pattern}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}