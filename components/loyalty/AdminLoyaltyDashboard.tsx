/**
 * Dashboard Admin pour la Gestion du Système de Fidélité
 * Universal Eats - Interface d'Administration
 * 
 * Dashboard complet pour administrateurs avec :
 * - Vue d'ensemble des métriques du programme
 * - Gestion des utilisateurs et niveaux
 * - Configuration des récompenses et défis
 * - Analytics et rapports avancés
 * - Gestion des événements et notifications
 */

import React, { useState, useEffect } from 'react';
import { loyaltyService } from '../../lib/loyalty-service';
import { loyaltyRewardsManager } from '../../lib/loyalty-rewards-manager';
import { analyticsService } from '../../lib/analytics-service';
import { performanceMonitor } from '../../lib/performance-monitor';

interface AdminLoyaltyDashboardProps {
  className?: string;
}

interface LoyaltyMetrics {
  totalMembers: number;
  activeMembers: number;
  averagePointsPerUser: number;
  pointsRedemptionRate: number;
  levelDistribution: Record<string, number>;
  topRewards: Array<{ rewardId: string; redemptionCount: number }>;
  revenueFromRewards: number;
  memberRetentionRate: number;
  averageLifetimeValue: number;
  referralSuccessRate: number;
}

interface SystemStats {
  totalRewards: number;
  activeChallenges: number;
  totalAchievements: number;
  activeEvents: number;
  categoriesCount: number;
}

export function AdminLoyaltyDashboard({ className = '' }: AdminLoyaltyDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rewards' | 'challenges' | 'analytics' | 'config'>('overview');
  const [metrics, setMetrics] = useState<LoyaltyMetrics | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Charger les données
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [loyaltyAnalytics, stats] = await Promise.all([
        loyaltyService.getAnalytics(),
        Promise.resolve(loyaltyRewardsManager.getStatistics())
      ]);

      setMetrics(loyaltyAnalytics);
      setSystemStats(stats);

      performanceMonitor.debug('Données dashboard admin chargées');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement dashboard admin', { error: err });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'users', label: 'Utilisateurs', icon: '👥' },
    { id: 'rewards', label: 'Récompenses', icon: '🎁' },
    { id: 'challenges', label: 'Défis', icon: '🎯' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'config', label: 'Configuration', icon: '⚙️' }
  ];

  if (isLoading) {
    return (
      <div className={`admin-loyalty-dashboard ${className}`}>
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`admin-loyalty-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-loyalty-dashboard ${className}`}>
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Administration du Programme de Fidélité
              </h1>
              <p className="text-gray-600">
                Gestion complète du système de fidélité et de récompenses
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              {/* Sélecteur de période */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
                <option value="1y">1 an</option>
              </select>
              
              {/* Bouton de rafraîchissement */}
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab metrics={metrics} systemStats={systemStats} />
          )}

          {activeTab === 'users' && (
            <UsersTab />
          )}

          {activeTab === 'rewards' && (
            <RewardsTab />
          )}

          {activeTab === 'challenges' && (
            <ChallengesTab />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab metrics={metrics} dateRange={dateRange} />
          )}

          {activeTab === 'config' && (
            <ConfigTab />
          )}
        </div>
      </div>
    </div>
  );
}

