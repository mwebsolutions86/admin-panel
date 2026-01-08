"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { DeliveryPerformance } from "@/components/analytics/DeliveryPerformance";
import { ModuleFooter } from "@/components/ModuleFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { Loader2 } from "lucide-react";

export default function OperationsPage() {
  // CORRECTION : refreshData -> refresh
  const { operationalMetrics, isLoading, refresh } = useAnalytics({
    autoRefresh: true,
    refreshInterval: 60000,
    enableRealtime: true
  });

  return (
    <LayoutShell>
      <div className="flex-1 p-8 pt-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Performance Opérationnelle</h2>
            <button 
                onClick={refresh} // CORRECTION
                className="text-sm text-blue-600 hover:underline"
                disabled={isLoading}
            >
                {isLoading ? 'Chargement...' : 'Actualiser'}
            </button>
        </div>

        <div className="mb-8">
          {isLoading && !operationalMetrics ? (
             <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : operationalMetrics ? (
             <DeliveryPerformance data={operationalMetrics} />
          ) : (
             <div className="text-center py-20 text-gray-500">
                Aucune donnée opérationnelle disponible pour le moment.
             </div>
          )}
        </div>
      </div>
      <ModuleFooter />
    </LayoutShell>
  );
}