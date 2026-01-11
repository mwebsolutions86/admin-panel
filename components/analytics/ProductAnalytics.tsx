"use client";

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  ShoppingBag, 
  Target, 
  TrendingUp,
  Package
} from 'lucide-react';
import { ProductAnalytics as ProductAnalyticsType, DateRange } from '@/types/analytics';

export interface ProductAnalyticsProps {
  data: ProductAnalyticsType;
  dateRange?: DateRange;
  height?: number;
}

export function ProductAnalytics({ data, dateRange, height = 400 }: ProductAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fallback si données vides
  if (!data || !data.topSellingProducts) {
    return (
      <Card className="h-full flex items-center justify-center min-h-[300px]">
        <div className="text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Aucune donnée produit disponible</p>
        </div>
      </Card>
    );
  }

  const topProducts = data.topSellingProducts.slice(0, 10);

  return (
    <div className="space-y-6">
      
      {/* HEADER KPI */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles Vendus</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.menuAnalysis?.totalItemsSold || 0}</div>
            <p className="text-xs text-muted-foreground">Volume total sur la période</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">
              {topProducts[0]?.productName || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Génère le plus de CA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits Uniques</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.menuAnalysis?.uniqueProductsSold || 0}</div>
            <p className="text-xs text-muted-foreground">Sur le menu actif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prix Moyen</CardTitle>
            <div className="text-xs font-bold text-blue-500">MAD</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {data.menuAnalysis?.averagePrice 
                 ? Math.round(data.menuAnalysis.averagePrice) 
                 : 0}
            </div>
            <p className="text-xs text-muted-foreground">Par article vendu</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: GRAPHIQUE */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Produits (Chiffre d'Affaires)</CardTitle>
              <CardDescription>Les piliers de votre revenu sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={topProducts} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="productName" 
                      type="category" 
                      width={150} 
                      tick={{fontSize: 12}} 
                      interval={0}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [`${value} MAD`, "Revenu"]}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={32}>
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#93c5fd'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TABLEAU DÉTAILLÉ */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Performance par Produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.productName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {product.quantity} ventes
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{product.revenue?.toLocaleString()} MAD</p>
                      <p className="text-xs text-muted-foreground">
                        {product.quantity ? Math.round(product.revenue / product.quantity) + ' MAD/ut' : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}