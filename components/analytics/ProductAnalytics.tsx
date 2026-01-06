/**
 * Composant ProductAnalytics
 * Universal Eats - Module Analytics
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { ProductAnalytics as ProductAnalyticsType } from '@/types/analytics';

interface ProductAnalyticsProps {
  data: ProductAnalyticsType;
  height?: number;
  className?: string;
}

export function ProductAnalytics({ 
  data, 
  height = 400, 
  className = '' 
}: ProductAnalyticsProps) {
  const [activeTab, setActiveTab] = useState('topselling');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getTrendIcon = (direction: 'rising' | 'falling' | 'stable') => {
    switch (direction) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={className} style={{ height }}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topselling">Top Ventes</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="trending">Tendances</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
        </TabsList>

        {/* Top des produits vendus */}
        <TabsContent value="topselling" className="mt-4">
          <div className="space-y-4">
            {data.topSellingProducts.map((product, index) => (
              <div key={product.productId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(product.revenue)}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.salesCount} ventes • {product.profitMargin}% marge
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Performance des catégories */}
        <TabsContent value="categories" className="mt-4">
          <div className="space-y-4">
            {data.categoryPerformance.map((category) => (
              <div key={category.categoryId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{category.categoryName}</h4>
                  <Badge variant={category.growthRate > 0 ? 'default' : 'destructive'}>
                    {category.growthRate > 0 ? '+' : ''}{category.growthRate.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ventes</p>
                    <p className="font-medium">{category.salesCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CA</p>
                    <p className="font-medium">{formatCurrency(category.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Panier moyen</p>
                    <p className="font-medium">{formatCurrency(category.averageOrderValue)}</p>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((category.revenue / Math.max(...data.categoryPerformance.map(c => c.revenue))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Produits tendances */}
        <TabsContent value="trending" className="mt-4">
          <div className="space-y-4">
            {data.trendingProducts.map((product) => (
              <div key={product.productId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">{product.reason}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {getTrendIcon(product.trendDirection)}
                      <span className="font-medium">
                        {product.growthRate > 0 ? '+' : ''}{product.growthRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Analyse du menu */}
        <TabsContent value="menu" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Statistiques générales */}
            <div className="space-y-4">
              <h4 className="font-medium">Statistiques du Menu</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{data.menuAnalysis.totalProducts}</p>
                  <p className="text-sm text-muted-foreground">Produits totaux</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{data.menuAnalysis.activeProducts}</p>
                  <p className="text-sm text-muted-foreground">Produits actifs</p>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{data.menuAnalysis.outOfStock}</p>
                  <p className="text-sm text-muted-foreground">Ruptures</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(data.menuAnalysis.averagePrice)}
                  </p>
                  <p className="text-sm text-muted-foreground">Prix moyen</p>
                </div>
              </div>
            </div>

            {/* Fourchette de prix */}
            <div className="space-y-4">
              <h4 className="font-medium">Analyse des Prix</h4>
              
              <div className="p-4 border rounded-lg">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Prix minimum</span>
                    <span className="font-medium">{formatCurrency(data.menuAnalysis.priceRange.min)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Prix maximum</span>
                    <span className="font-medium">{formatCurrency(data.menuAnalysis.priceRange.max)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Écart</span>
                    <span className="font-medium">
                      {formatCurrency(data.menuAnalysis.priceRange.max - data.menuAnalysis.priceRange.min)}
                    </span>
                  </div>
                </div>
                
                {/* Barre de prix */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{formatCurrency(data.menuAnalysis.priceRange.min)}</span>
                    <span>{formatCurrency(data.menuAnalysis.priceRange.max)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">Recommandations</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Optimiser les produits à faible marge</li>
                  <li>• Augmenter le prix des best-sellers populaires</li>
                  <li>• Réduire les ruptures de stock</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProductAnalytics;