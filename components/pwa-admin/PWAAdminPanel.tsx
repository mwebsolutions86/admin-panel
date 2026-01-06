// Interface d'administration PWA pour Universal Eats
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Bell, 
  Wifi, 
  Settings, 
  BarChart3, 
  Users, 
  Package,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface PWAMetrics {
  totalInstalls: number;
  activeUsers: number;
  offlineUsage: number;
  notificationEngagement: number;
  averageSessionDuration: number;
  crashRate: number;
  performanceScore: number;
}

interface ServiceWorkerStatus {
  registered: boolean;
  updating: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface NotificationMetrics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  optInRate: number;
}

export default function PWAAdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<PWAMetrics>({
    totalInstalls: 0,
    activeUsers: 0,
    offlineUsage: 0,
    notificationEngagement: 0,
    averageSessionDuration: 0,
    crashRate: 0,
    performanceScore: 0
  });
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    registered: false,
    updating: false,
    error: null,
    lastUpdate: null
  });
  const [notificationMetrics, setNotificationMetrics] = useState<NotificationMetrics>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    optInRate: 0
  });

  useEffect(() => {
    loadPWAMetrics();
    checkServiceWorkerStatus();
    loadNotificationMetrics();
  }, []);

  const loadPWAMetrics = async () => {
    // Simulation de chargement des métriques PWA
    setMetrics({
      totalInstalls: 1247,
      activeUsers: 892,
      offlineUsage: 34,
      notificationEngagement: 68,
      averageSessionDuration: 245,
      crashRate: 0.02,
      performanceScore: 94
    });
  };

  const checkServiceWorkerStatus = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        setSwStatus({
          registered: !!registration,
          updating: false,
          error: null,
          lastUpdate: new Date()
        });
      } catch (error) {
        setSwStatus({
          registered: false,
          updating: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          lastUpdate: null
        });
      }
    }
  };

  const loadNotificationMetrics = async () => {
    // Simulation des métriques de notifications
    setNotificationMetrics({
      totalSent: 5642,
      delivered: 5123,
      opened: 3847,
      clicked: 2156,
      optInRate: 72.4
    });
  };

  const forceUpdate = async () => {
    setSwStatus(prev => ({ ...prev, updating: true }));
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      
      setTimeout(() => {
        setSwStatus(prev => ({ 
          ...prev, 
          updating: false, 
          lastUpdate: new Date() 
        }));
      }, 2000);
    } catch (error) {
      setSwStatus(prev => ({ 
        ...prev, 
        updating: false, 
        error: error instanceof Error ? error.message : 'Erreur de mise à jour' 
      }));
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        alert('Cache PWA vidé avec succès');
      }
    } catch (error) {
      alert('Erreur lors du vidage du cache');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'installs', name: 'Installations', icon: Download },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'performance', name: 'Performance', icon: Clock },
    { id: 'settings', name: 'Paramètres', icon: Settings }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Smartphone className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Administration PWA</h1>
        </div>
        <p className="text-gray-600">
          Gestion et monitoring de l'Application Web Progressive Universal Eats
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab metrics={metrics} swStatus={swStatus} />}
      {activeTab === 'installs' && <InstallsTab metrics={metrics} />}
      {activeTab === 'notifications' && <NotificationsTab metrics={notificationMetrics} />}
      {activeTab === 'performance' && <PerformanceTab metrics={metrics} swStatus={swStatus} onClearCache={clearCache} onForceUpdate={forceUpdate} />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

// Composant Vue d'ensemble
function OverviewTab({ metrics, swStatus }: { metrics: PWAMetrics; swStatus: ServiceWorkerStatus }) {
  const getStatusIcon = (status: boolean, error?: string | null) => {
    if (error) return <XCircle className="w-5 h-5 text-red-500" />;
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Installations totales"
          value={metrics.totalInstalls.toLocaleString()}
          icon={Download}
          color="blue"
          change="+12%"
        />
        <MetricCard
          title="Utilisateurs actifs"
          value={metrics.activeUsers.toLocaleString()}
          icon={Users}
          color="green"
          change="+8%"
        />
        <MetricCard
          title="Usage hors ligne"
          value={`${metrics.offlineUsage}%`}
          icon={Wifi}
          color="orange"
          change="+5%"
        />
        <MetricCard
          title="Score de performance"
          value={`${metrics.performanceScore}/100`}
          icon={BarChart3}
          color="purple"
          change="+2%"
        />
      </div>

      {/* État des services */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">État des Services</h3>
        <div className="space-y-4">
          <ServiceStatus
            name="Service Worker"
            status={swStatus.registered}
            error={swStatus.error}
            lastUpdate={swStatus.lastUpdate}
          />
          <ServiceStatus
            name="Cache Offline"
            status={true}
            lastUpdate={new Date()}
          />
          <ServiceStatus
            name="Notifications Push"
            status={true}
            lastUpdate={new Date()}
          />
          <ServiceStatus
            name="Analytics PWA"
            status={true}
            lastUpdate={new Date()}
          />
        </div>
      </div>
    </div>
  );
}

// Composant Installations
function InstallsTab({ metrics }: { metrics: PWAMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendances d'Installation</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cette semaine</span>
              <span className="font-semibold">+156 installations</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ce mois</span>
              <span className="font-semibold">+647 installations</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Taux d'adoption</span>
              <span className="font-semibold">34.2%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plateformes</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Android</span>
              <span className="font-semibold">67.3%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">iOS</span>
              <span className="font-semibold">28.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Desktop</span>
              <span className="font-semibold">4.6%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Notifications
function NotificationsTab({ metrics }: { metrics: NotificationMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total envoyé"
          value={metrics.totalSent.toLocaleString()}
          icon={Bell}
          color="blue"
        />
        <MetricCard
          title="Taux de livraison"
          value={`${((metrics.delivered / metrics.totalSent) * 100).toFixed(1)}%`}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Taux d'ouverture"
          value={`${((metrics.opened / metrics.delivered) * 100).toFixed(1)}%`}
          icon={Users}
          color="orange"
        />
        <MetricCard
          title="Taux de clic"
          value={`${((metrics.clicked / metrics.opened) * 100).toFixed(1)}%`}
          icon={Package}
          color="purple"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement par Type</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Notifications de commande</span>
            <span className="font-semibold">78.5%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Promotions</span>
            <span className="font-semibold">45.2%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fidélité</span>
            <span className="font-semibold">62.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Performance
function PerformanceTab({ 
  metrics, 
  swStatus, 
  onClearCache, 
  onForceUpdate 
}: { 
  metrics: PWAMetrics; 
  swStatus: ServiceWorkerStatus;
  onClearCache: () => void;
  onForceUpdate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Score Lighthouse"
          value={`${metrics.performanceScore}/100`}
          icon={BarChart3}
          color="green"
        />
        <MetricCard
          title="Durée de session"
          value={`${Math.floor(metrics.averageSessionDuration / 60)}min`}
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Taux de crash"
          value={`${(metrics.crashRate * 100).toFixed(2)}%`}
          icon={Shield}
          color="red"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions de Maintenance</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={onForceUpdate}
            disabled={swStatus.updating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {swStatus.updating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Forcer la mise à jour
          </button>
          <button
            onClick={onClearCache}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Wifi className="w-4 h-4" />
            Vider le cache
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Paramètres
function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration PWA</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Installation automatique</label>
              <p className="text-xs text-gray-500">Proposer l'installation après 10 secondes</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Notifications push</label>
              <p className="text-xs text-gray-500">Activer les notifications en temps réel</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Cache offline</label>
              <p className="text-xs text-gray-500">Mettre en cache les données pour usage hors ligne</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Composants utilitaires
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  change 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  color: string; 
  change?: string; 
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-blue-600 bg-blue-50',
    green: 'bg-green-500 text-green-600 bg-green-50',
    orange: 'bg-orange-500 text-orange-600 bg-orange-50',
    purple: 'bg-purple-500 text-purple-600 bg-purple-50',
    red: 'bg-red-500 text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses].split(' ')[2]}`}>
          <Icon className={`w-4 h-4 ${colorClasses[color as keyof typeof colorClasses].split(' ')[1]}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <span className="text-sm text-green-600 font-medium">{change}</span>
        )}
      </div>
    </div>
  );
}

function ServiceStatus({ 
  name, 
  status, 
  error, 
  lastUpdate 
}: { 
  name: string; 
  status: boolean; 
  error?: string | null; 
  lastUpdate?: Date | null; 
}) {
  const getStatusIcon = (status: boolean, error?: string | null) => {
    if (error) return <XCircle className="w-5 h-5 text-red-500" />;
    return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {getStatusIcon(status, error)}
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {lastUpdate && (
            <p className="text-xs text-gray-500">
              Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        error ? 'bg-red-100 text-red-800' : 
        status ? 'bg-green-100 text-green-800' : 
        'bg-yellow-100 text-yellow-800'
      }`}>
        {error ? 'Erreur' : status ? 'Actif' : 'Inactif'}
      </span>
    </div>
  );
}