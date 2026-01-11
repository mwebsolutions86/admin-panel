"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Clock } from 'lucide-react';
import { OperationalMetrics } from '@/types/analytics';

interface DeliveryPerformanceProps {
  data: OperationalMetrics;
  height?: number;
  className?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function DeliveryPerformance({ data, height = 300, className = '' }: DeliveryPerformanceProps) {
  
  const distribution = Array.isArray(data.deliveryTimeDistribution)
    ? { under30min: 0, between30to45min: 0, between45to60min: 0, over60min: 0 }
    : (data.deliveryTimeDistribution || { under30min: 0, between30to45min: 0, between45to60min: 0, over60min: 0 });

  const pieData = [
    { name: '< 30 min', value: distribution.under30min },
    { name: '30-45 min', value: distribution.between30to45min },
    { name: '45-60 min', value: distribution.between45to60min },
    { name: '> 60 min', value: distribution.over60min },
  ].filter(d => d.value > 0);

  const drivers = (data.deliveryPersonMetrics as any[]) || [];
  
  const totalActive = drivers.length;
  const avgDeliveries = totalActive ? drivers.reduce((acc, d) => acc + (d.deliveries || 0), 0) / totalActive : 0;
  const avgRating = totalActive ? drivers.reduce((acc, d) => acc + (d.rating || 0), 0) / totalActive : 0;

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribution des Temps</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Performance de la Flotte</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                   <span className="text-sm font-medium">Livreurs Actifs</span>
                   <span className="font-bold text-lg">{totalActive}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                   <span className="text-sm font-medium">Moy. Courses / Livreur</span>
                   <span className="font-bold text-lg">{avgDeliveries.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                   <span className="text-sm font-medium">Note Moyenne</span>
                   <span className="font-bold text-lg text-yellow-600">{avgRating.toFixed(1)}/5</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DeliveryPerformance;