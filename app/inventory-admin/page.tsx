/**
 * Page d'Administration d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface d'administration complète pour :
 * - Gestion des règles d'alertes
 * - Configuration des notifications
 * - Paramètres généraux d'inventaire
 * - Analytics et rapports
 * - Gestion des fournisseurs
 */

'use client';

import React, { useState } from 'react';
import { useInventoryManagement } from '../../hooks/use-inventory';
import InventoryDashboard from '../../components/inventory/InventoryDashboard';
import AlertRulesManager from '../../components/inventory/AlertRulesManager';
import NotificationSettings from '../../components/inventory/NotificationSettings';
import SupplierManagement from '../../components/inventory/SupplierManagement';
import InventoryReports from '../../components/inventory/InventoryReports';
import InventorySettings from '../../components/inventory/InventorySettings';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

export default function InventoryAdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'notifications' | 'suppliers' | 'reports' | 'settings'>('dashboard');
  const [selectedStoreId, setSelectedStoreId] = useState('store_1'); // TODO: Récupérer depuis le contexte

  // Utiliser le hook d'inventory management
  const inventoryManagement = useInventoryManagement(selectedStoreId);

  // Onglets disponibles
  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: '📊',
      description: 'Vue d\'ensemble et monitoring'
    },
    {
      id: 'alerts',
      label: 'Règles d\'Alertes',
      icon: '🚨',
      description: 'Gestion des alertes et règles'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '🔔',
      description: 'Configuration des notifications'
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      icon: '🏭',
      description: 'Gestion des fournisseurs'
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: '📈',
      description: 'Analytics et rapports'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: '⚙️',
      description: 'Configuration générale'
    }
  ];

  if (inventoryManagement.inventory.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-lg text-gray-600">
            Chargement de l'administration d'inventaire...
          </p>
        </div>
      </div>
    );
  }

  if (inventoryManagement.inventory.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md">
          <ErrorMessage 
            message={inventoryManagement.inventory.error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête de l'administration */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  🏪 Administration d'Inventaire
                </h1>
                <p className="mt-2 text-gray-600">
                  Gestion complète des stocks, alertes et fournisseurs
                </p>
              </div>
              
              {/* Sélecteur de magasin */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Magasin
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="store_1">Magasin Principal</option>
                    <option value="store_2">Magasin Nord</option>
                    <option value="store_3">Magasin Sud</option>
                  </select>
                </div>
                
                {/* Actions rapides */}
                <div className="flex gap-2">
                  <button
                    onClick={inventoryManagement.refreshAll}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    🔄 Actualiser
                  </button>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    ➕ Nouvel Article
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs text-gray-400">{tab.description}</div>
                </div>
                
                {/* Indicateurs pour les onglets */}
                {tab.id === 'alerts' && inventoryManagement.alerts.unreadCount > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {inventoryManagement.alerts.unreadCount}
                  </span>
                )}
                {tab.id === 'suppliers' && inventoryManagement.suppliers.loading && (
                  <LoadingSpinner size="small" className="ml-2" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Indicateurs de statut global */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Santé globale de l'inventaire */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💚</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Santé Inventaire
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryManagement.inventory.inventory.length > 0 
                        ? `${Math.round((1 - (inventoryManagement.inventory.lowStockItems.length + inventoryManagement.inventory.outOfStockItems.length) / inventoryManagement.inventory.inventory.length) * 100)}%`
                        : '100%'
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Alertes actives */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">
                    {inventoryManagement.alerts.criticalCount > 0 ? '🚨' : '🔔'}
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Alertes Actives
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryManagement.alerts.totalAlerts}
                      {inventoryManagement.alerts.criticalCount > 0 && (
                        <span className="ml-2 text-sm text-red-600">
                          ({inventoryManagement.alerts.criticalCount} critiques)
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Fournisseurs actifs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🏭</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Fournisseurs
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryManagement.suppliers.suppliers.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Valeur totale */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💰</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Valeur Totale
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryManagement.inventory.totalInventoryValue.toLocaleString('fr-FR')}€
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <InventoryDashboard storeId={selectedStoreId} />
          )}

          {activeTab === 'alerts' && (
            <AlertRulesManager 
              storeId={selectedStoreId}
              alerts={inventoryManagement.alerts}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings 
              storeId={selectedStoreId}
              alerts={inventoryManagement.alerts}
            />
          )}

          {activeTab === 'suppliers' && (
            <SupplierManagement 
              storeId={selectedStoreId}
              suppliers={inventoryManagement.suppliers}
              inventory={inventoryManagement.inventory}
            />
          )}

          {activeTab === 'reports' && (
            <InventoryReports 
              storeId={selectedStoreId}
              analytics={inventoryManagement.inventory.analytics}
              suppliers={inventoryManagement.suppliers}
            />
          )}

          {activeTab === 'settings' && (
            <InventorySettings 
              storeId={selectedStoreId}
              inventory={inventoryManagement.inventory}
              onSettingsChange={(settings) => {
                // TODO: Sauvegarder les paramètres
                console.log('Settings changed:', settings);
              }}
            />
          )}
        </div>
      </div>

      {/* Notifications flottantes pour les alertes critiques */}
      {inventoryManagement.alerts.criticalCount > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-red-600 text-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🚨</div>
              <div className="flex-1">
                <h4 className="font-semibold">
                  {inventoryManagement.alerts.criticalCount} alerte{inventoryManagement.alerts.criticalCount > 1 ? 's' : ''} critique{inventoryManagement.alerts.criticalCount > 1 ? 's' : ''}
                </h4>
                <p className="text-red-100 text-sm mt-1">
                  Vérifiez immédiatement les alertes critiques
                </p>
                <button
                  onClick={() => setActiveTab('alerts')}
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