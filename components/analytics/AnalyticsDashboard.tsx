'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, DollarSign, Package, Activity, Globe } from 'lucide-react';

import { analyticsService } from '@/lib/analytics-service';
import { AnalyticsFilters, BusinessMetrics, StoreMetrics } from '@/types/analytics';
import { formatCurrency, CurrencyCode } from '@/lib/formatters';

import { FilterPanel } from './FilterPanel';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { OrdersChart } from './OrdersChart';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<CurrencyCode>('MAD');
  
  const [bizMetrics, setBizMetrics] = useState<BusinessMetrics | null>(null);
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: { start: new Date(new Date().setDate(new Date().getDate() - 30)), end: new Date() }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [biz, stores] = await Promise.all([
        analyticsService.getBusinessMetrics(filters),
        analyticsService.getStoreMetrics(filters.stores)
      ]);
      setBizMetrics(biz);
      setStoreMetrics(stores);
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filters]);

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble des performances (Agadir & Extension)</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
            <SelectTrigger className="w-[100px]"><Globe className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MAD">MAD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Activity className="mr-2 h-4 w-4"/> Filtres</Button>
          <Button onClick={loadData} disabled={loading}>
             {loading ? <LoadingSpinner size="small" /> : <RefreshCw className="mr-2 h-4 w-4"/>} Actualiser
          </Button>
        </div>
      </div>

      {showFilters && <FilterPanel filters={filters} onFilterChange={setFilters} onRefresh={loadData} loading={loading} />}

      <KPICards metrics={bizMetrics || undefined} loading={loading} currency={currency} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="stores">Magasins</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Chiffre d'affaires</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {bizMetrics?.dailyRevenue ? <RevenueChart data={bizMetrics.dailyRevenue} /> : <div>Chargement...</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Commandes</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {bizMetrics?.dailyRevenue ? <OrdersChart data={bizMetrics.dailyRevenue} /> : <div>Chargement...</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stores" className="space-y-6">
           <Card>
             <CardHeader><CardTitle>Performance Magasins</CardTitle></CardHeader>
             <CardContent>
                <div className="space-y-4">
                  {storeMetrics.slice(0, 5).map((s, i) => (
                    <div key={s.storeId} className="flex justify-between items-center p-4 border rounded hover:bg-muted/50">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex justify-center items-center text-white font-bold ${i===0?'bg-yellow-500':i===1?'bg-gray-400':'bg-orange-500'}`}>{i+1}</div>
                          <div>
                             <p className="font-medium">{s.storeName}</p>
                             <p className="text-sm text-muted-foreground">{s.ordersCount} cmd</p>
                          </div>
                       </div>
                       <div className="text-right font-bold">{formatCurrency(s.totalRevenue, currency)}</div>
                    </div>
                  ))}
                </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;