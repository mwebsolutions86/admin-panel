/**
 * Rapports et Analytics d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Interface pour :
 * - Génération de rapports personnalisés
 * - Analytics avancés et KPIs
 * - Graphiques et visualisations
 * - Export des données
 * - Prévisions et tendances
 */

'use client';

import React, { useState, useEffect } from 'react';
import { InventoryAnalytics } from '../../lib/inventory-service';
import { Supplier } from '../../lib/suppliers-manager';
import { useSuppliers } from '../../hooks/use-inventory';

interface InventoryReportsProps {
  storeId: string;
  analytics: InventoryAnalytics | null;
  suppliers: ReturnType<typeof useSuppliers>;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'summary' | 'detailed' | 'performance' | 'trends' | 'custom';
  metrics: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    enabled: boolean;
  };
}

export default function InventoryReports({ storeId, analytics, suppliers }: InventoryReportsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'trends' | 'forecasts' | 'reports'>('overview');
  const [reportTemplates] = useState<ReportTemplate[]>([
    {
      id: 'inventory_summary',
      name: 'Résumé Inventaire',
      description: 'Vue d\'ensemble complète de l\'inventaire',
      type: 'summary',
      metrics: ['total_value', 'total_items', 'low_stock_count', 'rotation_rate']
    },
    {
      id: 'performance_analysis',
      name: 'Analyse Performance',
      description: 'Analyse détaillée des performances d\'inventaire',
      type: 'performance',
      metrics: ['rotation_rate', 'turnover_time', 'waste_percentage', 'efficiency_score']
    },
    {
      id: 'supplier_performance',
      name: 'Performance Fournisseurs',
      description: 'Analyse de la performance des fournisseurs',
      type: 'detailed',
      metrics: ['supplier_scores', 'delivery_performance', 'quality_metrics']
    },
    {
      id: 'trends_analysis',
      name: 'Analyse des Tendances',
      description: 'Évolution des métriques dans le temps',
      type: 'trends',
      metrics: ['stock_trends', 'value_trends', 'rotation_trends']
    }
  ]);

  // Générer un rapport
  const generateReport = async (template: ReportTemplate) => {
    try {
      // TODO: Implémenter la génération de rapport
      console.log('Génération du rapport:', template.name);
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              📈 Rapports et Analytics
            </h2>
            <p className="text-gray-600 mt-1">
              Analysez les performances de votre inventaire et générez des rapports détaillés
            </p>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              📊 Générer Rapport
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              💾 Exporter Données
            </button>
          </div>
        </div>

        {/* KPIs rapides */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.totalValue.toLocaleString('fr-FR')}€
              </div>
              <div className="text-sm text-blue-700">
                Valeur totale inventaire
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {analytics.rotationRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-700">
                Taux de rotation
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.wastePercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-yellow-700">
                Taux de gaspillage
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.turnoverTime.toFixed(0)}j
              </div>
              <div className="text-sm text-purple-700">
                Temps de rotation
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
              { id: 'performance', label: 'Performance', icon: '📈' },
              { id: 'trends', label: 'Tendances', icon: '📉' },
              { id: 'forecasts', label: 'Prévisions', icon: '🔮' },
              { id: 'reports', label: 'Rapports', icon: '📋' }
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
          {activeTab === 'overview' && (
            <InventoryOverview analytics={analytics} suppliers={suppliers} />
          )}

          {activeTab === 'performance' && (
            <PerformanceAnalysis analytics={analytics} />
          )}

          {activeTab === 'trends' && (
            <TrendsAnalysis analytics={analytics} />
          )}

          {activeTab === 'forecasts' && (
            <Forecasts analytics={analytics} />
          )}

          {activeTab === 'reports' && (
            <ReportGenerator 
              templates={reportTemplates}
              onGenerate={generateReport}
              analytics={analytics}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Composant vue d'ensemble
function InventoryOverview({ analytics, suppliers }: { 
  analytics: InventoryAnalytics | null;
  suppliers: ReturnType<typeof useSuppliers>;
}) {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement des analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Vue d'Ensemble de l'Inventaire
        </h3>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Valeur Totale</p>
              <p className="text-3xl font-bold">{analytics.totalValue.toLocaleString('fr-FR')}€</p>
              <p className="text-blue-100 text-sm">{analytics.totalItems} articles</p>
            </div>
            <div className="text-4xl opacity-50">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Rotation</p>
              <p className="text-3xl font-bold">{analytics.rotationRate.toFixed(1)}%</p>
              <p className="text-green-100 text-sm">{analytics.turnoverTime.toFixed(0)}j moyen</p>
            </div>
            <div className="text-4xl opacity-50">🔄</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">Problèmes</p>
              <p className="text-3xl font-bold">
                {analytics.lowStockItems + analytics.outOfStockItems}
              </p>
              <p className="text-red-100 text-sm">
                {analytics.lowStockItems} faibles, {analytics.outOfStockItems} rupture{analytics.outOfStockItems > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-4xl opacity-50">⚠️</div>
          </div>
        </div>
      </div>

      {/* Analyse des problèmes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Problèmes Identifiés</h4>
          <div className="space-y-3">
            {analytics.lowStockItems > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-800">Articles en stock faible</span>
                <span className="font-semibold text-yellow-900">{analytics.lowStockItems}</span>
              </div>
            )}
            {analytics.outOfStockItems > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-800">Articles en rupture</span>
                <span className="font-semibold text-red-900">{analytics.outOfStockItems}</span>
              </div>
            )}
            {analytics.wastePercentage > 5 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-orange-800">Gaspillage élevé</span>
                <span className="font-semibold text-orange-900">{analytics.wastePercentage.toFixed(1)}%</span>
              </div>
            )}
            {analytics.lowStockItems === 0 && analytics.outOfStockItems === 0 && analytics.wastePercentage <= 5 && (
              <div className="flex items-center justify-center p-8 text-green-600">
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-medium">Aucun problème critique identifié</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Performance Fournisseurs</h4>
          <div className="space-y-3">
            {analytics.supplierPerformance.slice(0, 3).map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{supplier.supplierName}</p>
                  <p className="text-sm text-gray-600">{supplier.totalOrders} commandes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{supplier.qualityScore.toFixed(1)}/5</p>
                  <p className="text-sm text-gray-600">{supplier.onTimeDeliveryRate.toFixed(0)}% à l'heure</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant analyse de performance
function PerformanceAnalysis({ analytics }: { analytics: InventoryAnalytics | null }) {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement de l'analyse...</p>
      </div>
    );
  }

  const performanceMetrics = [
    {
      name: 'Taux de Rotation',
      value: analytics.rotationRate,
      target: 15,
      unit: '%',
      description: 'Mesure la vitesse de renouvellement du stock',
      status: analytics.rotationRate >= 15 ? 'good' : analytics.rotationRate >= 10 ? 'warning' : 'poor'
    },
    {
      name: 'Temps de Rotation',
      value: analytics.turnoverTime,
      target: 30,
      unit: 'j',
      description: 'Nombre moyen de jours pour écouler le stock',
      status: analytics.turnoverTime <= 30 ? 'good' : analytics.turnoverTime <= 45 ? 'warning' : 'poor'
    },
    {
      name: 'Taux de Gaspillage',
      value: analytics.wastePercentage,
      target: 3,
      unit: '%',
      description: 'Pourcentage de produits perdus ou gaspillés',
      status: analytics.wastePercentage <= 3 ? 'good' : analytics.wastePercentage <= 5 ? 'warning' : 'poor'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analyse de Performance
        </h3>
        <p className="text-gray-600">
          Évaluation détaillée des indicateurs clés de performance de votre inventaire
        </p>
      </div>

      <div className="grid gap-6">
        {performanceMetrics.map((metric, index) => (
          <div key={index} className={`border rounded-lg p-6 ${getStatusColor(metric.status)}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getStatusIcon(metric.status)}</span>
                  <h4 className="text-lg font-semibold">{metric.name}</h4>
                </div>
                <p className="text-sm opacity-75 mb-4">{metric.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-75">Valeur Actuelle</p>
                    <p className="text-2xl font-bold">
                      {metric.value.toFixed(1)}{metric.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Objectif</p>
                    <p className="text-2xl font-bold">
                      {metric.target}{metric.unit}
                    </p>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progression vers l'objectif</span>
                    <span>{Math.min(100, (metric.value / metric.target) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant analyse des tendances
function TrendsAnalysis({ analytics }: { analytics: InventoryAnalytics | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analyse des Tendances
        </h3>
        <p className="text-gray-600">
          Évolution des métriques dans le temps pour identifier les patterns et optimiser les performances
        </p>
      </div>

      {/* Graphique de tendances (simulé) */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Évolution du Stock (6 derniers mois)</h4>
        <div className="h-64 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📈</div>
            <p className="text-gray-600">Graphique des tendances</p>
            <p className="text-sm text-gray-500 mt-2">Intégration avec une librería de graphiques recommandée</p>
          </div>
        </div>
      </div>

      {/* Indicateurs de tendances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📦</span>
            <div>
              <h5 className="font-medium text-gray-900">Niveau de Stock</h5>
              <p className="text-sm text-gray-600">Tendance stable</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 font-semibold">↗️ +2.3%</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💰</span>
            <div>
              <h5 className="font-medium text-gray-900">Valeur d'Inventaire</h5>
              <p className="text-sm text-gray-600">Croissance continue</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 font-semibold">↗️ +5.7%</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔄</span>
            <div>
              <h5 className="font-medium text-gray-900">Rotation</h5>
              <p className="text-sm text-gray-600">Amélioration constante</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-green-600 font-semibold">↗️ +1.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant prévisions
function Forecasts({ analytics }: { analytics: InventoryAnalytics | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Prévisions et Recommandations
        </h3>
        <p className="text-gray-600">
          Prévisions basées sur l'IA pour optimiser la gestion de votre inventaire
        </p>
      </div>

      {/* Prévisions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔮</span>
            <h4 className="font-semibold text-purple-900">Demande Prévue</h4>
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-2">
            +12%
          </p>
          <p className="text-purple-700 text-sm">
            Augmentation attendue de la demande dans les 30 prochains jours
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📦</span>
            <h4 className="font-semibold text-orange-900">Réapprovisionnement</h4>
          </div>
          <p className="text-3xl font-bold text-orange-900 mb-2">
            {analytics?.lowStockItems || 0}
          </p>
          <p className="text-orange-700 text-sm">
            Articles nécessitant un réapprovisionnement imminent
          </p>
        </div>
      </div>

      {/* Recommandations */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">💡 Recommandations IA</h4>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-xl">🤖</span>
            <div>
              <h5 className="font-medium text-blue-900">Optimisation des Commandes</h5>
              <p className="text-blue-700 text-sm">
                Augmentez les commandes de 15% pour les articles à forte rotation identifiés par l'IA
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <span className="text-xl">💰</span>
            <div>
              <h5 className="font-medium text-green-900">Réduction des Coûts</h5>
              <p className="text-green-700 text-sm">
                Négociez de meilleurs tarifs avec les fournisseurs pour 3 catégories de produits
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <span className="text-xl">⚠️</span>
            <div>
              <h5 className="font-medium text-yellow-900">Gestion des Risques</h5>
              <p className="text-yellow-700 text-sm">
                Surveillez de près les produits saisonniers qui approchent de leur date d'expiration
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant générateur de rapports
function ReportGenerator({ 
  templates, 
  onGenerate, 
  analytics 
}: { 
  templates: ReportTemplate[];
  onGenerate: (template: ReportTemplate) => void;
  analytics: InventoryAnalytics | null;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customMetrics, setCustomMetrics] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Générateur de Rapports
        </h3>
        <p className="text-gray-600">
          Créez des rapports personnalisés selon vos besoins spécifiques
        </p>
      </div>

      {/* Templates de rapports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <div 
            key={template.id} 
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{template.name}</h4>
              <span className="text-sm text-gray-500">{template.type}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            <div className="flex flex-wrap gap-1">
              {template.metrics.map((metric) => (
                <span key={metric} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {metric}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration du rapport */}
      {selectedTemplate && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Configuration: {selectedTemplate.name}
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format de sortie
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Période
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onGenerate(selectedTemplate)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📊 Générer le Rapport
              </button>
              
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rapports récents */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Rapports Récents</h4>
        <div className="space-y-3">
          {[
            { name: 'Rapport Mensuel - Décembre 2024', date: '2024-12-01', type: 'PDF', size: '2.3 MB' },
            { name: 'Analyse Performance - Q4 2024', date: '2024-11-30', type: 'Excel', size: '1.8 MB' },
            { name: 'Inventaire Complet - Novembre', date: '2024-11-25', type: 'PDF', size: '3.1 MB' }
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">📄</span>
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-600">{report.date} • {report.type} • {report.size}</p>
                </div>
              </div>
              <button className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors">
                Télécharger
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}