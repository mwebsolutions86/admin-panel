/**
 * Gestion des Fournisseurs pour l'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface pour :
 * - Gestion complète des fournisseurs
 * - Commandes automatiques
 * - Évaluations et performance
 * - Contrats et tarifs
 * - Intégration avec l'inventaire
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSuppliers } from '../../hooks/use-inventory';
import { Supplier, SupplierOrder, AutomaticReorderRule } from '../../lib/suppliers-manager';
import { InventoryItem } from '../../lib/inventory-service';

interface SupplierManagementProps {
  storeId: string;
  suppliers: ReturnType<typeof useSuppliers>;
  inventory: {
    inventory: InventoryItem[];
    lowStockItems: InventoryItem[];
    outOfStockItems: InventoryItem[];
    loading: boolean;
    refreshInventory: () => Promise<void>;
  };
}

export default function SupplierManagement({ storeId, suppliers, inventory }: SupplierManagementProps) {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'contracts' | 'evaluations' | 'reorders'>('suppliers');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Utiliser le hook suppliers
  const {
    suppliers: suppliersList,
    loading,
    error,
    refreshSuppliers,
    createSupplier,
    updateSupplier,
    createSupplierOrder,
    getSupplierOrders,
    createReorderRule,
    processAutomaticReorders
  } = suppliers;

  // Ouvrir le modal pour créer/éditer un fournisseur
  const openSupplierModal = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setShowSupplierModal(true);
  };

  // Fermer le modal
  const closeSupplierModal = () => {
    setEditingSupplier(null);
    setShowSupplierModal(false);
  };

  // Actions en masse
  const handleBulkAction = async (action: string) => {
    switch (action) {
      case 'activate':
        for (const supplierId of selectedSuppliers) {
          await updateSupplier(supplierId, { status: 'active' });
        }
        break;
      case 'deactivate':
        for (const supplierId of selectedSuppliers) {
          await updateSupplier(supplierId, { status: 'inactive' });
        }
        break;
      case 'create_orders':
        setShowOrderModal(true);
        break;
    }
    setSelectedSuppliers([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des fournisseurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refreshSuppliers}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🏭 Gestion des Fournisseurs
            </h2>
            <p className="text-gray-600 mt-1">
              Gérez vos fournisseurs, commandes et évaluations
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={processAutomaticReorders}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Traiter Commandes Auto
            </button>
            <button
              onClick={() => openSupplierModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ Nouveau Fournisseur
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {suppliersList.length}
            </div>
            <div className="text-sm text-blue-700">
              Total fournisseurs
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {suppliersList.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-green-700">
              Fournisseurs actifs
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {suppliersList.filter(s => s.performance.overallScore >= 4).length}
            </div>
            <div className="text-sm text-yellow-700">
              Score ≥ 4/5
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {suppliersList.filter(s => s.type === 'local').length}
            </div>
            <div className="text-sm text-purple-700">
              Fournisseurs locaux
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">
              {suppliersList.filter(s => s.performance.onTimeDeliveryRate < 80).length}
            </div>
            <div className="text-sm text-red-700">
              Retards fréquents
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'suppliers', label: 'Fournisseurs', count: suppliersList.length },
              { id: 'orders', label: 'Commandes', count: 12 },
              { id: 'contracts', label: 'Contrats', count: 8 },
              { id: 'evaluations', label: 'Évaluations', count: 25 },
              { id: 'reorders', label: 'Réappro Auto', count: 5 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'suppliers' && (
            <SuppliersList
              suppliers={suppliersList}
              selectedSuppliers={selectedSuppliers}
              onSelectionChange={setSelectedSuppliers}
              onEdit={openSupplierModal}
              onRefresh={refreshSuppliers}
              onBulkAction={handleBulkAction}
              inventory={inventory}
            />
          )}

          {activeTab === 'orders' && (
            <SupplierOrders
              suppliers={suppliersList}
              getOrders={getSupplierOrders}
            />
          )}

          {activeTab === 'contracts' && (
            <SupplierContracts suppliers={suppliersList} />
          )}

          {activeTab === 'evaluations' && (
            <SupplierEvaluations suppliers={suppliersList} />
          )}

          {activeTab === 'reorders' && (
            <AutomaticReorders
              suppliers={suppliersList}
              inventory={inventory}
              onCreateRule={createReorderRule}
              onProcessReorders={processAutomaticReorders}
            />
          )}
        </div>
      </div>

      {/* Modal de création/édition de fournisseur */}
      {showSupplierModal && (
        <SupplierModal
          supplier={editingSupplier}
          storeId={storeId}
          onSave={async (supplierData) => {
            try {
              if (editingSupplier) {
                await updateSupplier(editingSupplier.id, supplierData);
              } else {
                await createSupplier(supplierData);
              }
              await refreshSuppliers();
              closeSupplierModal();
            } catch (error) {
              console.error('Erreur sauvegarde fournisseur:', error);
            }
          }}
          onClose={closeSupplierModal}
        />
      )}

      {/* Modal de création de commandes */}
      {showOrderModal && (
        <BulkOrderModal
          suppliers={suppliersList.filter(s => selectedSuppliers.includes(s.id))}
          inventory={inventory}
          onSave={async (orderData) => {
            try {
              await createSupplierOrder(orderData);
              setShowOrderModal(false);
              setSelectedSuppliers([]);
            } catch (error) {
              console.error('Erreur création commande:', error);
            }
          }}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedSuppliers([]);
          }}
        />
      )}
    </div>
  );
}

