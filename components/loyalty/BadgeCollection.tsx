/**
 * Collection de Badges
 * Universal Eats - Système de Fidélité
 * 
 * Affiche la collection de badges avec :
 * - Badges organisés par rareté
 * - Statistiques de collection
 * - Animations pour les nouveaux badges
 * - Vue détaillée des badges
 */

import React, { useState, useMemo } from 'react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  earnedAt: string;
  displayOrder: number;
}

interface BadgeCollectionProps {
  badges: Badge[];
  compact?: boolean;
  className?: string;
  showStats?: boolean;
}

export function BadgeCollection({ 
  badges, 
  compact = false, 
  className = '',
  showStats = true
}: BadgeCollectionProps) {
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  // Trier les badges par ordre d'affichage puis par rareté
  const sortedBadges = useMemo(() => {
    return [...badges].sort((a, b) => {
      // D'abord par ordre d'affichage
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      // Puis par rareté (diamond > platinum > gold > silver > bronze)
      const rarityOrder = { diamond: 5, platinum: 4, gold: 3, silver: 2, bronze: 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    });
  }, [badges]);

  // Filtrer les badges
  const filteredBadges = useMemo(() => {
    if (filterRarity === 'all') return sortedBadges;
    return sortedBadges.filter(badge => badge.rarity === filterRarity);
  }, [sortedBadges, filterRarity]);

  // Statistiques des badges
  const stats = useMemo(() => {
    const rarityCounts = badges.reduce((acc, badge) => {
      acc[badge.rarity] = (acc[badge.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalBadges = badges.length;
    const latestBadge = badges.length > 0 
      ? badges.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())[0]
      : null;

    return {
      total: totalBadges,
      byRarity: rarityCounts,
      latest: latestBadge
    };
  }, [badges]);

  // Configuration des raretés
  const rarityConfig = {
    bronze: {
      color: 'text-yellow-800',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      gradient: 'from-yellow-600 to-yellow-700',
      icon: '🥉',
      label: 'Bronze'
    },
    silver: {
      color: 'text-gray-800',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      gradient: 'from-gray-500 to-gray-600',
      icon: '🥈',
      label: 'Argent'
    },
    gold: {
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      gradient: 'from-yellow-500 to-yellow-600',
      icon: '🥇',
      label: 'Or'
    },
    platinum: {
      color: 'text-purple-800',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      gradient: 'from-purple-500 to-purple-600',
      icon: '💎',
      label: 'Platine'
    },
    diamond: {
      color: 'text-blue-800',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-blue-600',
      icon: '💠',
      label: 'Diamant'
    }
  };

  // Formatter la date d'obtention
  const formatEarnDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Vérifier si un badge est récent (moins de 24h)
  const isRecentBadge = (earnedAt: string) => {
    const now = Date.now();
    const earned = new Date(earnedAt).getTime();
    return (now - earned) < 24 * 60 * 60 * 1000;
  };

  if (compact) {
    return (
      <div className={`badge-collection-compact ${className}`}>
        {badges.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">🏅</div>
            <p className="text-gray-600">Aucun badge obtenu</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {badges.slice(0, 6).map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                isRecent={isRecentBadge(badge.earnedAt)}
                onClick={() => setSelectedBadge(badge)}
                compact={true}
              />
            ))}
            {badges.length > 6 && (
              <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg">
                <span className="text-gray-600 font-medium">+{badges.length - 6}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`badge-collection ${className}`}>
      {/* Statistiques */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(rarityConfig).map(([rarity, config]) => (
            <div key={rarity} className={`${config.bg} ${config.border} border rounded-lg p-4 text-center`}>
              <div className="text-2xl mb-1">{config.icon}</div>
              <div className={`text-lg font-bold ${config.color}`}>
                {stats.byRarity[rarity] || 0}
              </div>
              <div className="text-sm text-gray-600">{config.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge le plus récent */}
      {stats.latest && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl animate-bounce">
              {stats.latest.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Dernier Badge Obtenu !</h3>
              <p className="text-gray-700">{stats.latest.name}</p>
              <p className="text-sm text-gray-600">
                Obtenu le {formatEarnDate(stats.latest.earnedAt)}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${rarityConfig[stats.latest.rarity].bg} ${rarityConfig[stats.latest.rarity].color}`}>
              {rarityConfig[stats.latest.rarity].label}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Filtrer par rareté</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tous', icon: '🏅', count: badges.length },
            ...Object.entries(rarityConfig).map(([rarity, config]) => ({
              id: rarity,
              label: config.label,
              icon: config.icon,
              count: stats.byRarity[rarity] || 0
            }))
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterRarity(filter.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterRarity === filter.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{filter.icon}</span>
              {filter.label}
              {filter.count > 0 && (
                <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des badges */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun badge dans cette catégorie
          </h3>
          <p className="text-gray-600">
            {filterRarity === 'all' 
              ? 'Vous n\'avez pas encore obtenu de badges'
              : `Aucun badge ${rarityConfig[filterRarity as keyof typeof rarityConfig]?.label.toLowerCase()} obtenu`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredBadges.map((badge) => (
            <BadgeItem
              key={badge.id}
              badge={badge}
              isRecent={isRecentBadge(badge.earnedAt)}
              onClick={() => setSelectedBadge(badge)}
            />
          ))}
        </div>
      )}

      {/* Modal de détail du badge */}
      {selectedBadge && (
        <BadgeModal
          badge={selectedBadge}
          rarityConfig={rarityConfig[selectedBadge.rarity]}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}

// Composant badge individuel
interface BadgeItemProps {
  badge: Badge;
  isRecent: boolean;
  onClick: () => void;
  compact?: boolean;
}

function BadgeItem({ badge, isRecent, onClick, compact = false }: BadgeItemProps) {
  const rarityConfig = {
    bronze: { color: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-200', gradient: 'from-yellow-600 to-yellow-700' },
    silver: { color: 'text-gray-800', bg: 'bg-gray-50', border: 'border-gray-200', gradient: 'from-gray-500 to-gray-600' },
    gold: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', gradient: 'from-yellow-500 to-yellow-600' },
    platinum: { color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-600' },
    diamond: { color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' }
  };

  const config = rarityConfig[badge.rarity];

  const formatEarnDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`group relative ${config.bg} ${config.border} border rounded-lg p-3 hover:shadow-md transition-all ${
          isRecent ? 'ring-2 ring-yellow-400 ring-opacity-50 animate-pulse' : ''
        }`}
        title={`${badge.name} - ${badge.description}`}
      >
        <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
          {badge.icon}
        </div>
        <div className="text-xs font-medium text-gray-900 truncate">
          {badge.name}
        </div>
        {isRecent && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative ${config.bg} ${config.border} border rounded-lg p-4 hover:shadow-lg transition-all ${
        isRecent ? 'ring-2 ring-yellow-400 ring-opacity-50 animate-pulse' : ''
      }`}
    >
      {/* Badge principal */}
      <div className="text-center">
        <div className={`relative inline-block text-4xl mb-3 group-hover:scale-110 transition-transform ${
          isRecent ? 'animate-bounce' : ''
        }`}>
          {badge.icon}
          {isRecent && (
            <div className="absolute -top-2 -right-2 text-lg animate-ping">
              ✨
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-gray-700">
          {badge.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {badge.description}
        </p>
        
        {/* Rareté */}
        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
        </div>
      </div>

      {/* Date d'obtention (visible au hover) */}
      <div className="absolute inset-x-0 bottom-0 bg-gray-900 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
        Obtenu le {formatEarnDate(badge.earnedAt)}
      </div>

      {/* Indicateur de badge récent */}
      {isRecent && (
        <div className="absolute -top-1 -right-1">
          <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
            <span className="text-xs">✨</span>
          </div>
        </div>
      )}
    </button>
  );
}

// Modal de détail du badge
interface BadgeModalProps {
  badge: Badge;
  rarityConfig: any;
  onClose: () => void;
}

function BadgeModal({ badge, rarityConfig, onClose }: BadgeModalProps) {
  const formatEarnDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Contenu du modal */}
        <div className="text-center">
          {/* Icône du badge */}
          <div className="text-8xl mb-4">
            {badge.icon}
          </div>

          {/* Nom et rareté */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {badge.name}
          </h2>
          <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${rarityConfig.bg} ${rarityConfig.color} mb-4`}>
            {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            {badge.description}
          </p>

          {/* Date d'obtention */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Date d'obtention</div>
            <div className="font-semibold text-gray-900">
              {formatEarnDate(badge.earnedAt)}
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="mt-6 w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}