/**
 * Grille de Récompenses
 * Universal Eats - Système de Fidélité
 * 
 * Affiche les récompenses disponibles avec :
 * - Filtres par catégorie
 * - Indicateur de points requis
 * - Boutons de rachat
 * - Statut des récompenses
 */

import React, { useState, useMemo } from 'react';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'free_item' | 'free_delivery' | 'vip_experience' | 'charity_donation';
  pointsCost: number;
  value: number | string;
  category: string;
  isActive: boolean;
  stock: number | null;
  usageLimitPerUser: number;
  usageCount: number;
  image?: string;
}

interface RewardsGridProps {
  rewards: Reward[];
  availablePoints: number;
  onRedeem: (rewardId: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}

export function RewardsGrid({ 
  rewards, 
  availablePoints, 
  onRedeem, 
  compact = false,
  className = '' 
}: RewardsGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [redeemingRewards, setRedeemingRewards] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'affordable' | 'popular'>('all');

  // Extraire les catégories uniques
  const categories = useMemo(() => {
    const cats = Array.from(new Set(rewards.map(r => r.category)));
    return [
      { id: 'all', name: 'Toutes', icon: '🏷️' },
      ...cats.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: getCategoryIcon(cat)
      }))
    ];
  }, [rewards]);

  // Filtrer les récompenses
  const filteredRewards = useMemo(() => {
    let filtered = rewards;

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(reward => reward.category === selectedCategory);
    }

    // Filtrer par type
    switch (filter) {
      case 'affordable':
        filtered = filtered.filter(reward => reward.pointsCost <= availablePoints);
        break;
      case 'popular':
        // Simuler la popularité (en production, utiliser de vraies données)
        filtered = [...filtered].sort(() => Math.random() - 0.5);
        break;
    }

    return filtered;
  }, [rewards, selectedCategory, filter, availablePoints]);

  // Obtenir l'icône de catégorie
  function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      discounts: '🏷️',
      delivery: '🚚',
      food: '🍕',
      experiences: '⭐',
      charity: '❤️'
    };
    return icons[category] || '🎁';
  }

  // Obtenir la couleur du type de récompense
  function getRewardTypeColor(type: string): string {
    const colors: Record<string, string> = {
      discount: 'bg-red-50 border-red-200 text-red-800',
      free_item: 'bg-green-50 border-green-200 text-green-800',
      free_delivery: 'bg-blue-50 border-blue-200 text-blue-800',
      vip_experience: 'bg-purple-50 border-purple-200 text-purple-800',
      charity: 'bg-pink-50 border-pink-200 text-pink-800'
    };
    return colors[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  }

  // Gérer le rachat d'une récompense
  const handleRedeem = async (rewardId: string) => {
    try {
      setRedeemingRewards(prev => new Set(prev).add(rewardId));
      await onRedeem(rewardId);
    } catch (error) {
      console.error('Erreur lors du rachat:', error);
    } finally {
      setRedeemingRewards(prev => {
        const newSet = new Set(prev);
        newSet.delete(rewardId);
        return newSet;
      });
    }
  };

  if (compact) {
    return (
      <div className={`rewards-grid-compact ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.slice(0, 3).map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              availablePoints={availablePoints}
              isRedeeming={redeemingRewards.has(reward.id)}
              onRedeem={handleRedeem}
              compact={true}
            />
          ))}
        </div>
        {filteredRewards.length > 3 && (
          <div className="text-center mt-4">
            <button className="text-orange-600 hover:text-orange-700 font-medium">
              Voir toutes les récompenses ({filteredRewards.length - 3} de plus)
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rewards-grid ${className}`}>
      {/* Filtres */}
      <div className="mb-6">
        {/* Filtre par type */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'Toutes', count: rewards.length },
            { id: 'affordable', label: 'Abordables', count: rewards.filter(r => r.pointsCost <= availablePoints).length },
            { id: 'popular', label: 'Populaires', count: Math.floor(rewards.length * 0.7) }
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
              {filterOption.count > 0 && (
                <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                  {filterOption.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtre par catégorie */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
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

      {/* Grille des récompenses */}
      {filteredRewards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎁</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune récompense disponible
          </h3>
          <p className="text-gray-600">
            {selectedCategory !== 'all' 
              ? `Aucune récompense dans la catégorie "${categories.find(c => c.id === selectedCategory)?.name}"`
              : 'Aucune récompense ne correspond à vos critères de filtre'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              availablePoints={availablePoints}
              isRedeeming={redeemingRewards.has(reward.id)}
              onRedeem={handleRedeem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Composant carte de récompense individuelle
interface RewardCardProps {
  reward: Reward;
  availablePoints: number;
  isRedeeming: boolean;
  onRedeem: (rewardId: string) => void;
  compact?: boolean;
}

function RewardCard({ 
  reward, 
  availablePoints, 
  isRedeeming, 
  onRedeem, 
  compact = false 
}: RewardCardProps) {
  const canAfford = reward.pointsCost <= availablePoints;
  const isOutOfStock = reward.stock !== null && reward.stock <= reward.usageCount;
  const userLimitReached = reward.usageCount >= reward.usageLimitPerUser;

  // Couleurs selon le statut
  const getStatusColor = () => {
    if (isOutOfStock) return 'border-red-200 bg-red-50';
    if (userLimitReached) return 'border-yellow-200 bg-yellow-50';
    if (!canAfford) return 'border-gray-200 bg-gray-50';
    return 'border-orange-200 bg-white hover:shadow-lg';
  };

  const getButtonColor = () => {
    if (isOutOfStock || userLimitReached) return 'bg-gray-400 cursor-not-allowed';
    if (!canAfford) return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    return 'bg-orange-500 hover:bg-orange-600 text-white';
  };

  const getTypeLabel = () => {
    const labels: Record<string, string> = {
      discount: 'Réduction',
      free_item: 'Produit gratuit',
      free_delivery: 'Livraison gratuite',
      vip_experience: 'Expérience VIP',
      charity: 'Don caritatif'
    };
    return labels[reward.type] || reward.type;
  };

  if (compact) {
    return (
      <div className={`border rounded-lg p-4 transition-all ${getStatusColor()}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">{reward.name}</h4>
            <p className="text-xs text-gray-600 mt-1">{reward.description}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRewardTypeColor(reward.type)}`}>
            {getTypeLabel()}
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center">
            <span className="text-orange-600 font-bold">{reward.pointsCost}</span>
            <span className="text-xs text-gray-500 ml-1">points</span>
          </div>
          
          <button
            onClick={() => !isRedeeming && canAfford && !isOutOfStock && !userLimitReached && onRedeem(reward.id)}
            disabled={isRedeeming || !canAfford || isOutOfStock || userLimitReached}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${getButtonColor()}`}
          >
            {isRedeeming ? '...' : !canAfford ? 'Points insuffisants' : isOutOfStock ? 'Épuisé' : userLimitReached ? 'Limite atteinte' : 'Utiliser'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 transition-all ${getStatusColor()}`}>
      {/* En-tête de la carte */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">{reward.name}</h3>
          <p className="text-gray-600 text-sm">{reward.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRewardTypeColor(reward.type)}`}>
          {getTypeLabel()}
        </span>
      </div>

      {/* Valeur de la récompense */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          {typeof reward.value === 'number' ? `${reward.value}%` : reward.value}
        </div>
        <div className="text-sm text-gray-500">Valeur de la récompense</div>
      </div>

      {/* Coût en points */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-orange-600">{reward.pointsCost}</span>
          <span className="text-gray-600 ml-1">points</span>
        </div>
        {availablePoints < reward.pointsCost && (
          <div className="text-sm text-red-600">
            Il vous manque {reward.pointsCost - availablePoints} points
          </div>
        )}
      </div>

      {/* Informations de stock et limites */}
      <div className="text-xs text-gray-500 mb-4">
        {reward.stock !== null && (
          <div className="mb-1">
            Stock: {reward.stock - reward.usageCount} restant
          </div>
        )}
        <div>
          Utilisé {reward.usageCount}/{reward.usageLimitPerUser} fois
        </div>
      </div>

      {/* Bouton d'action */}
      <button
        onClick={() => !isRedeeming && canAfford && !isOutOfStock && !userLimitReached && onRedeem(reward.id)}
        disabled={isRedeeming || !canAfford || isOutOfStock || userLimitReached}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${getButtonColor()}`}
      >
        {isRedeeming ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Traitement...
          </span>
        ) : !canAfford ? (
          'Points insuffisants'
        ) : isOutOfStock ? (
          'Épuisé'
        ) : userLimitReached ? (
          'Limite atteinte'
        ) : (
          `Utiliser ${reward.pointsCost} points`
        )}
      </button>
    </div>
  );
}