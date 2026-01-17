/**
 * Page Analytics Dashboard
 * Universal Eats - Hub Central
 */

'use client';

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Target } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';
import Link from 'next/link';
// Import du Footer Global comme demandé
import { ModuleFooter } from "@/components/ModuleFooter"; 

export default function AnalyticsPage() {
  const { businessMetrics, operationalMetrics, alerts } = useAnalytics({
    autoRefresh: true,
    enableRealtime: true
  });

  // Métriques rapides pour le header (Bande blanche en haut)
  const quickStats = {
    totalRevenue: businessMetrics?.totalRevenue || 0,
    ordersCount: businessMetrics?.ordersCount || 0,
    satisfaction: operationalMetrics?.customerSatisfaction || 0,
    activeAlerts: alerts?.filter(a => !a.isResolved).length || 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Blanc avec Métriques Rapides */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Analytics Universal Eats
              </h1>
              <p className="text-xs text-gray-500">
                Tableau de bord des performances business et opérationnelles
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Métriques rapides alignées */}
              <div className="hidden md:flex items-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">CA Total</p>
                  <p className="text-base font-bold text-green-600">
                    {quickStats.totalRevenue.toLocaleString('fr-FR')}€
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Commandes</p>
                  <p className="text-base font-bold text-blue-600">
                    {quickStats.ordersCount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Satisfaction</p>
                  <p className="text-base font-bold text-purple-600">
                    {quickStats.satisfaction.toFixed(1)}/5
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Alertes</p>
                  <div className="flex justify-center">
                     <span className="font-bold text-gray-900">{quickStats.activeAlerts}</span>
                  </div>
                </div>
              </div>

              {/* Boutons d'action Header */}
              <div className="flex items-center gap-2 border-l pl-6 ml-2">
                <Link href="/analytics/reports">
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <Download className="h-4 w-4 mr-2" />
                    Rapports
                  </Button>
                </Link>
                <Link href="/analytics/kpis">
                  <Button variant="ghost" size="sm" className="text-gray-600">
                    <Target className="h-4 w-4 mr-2" />
                    KPIs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal : Le Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard />
      </div>

      
    </div>
  );
}