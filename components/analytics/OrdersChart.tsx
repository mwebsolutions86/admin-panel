/**
 * Composant OrdersChart
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint } from '@/types/analytics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrdersChartProps {
  data: TimeSeriesPoint[];
  height?: number;
  className?: string;
}

export function OrdersChart({ 
  data, 
  height = 300, 
  className = '' 
}: OrdersChartProps) {
  // Formatter les données pour le graphique
  const chartData = data.map(point => ({
    ...point,
    date: format(new Date(point.timestamp), 'dd/MM', { locale: fr }),
    fullDate: format(new Date(point.timestamp), 'dd MMMM yyyy', { locale: fr }),
    orders: Math.floor(point.value / 35) // Approximation basée sur le panier moyen
  }));

  // Formatter pour les tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-blue-600">
            Commandes: {new Intl.NumberFormat('fr-FR').format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="orders"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrdersChart;