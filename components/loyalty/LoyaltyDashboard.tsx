/**
 * Dashboard de Fidélité Principal
 * Universal Eats - Interface Utilisateur
 * 
 * Dashboard complet du système de fidélité avec :
 * - Vue d'ensemble des points et niveau
 * - Progression vers le niveau suivant
 * - Récompenses disponibles
 * - Défis actifs
 * - Achievements récents
 */

import React, { useState } from 'react';
import { useLoyaltyComplete, useLoyaltyActions } from '../../hooks/use-loyalty';
import { LoyaltyCard } from './LoyaltyCard';
import { RewardsGrid } from './RewardsGrid';
import { ChallengesList } from './ChallengesList';
import { AchievementsShowcase } from './AchievementsShowcase';
import { TransactionsHistory } from './TransactionsHistory';
import { LevelProgress } from './LevelProgress';
import { BadgeCollection } from './BadgeCollection';

interface LoyaltyDashboardProps {
  userId: string;
  className?: string;
  showFullHistory?: boolean;
}

export function LoyaltyDashboard({ 
  userId, 
  className = '', 
  showFullHistory = false 
}: LoyaltyDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'challenges' | 'achievements' | 'history'>('overview');
  
  const { 
    user, 
    currentLevel, 
    nextLevel, 
    rewards, 
    activeChallenges, 
    unlockedAchievements, 
    badges, 
    transactions,
    redeemReward,
    joinChallenge,
    isLoading,
    error,
    refresh
  } = useLoyaltyComplete(userId);
  
  const { registerToProgram, isProcessing } = useLoyaltyActions(userId);

  // Si l'utilisateur n'est pas inscrit au programme
  if (!user && !isLoading) {
    return (
      <div className={`loyalty-dashboard ${className}`}>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl">
              ⭐
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Rejoignez notre Programme de Fidélité
            </h2>
            <p className="text-gray-600 mb-6">
              Gagnez des points à chaque commande et débloquez des récompenses exclusives !
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-blue-900">Gagnez des Points</h3>
              <p className="text-sm text-blue-700">1 DH = 1 point</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🎁</div>
              <h3 className="font-semibold text-green-900">Récompenses</h3>
              <p className="text-sm text-green-700">Réductions & cadeaux</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">👑</div>
              <h3 className="font-semibold text-purple-900">Niveaux VIP</h3>
              <p className="text-sm text-purple-700">Jusqu'à 20% de réduction</p>
            </div>
          </div>
          
          <button
            onClick={() => registerToProgram()}
            disabled={isProcessing}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Inscription...' : 'Rejoindre Maintenant'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`loyalty-dashboard ${className}`}>
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`loyalty-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'rewards', label: 'Récompenses', icon: '🎁', count: rewards.length },
    { id: 'challenges', label: 'Défis', icon: '🎯', count: activeChallenges.length },
    { id: 'achievements', label: 'Achievements', icon: '🏆', count: unlockedAchievements.length },
    { id: 'history', label: 'Historique', icon: '📜', count: transactions.length }
  ];

  return (
    <div className={`loyalty-dashboard ${className}`}>
      {/* En-tête avec niveau et points */}
      <div className="bg-white rounded-lg shadow-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Mon Programme de Fidélité
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">{currentLevel?.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{currentLevel?.name}</p>
                    <p className="text-sm text-gray-600">{user?.totalPoints} points au total</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{user?.availablePoints}</p>
                  <p className="text-sm text-gray-600">Points disponibles</p>
                </div>
              </div>
            </div>
            
            {/* Progression vers le niveau suivant */}
            {nextLevel && (
              <div className="bg-gray-50 rounded-lg p-4 min-w-[250px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Vers {nextLevel.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(user?.levelProgress || 0)}%
                  </span>
                </div>
                <LevelProgress 
                  current={user?.totalPoints || 0}
                  target={nextLevel.minPoints}
                  currentLevelMin={currentLevel?.minPoints || 0}
                />
                <p className="text-xs text-gray-600 mt-1">
                  {nextLevel.minPoints - (user?.totalPoints || 0)} points restants
                </p>
              </div>
            )}
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
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistiques rapides */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{user?.ordersCount}</div>
                  <div className="text-sm text-blue-700">Commandes</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{user?.totalSpent?.toFixed(0)}€</div>
                  <div className="text-sm text-green-700">Total dépensé</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{user?.streakDays}</div>
                  <div className="text-sm text-purple-700">Jours consécutifs</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{badges.length}</div>
                  <div className="text-sm text-orange-700">Badges</div>
                </div>
              </div>

              {/* Récompenses recommandées */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Récompenses Recommandées</h3>
                <RewardsGrid 
                  rewards={rewards.slice(0, 3)} 
                  availablePoints={user?.availablePoints || 0}
                  onRedeem={redeemReward}
                  compact={true}
                />
              </div>

              {/* Défis actifs */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Défis Actifs</h3>
                <ChallengesList 
                  challenges={activeChallenges.slice(0, 3)} 
                  onJoin={joinChallenge}
                  compact={true}
                />
              </div>

              {/* Achievements récents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements Récents</h3>
                <AchievementsShowcase 
                  achievements={unlockedAchievements.slice(0, 3)} 
                  compact={true}
                />
              </div>

              {/* Collection de badges */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ma Collection de Badges</h3>
                <BadgeCollection badges={badges} compact={true} />
              </div>
            </div>
          )}

          {activeTab === 'rewards' && (
            <RewardsGrid 
              rewards={rewards}
              availablePoints={user?.availablePoints || 0}
              onRedeem={redeemReward}
            />
          )}

          {activeTab === 'challenges' && (
            <ChallengesList 
              challenges={activeChallenges}
              onJoin={joinChallenge}
            />
          )}

          {activeTab === 'achievements' && (
            <AchievementsShowcase achievements={unlockedAchievements} />
          )}

          {activeTab === 'history' && (
            <TransactionsHistory 
              transactions={transactions}
              showFullHistory={showFullHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
}