/**
 * Composant d'Alertes d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Gestion complète des alertes :
 * - Affichage des alertes par sévérité
 * - Actions (marquer lu, résoudre)
 * - Filtres et группировка
 * - Notifications en temps réel
 */

'use client';

import React, { useState, useMemo } from 'react';
import { InventoryAlert } from '../../lib/inventory-service';

interface InventoryAlertsProps {
  alerts: InventoryAlert[];
  criticalAlerts: InventoryAlert[];
  warningAlerts: InventoryAlert[];
  loading: boolean;
  onMarkAsRead: (alertId: string) => Promise<void>;
  onResolve: (alertId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDismissAll: () => Promise<void>;
}

export default function InventoryAlerts({
  alerts,
  criticalAlerts,
  warningAlerts,
  loading,
  onMarkAsRead,
  onResolve,
  onMarkAllAsRead,
  onDismissAll
}: InventoryAlertsProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [selectedAlert, setSelectedAlert] = useState<InventoryAlert | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filtrer les alertes
  const filteredAlerts = useMemo(() => {
    switch (selectedFilter) {
      case 'critical':
        return criticalAlerts;
      case 'warning':
        return warningAlerts;
      case 'info':
        return alerts.filter(alert => alert.severity === 'info');
      default:
        return alerts;
    }
  }, [alerts, criticalAlerts, warningAlerts, selectedFilter]);

  // Grouper les alertes par type
  const alertsByType = useMemo(() => {
    const grouped = filteredAlerts.reduce((acc, alert) => {
      if (!acc[alert.type]) {
        acc[alert.type] = [];
      }
      acc[alert.type].push(alert);
      return acc;
    }, {} as Record<string, InventoryAlert[]>);

    return grouped;
  }, [filteredAlerts]);

  // Fonction pour obtenir l'icône et la couleur selon la sévérité
  const getAlertStyle = (severity: InventoryAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: '🚨',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          badgeColor: 'bg-red-100 text-red-800'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          icon: '📝',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Fonction pour obtenir le libellé du type d'alerte
  const getAlertTypeLabel = (type: InventoryAlert['type']) => {
    const labels = {
      low_stock: 'Stock faible',
      out_of_stock: 'Rupture de stock',
      overstock: 'Surstock',
      expiry_warning: 'Expiration proche',
      expiry_critical: 'Expiration critique'
    };
    return labels[type] || type;
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Fonction pour ouvrir le modal de détails
  const openAlertModal = (alert: InventoryAlert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  // Fonction pour fermer le modal
  const closeAlertModal = () => {
    setSelectedAlert(null);
    setShowModal(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-gray-900">
            {alerts.length}
          </div>
          <div className="text-sm text-gray-600">
            Total alertes
          </div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">
            {criticalAlerts.length}
          </div>
          <div className="text-sm text-red-600">
            Critiques
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {warningAlerts.length}
          </div>
          <div className="text-sm text-yellow-600">
            Avertissements
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-2xl font-bold text-blue-600">
            {alerts.filter(a => !a.isRead).length}
          </div>
          <div className="text-sm text-blue-600">
            Non lues
          </div>
        </div>
      </div>

      {/* Filtres et actions */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Filtres */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Toutes', count: alerts.length },
              { key: 'critical', label: 'Critiques', count: criticalAlerts.length },
              { key: 'warning', label: 'Avertissements', count: warningAlerts.length },
              { key: 'info', label: 'Information', count: alerts.filter(a => a.severity === 'info').length }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-1 bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions en masse */}
          <div className="flex gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Tout marquer lu
            </button>
            <button
              onClick={onDismissAll}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
            >
              Tout résoudre
            </button>
          </div>
        </div>
      </div>

      {/* Liste des alertes */}
      {Object.keys(alertsByType).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucune alerte
          </h3>
          <p className="text-gray-600">
            {selectedFilter === 'all' 
              ? 'Toutes les alertes ont été résolues'
              : `Aucune alerte de type "${selectedFilter}"`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(alertsByType).map(([type, typeAlerts]) => (
            <div key={type} className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {getAlertTypeLabel(type as InventoryAlert['type'])}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {typeAlerts.length} alerte{typeAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {typeAlerts.map((alert) => {
                  const style = getAlertStyle(alert.severity);
                  
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 ${style.bgColor} ${!alert.isRead ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">{style.icon}</span>
                            <h4 className={`font-medium ${style.textColor}`}>
                              {alert.title}
                            </h4>
                            {!alert.isRead && (
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                          </div>
                          
                          <p className={`text-sm ${style.textColor} mb-3`}>
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              {formatDate(alert.createdAt)}
                            </span>
                            {alert.currentValue !== undefined && (
                              <span>
                                Valeur actuelle: <strong>{alert.currentValue}</strong>
                              </span>
                            )}
                            {alert.threshold !== undefined && (
                              <span>
                                Seuil: <strong>{alert.threshold}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.badgeColor}`}>
                            {alert.severity}
                          </span>
                          
                          <div className="flex gap-1">
                            {!alert.isRead && (
                              <button
                                onClick={() => onMarkAsRead(alert.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Marquer comme lu"
                              >
                                👁️
                              </button>
                            )}
                            
                            <button
                              onClick={() => openAlertModal(alert)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Voir les détails"
                            >
                              🔍
                            </button>
                            
                            <button
                              onClick={() => onResolve(alert.id)}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Résoudre"
                            >
                              ✅
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de détails d'alerte */}
      {showModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Détails de l'alerte
                </h3>
                <button
                  onClick={closeAlertModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titre
                  </label>
                  <p className="text-gray-900">{selectedAlert.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <p className="text-gray-900">{selectedAlert.message}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sévérité
                    </label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertStyle(selectedAlert.severity).badgeColor}`}>
                      {selectedAlert.severity}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <p className="text-gray-900">
                      {getAlertTypeLabel(selectedAlert.type)}
                    </p>
                  </div>
                </div>
                
                {selectedAlert.currentValue !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valeur actuelle
                    </label>
                    <p className="text-gray-900">{selectedAlert.currentValue}</p>
                  </div>
                )}
                
                {selectedAlert.threshold !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seuil
                    </label>
                    <p className="text-gray-900">{selectedAlert.threshold}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de création
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedAlert.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                
                <div className="flex gap-2 pt-4">
                  {!selectedAlert.isRead && (
                    <button
                      onClick={() => {
                        onMarkAsRead(selectedAlert.id);
                        closeAlertModal();
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Marquer comme lu
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onResolve(selectedAlert.id);
                      closeAlertModal();
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Résoudre
                  </button>
                  
                  <button
                    onClick={closeAlertModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Fermer
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