import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessMetrics } from '@/types/analytics';
import { Euro, ShoppingBag, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, CurrencyCode } from '@/lib/formatters';

interface KPICardsProps {
  metrics?: BusinessMetrics;
  loading?: boolean;
  currency?: CurrencyCode;
}

export function KPICards({ metrics, loading, currency = 'MAD' }: KPICardsProps) {
  
  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded mb-2"></div>
              <div className="h-3 w-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Fallback si netMargin n'est pas calculé
  const estimatedMargin = metrics.netMargin || (metrics.totalRevenue * 0.15);

  const kpiData = [
    {
      title: "Chiffre d'Affaires",
      value: formatCurrency(metrics.totalRevenue, currency),
      icon: <Wallet className="h-5 w-5 text-primary" />,
      trend: `${metrics.revenueGrowth > 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}%`,
      trendUp: metrics.revenueGrowth >= 0,
      description: "Période actuelle"
    },
    {
      title: "Commandes",
      value: (metrics.ordersCount || 0).toString(),
      icon: <ShoppingBag className="h-5 w-5 text-blue-500" />,
      trend: `${metrics.ordersGrowth > 0 ? '+' : ''}${metrics.ordersGrowth.toFixed(1)}%`,
      trendUp: metrics.ordersGrowth >= 0,
      description: "Validées"
    },
    {
      title: "Panier Moyen",
      value: formatCurrency(metrics.averageOrderValue, currency),
      icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
      trend: `${metrics.averageBasketGrowth > 0 ? '+' : ''}${metrics.averageBasketGrowth.toFixed(1)}%`,
      trendUp: metrics.averageBasketGrowth >= 0,
      description: "Moyenne"
    },
    {
      title: "Marge Nette",
      value: formatCurrency(estimatedMargin, currency),
      icon: <Euro className="h-5 w-5 text-green-500" />,
      trend: "+0%",
      trendUp: true,
      description: "Estimée"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            {kpi.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {kpi.trendUp ? (
                <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
              )}
              <span className={kpi.trendUp ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                {kpi.trend}
              </span>
              <span className="ml-1 text-muted-foreground opacity-70">
                {kpi.description}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}