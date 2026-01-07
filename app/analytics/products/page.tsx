"use client";

import React from "react";
import LayoutShell from "@/components/LayoutShell";
import { ProductAnalytics } from "@/components/analytics/ProductAnalytics"; 
import { ModuleFooter } from "@/components/ModuleFooter";

const MOCK_PRODUCT_DATA = {
  // === PROPRIÉTÉS MANQUANTES AJOUTÉES SELON L'INTERFACE ===
  topSellingProducts: [
    { productId: '1', productName: 'Pizza Margherita', salesCount: 150, revenue: 1500, profitMargin: 40, category: 'Pizza' },
    { productId: '2', productName: 'Burger Classique', salesCount: 120, revenue: 1200, profitMargin: 35, category: 'Burger' },
    { productId: '3', productName: 'Coca Cola', salesCount: 300, revenue: 600, profitMargin: 80, category: 'Boissons' }
  ],
  categoryPerformance: [
    { categoryId: '1', categoryName: 'Fast Food', salesCount: 400, revenue: 5000, averageOrderValue: 12.5, growthRate: 5 },
    { categoryId: '2', categoryName: 'Boissons', salesCount: 600, revenue: 1500, averageOrderValue: 2.5, growthRate: 2 },
    { categoryId: '3', categoryName: 'Desserts', salesCount: 200, revenue: 1200, averageOrderValue: 6.0, growthRate: 8 }
  ],
  menuAnalysis: {
    totalProducts: 45,
    activeProducts: 42,
    outOfStock: 3,
    averagePrice: 8.50,
    priceRange: { min: 2, max: 25 }
  },
  trendingProducts: [
    { productId: '1', productName: 'Pizza Truffe', trendDirection: 'rising' as const, growthRate: 15, reason: 'Saison' },
    { productId: '4', productName: 'Salade César', trendDirection: 'falling' as const, growthRate: -5, reason: 'Hiver' }
  ],
  
  // Propriétés supplémentaires pour compatibilité (si le composant utilise les deux formats)
  totalRevenue: 7700,
  totalItemsSold: 1200
};

export default function ProductAnalyticsPage() {
  return (
    <LayoutShell>
      <div className="flex-1 p-8 pt-6">
        <h2 className="text-3xl font-bold mb-6">Analyse Produits</h2>
        <div className="mb-8">
          <ProductAnalytics data={MOCK_PRODUCT_DATA} />
        </div>
      </div>
      <ModuleFooter />
    </LayoutShell>
  );
}