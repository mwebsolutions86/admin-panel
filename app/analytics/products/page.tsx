"use client";

import React from "react";
// ❌ On retire LayoutShell car il est déjà dans app/layout.tsx (Racine)
// ❌ On retire ModuleFooter car il est maintenant dans app/analytics/layout.tsx
import { ProductAnalytics } from "@/components/analytics/ProductAnalytics"; 
import { useAnalytics } from "@/hooks/use-analytics";
import { Loader2 } from "lucide-react";

// Mock Data (inchangé)
const MOCK_PRODUCT_DATA = {
  topSellingProducts: [
    { productId: '1', productName: 'Pizza Margherita', quantity: 150, revenue: 1500, trend: 'up' },
    { productId: '2', productName: 'Burger Classique', quantity: 120, revenue: 1200, trend: 'stable' },
    { productId: '3', productName: 'Tacos Poulet', quantity: 100, revenue: 1000, trend: 'up' },
    { productId: '4', productName: 'Soda 33cl', quantity: 300, revenue: 600, trend: 'down' }
  ],
  topProducts: [], 
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

  const displayData = productAnalytics || MOCK_PRODUCT_DATA;

  return (
    // ✅ On retourne juste le contenu spécifique, le Layout gère le reste
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
          <button 
            onClick={refresh} 
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-white px-4 py-2 rounded-lg border border-blue-100 shadow-sm"
          >
              Actualiser les données
          </button>
      </div>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {isLoading && !productAnalytics ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        ) : (
            <ProductAnalytics data={displayData} />
        )}
      </div>
    </div>
  );
}