/**
 * Dashboard d'Inventaire Principal
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Composant principal affichant :
 * - Vue d'ensemble de l'inventaire
 * - Indicateurs clés (KPIs)
 * - Alertes critiques
 * - Graphiques de performance
 * - Accès rapide aux actions principales
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useInventory, useInventoryAlerts, useInventoryManagement } from '../../hooks/use-inventory';
import { InventoryItem } from '../../lib/inventory-service';
import InventoryOverview from './InventoryOverview';
import InventoryAlerts from './InventoryAlerts';
import InventoryKPIs from './InventoryKPIs';
import RecentMovements from './RecentMovements';
import QuickActions from './QuickActions';
import InventoryFilters from './InventoryFilters';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

interface InventoryDashboardProps {
  storeId: string;
  className?: string;
}

export default function InventoryDashboard({ storeId, className = '' }: InventoryDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'movements' | 'analytics'>('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Utiliser le hook composite pour avoir toutes les données
  const {
    inventory,
    suppliers,
    alerts,
    refreshAll
  } = useInventoryManagement(storeId);

  // États de chargement
  const isLoading = inventory.loading || suppliers.loading || alerts.loading;
  const hasError = inventory.error || suppliers.error || alerts.error;

  // Charger les analytics au montage
  useEffect(() => {
    if (!isLoading) {
      inventory.getAnalytics();
    }
  }, [isLoading, inventory.getAnalytics]);

  // Auto-refresh des données critiques
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        refreshAll();
      }
    }, 30000); // Refresh toutes les 30 secondes

    return () => clearInterval(interval);
  }, [isLoading, refreshAll]);

  // Calculer les statistiques en temps réel
  const stats = React.useMemo(() => {
    const totalItems = inventory.inventory.length;
    const totalValue = inventory.totalInventoryValue;
    const lowStockCount = inventory.lowStockItems.length;
    const outOfStockCount = inventory.outOfStockItems.length;
    const activeAlertsCount = alerts.unreadCount;
    const criticalAlertsCount = alerts.criticalCount;

    return {
      totalItems,
      totalValue,
      lowStockCount,
      outOfStockCount,
      activeAlertsCount,
      criticalAlertsCount,
      healthScore: calculateHealthScore(totalItems, lowStockCount, outOfStockCount, criticalAlertsCount)
    };
  }, [inventory, alerts]);

  // Fonction de calcul du score de santé
  function calculateHealthScore(
    totalItems: number, 
    lowStock: number, 
    outOfStock: number, 
    criticalAlerts: number
  ): number {
    if (totalItems === 0) return 100;
    
    const penaltyLowStock = (lowStock / totalItems) * 30;
    const penaltyOutOfStock = (outOfStock / totalItems) * 50;
    const penaltyCritical = Math.min(criticalAlerts * 5, 20);
    
    return Math.max(0, 100 - penaltyLowStock - penaltyOutOfStock - penaltyCritical);
  }

  // Fonction de rafraîchissement manuel
  const handleRefresh = async () => {
    await refreshAll();
    await inventory.getAnalytics();
  };

  if (isLoading) {
    return (
      <div className={`inventory-dashboard ${className}`}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-lg text-gray-600">
            Chargement de l'inventaire...
          </span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`inventory-dashboard ${className}`}>
        <ErrorMessage 
          message={inventory.error || suppliers.error || alerts.error || 'Erreur inconnue'}
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className={`inventory-dashboard ${className}`}>
      {/* En-tête du dashboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏪 Tableau de Bord Inventaire
              </h1>
              <p className="text-gray-600 mt-1">
                Gestion des stocks et inventaire en temps réel
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Indicateur de santé */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
                <div className={`w-3 h-3 rounded-full ${
                  stats.healthScore >= 80 ? 'bg-green-500' :
                  stats.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-gray-700">
                  Santé: {stats.healthScore.toFixed(0)}%
                </span>
              </div>
              
              {/* Bouton filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  showFilters 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                🔍 Filtres
              </button>
              
              {/* Bouton rafraîchir */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                🔄 Actualiser
              </button>
            </div>
          </div>

          {/* KPIs principaux */}
          <InventoryKPIs 
            stats={stats}
            analytics={inventory.analytics}
            loading={inventory.loading}
          />
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="mb-6">
          <InventoryFilters 
            filters={inventory.filters}
            onFiltersChange={inventory.updateFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
              { id: 'alerts', label: 'Alertes', icon: '🚨', count: alerts.unreadCount },
              { id: 'movements', label: 'Mouvements', icon: '📦' },
              { id: 'analytics', label: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              <InventoryOverview 
                inventory={inventory.inventory}
                lowStockItems={inventory.lowStockItems}
                outOfStockItems={inventory.outOfStockItems}
                loading={inventory.loading}
                onItemSelect={(item) => {
                  // TODO: Ouvrir le modal de détails
                  console.log('Item selected:', item);
                }}
              />
              <QuickActions 
                onStockAdjustment={(item) => {
                  // TODO: Ouvrir le modal d'ajustement
                  console.log('Stock adjustment:', item);
                }}
                onCreateOrder={(item) => {
                  // TODO: Créer une commande fournisseur
                  console.log('Create order:', item);
                }}
                lowStockItems={inventory.lowStockItems}
                outOfStockItems={inventory.outOfStockItems}
              />
            </div>
          )}

          {selectedTab === 'alerts' && (
            <InventoryAlerts 
              alerts={alerts.alerts}
              criticalAlerts={alerts.criticalAlerts}
              warningAlerts={alerts.warningAlerts}
              loading={alerts.loading}
              onMarkAsRead={alerts.markAsRead}
              onResolve={alerts.resolve}
              onMarkAllAsRead={alerts.markAllAsRead}
              onDismissAll={alerts.dismissAll}
            />
          )}

          {selectedTab === 'movements' && (
            <RecentMovements 
              storeId={storeId}
              loading={inventory.loading}
              onViewDetails={(movement) => {
                // TODO: Ouvrir les détails du mouvement
                console.log('Movement details:', movement);
              }}
            />
          )}

          {selectedTab === 'analytics' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Analytics et Rapports
              </h3>
              <p className="text-gray-600">
                Section en cours de développement...
              </p>
              {inventory.analytics && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {inventory.analytics.totalValue.toLocaleString('fr-FR')}€
                    </div>
                    <div className="text-sm text-blue-800">Valeur totale</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {inventory.analytics.rotationRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-green-800">Taux de rotation</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {inventory.analytics.wastePercentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-yellow-800">Taux de gaspillage</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {inventory.analytics.turnoverTime.toFixed(0)}j
                    </div>
                    <div className="text-sm text-purple-800">Temps de rotation</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Alertes flottantes */}
      {alerts.criticalCount > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-red-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🚨</div>
              <div className="flex-1">
                <h4 className="font-semibold">
                  {alerts.criticalCount} alerte{alerts.criticalCount > 1 ? 's' : ''} critique{alerts.criticalCount > 1 ? 's' : ''}
                </h4>
                <p className="text-red-100 text-sm mt-1">
                  Vérifiez immédiatement les alertes critiques
                </p>
                <button
                  onClick={() => setSelectedTab('alerts')}
                  className="mt-2 bg-white text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Voir les alertes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}