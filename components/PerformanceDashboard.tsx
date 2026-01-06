/**
 * Dashboard de Performance en Temps Réel
 * Universal Eats - Phase 1 Optimisation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';
import { productCache, orderCache, userCache, CacheUtils } from '@/lib/cache-service';
import { dbOptimizer } from '@/lib/database-optimizer';
import { securityManager } from '@/lib/security-enhanced';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  Users,
  BarChart3
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 secondes

  useEffect(() => {
    updateDashboard();
    
    // Auto-refresh
    const interval = setInterval(updateDashboard, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const updateDashboard = () => {
    // Récupérer les métriques de performance
    const avgResponseTime = performanceMonitor.getAverageResponseTime();
    const avgDbTime = performanceMonitor.getAverageDatabaseTime();
    const errorRate = performanceMonitor.getErrorRate();
    const alertsList = performanceMonitor.checkPerformanceAlerts();
    
    // Récupérer les statistiques de cache
    const cacheStats = {
      product: productCache.getStats(),
      order: orderCache.getStats(),
      user: userCache.getStats()
    };

    // Récupérer les événements de sécurité
    const securityEvents = securityManager.getSecurityEvents(10);

    // Construire les cartes de métriques
    const metricCards: MetricCard[] = [
      {
        title: 'Temps de Réponse API',
        value: avgResponseTime.toFixed(2),
        unit: 'ms',
        trend: avgResponseTime > 500 ? 'up' : avgResponseTime < 200 ? 'down' : 'stable',
        status: avgResponseTime > 1000 ? 'error' : avgResponseTime > 500 ? 'warning' : 'success',
        icon: <Clock className="w-5 h-5" />
      },
      {
        title: 'Temps Requête DB',
        value: avgDbTime.toFixed(2),
        unit: 'ms',
        trend: avgDbTime > 300 ? 'up' : avgDbTime < 150 ? 'down' : 'stable',
        status: avgDbTime > 500 ? 'error' : avgDbTime > 300 ? 'warning' : 'success',
        icon: <Database className="w-5 h-5" />
      },
      {
        title: 'Taux d\'Erreur',
        value: (errorRate * 100).toFixed(2),
        unit: '%',
        trend: errorRate > 0.05 ? 'up' : 'stable',
        status: errorRate > 0.1 ? 'error' : errorRate > 0.05 ? 'warning' : 'success',
        icon: <AlertTriangle className="w-5 h-5" />
      },
      {
        title: 'Cache Hit Rate',
        value: (cacheStats.product.hitRate * 100).toFixed(1),
        unit: '%',
        trend: cacheStats.product.hitRate > 0.8 ? 'up' : 'down',
        status: cacheStats.product.hitRate > 0.8 ? 'success' : cacheStats.product.hitRate > 0.6 ? 'warning' : 'error',
        icon: <Zap className="w-5 h-5" />
      },
      {
        title: 'Opérations Cache/min',
        value: Math.round(cacheStats.product.totalOperations / 5), // Sur 5 minutes
        unit: 'ops',
        trend: 'stable',
        status: 'success',
        icon: <Activity className="w-5 h-5" />
      },
      {
        title: 'Événements Sécurité',
        value: securityEvents.length,
        unit: 'événements',
        trend: securityEvents.length > 5 ? 'up' : 'stable',
        status: securityEvents.length > 10 ? 'error' : 'success',
        icon: <Shield className="w-5 h-5" />
      }
    ];

    setMetrics(metricCards);
    setAlerts(alertsList);
    setRecentLogs(performanceMonitor.getRecentLogs(20));

    // Données pour les graphiques (simulation)
    const now = Date.now();
    const newDataPoint = {
      timestamp: now,
      responseTime: avgResponseTime,
      dbTime: avgDbTime,
      errorRate: errorRate,
      cacheHitRate: cacheStats.product.hitRate
    };

    setPerformanceData(prev => {
      const updated = [...prev, newDataPoint];
      return updated.slice(-20); // Garder les 20 derniers points
    });
  };

  const getStatusColor = (status: MetricCard['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: MetricCard['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Performance</h1>
          <p className="text-gray-600 mt-1">Monitoring temps réel - Universal Eats</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Alertes Performance</h3>
          </div>
          <ul className="space-y-1">
            {alerts.map((alert, index) => (
              <li key={index} className="text-yellow-700 text-sm">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className={`p-6 rounded-lg border ${getStatusColor(metric.status)} transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${metric.status === 'success' ? 'bg-green-100' : metric.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                {metric.icon}
              </div>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">{metric.title}</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.unit && <span className="text-sm text-gray-500">{metric.unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphique de performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Évolution des Performances</h3>
        </div>
        
        {performanceData.length > 0 ? (
          <div className="space-y-4">
            {/* Graphique simplifié avec du CSS */}
            <div className="relative h-40 bg-gray-50 rounded-lg p-4 overflow-hidden">
              <div className="absolute inset-0 flex items-end gap-1">
                {performanceData.map((point, index) => (
                  <div key={index} className="flex-1 flex flex-col gap-1">
                    <div 
                      className="bg-blue-500 rounded-t"
                      style={{ 
                        height: `${Math.min((point.responseTime / 1000) * 100, 100)}%`,
                        opacity: 0.7 
                      }}
                    />
                    <div 
                      className="bg-green-500"
                      style={{ 
                        height: `${Math.min((point.dbTime / 500) * 100, 100)}%`,
                        opacity: 0.7 
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Temps Réponse API</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Temps Requête DB</span>
              </div>
              <div className="text-xs text-gray-400">
                {performanceData.length} points
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée disponible</p>
          </div>
        )}
      </div>

      {/* Logs récents et sécurité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs récents */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Logs Récents</h3>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentLogs.length > 0 ? (
              recentLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warn' ? 'bg-yellow-500' :
                    log.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {log.level}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{log.message}</p>
                    {log.context && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Voir contexte
                        </summary>
                        <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>Aucun log récent</p>
              </div>
            )}
          </div>
        </div>

        {/* Événements de sécurité */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Sécurité</h3>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Sessions Actives</p>
                <p className="text-lg font-bold text-green-700">
                  {securityManager.getSecurityEvents(50).filter(e => e.type === 'login_success').length}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-600">Utilisateurs Connectés</p>
                <p className="text-lg font-bold text-blue-700">
                  {Math.floor(Math.random() * 50) + 20} {/* Simulation */}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Événements Récents</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {securityManager.getSecurityEvents(5).map((event, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'login_success' ? 'bg-green-500' :
                      event.type === 'login_failure' ? 'bg-red-500' :
                      event.type === 'suspicious_activity' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-gray-600 capitalize">{event.type.replace('_', ' ')}</span>
                    <span className="text-gray-400 text-xs">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => performanceMonitor.exportMetrics()}
            className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            Exporter Métriques
          </button>
          <button 
            onClick={() => {
              const cacheStats = {
                product: productCache.getMetrics(),
                order: orderCache.getMetrics(),
                user: userCache.getMetrics()
              };
              console.log('Cache Stats:', cacheStats);
            }}
            className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
          >
            Stats Cache
          </button>
          <button 
            onClick={() => {
              const recommendations = dbOptimizer.getIndexRecommendations();
              console.log('DB Recommendations:', recommendations);
            }}
            className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
          >
            Recommandations DB
          </button>
          <button 
            onClick={() => {
              productCache.clear();
              orderCache.clear();
              userCache.clear();
              updateDashboard();
            }}
            className="px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Vider Cache
          </button>
        </div>
      </div>
    </div>
  );
}