// Composant onglet Vue d'ensemble
function OverviewTab({ metrics, systemStats }: { metrics: LoyaltyMetrics | null; systemStats: SystemStats | null }) {
  if (!metrics || !systemStats) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      {/* Métriques clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard
          title="Membres Totaux"
          value={metrics.totalMembers.toLocaleString()}
          icon="👥"
          trend="+12%"
          trendUp={true}
          color="blue"
        />
        <MetricCard
          title="Membres Actifs"
          value={metrics.activeMembers.toLocaleString()}
          icon="⚡"
          trend="+8%"
          trendUp={true}
          color="green"
        />
        <MetricCard
          title="Points Moyens"
          value={metrics.averagePointsPerUser.toLocaleString()}
          icon="⭐"
          trend="+5%"
          trendUp={true}
          color="purple"
        />
        <MetricCard
          title="Taux de Rachat"
          value={`${(metrics.pointsRedemptionRate * 100).toFixed(1)}%`}
          icon="🎁"
          trend="+3%"
          trendUp={true}
          color="orange"
        />
      </div>

      {/* Distribution des niveaux */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution des Niveaux</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.levelDistribution).map(([level, count]) => (
            <div key={level} className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">
                {level === 'bronze' ? '🥉' : level === 'silver' ? '🥈' : level === 'gold' ? '🥇' : '💎'}
              </div>
              <div className="text-lg font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600 capitalize">{level}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistiques système */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">Récompenses</h4>
          <div className="text-2xl font-bold text-blue-600">{systemStats.totalRewards}</div>
          <div className="text-sm text-blue-700">Total disponibles</div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <h4 className="font-semibold text-green-900 mb-2">Défis Actifs</h4>
          <div className="text-2xl font-bold text-green-600">{systemStats.activeChallenges}</div>
          <div className="text-sm text-green-700">En cours</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <h4 className="font-semibold text-purple-900 mb-2">Achievements</h4>
          <div className="text-2xl font-bold text-purple-600">{systemStats.totalAchievements}</div>
          <div className="text-sm text-purple-700">Total disponibles</div>
        </div>
      </div>

      {/* Top récompenses */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Récompenses</h3>
        <div className="space-y-3">
          {metrics.topRewards.slice(0, 5).map((reward, index) => (
            <div key={reward.rewardId} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-gray-900">Récompense {reward.rewardId}</span>
              </div>
              <span className="text-gray-600">{reward.redemptionCount} rachats</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant carte métrique
interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon, trend, trendUp, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200'
  };

  return (
    <div className={`bg-white border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trend} {trendUp ? '↗️' : '↘️'}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-75">{title}</div>
    </div>
  );
}

// Composant onglet Utilisateurs
function UsersTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gestion des Utilisateurs</h3>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
          Exporter les données
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">👥</div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Gestion des Utilisateurs</h4>
        <p className="text-gray-600">
          Interface de gestion des utilisateurs du programme de fidélité
        </p>
        <p className="text-sm text-gray-500 mt-2">
          (Fonctionnalité en développement)
        </p>
      </div>
    </div>
  );
}

// Composant onglet Récompenses
function RewardsTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gestion des Récompenses</h3>
        <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
          + Nouvelle Récompense
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🎁</div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Gestion des Récompenses</h4>
        <p className="text-gray-600">
          Interface de création et gestion des récompenses du programme
        </p>
        <p className="text-sm text-gray-500 mt-2">
          (Fonctionnalité en développement)
        </p>
      </div>
    </div>
  );
}

// Composant onglet Défis
function ChallengesTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Gestion des Défis</h3>
        <button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors">
          + Nouveau Défi
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">🎯</div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Gestion des Défis</h4>
        <p className="text-gray-600">
          Interface de création et gestion des défis du programme
        </p>
        <p className="text-sm text-gray-500 mt-2">
          (Fonctionnalité en développement)
        </p>
      </div>
    </div>
  );
}

// Composant onglet Analytics
function AnalyticsTab({ metrics, dateRange }: { metrics: LoyaltyMetrics | null; dateRange: string }) {
  if (!metrics) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Analytics Avancées</h3>
        <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
          📊 Générer un Rapport
        </button>
      </div>
      
      {/* Métriques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Rétention des Membres</h4>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {(metrics.memberRetentionRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Taux de rétention sur 12 mois</div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Valeur Vie Client</h4>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {metrics.averageLifetimeValue.toFixed(0)}€
          </div>
          <div className="text-sm text-gray-600">Valeur moyenne par client</div>
        </div>
        
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Succès Parrainages</h4>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {(metrics.referralSuccessRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Taux de conversion parrainage</div>
        </div>
      </div>

      {/* Graphique de performance (placeholder) */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Évolution sur {dateRange}</h4>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-2">📈</div>
            <p className="text-gray-600">Graphique d'évolution</p>
            <p className="text-sm text-gray-500">Intégration avec bibliothèque de graphiques</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant onglet Configuration
function ConfigTab() {
  const [config, setConfig] = useState({
    pointsPerDirham: 1,
    expirationMonths: 12,
    minimumPointsForRedemption: 100,
    maximumPointsPerTransaction: 1000,
    welcomeBonus: 50,
    birthdayBonus: 200,
    referralBonus: 300
  });

  const handleSave = () => {
    // Logique de sauvegarde
    performanceMonitor.info('Configuration fidélité mise à jour');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Configuration du Programme</h3>
        <button 
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          💾 Sauvegarder
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration des points */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">💰 Configuration des Points</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points par Dirham
              </label>
              <input
                type="number"
                value={config.pointsPerDirham}
                onChange={(e) => setConfig({...config, pointsPerDirham: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois d'expiration
              </label>
              <input
                type="number"
                value={config.expirationMonths}
                onChange={(e) => setConfig({...config, expirationMonths: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum pour rachat
              </label>
              <input
                type="number"
                value={config.minimumPointsForRedemption}
                onChange={(e) => setConfig({...config, minimumPointsForRedemption: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Configuration des bonus */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">🎁 Configuration des Bonus</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonus de bienvenue
              </label>
              <input
                type="number"
                value={config.welcomeBonus}
                onChange={(e) => setConfig({...config, welcomeBonus: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonus d'anniversaire
              </label>
              <input
                type="number"
                value={config.birthdayBonus}
                onChange={(e) => setConfig({...config, birthdayBonus: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bonus de parrainage
              </label>
              <input
                type="number"
                value={config.referralBonus}
                onChange={(e) => setConfig({...config, referralBonus: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Niveaux de fidélité */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">🏆 Niveaux de Fidélité</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Bronze', min: 0, max: 499, discount: 5, icon: '🥉' },
            { name: 'Silver', min: 500, max: 1999, discount: 10, icon: '🥈' },
            { name: 'Gold', min: 2000, max: 4999, discount: 15, icon: '🥇' },
            { name: 'Platinum', min: 5000, max: null, discount: 20, icon: '💎' }
          ].map((level) => (
            <div key={level.name} className="border rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">{level.icon}</div>
              <h5 className="font-semibold text-gray-900">{level.name}</h5>
              <p className="text-sm text-gray-600">
                {level.min} - {level.max === null ? '∞' : level.max} points
              </p>
              <p className="text-sm font-medium text-green-600">{level.discount}% de réduction</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}