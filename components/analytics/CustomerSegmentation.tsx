import React from 'react';
import { CustomerMetrics } from '@/types/analytics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Correction de l'interface pour accepter 'data' ou 'segments'
export interface CustomerSegmentationProps {
  data?: CustomerMetrics; // Le dashboard envoie 'data'
  segments?: any;         // Backwards compatibility
  height?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function CustomerSegmentation({ data, segments, height = 300 }: CustomerSegmentationProps) {
  // Récupération sécurisée des segments
  const segmentsData = data?.customerSegments || segments || { vip: 0, regular: 0, occasional: 0, atRisk: 0 };
  
  const chartData = [
    { name: 'VIP', value: segmentsData.vip },
    { name: 'Réguliers', value: segmentsData.regular },
    { name: 'Occasionnels', value: segmentsData.occasional },
    { name: 'À risque', value: segmentsData.atRisk },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Pas de données de segmentation</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} Clients`, 'Nombre']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}