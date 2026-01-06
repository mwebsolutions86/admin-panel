/**
 * Composant KPICards
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { MetricsCard } from './MetricsCard';
import { DollarSign, Package, TrendingUp, Users } from 'lucide-react';

interface KPICardsProps {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  growth: number;
  className?: string;
}

export function KPICards({
  revenue,
  orders,
  avgOrderValue,
  growth,
  className = ''
}: KPICardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  const getTrend = (value: number) => {
    if (value > 5) return 'up';
    if (value < -5) return 'down';
    return 'stable';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <MetricsCard
        title="Chiffre d'Affaires"
        value={formatCurrency(revenue)}
        trend={getTrend(growth)}
        trendValue={growth}
        icon={DollarSign}
        color="green"
        description="Revenus totaux période"
      />

      <MetricsCard
        title="Commandes"
        value={formatNumber(orders)}
        unit=""
        trend={getTrend(growth * 0.8)} // Corrélation approximative
        trendValue={growth * 0.8}
        icon={Package}
        color="blue"
        description="Nombre total de commandes"
      />

      <MetricsCard
        title="Panier Moyen"
        value={formatCurrency(avgOrderValue)}
        trend={getTrend(growth * 0.6)}
        trendValue={growth * 0.6}
        icon={TrendingUp}
        color="purple"
        description="Valeur moyenne par commande"
      />

      <MetricsCard
        title="Croissance"
        value={growth}
        unit="%"
        trend={getTrend(growth)}
        icon={Users}
        color="orange"
        description="Évolution vs période précédente"
      />
    </div>
  );
}

export default KPICards;