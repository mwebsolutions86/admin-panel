import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  // AJOUT: La propriété unit manquait
  unit?: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  // AJOUT: color optionnel pour le styling
  color?: string; 
}

export function MetricsCard({
  title,
  value,
  unit,
  icon: Icon,
  description,
  trend,
  className
}: MetricsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={trend.isPositive ? "text-green-500 mr-2" : "text-red-500 mr-2"}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}