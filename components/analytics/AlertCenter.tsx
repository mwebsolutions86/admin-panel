"use client";

import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  X, 
  Filter
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnalyticsAlert } from '@/types/analytics';
import { useAnalytics } from '@/hooks/use-analytics';
import { AdvancedFilters } from './AdvancedFilters';

export function AlertCenter() {
  const { alerts, filters, updateFilters } = useAnalytics();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const getSeverityColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-500 bg-amber-50 border-amber-200';
      default: return 'text-blue-500 bg-blue-50 border-blue-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <X className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Centre de Notifications</CardTitle>
            <CardDescription>Alertes et insights en temps réel</CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFiltersOpen(true)}
            className={filters?.comparison === true ? "border-blue-500 text-blue-600 bg-blue-50" : ""}
          >
            <Filter className="mr-2 h-4 w-4" /> 
            {filters?.comparison === true ? "Comparaison (Active)" : "Filtres"}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert: AnalyticsAlert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border flex items-start gap-3 ${getSeverityColor(alert.type)}`}
                >
                  <div className="mt-0.5">{getIcon(alert.type)}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold capitalize mb-1">
                      {alert.type === 'critical' ? 'Alerte Critique' : alert.type === 'warning' ? 'Attention' : 'Information'}
                    </h4>
                    <p className="text-sm opacity-90">{alert.message}</p>
                    <span className="text-xs opacity-70 mt-2 block">
                      {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
                <p>Aucune alerte pour le moment.</p>
                <p className="text-sm">Tout fonctionne normalement.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <AdvancedFilters 
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        currentFilters={filters || {}}
        onApply={(newFilters) => {
          updateFilters(newFilters);
          setIsFiltersOpen(false);
        }}
      />
    </Card>
  );
}