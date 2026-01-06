/**
 * Composant d'Indicateurs Clés (KPIs) d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Affiche les métriques principales :
 * - Valeur totale de l'inventaire
 * - Nombre d'articles
 * - Articles en stock faible/rupture
 * - Alertes actives
 * - Score de santé
 */

'use client';

import React from 'react';
import { InventoryAnalytics } from '../../lib/inventory-service';

interface InventoryKPIsProps {
  stats: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    activeAlertsCount: number;
    criticalAlertsCount: number;
    healthScore: number;
  };
  analytics: InventoryAnalytics | null;
  loading: boolean;
}

export default function InventoryKPIs({ stats, analytics, loading }: InventoryKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return '😊';
    if (score >= 60) return '😐';
    return '😟';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Score de Santé */}
      <div className={`rounded-lg border p-4 ${getHealthScoreColor(stats.healthScore)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Santé Inventaire</span>
          <span className="text-2xl">{getHealthScoreIcon(stats.healthScore)}</span>
        </div>
        <div className="text-2xl font-bold">
          {stats.healthScore.toFixed(0)}%
        </div>
        <div className="text-xs opacity-75 mt-1">
          {stats.healthScore >= 80 ? 'Excellent' : 
           stats.healthScore >= 60 ? 'Bon' : 'Critique'}
        </div>
      </div>

      {/* Valeur Totale */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-700">Valeur Totale</span>
          <span className="text-2xl">💰</span>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          {formatCurrency(stats.totalValue)}
        </div>
        <div className="text-xs text-blue-600 mt-1">
          {stats.totalItems} articles
        </div>
      </div>

      {/* Stock Faible */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-yellow-700">Stock Faible</span>
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="text-2xl font-bold text-yellow-900">
          {stats.lowStockCount}
        </div>
        <div className="text-xs text-yellow-600 mt-1">
          {stats.totalItems > 0 ? ((stats.lowStockCount / stats.totalItems) * 100).toFixed(1) : 0}% des articles
        </div>
      </div>

      {/* Rupture de Stock */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-red-700">Rupture</span>
          <span className="text-2xl">🚫</span>
        </div>
        <div className="text-2xl font-bold text-red-900">
          {stats.outOfStockCount}
        </div>
        <div className="text-xs text-red-600 mt-1">
          {stats.totalItems > 0 ? ((stats.outOfStockCount / stats.totalItems) * 100).toFixed(1) : 0}% des articles
        </div>
      </div>

      {/* Alertes Actives */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-700">Alertes</span>
          <span className="text-2xl">🔔</span>
        </div>
        <div className="text-2xl font-bold text-purple-900">
          {stats.activeAlertsCount}
        </div>
        <div className="text-xs text-purple-600 mt-1">
          {stats.criticalAlertsCount > 0 && (
            <span className="text-red-600 font-medium">
              {stats.criticalAlertsCount} critique{stats.criticalAlertsCount > 1 ? 's' : ''}
            </span>
          )}
          {stats.criticalAlertsCount === 0 && 'Toutes lues'}
        </div>
      </div>

      {/* Taux de Rotation */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-green-700">Rotation</span>
          <span className="text-2xl">🔄</span>
        </div>
        <div className="text-2xl font-bold text-green-900">
          {analytics ? formatPercentage(analytics.rotationRate) : '--'}
        </div>
        <div className="text-xs text-green-600 mt-1">
          {analytics ? `${analytics.turnoverTime.toFixed(0)}j moyen` : 'Chargement...'}
        </div>
      </div>
    </div>
  );
}

// Composant pour afficher les tendances (optionnel)
interface KPITrendProps {
  label: string;
  current: number;
  previous: number;
  format?: 'currency' | 'number' | 'percentage';
  trend?: 'up' | 'down' | 'stable';
}

export function KPITrend({ label, current, previous, format = 'number', trend }: KPITrendProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString('fr-FR');
    }
  };

  const calculateChange = () => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const change = calculateChange();
  const changePercent = Math.abs(change);
  
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '➡️';
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {formatValue(current)}
        </span>
        {previous !== current && (
          <div className={`flex items-center text-sm ${getTrendColor()}`}>
            <span className="mr-1">{getTrendIcon()}</span>
            <span>{changePercent.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}