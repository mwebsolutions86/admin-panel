"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint, AnalyticsFilters, BusinessMetrics } from '@/types/analytics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface OrdersChartProps {
  data: BusinessMetrics;
  filters?: AnalyticsFilters;
}

export function OrdersChart({ data, filters }: OrdersChartProps) {
  const chartData = (data?.ordersOverTime || []).map(point => {
    const dateValue = point.timestamp ? new Date(point.timestamp) : (point.date ? new Date(point.date) : new Date());
    
    // Fallback si la date est invalide
    const validDate = isNaN(dateValue.getTime()) ? new Date() : dateValue;

    return {
      ...point,
      dateFormatted: format(validDate, 'dd/MM', { locale: fr }),
      fullDate: format(validDate, 'dd MMMM yyyy', { locale: fr }),
      orders: point.value || 0
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
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

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="dateFormatted" 
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
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="orders"
            name="Commandes"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OrdersChart;