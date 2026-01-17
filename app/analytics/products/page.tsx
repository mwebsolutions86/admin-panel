"use client";

import React from "react";
// LayoutShell est généralement un export par défaut
import LayoutShell from "@/components/LayoutShell";
// ✅ CORRECTION : Import nommé avec accolades (car 'export function ModuleFooter')
import { ModuleFooter } from "@/components/ModuleFooter"; 
// ✅ Import nommé avec accolades
import { ProductAnalytics } from "@/components/analytics/ProductAnalytics"; 
import { useAnalytics } from "@/hooks/use-analytics";
import { Loader2 } from "lucide-react";

// Données Mock pour éviter les erreurs si l'API est vide
const MOCK_PRODUCT_DATA = {
  topSellingProducts: [
    { productId: '1', productName: 'Pizza Margherita', quantity: 150, revenue: 1500, trend: 'up' },
    { productId: '2', productName: 'Burger Classique', quantity: 120, revenue: 1200, trend: 'stable' },
    { productId: '3', productName: 'Tacos Poulet', quantity: 100, revenue: 1000, trend: 'up' },
    { productId: '4', productName: 'Soda 33cl', quantity: 300, revenue: 600, trend: 'down' }
  ],
  topProducts: [], // Requis par le type TS
  categoryPerformance: [
    { category: 'Fast Food', revenue: 5000, orders: 400 },
    { category: 'Boissons', revenue: 1500, orders: 600 }
  ],
  stockAlerts: [],
  totalRevenue: 7700,
  totalItemsSold: 1200,
  menuAnalysis: {
    totalProducts: 50,
    activeProducts: 48,
    outOfStock: 2,
    averagePrice: 15,
    priceRange: { min: 5, max: 25 },
    totalItemsSold: 1200,
    uniqueProductsSold: 42
  },
  trendingProducts: []
};

export default function ProductsAnalyticsPage() {
  const { productAnalytics, isLoading, refresh } = useAnalytics({
    autoRefresh: false,
    cacheTTL: 300000
  });

  // Sécurité : si productAnalytics est null, on utilise MOCK_PRODUCT_DATA
  const displayData = productAnalytics || MOCK_PRODUCT_DATA;

  return (
    <LayoutShell>
      <div className="flex-1 p-8 pt-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Analyse Produits</h2>
            <button 
              onClick={refresh} 
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
                Actualiser
            </button>
        </div>
        
        <div className="mb-8">
          {isLoading && !productAnalytics ? (
             <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
             </div>
          ) : (
             <ProductAnalytics data={displayData} />
          )}
        </div>
      </div>
      <ModuleFooter />
    </LayoutShell>
  );
}