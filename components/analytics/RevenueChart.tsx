"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { AnalyticsFilters, BusinessMetrics } from '@/types/analytics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RevenueChartProps {
  data: BusinessMetrics;
  filters?: AnalyticsFilters;
}

export function RevenueChart({ data, filters }: RevenueChartProps) {
  const chartData = (data?.revenueOverTime || []).map(point => {
    const dateValue = point.timestamp ? new Date(point.timestamp) : (point.date ? new Date(point.date) : new Date());
    const validDate = isNaN(dateValue.getTime()) ? new Date() : dateValue;

    return {
      ...point,
      dateFormatted: format(validDate, 'dd/MM', { locale: fr }),
      fullDate: format(validDate, 'dd MMMM yyyy', { locale: fr }),
      value: point.value || 0
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-green-600">
            Revenu: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Évolution du Chiffre d'Affaires</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        {/* Ajout de min-w-0 pour la stabilité Grid */}
        <div className="h-[350px] w-full min-w-0">
          {/* Fixation de la hauteur à 350px pour éviter le bug height(-1) */}
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateFormatted" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => `${val/1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}