// Composant liste des fournisseurs
function SuppliersList({
  suppliers,
  selectedSuppliers,
  onSelectionChange,
  onEdit,
  onRefresh,
  onBulkAction,
  inventory
}: {
  suppliers: Supplier[];
  selectedSuppliers: string[];
  onSelectionChange: (suppliers: string[]) => void;
  onEdit: (supplier: Supplier) => void;
  onRefresh: () => void;
  onBulkAction: (action: string) => void;
  inventory: any;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'orders' | 'value'>('name');

  // Filtrer et trier les fournisseurs
  const filteredSuppliers = suppliers
    .filter(supplier => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           supplier.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'score':
          return b.performance.overallScore - a.performance.overallScore;
        case 'orders':
          return b.performance.totalOrders - a.performance.totalOrders;
        case 'value':
          return b.performance.totalValue - a.performance.totalValue;
        default:
          return 0;
      }
    });

  const handleSelectAll = () => {
    if (selectedSuppliers.length === filteredSuppliers.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredSuppliers.map(s => s.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
          <option value="suspended">Suspendu</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="name">Nom A-Z</option>
          <option value="score">Score décroissant</option>
          <option value="orders">Nb commandes</option>
          <option value="value">Valeur totale</option>
        </select>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Actions en masse */}
      {selectedSuppliers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedSuppliers.length} fournisseur{selectedSuppliers.length > 1 ? 's' : ''} sélectionné{selectedSuppliers.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onBulkAction('activate')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                Activer
              </button>
              <button
                onClick={() => onBulkAction('deactivate')}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Désactiver
              </button>
              <button
                onClick={() => onBulkAction('create_orders')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Créer commandes
              </button>
              <button
                onClick={() => onSelectionChange([])}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Désélectionner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des fournisseurs */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun fournisseur trouvé
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Aucun fournisseur ne correspond aux filtres'
              : 'Commencez par ajouter votre premier fournisseur'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.includes(supplier.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedSuppliers, supplier.id]);
                      } else {
                        onSelectionChange(selectedSuppliers.filter(id => id !== supplier.id));
                      }
                    }}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {supplier.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supplier.status)}`}>
                        {supplier.status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {supplier.type}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">
                      {supplier.code} • {supplier.contact.email}
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Score global:</span>
                        <div className={`font-semibold ${getScoreColor(supplier.performance.overallScore)}`}>
                          {supplier.performance.overallScore.toFixed(1)}/5
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Commandes:</span>
                        <div className="font-semibold text-gray-900">
                          {supplier.performance.totalOrders}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Valeur totale:</span>
                        <div className="font-semibold text-gray-900">
                          {supplier.performance.totalValue.toLocaleString('fr-FR')}€
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Livraison à l'heure:</span>
                        <div className="font-semibold text-gray-900">
                          {supplier.performance.onTimeDeliveryRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(supplier)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Éditer"
                  >
                    ✏️
                  </button>
                  <button className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Voir détails">
                    👁️
                  </button>
                  <button className="p-2 text-gray-400 hover:text-purple-600 transition-colors" title="Évaluer">
                    ⭐
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Composants simplifiés pour les autres onglets
function SupplierOrders({ suppliers, getOrders }: { suppliers: Supplier[]; getOrders: any }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📦</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Gestion des Commandes
      </h3>
      <p className="text-gray-600">
        Section en cours de développement...
      </p>
    </div>
  );
}

function SupplierContracts({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📋</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Gestion des Contrats
      </h3>
      <p className="text-gray-600">
        Section en cours de développement...
      </p>
    </div>
  );
}

function SupplierEvaluations({ suppliers }: { suppliers: Supplier[] }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">⭐</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Évaluations des Fournisseurs
      </h3>
      <p className="text-gray-600">
        Section en cours de développement...
      </p>
    </div>
  );
}

function AutomaticReorders({ suppliers, inventory, onCreateRule, onProcessReorders }: {
  suppliers: Supplier[];
  inventory: any;
  onCreateRule: (rule: any) => Promise<any>;
  onProcessReorders: () => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Réapprovisionnement Automatique
        </h3>
        <button
          onClick={onProcessReorders}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🔄 Traiter maintenant
        </button>
      </div>
      
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🤖</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Règles de Réapprovisionnement
        </h3>
        <p className="text-gray-600">
          Section en cours de développement...
        </p>
      </div>
    </div>
  );
}

// Modal de création/édition de fournisseur (simplifié)
function SupplierModal({ 
  supplier, 
  storeId, 
  onSave, 
  onClose 
}: { 
  supplier: Supplier | null;
  storeId: string;
  onSave: (supplierData: any) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    code: supplier?.code || '',
    type: supplier?.type || 'local',
    contact: supplier?.contact || { email: '', phone: '', primaryContact: '' },
    address: supplier?.address || { street: '', city: '', country: 'France' },
    commercial: supplier?.commercial || { taxId: '', paymentTerms: 30, currency: 'EUR' }
  });

  const handleSave = async () => {
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {supplier ? 'Éditer le fournisseur' : 'Nouveau fournisseur'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du fournisseur
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code fournisseur
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de fournisseur
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="local">Local</option>
                <option value="distributor">Distributeur</option>
                <option value="manufacturer">Fabricant</option>
                <option value="import">Import</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contact: { ...formData.contact, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contact: { ...formData.contact, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {supplier ? 'Mettre à jour' : 'Créer le fournisseur'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de création de commandes en masse (simplifié)
function BulkOrderModal({ 
  suppliers, 
  inventory, 
  onSave, 
  onClose 
}: { 
  suppliers: Supplier[];
  inventory: any;
  onSave: (orderData: any) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Créer des commandes
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              {suppliers.length} fournisseur{suppliers.length > 1 ? 's' : ''} sélectionné{suppliers.length > 1 ? 's' : ''}
            </p>
            
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => onSave({})}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer les commandes
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}