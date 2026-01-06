/**
 * Composant MetricsCard
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
  description?: string;
  className?: string;
}

export function MetricsCard({
  title,
  value,
  unit = '',
  trend,
  trendValue,
  icon: Icon,
  color = 'blue',
  description,
  className
}: MetricsCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200'
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'k';
    } else {
      return val.toFixed(1);
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      colorClasses[color],
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
            
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? formatValue(value) : value}
              </p>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>

            {trend && (
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon()}
                {trendValue !== undefined && (
                  <span className={cn('text-sm font-medium', getTrendColor())}>
                    {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  vs période précédente
                </span>
              </div>
            )}

            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>

          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            colorClasses[color]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricsCard;