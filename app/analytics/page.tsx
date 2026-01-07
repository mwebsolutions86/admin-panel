/**
 * Page Analytics Dashboard
 * Universal Eats - Module Analytics Phase 2
 * Hub central de navigation pour les modules avancés
 */

'use client';

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Download,
  RefreshCw,
  Target
} from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { businessMetrics, operationalMetrics, alerts, isLoading } = useAnalytics({
    autoRefresh: true,
    refreshInterval: 300000,
    enableRealtime: true
  });

  // Métriques rapides pour le header
  const quickStats = {
    totalRevenue: businessMetrics?.totalRevenue || 0,
    ordersCount: businessMetrics?.ordersCount || 0,
    satisfaction: operationalMetrics?.customerSatisfaction || 0,
    activeAlerts: alerts.filter(a => !a.isResolved).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec métriques rapides */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analytics Universal Eats
              </h1>
              <p className="text-sm text-gray-500">
                Tableau de bord des performances business et opérationnelles
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Métriques rapides */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">CA Total</p>
                  <p className="text-lg font-bold text-green-600">
                    {quickStats.totalRevenue.toLocaleString('fr-FR')}€
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Commandes</p>
                  <p className="text-lg font-bold text-blue-600">
                    {quickStats.ordersCount.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Satisfaction</p>
                  <p className="text-lg font-bold text-purple-600">
                    {quickStats.satisfaction.toFixed(1)}/5
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Alertes</p>
                  <Badge 
                    variant={quickStats.activeAlerts > 0 ? 'destructive' : 'default'}
                    className="text-sm"
                  >
                    {quickStats.activeAlerts}
                  </Badge>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="flex items-center gap-2">
                <Link href="/analytics/reports">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Rapports
                  </Button>
                </Link>
                
                <Link href="/analytics/kpis">
                  <Button variant="outline" size="sm">
                    <Target className="h-4 w-4 mr-2" />
                    KPIs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500">Chargement des analytics...</p>
            </div>
          </div>
        ) : (
          <AnalyticsDashboard />
        )}
      </div>

      {/* Footer avec liens utiles - CONNECTÉ AUX NOUVEAUX MODULES */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Analytics & Finance</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  {/* LIEN CONNECTÉ -> Module Finance */}
                  <Link href="/finance" className="hover:text-blue-600">
                    Métriques Business & Finance
                  </Link>
                </li>
                <li>
                  {/* LIEN CONNECTÉ -> Module Fidélité */}
                  <Link href="/loyalty" className="hover:text-blue-600">
                    Analytics Client & Fidélité
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/operations" className="hover:text-blue-600">
                    Performance Opérationnelle
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/products" className="hover:text-blue-600">
                    Analyse Produits
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Rapports</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/analytics/reports/daily" className="hover:text-blue-600">
                    Rapport Quotidien
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/reports/weekly" className="hover:text-blue-600">
                    Rapport Hebdomadaire
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/reports/monthly" className="hover:text-blue-600">
                    Rapport Mensuel
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/reports/custom" className="hover:text-blue-600">
                    Rapport Personnalisé
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Configuration</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  {/* LIEN CONNECTÉ -> Module Promotions */}
                  <Link href="/promotions" className="hover:text-blue-600">
                    Gestion des Promotions
                  </Link>
                </li>
                <li>
                  {/* LIEN CONNECTÉ -> Module Notifications */}
                  <Link href="/notifications" className="hover:text-blue-600">
                    Centre d'Alertes & Notifs
                  </Link>
                </li>
                <li>
                   {/* LIEN CONNECTÉ -> Module PWA */}
                  <Link href="/mobile-app" className="hover:text-blue-600">
                    Application Mobile (PWA)
                  </Link>
                </li>
                <li>
                  <Link href="/analytics/export" className="hover:text-blue-600">
                    Export Données
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Ressources</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                   {/* LIEN CONNECTÉ -> Module Traductions */}
                  <Link href="/settings/localization" className="hover:text-blue-600">
                    Traductions & Langues
                  </Link>
                </li>
                <li>
                  <Link href="/docs/analytics" className="hover:text-blue-600">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/support/analytics" className="hover:text-blue-600">
                    Support Technique
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                © 2025 Universal Eats - Module Analytics v1.0
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Phase 2 - Analytics & Reporting</span>
                <Badge variant="outline" className="text-xs">
                  Production Ready
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}