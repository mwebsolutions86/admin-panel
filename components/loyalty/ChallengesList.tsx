/**
 * Liste des Défis et Missions
 * Universal Eats - Système de Fidélité
 * 
 * Affiche les défis disponibles avec :
 * - Barre de progression visuelle
 * - Difficultés et récompenses
 * - Système d'inscription
 * - Défis saisonniers
 */

import React, { useState } from 'react';

// Helper: obtenir la configuration selon la difficulté
const getDifficultyConfig = (difficulty: string) => {
  const configs = {
    easy: { icon: '🟢', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    medium: { icon: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    hard: { icon: '🟠', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    expert: { icon: '🔴', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  };
  return configs[difficulty as keyof typeof configs] || configs.medium;
};

// Helper: obtenir l'icône selon le type de défi
const getTypeIcon = (type: string) => {
  const icons = {
    spending: '💰',
    orders: '🛒',
    streak: '🔥',
    category: '🏷️',
    referral: '👥',
    seasonal: '🎄'
  };
  return icons[type as keyof typeof icons] || '🎯';
};

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'spending' | 'orders' | 'streak' | 'category' | 'referral' | 'seasonal';
  target: number;
  progress: number;
  reward: {
    points: number;
    badgeId?: string;
    customReward?: string;
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  participants: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category?: string;
}

interface UserProgress {
  challengeId: string;
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  rewardClaimed: boolean;
}

interface ChallengesListProps {
  challenges: Challenge[];
  userProgress?: UserProgress[];
  onJoin: (challengeId: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}

export function ChallengesList({ 
  challenges, 
  userProgress = [],
  onJoin, 
  compact = false,
  className = '' 
}: ChallengesListProps) {
  const [joiningChallenges, setJoiningChallenges] = useState<Set<string>>(new Set());
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Filtrer les défis
  const filteredChallenges = challenges.filter(challenge => {
    if (filterDifficulty !== 'all' && challenge.difficulty !== filterDifficulty) return false;
    if (filterType !== 'all' && challenge.type !== filterType) return false;
    return true;
  });

  // Obtenir le progrès utilisateur pour un défi
  const getUserProgress = (challengeId: string): UserProgress | undefined => {
    return userProgress.find(p => p.challengeId === challengeId);
  };

  // Obtenir l'icône et couleur selon la difficulté
  

  // Obtenir l'icône selon le type de défi
  const getTypeIcon = (type: string) => {
    const icons = {
      spending: '💰',
      orders: '🛒',
      streak: '🔥',
      category: '🏷️',
      referral: '👥',
      seasonal: '🎄'
    };
    return icons[type as keyof typeof icons] || '🎯';
  };

  // Formatter la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Calculer le pourcentage de progression
  const getProgressPercentage = (challenge: Challenge) => {
    const progress = getUserProgress(challenge.id);
    if (progress) {
      return Math.min((progress.currentProgress / progress.targetProgress) * 100, 100);
    }
    return Math.min((challenge.progress / challenge.target) * 100, 100);
  };

  // Gérer l'inscription à un défi
  const handleJoin = async (challengeId: string) => {
    try {
      setJoiningChallenges(prev => new Set(prev).add(challengeId));
      await onJoin(challengeId);
    } catch (error) {
      console.error('Erreur lors de l\'inscription au défi:', error);
    } finally {
      setJoiningChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(challengeId);
        return newSet;
      });
    }
  };

  // Compter les défis par difficulté
  const difficultyCounts = challenges.reduce((acc, challenge) => {
    acc[challenge.difficulty] = (acc[challenge.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compter les défis par type
  const typeCounts = challenges.reduce((acc, challenge) => {
    acc[challenge.type] = (acc[challenge.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (compact) {
    return (
      <div className={`challenges-list-compact ${className}`}>
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🎯</div>
            <p className="text-gray-600">Aucun défi disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChallenges.slice(0, 3).map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                progress={getUserProgress(challenge.id)}
                isJoining={joiningChallenges.has(challenge.id)}
                onJoin={handleJoin}
                compact={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`challenges-list ${className}`}>
      {/* Filtres */}
      <div className="mb-6">
        {/* Filtre par difficulté */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Difficulté</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Toutes', icon: '🎯', count: challenges.length },
              { id: 'easy', label: 'Facile', icon: '🟢', count: difficultyCounts.easy || 0 },
              { id: 'medium', label: 'Moyen', icon: '🟡', count: difficultyCounts.medium || 0 },
              { id: 'hard', label: 'Difficile', icon: '🟠', count: difficultyCounts.hard || 0 },
              { id: 'expert', label: 'Expert', icon: '🔴', count: difficultyCounts.expert || 0 }
            ].map((difficulty) => (
              <button
                key={difficulty.id}
                onClick={() => setFilterDifficulty(difficulty.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterDifficulty === difficulty.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{difficulty.icon}</span>
                {difficulty.label}
                {difficulty.count > 0 && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {difficulty.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filtre par type */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Type</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tous', count: challenges.length },
              { id: 'spending', label: 'Dépenses', icon: '💰', count: typeCounts.spending || 0 },
              { id: 'orders', label: 'Commandes', icon: '🛒', count: typeCounts.orders || 0 },
              { id: 'streak', label: 'Série', icon: '🔥', count: typeCounts.streak || 0 },
              { id: 'referral', label: 'Parrainage', icon: '👥', count: typeCounts.referral || 0 }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.icon && <span className="mr-1">{type.icon}</span>}
                {type.label}
                {type.count > 0 && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {type.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste des défis */}
      {filteredChallenges.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun défi disponible
          </h3>
          <p className="text-gray-600">
            Aucun défi ne correspond à vos critères de filtre
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              progress={getUserProgress(challenge.id)}
              isJoining={joiningChallenges.has(challenge.id)}
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Composant carte de défi individuelle
interface ChallengeCardProps {
  challenge: Challenge;
  progress?: UserProgress;
  isJoining: boolean;
  onJoin: (challengeId: string) => void;
  compact?: boolean;
}

function ChallengeCard({ 
  challenge, 
  progress, 
  isJoining, 
  onJoin, 
  compact = false 
}: ChallengeCardProps) {
  const difficultyConfig = getDifficultyConfig(challenge.difficulty);
  const progressPercentage = progress 
    ? Math.min((progress.currentProgress / progress.targetProgress) * 100, 100)
    : Math.min((challenge.progress / challenge.target) * 100, 100);
  
  const isCompleted = progress?.isCompleted || false;
  const isJoined = !!progress;
  const timeLeft = new Date(challenge.endDate).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (compact) {
    return (
      <div className={`border rounded-lg p-4 ${difficultyConfig.bg} ${difficultyConfig.border}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm flex items-center">
              <span className="mr-2">{getTypeIcon(challenge.type)}</span>
              {challenge.name}
            </h4>
            <p className="text-xs text-gray-600 mt-1">{challenge.description}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyConfig.color} ${difficultyConfig.bg}`}>
            {challenge.difficulty}
          </span>
        </div>

        {/* Barre de progression */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{progress?.currentProgress || challenge.progress} / {challenge.target}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-600">
            <span className="mr-1">⏰</span>
            {daysLeft} jours restants
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-orange-600 font-medium">
              +{challenge.reward.points} pts
            </div>
            {!isJoined ? (
              <button
                onClick={() => !isJoining && onJoin(challenge.id)}
                disabled={isJoining}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isJoining ? '...' : 'Rejoindre'}
              </button>
            ) : isCompleted ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                ✓ Terminé
              </span>
            ) : (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                En cours
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 ${difficultyConfig.bg} ${difficultyConfig.border} transition-all hover:shadow-md`}>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-3">{getTypeIcon(challenge.type)}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{challenge.name}</h3>
              <p className="text-gray-600">{challenge.description}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyConfig.color} ${difficultyConfig.bg}`}>
            {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
          </span>
          <div className="text-sm text-gray-600">
            👥 {challenge.participants} participants
          </div>
        </div>
      </div>

      {/* Progression */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progression
          </span>
          <span className="text-sm text-gray-500">
            {progress?.currentProgress || challenge.progress} / {challenge.target}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 relative overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          >
            {progressPercentage > 0 && (
              <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-900">
            {Math.round(progressPercentage)}% complété
          </span>
          {isCompleted && (
            <span className="text-sm text-green-600 font-medium flex items-center">
              <span className="mr-1">🎉</span>
              Défi terminé !
            </span>
          )}
        </div>
      </div>

      {/* Récompense et dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">Récompense</div>
          <div className="flex items-center">
            <span className="text-xl font-bold text-orange-600">+{challenge.reward.points}</span>
            <span className="text-gray-600 ml-1">points</span>
          </div>
          {challenge.reward.badgeId && (
            <div className="text-xs text-blue-600 mt-1">
              + Badge spécial
            </div>
          )}
        </div>
        
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">Début</div>
          <div className="font-medium text-gray-900">{formatDate(challenge.startDate)}</div>
        </div>
        
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-sm text-gray-600 mb-1">Fin</div>
          <div className="font-medium text-gray-900">{formatDate(challenge.endDate)}</div>
          <div className="text-xs text-orange-600">
            {daysLeft} jours restants
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {isJoined ? (
            <span className="text-green-600 font-medium">✓ Inscrit</span>
          ) : (
            <span>Rejoignez ce défi pour commencer</span>
          )}
        </div>
        
        {!isJoined ? (
          <button
            onClick={() => !isJoining && onJoin(challenge.id)}
            disabled={isJoining}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isJoining ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inscription...
              </span>
            ) : (
              'Rejoindre le défi'
            )}
          </button>
        ) : isCompleted ? (
          <div className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center">
            <span className="mr-2">🎉</span>
            Récompense accordée
          </div>
        ) : (
          <div className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center">
            <span className="mr-2">🏃‍♂️</span>
            En cours...
          </div>
        )}
      </div>
    </div>
  );
}