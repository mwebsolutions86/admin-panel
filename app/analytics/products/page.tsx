"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { ProductAnalytics } from "@/components/analytics/ProductAnalytics"; 
import { ModuleFooter } from "@/components/ModuleFooter";
import { useAnalytics } from "@/hooks/use-analytics";
import { Loader2 } from "lucide-react";

const MOCK_PRODUCT_DATA = {
  topProducts: [
    { id: '1', name: 'Pizza Margherita', quantity: 150, revenue: 1500, trend: 12 },
    { id: '2', name: 'Burger Classique', quantity: 120, revenue: 1200, trend: 5 }
  ],
  categoryPerformance: [
    { category: 'Fast Food', revenue: 5000, orders: 400 },
    { category: 'Boissons', revenue: 1500, orders: 600 }
  ],
  stockAlerts: [],
  totalRevenue: 7700,
  totalItemsSold: 1200,
  topSellingProducts: [],
  menuAnalysis: {
    totalProducts: 50,
    activeProducts: 48,
    outOfStock: 2,
    averagePrice: 15,
    priceRange: { min: 5, max: 25 }
  },
  trendingProducts: []
};

export default function ProductAnalyticsPage() {
  // UTILISATION DE 'refresh' (API originale)
  const { productAnalytics, isLoading, refresh } = useAnalytics({
    autoRefresh: false,
    cacheTTL: 300000
  });

  return (
    <LayoutShell>
      <div className="flex-1 p-8 pt-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Analyse Produits</h2>
            <button onClick={refresh} className="text-sm text-blue-600">
                Actualiser
            </button>
        </div>
        
        <div className="mb-8">
          {isLoading && !productAnalytics ? (
             <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
             <ProductAnalytics data={productAnalytics || MOCK_PRODUCT_DATA} />
          )}
        </div>
      </div>
      <ModuleFooter />
    </LayoutShell>
  );
}