/**
 * Gestionnaire des Règles d'Alertes
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface pour :
 * - Créer et modifier les règles d'alertes
 * - Gérer les conditions et actions
 * - Tester les règles
 * - Voir l'historique des alertes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InventoryAlert } from '../../lib/inventory-service';
import { inventoryAlertsService, AlertRule, AlertCondition, AlertAction } from '../../lib/inventory-alerts-service';

interface AlertRulesManagerProps {
  storeId: string;
  alerts: {
    alerts: InventoryAlert[];
    criticalAlerts: InventoryAlert[];
    warningAlerts: InventoryAlert[];
    loading: boolean;
    refreshAlerts: () => Promise<void>;
    markAsRead: (alertId: string) => Promise<void>;
    resolve: (alertId: string) => Promise<void>;
  };
}

export default function AlertRulesManager({ storeId, alerts }: AlertRulesManagerProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history' | 'templates'>('active');

  // Charger les règles au montage
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setRulesLoading(true);
      const data = await inventoryAlertsService.getAlertRules();
      setRules(data);
    } catch (error) {
      console.error('Erreur chargement règles:', error);
    } finally {
      setRulesLoading(false);
    }
  };

  // Ouvrir le modal pour créer/éditer une règle
  const openRuleModal = (rule?: AlertRule) => {
    setEditingRule(rule || null);
    setShowRuleModal(true);
  };

  // Fermer le modal
  const closeRuleModal = () => {
    setEditingRule(null);
    setShowRuleModal(false);
  };

  // Activer/désactiver une règle
  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await inventoryAlertsService.updateAlertRule(ruleId, { isActive });
      await loadRules();
    } catch (error) {
      console.error('Erreur modification règle:', error);
    }
  };

  // Supprimer une règle
  const deleteRule = async (ruleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      try {
        // TODO: Implémenter la suppression dans le service
        await loadRules();
      } catch (error) {
        console.error('Erreur suppression règle:', error);
      }
    }
  };

  if (rulesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des règles d'alertes...</p>
        </div>
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
              🚨 Gestion des Règles d'Alertes
            </h2>
            <p className="text-gray-600 mt-1">
              Configurez les règles de déclenchement des alertes d'inventaire
            </p>
          </div>
          
          <button
            onClick={() => openRuleModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ➕ Nouvelle Règle
          </button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {rules.filter(r => r.isActive).length}
            </div>
            <div className="text-sm text-blue-700">
              Règles actives
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {rules.filter(r => r.category === 'stock').length}
            </div>
            <div className="text-sm text-green-700">
              Règles stock
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {rules.filter(r => r.severity === 'warning').length}
            </div>
            <div className="text-sm text-yellow-700">
              Alertes warning
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">
              {rules.filter(r => r.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700">
              Alertes critiques
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'active', label: 'Règles Actives', count: rules.filter(r => r.isActive).length },
              { id: 'history', label: 'Historique', count: alerts.alerts.length },
              { id: 'templates', label: 'Templates', count: 5 }
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
          {selectedTab === 'active' && (
            <div className="space-y-4">
              {rules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚨</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Aucune règle d'alerte
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Créez votre première règle d'alerte pour surveiller votre inventaire
                  </p>
                  <button
                    onClick={() => openRuleModal()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Créer une règle
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={() => openRuleModal(rule)}
                      onToggle={(isActive) => toggleRule(rule.id, isActive)}
                      onDelete={() => deleteRule(rule.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'history' && (
            <AlertHistory alerts={alerts} />
          )}

          {selectedTab === 'templates' && (
            <AlertTemplates onUseTemplate={(template) => openRuleModal(template)} />
          )}
        </div>
      </div>

      {/* Modal de création/édition de règle */}
      {showRuleModal && (
        <RuleModal
          rule={editingRule}
          storeId={storeId}
          onSave={async (ruleData) => {
            try {
              if (editingRule) {
                await inventoryAlertsService.updateAlertRule(editingRule.id, ruleData);
              } else {
                await inventoryAlertsService.createAlertRule(ruleData);
              }
              await loadRules();
              closeRuleModal();
            } catch (error) {
              console.error('Erreur sauvegarde règle:', error);
            }
          }}
          onClose={closeRuleModal}
        />
      )}
    </div>
  );
}

// Composant carte de règle
interface RuleCardProps {
  rule: AlertRule;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
}

function RuleCard({ rule, onEdit, onToggle, onDelete }: RuleCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock': return '📦';
      case 'expiry': return '⏰';
      case 'supplier': return '🏭';
      case 'cost': return '💰';
      case 'quality': return '⭐';
      default: return '📋';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{getCategoryIcon(rule.category)}</span>
            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
              {rule.severity}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {rule.category}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3">{rule.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              📅 Créée le {new Date(rule.createdAt).toLocaleDateString('fr-FR')}
            </span>
            <span>
              👤 {rule.createdBy}
            </span>
            <span>
              ⚙️ {rule.actions.length} action{rule.actions.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {/* Toggle actif/inactif */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rule.isActive}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              rule.isActive ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                rule.isActive ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="ml-2 text-sm text-gray-700">
              {rule.isActive ? 'Activée' : 'Désactivée'}
            </span>
          </label>
          
          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Éditer"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Supprimer"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant historique des alertes
function AlertHistory({ alerts }: { alerts: AlertRulesManagerProps['alerts'] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Historique des Alertes
        </h3>
        <div className="flex gap-2">
          <button
            onClick={alerts.refreshAlerts}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            🔄 Actualiser
          </button>
          <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
            📊 Exporter
          </button>
        </div>
      </div>

      {alerts.alerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune alerte dans l'historique
          </h3>
          <p className="text-gray-600">
            Les alertes déclenchées apparaîtront ici
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.alerts.slice(0, 10).map((alert) => (
            <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {alert.severity === 'critical' ? '🚨' : 
                     alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Composant templates d'alertes
function AlertTemplates({ onUseTemplate }: { onUseTemplate: (template: any) => void }) {
  const templates = [
    {
      id: 'low_stock',
      name: 'Stock faible automatique',
      description: 'Alerte quand le stock passe sous le seuil minimum',
      category: 'stock',
      severity: 'warning'
    },
    {
      id: 'out_of_stock',
      name: 'Rupture de stock critique',
      description: 'Alerte critique en cas de rupture de stock',
      category: 'stock',
      severity: 'critical'
    },
    {
      id: 'expiry_warning',
      name: 'Expiration proche',
      description: 'Alerte pour les produits expirant dans 7 jours',
      category: 'expiry',
      severity: 'warning'
    },
    {
      id: 'cost_threshold',
      name: 'Seuil de coût',
      description: 'Alerte quand la valeur d\'inventaire dépasse un seuil',
      category: 'cost',
      severity: 'info'
    },
    {
      id: 'supplier_delay',
      name: 'Retard fournisseur',
      description: 'Alerte en cas de retard de livraison fournisseur',
      category: 'supplier',
      severity: 'warning'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Templates d'Alertes
        </h3>
        <p className="text-sm text-gray-600">
          Utilisez ces templates pour créer rapidement des règles d'alertes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  template.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {template.severity}
                </span>
                <span className="text-xs text-gray-500">{template.category}</span>
              </div>
            </div>
            
            <button
              onClick={() => onUseTemplate(template)}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Utiliser ce template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant modal de création/édition de règle (simplifié)
function RuleModal({ 
  rule, 
  storeId, 
  onSave, 
  onClose 
}: { 
  rule: AlertRule | null;
  storeId: string;
  onSave: (ruleData: any) => Promise<void>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    category: rule?.category || 'stock',
    severity: rule?.severity || 'warning',
    isActive: rule?.isActive ?? true,
    conditions: rule?.conditions || [],
    actions: rule?.actions || []
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
              {rule ? 'Éditer la règle' : 'Nouvelle règle d\'alerte'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la règle
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Stock faible automatique"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Décrivez quand et pourquoi cette alerte doit être déclenchée..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="stock">Stock</option>
                  <option value="expiry">Expiration</option>
                  <option value="supplier">Fournisseur</option>
                  <option value="cost">Coût</option>
                  <option value="quality">Qualité</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sévérité
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="info">Information</option>
                  <option value="warning">Avertissement</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Activer cette règle immédiatement
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {rule ? 'Mettre à jour' : 'Créer la règle'}
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