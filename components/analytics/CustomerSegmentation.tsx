/**
 * Composant CustomerSegmentation
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CustomerMetrics } from '@/types/analytics';

interface CustomerSegmentationProps {
  segments: CustomerMetrics['customerSegments'];
  height?: number;
  className?: string;
}

const COLORS = {
  vip: '#f59e0b',      // Orange
  regular: '#10b981',  // Green
  occasional: '#3b82f6', // Blue
  atRisk: '#ef4444'    // Red
};

export function CustomerSegmentation({ 
  segments, 
  height = 300, 
  className = '' 
}: CustomerSegmentationProps) {
  // Convertir les données en format pour le graphique
  const chartData = [
    { name: 'VIP', value: segments.vip, color: COLORS.vip },
    { name: 'Réguliers', value: segments.regular, color: COLORS.regular },
    { name: 'Occasionnels', value: segments.occasional, color: COLORS.occasional },
    { name: 'À risque', value: segments.atRisk, color: COLORS.atRisk }
  ];

  const total = segments.vip + segments.regular + segments.occasional + segments.atRisk;

  // Formatter pour les tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p style={{ color: data.color }}>
            {data.value} clients ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Formatter pour la légende
  const renderCustomizedLabel = (entry: any) => {
    const percentage = ((entry.value / total) * 100).toFixed(1);
    return `${percentage}%`;
  };

  if (total === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-muted-foreground">Aucune donnée de segmentation</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Détails sous le graphique */}
      <div className="mt-4 space-y-2">
        {chartData.map((segment) => {
          const percentage = ((segment.value / total) * 100).toFixed(1);
          return (
            <div key={segment.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm font-medium">{segment.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold">{segment.value}</span>
                <span className="text-xs text-muted-foreground ml-2">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CustomerSegmentation;