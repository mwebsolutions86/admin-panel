/**
 * Paramètres Généraux d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface pour configurer :
 * - Paramètres globaux d'inventaire
 * - Configuration des seuils par défaut
 * - Paramètres d'automatisation
 * - Intégrations externes
 * - Sauvegarde et restauration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../../lib/inventory-service';

interface InventorySettingsProps {
  storeId: string;
  inventory: {
    inventory: InventoryItem[];
    loading: boolean;
  };
  onSettingsChange: (settings: InventorySettings) => void;
}

export interface InventorySettings {
  // Paramètres généraux
  general: {
    currency: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    autoRefresh: boolean;
    refreshInterval: number;
  };

  // Seuils par défaut
  thresholds: {
    lowStockPercentage: number;
    defaultMinThreshold: number;
    defaultMaxThreshold: number;
    expiryWarningDays: number;
    criticalExpiryDays: number;
  };

  // Automatisation
  automation: {
    autoReorder: boolean;
    autoReorderThreshold: number;
    autoReorderQuantity: number;
    autoConsumeFIFO: boolean;
    autoAlertEscalation: boolean;
    autoCleanupExpired: boolean;
  };

  // Notifications
  notifications: {
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
    enablePushNotifications: boolean;
    notificationFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };

  // Interface utilisateur
  ui: {
    defaultView: 'dashboard' | 'list' | 'grid';
    itemsPerPage: number;
    showImages: boolean;
    compactMode: boolean;
    theme: 'light' | 'dark' | 'auto';
  };

  // Intégrations
  integrations: {
    posSync: boolean;
    posApiUrl: string;
    posApiKey: string;
    eCommerceSync: boolean;
    ecommerceApiUrl: string;
    ecommerceApiKey: string;
    webhookNotifications: boolean;
    webhookUrl: string;
  };

  // Performance
  performance: {
    enableCaching: boolean;
    cacheExpiry: number;
    enableRealTimeUpdates: boolean;
    batchOperations: boolean;
    optimizeQueries: boolean;
  };

  // Sauvegarde
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    backupRetention: number;
    lastBackup?: string;
  };
}

export default function InventorySettings({ storeId, inventory, onSettingsChange }: InventorySettingsProps) {
  const [settings, setSettings] = useState<InventorySettings>({
    general: {
      currency: 'EUR',
      timezone: 'Europe/Paris',
      dateFormat: 'dd/mm/yyyy',
      numberFormat: 'fr-FR',
      autoRefresh: true,
      refreshInterval: 30
    },
    thresholds: {
      lowStockPercentage: 20,
      defaultMinThreshold: 10,
      defaultMaxThreshold: 100,
      expiryWarningDays: 7,
      criticalExpiryDays: 3
    },
    automation: {
      autoReorder: false,
      autoReorderThreshold: 5,
      autoReorderQuantity: 50,
      autoConsumeFIFO: true,
      autoAlertEscalation: true,
      autoCleanupExpired: false
    },
    notifications: {
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      enablePushNotifications: true,
      notificationFrequency: 'immediate',
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      }
    },
    ui: {
      defaultView: 'dashboard',
      itemsPerPage: 20,
      showImages: true,
      compactMode: false,
      theme: 'light'
    },
    integrations: {
      posSync: false,
      posApiUrl: '',
      posApiKey: '',
      eCommerceSync: false,
      ecommerceApiUrl: '',
      ecommerceApiKey: '',
      webhookNotifications: false,
      webhookUrl: ''
    },
    performance: {
      enableCaching: true,
      cacheExpiry: 300,
      enableRealTimeUpdates: true,
      batchOperations: true,
      optimizeQueries: true
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 30
    }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'thresholds' | 'automation' | 'notifications' | 'integrations' | 'performance' | 'backup'>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
  }, [storeId]);

  const loadSettings = async () => {
    try {
      // TODO: Charger les paramètres depuis la base de données
      console.log('Chargement des paramètres pour le magasin:', storeId);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // TODO: Sauvegarder les paramètres en base de données
      onSettingsChange(settings);
      setHasUnsavedChanges(false);
      console.log('Paramètres sauvegardés:', settings);
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  const updateSetting = (category: keyof InventorySettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const resetToDefaults = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      // Recharger les paramètres par défaut
      window.location.reload();
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-settings-${storeId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(imported);
          setHasUnsavedChanges(true);
        } catch (error) {
          alert('Erreur lors de l\'importation du fichier');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              ⚙️ Paramètres d'Inventaire
            </h2>
            <p className="text-gray-600 mt-1">
              Configurez les paramètres globaux de votre système d'inventaire
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportSettings}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              📤 Exporter
            </button>
            
            <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              📥 Importer
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🔄 Réinitialiser
            </button>
          </div>
        </div>

        {/* Indicateurs de statut */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(settings.general).filter(v => typeof v === 'boolean' && v).length}
            </div>
            <div className="text-sm text-blue-700">
              Fonctions activées
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(settings.automation).filter(v => typeof v === 'boolean' && v).length}
            </div>
            <div className="text-sm text-green-700">
              Automatisations
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {Object.values(settings.integrations).filter(v => typeof v === 'boolean' && v).length}
            </div>
            <div className="text-sm text-yellow-700">
              Intégrations actives
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {settings.backup.autoBackup ? '✅' : '❌'}
            </div>
            <div className="text-sm text-purple-700">
              Sauvegarde auto
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'general', label: 'Général', icon: '🏠' },
              { id: 'thresholds', label: 'Seuils', icon: '📊' },
              { id: 'automation', label: 'Automatisation', icon: '🤖' },
              { id: 'notifications', label: 'Notifications', icon: '🔔' },
              { id: 'integrations', label: 'Intégrations', icon: '🔗' },
              { id: 'performance', label: 'Performance', icon: '⚡' },
              { id: 'backup', label: 'Sauvegarde', icon: '💾' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <GeneralSettings 
              settings={settings.general}
              onUpdate={(key, value) => updateSetting('general', key, value)}
            />
          )}

          {activeTab === 'thresholds' && (
            <ThresholdsSettings 
              settings={settings.thresholds}
              onUpdate={(key, value) => updateSetting('thresholds', key, value)}
            />
          )}

          {activeTab === 'automation' && (
            <AutomationSettings 
              settings={settings.automation}
              onUpdate={(key, value) => updateSetting('automation', key, value)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsSettings 
              settings={settings.notifications}
              onUpdate={(key, value) => updateSetting('notifications', key, value)}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsSettings 
              settings={settings.integrations}
              onUpdate={(key, value) => updateSetting('integrations', key, value)}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceSettings 
              settings={settings.performance}
              onUpdate={(key, value) => updateSetting('performance', key, value)}
            />
          )}

          {activeTab === 'backup' && (
            <BackupSettings 
              settings={settings.backup}
              onUpdate={(key, value) => updateSetting('backup', key, value)}
            />
          )}
        </div>

        {/* Barre d'actions */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-orange-600 text-sm">⚠️ Modifications non sauvegardées</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={loadSettings}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                🔄 Recharger
              </button>
              <button
                onClick={saveSettings}
                disabled={!hasUnsavedChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                💾 Sauvegarder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant paramètres généraux
function GeneralSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['general'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Paramètres Généraux
        </h3>
        <p className="text-gray-600">
          Configuration de base pour l'affichage et le comportement du système
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Devise
          </label>
          <select
            value={settings.currency}
            onChange={(e) => onUpdate('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="EUR">Euro (EUR)</option>
            <option value="USD">Dollar US (USD)</option>
            <option value="GBP">Livre Sterling (GBP)</option>
            <option value="CHF">Franc Suisse (CHF)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fuseau horaire
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => onUpdate('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format de date
          </label>
          <select
            value={settings.dateFormat}
            onChange={(e) => onUpdate('dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format numérique
          </label>
          <select
            value={settings.numberFormat}
            onChange={(e) => onUpdate('numberFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="fr-FR">Français (1 234,56)</option>
            <option value="en-US">Anglais (1,234.56)</option>
            <option value="de-DE">Allemand (1.234,56)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={settings.autoRefresh}
            onChange={(e) => onUpdate('autoRefresh', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="autoRefresh" className="ml-2 text-sm text-gray-700">
            Actualisation automatique des données
          </label>
        </div>

        {settings.autoRefresh && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervalle d'actualisation (secondes)
            </label>
            <input
              type="number"
              min="10"
              max="300"
              value={settings.refreshInterval}
              onChange={(e) => onUpdate('refreshInterval', parseInt(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Composant paramètres des seuils
function ThresholdsSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['thresholds'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Configuration des Seuils
        </h3>
        <p className="text-gray-600">
          Définissez les seuils par défaut pour les alertes et la gestion des stocks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seuil de stock faible (%)
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={settings.lowStockPercentage}
            onChange={(e) => onUpdate('lowStockPercentage', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Pourcentage du stock maximum qui déclenche l'alerte de stock faible
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seuil minimum par défaut
          </label>
          <input
            type="number"
            min="0"
            value={settings.defaultMinThreshold}
            onChange={(e) => onUpdate('defaultMinThreshold', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantité minimum par défaut pour les nouveaux articles
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seuil maximum par défaut
          </label>
          <input
            type="number"
            min="1"
            value={settings.defaultMaxThreshold}
            onChange={(e) => onUpdate('defaultMaxThreshold', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantité maximum par défaut pour les nouveaux articles
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alerte d'expiration (jours)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={settings.expiryWarningDays}
            onChange={(e) => onUpdate('expiryWarningDays', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre de jours avant expiration pour l'alerte d'avertissement
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alerte d'expiration critique (jours)
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={settings.criticalExpiryDays}
            onChange={(e) => onUpdate('criticalExpiryDays', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre de jours avant expiration pour l'alerte critique
          </p>
        </div>
      </div>
    </div>
  );
}

// Composants simplifiés pour les autres onglets
function AutomationSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['automation'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Automatisation
        </h3>
        <p className="text-gray-600">
          Configurez les actions automatiques pour optimiser la gestion
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">
                {key === 'autoReorder' && 'Réapprovisionnement automatique'}
                {key === 'autoReorderThreshold' && 'Seuil de réapprovisionnement'}
                {key === 'autoReorderQuantity' && 'Quantité de réapprovisionnement'}
                {key === 'autoConsumeFIFO' && 'Consommation FIFO automatique'}
                {key === 'autoAlertEscalation' && 'Escalade automatique des alertes'}
                {key === 'autoCleanupExpired' && 'Nettoyage automatique des expirés'}
              </h4>
              <p className="text-sm text-gray-600">
                {typeof value === 'boolean' ? 'Activer/désactiver cette fonctionnalité' : 'Valeur de configuration'}
              </p>
            </div>
            {typeof value === 'boolean' ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => onUpdate(key, e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            ) : (
              <input
                type="number"
                value={value}
                onChange={(e) => onUpdate(key, parseInt(e.target.value))}
                className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['notifications'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Notifications
        </h3>
        <p className="text-gray-600">
          Configurez les canaux et préférences de notification
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">
                {key === 'enableEmailNotifications' && 'Notifications par email'}
                {key === 'enableSMSNotifications' && 'Notifications par SMS'}
                {key === 'enablePushNotifications' && 'Notifications push'}
                {key === 'notificationFrequency' && 'Fréquence de notification'}
                {key === 'quietHours' && 'Heures silencieuses'}
              </h4>
            </div>
            {typeof value === 'boolean' ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => onUpdate(key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ) : key === 'quietHours' ? (
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={Boolean((value as any).enabled)}
                    onChange={(e) => onUpdate(key, { ...(value as any), enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">Activé</span>
                </label>
                <input
                  type="time"
                  value={(value as any).start || ''}
                  onChange={(e) => onUpdate(key, { ...(value as any), start: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded"
                />
                <input
                  type="time"
                  value={(value as any).end || ''}
                  onChange={(e) => onUpdate(key, { ...(value as any), end: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded"
                />
              </div>
            ) : (
              <select
                value={String(value)}
                onChange={(e) => onUpdate(key, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="immediate">Immédiat</option>
                <option value="hourly">Horaire</option>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['integrations'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Intégrations
        </h3>
        <p className="text-gray-600">
          Configurez les connexions avec les systèmes externes
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                {key === 'posSync' && 'Synchronisation POS'}
                {key === 'posApiUrl' && 'URL API POS'}
                {key === 'posApiKey' && 'Clé API POS'}
                {key === 'eCommerceSync' && 'Synchronisation e-commerce'}
                {key === 'ecommerceApiUrl' && 'URL API e-commerce'}
                {key === 'ecommerceApiKey' && 'Clé API e-commerce'}
                {key === 'webhookNotifications' && 'Notifications webhook'}
                {key === 'webhookUrl' && 'URL webhook'}
              </h4>
              {(key === 'posSync' || key === 'eCommerceSync' || key === 'webhookNotifications') && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onUpdate(key, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              )}
            </div>
            {typeof value === 'string' && (
              <input
                type="text"
                value={value}
                onChange={(e) => onUpdate(key, e.target.value)}
                placeholder={key.includes('url') ? 'https://...' : 'Clé API...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['performance'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Performance
        </h3>
        <p className="text-gray-600">
          Optimisez les performances du système
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">
                {key === 'enableCaching' && 'Mise en cache activée'}
                {key === 'cacheExpiry' && 'Durée de cache (secondes)'}
                {key === 'enableRealTimeUpdates' && 'Mises à jour en temps réel'}
                {key === 'batchOperations' && 'Opérations par lots'}
                {key === 'optimizeQueries' && 'Optimisation des requêtes'}
              </h4>
              <p className="text-sm text-gray-600">
                {typeof value === 'boolean' ? 'Activer/désactiver cette optimisation' : 'Configuration de performance'}
              </p>
            </div>
            {typeof value === 'boolean' ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onUpdate(key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ) : (
              <input
                type="number"
                value={value}
                onChange={(e) => onUpdate(key, parseInt(e.target.value))}
                className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BackupSettings({ 
  settings, 
  onUpdate 
}: { 
  settings: InventorySettings['backup'];
  onUpdate: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sauvegarde
        </h3>
        <p className="text-gray-600">
          Configurez la sauvegarde automatique de vos données
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">
                {key === 'autoBackup' && 'Sauvegarde automatique'}
                {key === 'backupFrequency' && 'Fréquence de sauvegarde'}
                {key === 'backupRetention' && 'Rétention (jours)'}
                {key === 'lastBackup' && 'Dernière sauvegarde'}
              </h4>
              <p className="text-sm text-gray-600">
                {typeof value === 'boolean' ? 'Activer/désactiver la sauvegarde auto' : 'Configuration de sauvegarde'}
              </p>
            </div>
            {typeof value === 'boolean' ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onUpdate(key, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            ) : key === 'lastBackup' ? (
              <span className="text-sm text-gray-500">
                {value || 'Jamais'}
              </span>
            ) : (
              <input
                type="number"
                value={value}
                onChange={(e) => onUpdate(key, parseInt(e.target.value))}
                className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💾</span>
          <div>
            <h4 className="font-medium text-blue-900">Sauvegarde manuelle</h4>
            <p className="text-blue-700 text-sm">
              Effectuez une sauvegarde immédiate de toutes vos données d'inventaire
            </p>
          </div>
          <button className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Sauvegarder maintenant
          </button>
        </div>
      </div>
    </div>
  );
}