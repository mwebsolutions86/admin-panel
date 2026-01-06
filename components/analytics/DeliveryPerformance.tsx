/**
 * Composant DeliveryPerformance
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OperationalMetrics } from '@/types/analytics';

interface DeliveryPerformanceProps {
  data: OperationalMetrics;
  height?: number;
  className?: string;
}

export function DeliveryPerformance({ 
  data, 
  height = 300, 
  className = '' 
}: DeliveryPerformanceProps) {
  // Convertir la distribution en données pour le graphique
  const chartData = [
    { 
      name: '< 30 min', 
      value: data.deliveryTimeDistribution.under30min,
      color: '#10b981' // Vert
    },
    { 
      name: '30-45 min', 
      value: data.deliveryTimeDistribution.between30to45min,
      color: '#f59e0b' // Orange
    },
    { 
      name: '45-60 min', 
      value: data.deliveryTimeDistribution.between45to60min,
      color: '#ef4444' // Rouge
    },
    { 
      name: '> 60 min', 
      value: data.deliveryTimeDistribution.over60min,
      color: '#7c2d12' // Rouge foncé
    }
  ];

  // Formatter pour les tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p style={{ color: data.color }}>
            {data.value}% des livraisons
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Métriques clés */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">
            {data.averageDeliveryTime.toFixed(1)} min
          </p>
          <p className="text-sm text-muted-foreground">Temps moyen</p>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">
            {data.deliveryTimeDistribution.under30min}%
          </p>
          <p className="text-sm text-muted-foreground">Livraisons < 30min</p>
        </div>
      </div>

      {/* Détails des livreurs */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Performance des Livreurs</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Livreurs actifs</span>
            <span className="font-medium">{data.deliveryPersonMetrics.totalActive}</span>
          </div>
          <div className="flex justify-between">
            <span>Livraisons/jour</span>
            <span className="font-medium">{data.deliveryPersonMetrics.averageDeliveriesPerDay}</span>
          </div>
          <div className="flex justify-between">
            <span>Note moyenne</span>
            <span className="font-medium">{data.deliveryPersonMetrics.customerRating.toFixed(1)}/5</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeliveryPerformance;