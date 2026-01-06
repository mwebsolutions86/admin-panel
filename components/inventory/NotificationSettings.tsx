/**
 * Paramètres de Notifications d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface pour configurer :
 * - Canaux de notifications (email, SMS, push, webhooks)
 * - Templates de messages
 * - Horaires de notification
 * - Préférences utilisateur
 * - Escalade des alertes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InventoryAlert } from '../../lib/inventory-service';
import { inventoryAlertsService, NotificationChannel } from '../../lib/inventory-alerts-service';

interface NotificationSettingsProps {
  storeId: string;
  alerts: {
    alerts: InventoryAlert[];
    criticalAlerts: InventoryAlert[];
    warningAlerts: InventoryAlert[];
    loading: boolean;
    refreshAlerts: () => Promise<void>;
  };
}

interface NotificationPreferences {
  email: {
    enabled: boolean;
    recipients: string[];
    severity: string[]; // ['critical', 'warning', 'info']
    schedule: {
      enabled: boolean;
      timeWindows: { start: string; end: string; days: number[] }[];
    };
  };
  sms: {
    enabled: boolean;
    recipients: string[];
    severity: string[];
    schedule: {
      enabled: boolean;
      timeWindows: { start: string; end: string; days: number[] }[];
    };
  };
  push: {
    enabled: boolean;
    recipients: string[];
    severity: string[];
    schedule: {
      enabled: boolean;
      timeWindows: { start: string; end: string; days: number[] }[];
    };
  };
  webhook: {
    enabled: boolean;
    url: string;
    severity: string[];
    headers: Record<string, string>;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    severity: string[];
  };
}

export default function NotificationSettings({ storeId, alerts }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      enabled: true,
      recipients: ['manager@universaleats.com'],
      severity: ['critical', 'warning'],
      schedule: {
        enabled: true,
        timeWindows: [
          { start: '08:00', end: '22:00', days: [1, 2, 3, 4, 5, 6] },
          { start: '10:00', end: '20:00', days: [0] }
        ]
      }
    },
    sms: {
      enabled: false,
      recipients: ['+33123456789'],
      severity: ['critical'],
      schedule: {
        enabled: true,
        timeWindows: [
          { start: '08:00', end: '23:00', days: [0, 1, 2, 3, 4, 5, 6] }
        ]
      }
    },
    push: {
      enabled: true,
      recipients: [],
      severity: ['critical', 'warning'],
      schedule: {
        enabled: false,
        timeWindows: []
      }
    },
    webhook: {
      enabled: false,
      url: '',
      severity: ['critical'],
      headers: { 'Content-Type': 'application/json' }
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#alerts',
      severity: ['critical']
    }
  });

  const [activeTab, setActiveTab] = useState<'channels' | 'templates' | 'schedule' | 'preferences'>('channels');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Sauvegarder les préférences
  const savePreferences = async () => {
    try {
      // TODO: Implémenter la sauvegarde en base de données
      console.log('Sauvegarde des préférences:', preferences);
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
    }
  };

  // Tester une notification
  const testNotification = async (channel: string) => {
    setTestingChannel(channel);
    try {
      // Simuler l'envoi de test
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Test de notification ${channel} envoyé`);
    } catch (error) {
      console.error(`Erreur test ${channel}:`, error);
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔔 Paramètres de Notifications
            </h2>
            <p className="text-gray-600 mt-1">
              Configurez les canaux et préférences de notification pour votre inventaire
            </p>
          </div>
          
          <button
            onClick={savePreferences}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 Sauvegarder
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(preferences).filter(p => p.enabled).length}
            </div>
            <div className="text-sm text-blue-700">
              Canaux actifs
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {preferences.email.recipients.length}
            </div>
            <div className="text-sm text-green-700">
              Destinataires email
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {preferences.sms.recipients.length}
            </div>
            <div className="text-sm text-yellow-700">
              Destinataires SMS
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(preferences).flatMap(p => p.severity || []).length}
            </div>
            <div className="text-sm text-purple-700">
              Configurations sévérité
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'channels', label: 'Canaux', icon: '📡' },
              { id: 'templates', label: 'Templates', icon: '📝' },
              { id: 'schedule', label: 'Horaires', icon: '🕐' },
              { id: 'preferences', label: 'Préférences', icon: '⚙️' }
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
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'channels' && (
            <NotificationChannels 
              preferences={preferences}
              onPreferencesChange={setPreferences}
              testingChannel={testingChannel}
              onTestChannel={testNotification}
            />
          )}

          {activeTab === 'templates' && (
            <NotificationTemplates />
          )}

          {activeTab === 'schedule' && (
            <NotificationSchedule 
              preferences={preferences}
              onPreferencesChange={setPreferences}
            />
          )}

          {activeTab === 'preferences' && (
            <NotificationPreferences 
              preferences={preferences}
              onPreferencesChange={setPreferences}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Composant gestion des canaux de notification
function NotificationChannels({ 
  preferences, 
  onPreferencesChange, 
  testingChannel, 
  onTestChannel 
}: {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
  testingChannel: string | null;
  onTestChannel: (channel: string) => void;
}) {
  const channels = [
    {
      key: 'email',
      name: 'Email',
      icon: '📧',
      description: 'Notifications par email aux destinataires configurés',
      color: 'blue'
    },
    {
      key: 'sms',
      name: 'SMS',
      icon: '📱',
      description: 'Alertes SMS pour les situations critiques',
      color: 'green'
    },
    {
      key: 'push',
      name: 'Push',
      icon: '🔔',
      description: 'Notifications push en temps réel',
      color: 'purple'
    },
    {
      key: 'webhook',
      name: 'Webhook',
      icon: '🔗',
      description: 'Intégration avec des systèmes externes',
      color: 'gray'
    },
    {
      key: 'slack',
      name: 'Slack',
      icon: '💬',
      description: 'Notifications dans les canaux Slack',
      color: 'pink'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800',
      pink: 'bg-pink-50 border-pink-200 text-pink-800'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Canaux de Notification
        </h3>
        <p className="text-gray-600">
          Activez et configurez les canaux de notification pour recevoir les alertes d'inventaire
        </p>
      </div>

      <div className="grid gap-6">
        {channels.map((channel) => {
          const prefs = preferences[channel.key as keyof NotificationPreferences] as any;
          const isEnabled = prefs.enabled;
          
          return (
            <div key={channel.key} className={`border rounded-lg p-6 ${getColorClasses(channel.color)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{channel.icon}</span>
                  <div>
                    <h4 className="text-lg font-semibold">{channel.name}</h4>
                    <p className="text-sm opacity-75">{channel.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => onPreferencesChange({
                        ...preferences,
                        [channel.key]: { ...prefs, enabled: e.target.checked }
                      })}
                      className="sr-only"
                    />
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                    <span className="ml-2 text-sm font-medium">
                      {isEnabled ? 'Activé' : 'Désactivé'}
                    </span>
                  </label>
                  
                  {isEnabled && (
                    <button
                      onClick={() => onTestChannel(channel.key)}
                      disabled={testingChannel === channel.key}
                      className="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {testingChannel === channel.key ? '⏳ Test...' : '🧪 Test'}
                    </button>
                  )}
                </div>
              </div>

              {isEnabled && (
                <ChannelConfiguration
                  channel={channel.key}
                  preferences={preferences}
                  onPreferencesChange={onPreferencesChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant de configuration des canaux
function ChannelConfiguration({ 
  channel, 
  preferences, 
  onPreferencesChange 
}: {
  channel: string;
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
}) {
  const prefs = preferences[channel as keyof NotificationPreferences] as any;

  switch (channel) {
    case 'email':
    case 'sms':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Destinataires ({channel === 'email' ? 'emails' : 'numéros de téléphone'})
            </label>
            <div className="space-y-2">
              {prefs.recipients.map((recipient: string, index: number) => (
                <div key={index} className="flex gap-2">
                  <input
                    type={channel === 'email' ? 'email' : 'tel'}
                    value={recipient}
                    onChange={(e) => {
                      const newRecipients = [...prefs.recipients];
                      newRecipients[index] = e.target.value;
                      onPreferencesChange({
                        ...preferences,
                        [channel]: { ...prefs, recipients: newRecipients }
                      });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={channel === 'email' ? 'email@exemple.com' : '+33123456789'}
                  />
                  <button
                    onClick={() => {
                      const newRecipients = prefs.recipients.filter((_: any, i: number) => i !== index);
                      onPreferencesChange({
                        ...preferences,
                        [channel]: { ...prefs, recipients: newRecipients }
                      });
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newRecipients = [...prefs.recipients, ''];
                  onPreferencesChange({
                    ...preferences,
                    [channel]: { ...prefs, recipients: newRecipients }
                  });
                }}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                ➕ Ajouter un destinataire
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Sévérités à notifier
            </label>
            <div className="flex gap-4">
              {['critical', 'warning', 'info'].map((severity) => (
                <label key={severity} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prefs.severity.includes(severity)}
                    onChange={(e) => {
                      const newSeverity = e.target.checked
                        ? [...prefs.severity, severity]
                        : prefs.severity.filter((s: string) => s !== severity);
                      onPreferencesChange({
                        ...preferences,
                        [channel]: { ...prefs, severity: newSeverity }
                      });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    {severity === 'critical' && '🚨 Critique'}
                    {severity === 'warning' && '⚠️ Avertissement'}
                    {severity === 'info' && 'ℹ️ Information'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    case 'webhook':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              URL du Webhook
            </label>
            <input
              type="url"
              value={prefs.url}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                webhook: { ...prefs, url: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/webhook"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Sévérités à notifier
            </label>
            <div className="flex gap-4">
              {['critical', 'warning', 'info'].map((severity) => (
                <label key={severity} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prefs.severity.includes(severity)}
                    onChange={(e) => {
                      const newSeverity = e.target.checked
                        ? [...prefs.severity, severity]
                        : prefs.severity.filter((s: string) => s !== severity);
                      onPreferencesChange({
                        ...preferences,
                        webhook: { ...prefs, severity: newSeverity }
                      });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">{severity}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    case 'slack':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Webhook URL Slack
            </label>
            <input
              type="url"
              value={prefs.webhookUrl}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                slack: { ...prefs, webhookUrl: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Canal
            </label>
            <input
              type="text"
              value={prefs.channel}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                slack: { ...prefs, channel: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="#alerts"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Composant templates de notification (simplifié)
function NotificationTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Templates de Messages
        </h3>
        <p className="text-gray-600">
          Personnalisez les messages envoyés pour chaque type d'alerte
        </p>
      </div>

      <div className="grid gap-4">
        {[
          {
            name: 'Rupture de stock critique',
            subject: '🚨 Rupture de stock - {product_name}',
            message: 'L\'article {product_name} est en rupture de stock dans {store_name}. Action immédiate requise.',
            variables: ['product_name', 'store_name', 'current_stock']
          },
          {
            name: 'Stock faible',
            subject: '⚠️ Stock faible - {product_name}',
            message: 'L\'article {product_name} atteint le seuil minimum dans {store_name}.',
            variables: ['product_name', 'store_name', 'current_stock', 'min_threshold']
          },
          {
            name: 'Expiration proche',
            subject: '⏰ Expiration - {product_name}',
            message: 'Le produit {product_name} expire le {expiry_date} dans {store_name}.',
            variables: ['product_name', 'expiry_date', 'store_name']
          }
        ].map((template, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{template.name}</h4>
              <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors">
                ✏️ Éditer
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-500">Sujet</label>
                <p className="text-sm text-gray-900">{template.subject}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Message</label>
                <p className="text-sm text-gray-900">{template.message}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Variables disponibles</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {template.variables.map((variable) => (
                    <span key={variable} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant horaires de notification (simplifié)
function NotificationSchedule({ 
  preferences, 
  onPreferencesChange 
}: {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Horaires de Notification
        </h3>
        <p className="text-gray-600">
          Définissez quand les notifications doivent être envoyées
        </p>
      </div>

      <div className="space-y-4">
        {['email', 'sms', 'push'].map((channel) => {
          const prefs = preferences[channel as keyof NotificationPreferences] as any;
          return (
            <div key={channel} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 capitalize">{channel}</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={prefs.schedule?.enabled || false}
                    onChange={(e) => onPreferencesChange({
                      ...preferences,
                      [channel]: { 
                        ...prefs, 
                        schedule: { 
                          ...prefs.schedule, 
                          enabled: e.target.checked 
                        } 
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">Activer la planification</span>
                </label>
              </div>
              
              {prefs.schedule?.enabled && (
                <div className="text-sm text-gray-600">
                  📅 Fenêtres horaires configurées: {prefs.schedule.timeWindows?.length || 0}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant préférences générales (simplifié)
function NotificationPreferences({ 
  preferences, 
  onPreferencesChange 
}: {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Préférences Générales
        </h3>
        <p className="text-gray-600">
          Configurez les préférences globales pour toutes les notifications
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Escalade</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Activer l'escalade automatique</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Délai d'escalade (minutes)
              </label>
              <input
                type="number"
                defaultValue={30}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Regroupement</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Regrouper les alertes similaires</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervalle de regroupement (minutes)
              </label>
              <input
                type="number"
                defaultValue={15}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}