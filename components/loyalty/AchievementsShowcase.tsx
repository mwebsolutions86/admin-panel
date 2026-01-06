/**
 * Vitrine des Achievements
 * Universal Eats - Système de Fidélité
 * 
 * Affiche les achievements débloqués avec :
 * - Icônes et descriptions
 * - Rareté et points de récompense
 * - Progression des achievements non débloqués
 * - Effets visuels pour les nouveaux achievements
 */

import React, { useState, useEffect } from 'react';

// Helper: obtenir la couleur et style selon la rareté
const getRarityConfig = (rarity: string) => {
  const configs = {
    common: {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      glow: 'shadow-gray-200',
      badge: 'bg-gray-100 text-gray-800'
    },
    rare: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      glow: 'shadow-blue-200',
      badge: 'bg-blue-100 text-blue-800'
    },
    epic: {
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      glow: 'shadow-purple-200',
      badge: 'bg-purple-100 text-purple-800'
    },
    legendary: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      glow: 'shadow-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800'
    }
  };
  return configs[rarity as keyof typeof configs] || configs.common;
};

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'orders' | 'spending' | 'loyalty' | 'social' | 'special';
  requirement: {
    type: string;
    value: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  pointsReward: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

interface AchievementsShowcaseProps {
  achievements: Achievement[];
  compact?: boolean;
  showLocked?: boolean;
  className?: string;
}

export function AchievementsShowcase({ 
  achievements, 
  compact = false, 
  showLocked = true,
  className = '' 
}: AchievementsShowcaseProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [celebratedAchievements, setCelebratedAchievements] = useState<Set<string>>(new Set());

  // Séparer les achievements débloqués et verrouillés
  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = showLocked ? achievements.filter(a => !a.unlockedAt) : [];

  // Obtenir l'icône de catégorie
  const getCategoryIcon = (category: string) => {
    const icons = {
      orders: '🛒',
      spending: '💰',
      loyalty: '👑',
      social: '👥',
      special: '⭐'
    };
    return icons[category as keyof typeof icons] || '🏆';
  };

  // Obtenir la couleur et style selon la rareté
  

  // Filtrer les achievements
  const filteredAchievements = achievements.filter(achievement => {
    if (filterCategory !== 'all' && achievement.category !== filterCategory) return false;
    if (filterRarity !== 'all' && achievement.rarity !== filterRarity) return false;
    return true;
  });

  // Catégories uniques
  const categories = [
    { id: 'all', name: 'Tous', icon: '🏆' },
    ...Array.from(new Set(achievements.map(a => a.category))).map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      icon: getCategoryIcon(category)
    }))
  ];

  // Compter par rareté
  const rarityCounts = achievements.reduce((acc, achievement) => {
    acc[achievement.rarity] = (acc[achievement.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Simuler une célébration pour les nouveaux achievements
  useEffect(() => {
    const newUnlocked = unlockedAchievements.filter(a => 
      a.unlockedAt && 
      new Date(a.unlockedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Dernières 24h
    );
    
    newUnlocked.forEach(achievement => {
      setTimeout(() => {
        setCelebratedAchievements(prev => new Set(prev).add(achievement.id));
      }, Math.random() * 2000); // Délai aléatoire pour la célébration
    });
  }, [unlockedAchievements]);

  // Formater la date de déblocage
  const formatUnlockDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculer le pourcentage de progression
  const getProgressPercentage = (achievement: Achievement) => {
    return Math.min((achievement.progress / achievement.maxProgress) * 100, 100);
  };

  if (compact) {
    return (
      <div className={`achievements-showcase-compact ${className}`}>
        {unlockedAchievements.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🏆</div>
            <p className="text-gray-600">Aucun achievement débloqué</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedAchievements.slice(0, 3).map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isCelebrated={celebratedAchievements.has(achievement.id)}
                compact={true}
              />
            ))}
          </div>
        )}
        {unlockedAchievements.length > 3 && (
          <div className="text-center mt-4">
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              Voir tous les achievements ({unlockedAchievements.length})
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`achievements-showcase ${className}`}>
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{unlockedAchievements.length}</div>
          <div className="text-sm text-blue-700">Débloqués</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {unlockedAchievements.filter(a => a.rarity === 'rare').length}
          </div>
          <div className="text-sm text-purple-700">Rares</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {unlockedAchievements.filter(a => a.rarity === 'epic').length}
          </div>
          <div className="text-sm text-yellow-700">Épiques</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {unlockedAchievements.filter(a => a.rarity === 'legendary').length}
          </div>
          <div className="text-sm text-orange-700">Légendaires</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6">
        {/* Filtre par catégorie */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Catégorie</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setFilterCategory(category.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filtre par rareté */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Rareté</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Toutes', count: achievements.length },
              { id: 'common', label: 'Commun', icon: '⚪', count: rarityCounts.common || 0 },
              { id: 'rare', label: 'Rare', icon: '🔵', count: rarityCounts.rare || 0 },
              { id: 'epic', label: 'Épique', icon: '🟣', count: rarityCounts.epic || 0 },
              { id: 'legendary', label: 'Légendaire', icon: '🟡', count: rarityCounts.legendary || 0 }
            ].map((rarity) => (
              <button
                key={rarity.id}
                onClick={() => setFilterRarity(rarity.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRarity === rarity.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rarity.icon && <span className="mr-1">{rarity.icon}</span>}
                {rarity.label}
                {rarity.count > 0 && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {rarity.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements débloqués */}
      {unlockedAchievements.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Achievements Débloqués ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.filter(a => a.unlockedAt).map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isCelebrated={celebratedAchievements.has(achievement.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achievements verrouillés */}
      {showLocked && lockedAchievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔒</span>
            À Débloquer ({lockedAchievements.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAchievements.filter(a => !a.unlockedAt).map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isCelebrated={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Message si aucun achievement */}
      {achievements.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun achievement disponible
          </h3>
          <p className="text-gray-600">
            Continuez à utiliser Universal Eats pour débloquer vos premiers achievements !
          </p>
        </div>
      )}
    </div>
  );
}

// Composant carte d'achievement individuelle
interface AchievementCardProps {
  achievement: Achievement;
  isCelebrated: boolean;
  compact?: boolean;
}

function AchievementCard({ 
  achievement, 
  isCelebrated, 
  compact = false 
}: AchievementCardProps) {
  const rarityConfig = getRarityConfig(achievement.rarity);
  const progressPercentage = achievement.unlockedAt ? 100 : Math.min((achievement.progress / achievement.maxProgress) * 100, 100);
  const isUnlocked = !!achievement.unlockedAt;

  const formatUnlockDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  

  if (compact) {
    return (
      <div className={`border rounded-lg p-4 transition-all ${rarityConfig.bg} ${rarityConfig.border} ${
        isCelebrated ? 'animate-bounce shadow-lg' : ''
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`text-3xl ${isUnlocked ? '' : 'grayscale opacity-50'}`}>
            {achievement.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">{achievement.name}</h4>
            <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
            <div className="flex items-center justify-between mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${rarityConfig.badge}`}>
                {achievement.rarity}
              </span>
              {isUnlocked ? (
                <span className="text-xs text-green-600 font-medium">✓ Débloqué</span>
              ) : (
                <div className="text-xs text-gray-500">
                  {achievement.progress}/{achievement.maxProgress}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 transition-all duration-300 ${rarityConfig.bg} ${rarityConfig.border} ${
      isUnlocked ? `shadow-lg ${rarityConfig.glow}` : 'opacity-75'
    } ${
      isCelebrated ? 'animate-pulse ring-2 ring-yellow-400 ring-opacity-50' : ''
    }`}>
      {/* Icône et statut */}
      <div className="text-center mb-4">
        <div className={`relative inline-block text-6xl mb-2 ${
          isUnlocked ? '' : 'grayscale opacity-50'
        } ${isCelebrated ? 'animate-spin-slow' : ''}`}>
          {achievement.icon}
          {isCelebrated && (
            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
              ✨
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${rarityConfig.badge}`}>
            {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
          </span>
          {isUnlocked && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              ✓ Débloqué
            </span>
          )}
        </div>
      </div>

      {/* Nom et description */}
      <div className="text-center mb-4">
        <h3 className={`text-lg font-bold mb-2 ${isUnlocked ? 'text-gray-900' : 'text-gray-600'}`}>
          {achievement.name}
        </h3>
        <p className="text-gray-600 text-sm">{achievement.description}</p>
      </div>

      {/* Progression (pour les achievements non débloqués) */}
      {!isUnlocked && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progression</span>
            <span>{achievement.progress} / {achievement.maxProgress}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            {Math.round(progressPercentage)}% complété
          </div>
        </div>
      )}

      {/* Informations de récompense et date */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Récompense:</span>
          <div className="flex items-center">
            <span className="text-orange-600 font-bold">+{achievement.pointsReward}</span>
            <span className="text-gray-600 ml-1">points</span>
          </div>
        </div>
        
        {isUnlocked && achievement.unlockedAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Débloqué le:</span>
            <span className="text-gray-900 font-medium">
              {formatUnlockDate(achievement.unlockedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Effet de célébration */}
      {isCelebrated && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
            <span className="animate-pulse">🎉</span>
            <span>Nouveau achievement !</span>
            <span className="animate-pulse">🎉</span>
          </div>
        </div>
      )}
    </div>
  );
}