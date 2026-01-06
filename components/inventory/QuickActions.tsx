/**
 * Composant d'Actions Rapides d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Actions rapides pour :
 * - Ajustement de stock en masse
 * - Création de commandes fournisseurs
 * - Import/Export de données
 * - Actions de maintenance
 */

'use client';

import React, { useState } from 'react';
import { InventoryItem } from '../../lib/inventory-service';

interface QuickActionsProps {
  onStockAdjustment: (item: InventoryItem) => void;
  onCreateOrder: (item: InventoryItem) => void;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
}

export default function QuickActions({
  onStockAdjustment,
  onCreateOrder,
  lowStockItems,
  outOfStockItems
}: QuickActionsProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'adjust' | 'order' | 'export'>('adjust');

  // Actions rapides prédéfinies
  const quickActions = [
    {
      id: 'adjust_low_stock',
      title: 'Ajuster stocks faibles',
      description: `Ajuster automatiquement ${lowStockItems.length} article${lowStockItems.length > 1 ? 's' : ''} en stock faible`,
      icon: '⚖️',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      count: lowStockItems.length,
      action: () => {
        setSelectedItems(lowStockItems.map(item => item.id));
        setBulkActionType('adjust');
        setShowBulkModal(true);
      }
    },
    {
      id: 'create_orders',
      title: 'Créer commandes fournisseurs',
      description: `Commander automatiquement ${outOfStockItems.length} article${outOfStockItems.length > 1 ? 's' : ''} en rupture`,
      icon: '📦',
      color: 'bg-green-50 border-green-200 text-green-700',
      count: outOfStockItems.length,
      action: () => {
        setSelectedItems(outOfStockItems.map(item => item.id));
        setBulkActionType('order');
        setShowBulkModal(true);
      }
    },
    {
      id: 'export_data',
      title: 'Exporter l\'inventaire',
      description: 'Télécharger les données complètes de l\'inventaire',
      icon: '📊',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      count: null,
      action: () => {
        setBulkActionType('export');
        setShowBulkModal(true);
      }
    },
    {
      id: 'check_expiry',
      title: 'Vérifier expirations',
      description: 'Vérifier les dates d\'expiration des articles',
      icon: '⏰',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      count: null,
      action: () => {
        // TODO: Implémenter la vérification des expirations
        console.log('Vérification des expirations');
      }
    },
    {
      id: 'sync_pos',
      title: 'Synchroniser avec POS',
      description: 'Synchroniser l\'inventaire avec le système de caisse',
      icon: '🔄',
      color: 'bg-gray-50 border-gray-200 text-gray-700',
      count: null,
      action: () => {
        // TODO: Implémenter la synchronisation POS
        console.log('Synchronisation POS');
      }
    },
    {
      id: 'generate_report',
      title: 'Générer rapport',
      description: 'Créer un rapport détaillé de l\'inventaire',
      icon: '📋',
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      count: null,
      action: () => {
        // TODO: Implémenter la génération de rapport
        console.log('Génération de rapport');
      }
    }
  ];

  // Gestion des actions en masse
  const handleBulkAction = () => {
    switch (bulkActionType) {
      case 'adjust':
        console.log('Ajustement en masse:', selectedItems);
        break;
      case 'order':
        console.log('Commande en masse:', selectedItems);
        break;
      case 'export':
        console.log('Export des données');
        break;
    }
    setShowBulkModal(false);
    setSelectedItems([]);
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          ⚡ Actions Rapides
        </h3>
        <p className="text-sm text-gray-600">
          Effectuez des actions courantes sur votre inventaire en un clic
        </p>
      </div>

      {/* Grille d'actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <div
            key={action.id}
            className={`rounded-lg border p-4 transition-all hover:shadow-md ${action.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{action.icon}</span>
                <div>
                  <h4 className="font-medium text-sm">
                    {action.title}
                  </h4>
                  {action.count !== null && (
                    <span className="text-xs opacity-75">
                      {action.count} élément{action.count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-xs mb-4 opacity-75">
              {action.description}
            </p>
            
            <button
              onClick={action.action}
              disabled={action.count !== null && action.count === 0}
              className="w-full px-3 py-2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {action.count !== null && action.count === 0 ? 'Aucun élément' : 'Exécuter'}
            </button>
          </div>
        ))}
      </div>

      {/* Statistiques rapides */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-3">
          📈 Résumé des Actions
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {lowStockItems.length}
            </div>
            <div className="text-xs text-gray-600">
              Stocks faibles à ajuster
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {outOfStockItems.length}
            </div>
            <div className="text-xs text-gray-600">
              Articles en rupture
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {lowStockItems.length + outOfStockItems.length}
            </div>
            <div className="text-xs text-gray-600">
              Actions recommandées
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              6
            </div>
            <div className="text-xs text-gray-600">
              Outils disponibles
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'action en masse */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {bulkActionType === 'adjust' && 'Ajustement en Masse'}
                  {bulkActionType === 'order' && 'Commande en Masse'}
                  {bulkActionType === 'export' && 'Export des Données'}
                </h3>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {bulkActionType !== 'export' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Articles sélectionnés ({selectedItems.length})
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
                      {selectedItems.map(itemId => {
                        const item = [...lowStockItems, ...outOfStockItems].find(i => i.id === itemId);
                        return item ? (
                          <div key={itemId} className="text-sm text-gray-600 py-1">
                            {item.productId} - Stock: {item.currentStock}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {bulkActionType === 'adjust' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nouvelle quantité
                    </label>
                    <input
                      type="number"
                      placeholder="Quantité cible"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {bulkActionType === 'order' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantité à commander
                    </label>
                    <input
                      type="number"
                      placeholder="Quantité par article"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleBulkAction}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {bulkActionType === 'adjust' && 'Ajuster'}
                    {bulkActionType === 'order' && 'Commander'}
                    {bulkActionType === 'export' && 'Télécharger'}
                  </button>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}