/**
 * Composant de Progression de Niveau
 * Universal Eats - Système de Fidélité
 * 
 * Affiche la progression vers le niveau suivant avec :
 * - Barre de progression visuelle
 * - Points actuels vs objectifs
 * - Animations et effets visuels
 */

import React from 'react';

interface LevelProgressProps {
  current: number; // Points actuels
  target: number; // Points nécessaires pour le niveau suivant
  currentLevelMin: number; // Points minimum du niveau actuel
  className?: string;
  showAnimation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LevelProgress({ 
  current, 
  target, 
  currentLevelMin,
  className = '',
  showAnimation = true,
  size = 'md'
}: LevelProgressProps) {
  // Calculer le pourcentage de progression
  const progressRange = target - currentLevelMin;
  const currentProgress = current - currentLevelMin;
  const progressPercentage = Math.min((currentProgress / progressRange) * 100, 100);
  
  // Calculer les points restants
  const pointsRemaining = Math.max(0, target - current);
  
  // Classes CSS selon la taille
  const sizeClasses = {
    sm: {
      container: 'h-2',
      text: 'text-xs',
      icon: 'text-sm'
    },
    md: {
      container: 'h-3',
      text: 'text-sm',
      icon: 'text-base'
    },
    lg: {
      container: 'h-4',
      text: 'text-base',
      icon: 'text-lg'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`level-progress ${className}`}>
      {/* Barre de progression */}
      <div className={`relative bg-gray-200 rounded-full ${classes.container} overflow-hidden`}>
        {/* Fond de progression (ce qui a été accompli) */}
        <div 
          className={`absolute top-0 left-0 ${classes.container} rounded-full transition-all duration-500 ease-out ${
            showAnimation ? 'animate-pulse' : ''
          }`}
          style={{ 
            width: `${progressPercentage}%`,
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
          }}
        />
        
        {/* Effet de brillance animé */}
        {showAnimation && (
          <div 
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 2s infinite'
            }}
          />
        )}
      </div>

      {/* Informations de progression */}
      <div className={`flex justify-between items-center mt-2 ${classes.text}`}>
        <div className="text-gray-600">
          <span className="font-medium">{current.toLocaleString()}</span>
          <span className="mx-1">/</span>
          <span className="text-gray-500">{target.toLocaleString()}</span>
        </div>
        
        {pointsRemaining > 0 ? (
          <div className="text-orange-600 font-medium">
            {pointsRemaining.toLocaleString()} points restants
          </div>
        ) : (
          <div className="text-green-600 font-medium flex items-center">
            <span className={`mr-1 ${classes.icon}`}>🎉</span>
            Niveau atteint !
          </div>
        )}
      </div>

      {/* Milestones intermédiaires */}
      {progressRange > 100 && (
        <div className="flex justify-between mt-1">
          {Array.from({ length: 4 }, (_, i) => {
            const milestone = currentLevelMin + (progressRange * (i + 1) / 5);
            const isReached = current >= milestone;
            const isNext = milestone === target;
            
            return (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border-2 ${
                  isReached 
                    ? 'bg-orange-500 border-orange-500' 
                    : 'bg-white border-gray-300'
                } ${isNext ? 'ring-2 ring-orange-300 ring-offset-1' : ''}`}
                title={`${milestone.toLocaleString()} points`}
              />
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}