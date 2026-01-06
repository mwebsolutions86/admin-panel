/**
 * Composant de Filtres d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Filtres avancés pour l'inventaire :
 * - Filtres par statut de stock
 * - Filtres par valeur et seuils
 * - Filtres par date de mise à jour
 * - Filtres par fournisseur et catégorie
 */

'use client';

import React, { useState } from 'react';
import { InventoryFilters as InventoryFiltersType } from '../../lib/inventory-service';

interface InventoryFiltersProps {
  filters: InventoryFiltersType;
  onFiltersChange: (filters: Partial<InventoryFiltersType>) => void;
  onClose: () => void;
}

export default function InventoryFilters({
  filters,
  onFiltersChange,
  onClose
}: InventoryFiltersProps) {
  const [localFilters, setLocalFilters] = useState<InventoryFiltersType>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Options pour les filtres
  const stockStatusOptions = [
    { value: 'all', label: 'Tous les articles' },
    { value: 'in_stock', label: 'En stock' },
    { value: 'low_stock', label: 'Stock faible' },
    { value: 'out_of_stock', label: 'Rupture de stock' },
    { value: 'overstock', label: 'Surstock' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'aliments_frais', label: 'Aliments frais' },
    { value: 'boissons', label: 'Boissons' },
    { value: 'epicerie', label: 'Épicerie' },
    { value: 'viandes', label: 'Viandes' },
    { value: 'legumes', label: 'Légumes' },
    { value: 'produits_laitiers', label: 'Produits laitiers' }
  ];

  const supplierOptions = [
    { value: 'all', label: 'Tous les fournisseurs' },
    { value: 'supplier_1', label: 'Fournisseur Principal' },
    { value: 'supplier_2', label: 'Fournisseur Bio' },
    { value: 'supplier_3', label: 'Fournisseur Local' }
  ];

  // Fonction pour mettre à jour un filtre
  const updateFilter = (key: keyof InventoryFiltersType, value: any) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
  };

  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    const resetFilters: InventoryFiltersType = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Fonction pour gérer les filtres de date
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const newDateRange = {
      ...localFilters.dateRange,
      [type]: new Date(value)
    };
    updateFilter('dateRange', newDateRange);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            🔍 Filtres d'Inventaire
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Masquer' : 'Afficher'} les filtres avancés
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des filtres */}
      <div className="p-6 space-y-6">
        {/* Filtres de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Statut du stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut du stock
            </label>
            <select
              value={localFilters.stockStatus || 'all'}
              onChange={(e) => updateFilter('stockStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {stockStatusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <select
              value={localFilters.categories?.[0] || 'all'}
              onChange={(e) => updateFilter('categories', e.target.value === 'all' ? undefined : [e.target.value])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fournisseur
            </label>
            <select
              value={localFilters.supplierIds?.[0] || 'all'}
              onChange={(e) => updateFilter('supplierIds', e.target.value === 'all' ? undefined : [e.target.value])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {supplierOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtres de stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock minimum
            </label>
            <input
              type="number"
              placeholder="0"
              value={localFilters.minStock || ''}
              onChange={(e) => updateFilter('minStock', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock maximum
            </label>
            <input
              type="number"
              placeholder="999999"
              value={localFilters.maxStock || ''}
              onChange={(e) => updateFilter('maxStock', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtres avancés */}
        {showAdvanced && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Filtres Avancés
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Expiration */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="expiryWarning"
                  checked={localFilters.expiryWarning || false}
                  onChange={(e) => updateFilter('expiryWarning', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="expiryWarning" className="ml-2 text-sm text-gray-700">
                  Articles expirant bientôt
                </label>
              </div>

              {/* Stock faible uniquement */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="lowStockOnly"
                  checked={localFilters.lowStock || false}
                  onChange={(e) => updateFilter('lowStock', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="lowStockOnly" className="ml-2 text-sm text-gray-700">
                  Uniquement stock faible
                </label>
              </div>
            </div>

            {/* Filtres de date */}
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                Dernière mise à jour
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={localFilters.dateRange?.start ? localFilters.dateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={localFilters.dateRange?.end ? localFilters.dateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres actifs */}
        {Object.keys(localFilters).length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              Filtres actifs
            </h5>
            <div className="flex flex-wrap gap-2">
              {localFilters.stockStatus && localFilters.stockStatus !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Statut: {stockStatusOptions.find(o => o.value === localFilters.stockStatus)?.label}
                </span>
              )}
              {localFilters.categories && localFilters.categories.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Catégorie: {categoryOptions.find(o => o.value === localFilters.categories?.[0])?.label}
                </span>
              )}
              {localFilters.supplierIds && localFilters.supplierIds.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Fournisseur: {supplierOptions.find(o => o.value === localFilters.supplierIds?.[0])?.label}
                </span>
              )}
              {localFilters.minStock !== undefined && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Min: {localFilters.minStock}
                </span>
              )}
              {localFilters.maxStock !== undefined && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Max: {localFilters.maxStock}
                </span>
              )}
              {localFilters.expiryWarning && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Expiration proche
                </span>
              )}
              {localFilters.lowStock && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Stock faible uniquement
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={resetFilters}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Réinitialiser les filtres
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}