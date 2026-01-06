import React from 'react';
import { ProductAnalytics as ProductAnalyticsType, DateRange } from '@/types/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface ProductAnalyticsProps {
  data: ProductAnalyticsType;
  dateRange?: DateRange; // AJOUT: Manquait ici
  height?: number;
}

export function ProductAnalytics({ data, dateRange, height = 300 }: ProductAnalyticsProps) {
  const chartData = data.topSellingProducts.map(p => ({
    name: p.productName,
    ventes: p.salesCount,
    revenus: p.revenue
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="ventes" fill="#8884d8" name="Ventes (Qté)" />
          <Bar yAxisId="right" dataKey="revenus" fill="#82ca9d" name="Revenus (MAD)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}