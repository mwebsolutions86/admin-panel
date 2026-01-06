/**
 * Hooks React pour le Système de Fidélité
 * Universal Eats - Interface Utilisateur Avancée
 * 
 * Ce module fournit les hooks React pour intégrer le système de fidélité :
 * - Hook principal pour les données de fidélité
 * - Hook pour les récompenses et défis
 * - Hook pour les achievements et badges
 * - Hook pour les événements et notifications
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { loyaltyService, LoyaltyUser, LoyaltyTransaction, LoyaltyLevel } from '../lib/loyalty-service';
import { loyaltyRewardsManager } from '../lib/loyalty-rewards-manager';
import { analyticsService } from '../lib/analytics-service';
import { performanceMonitor } from '../lib/performance-monitor';

// Types pour les hooks
export interface UseLoyaltyData {
  user: LoyaltyUser | null;
  levels: LoyaltyLevel[];
  currentLevel: LoyaltyLevel | null;
  nextLevel: LoyaltyLevel | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseRewardsData {
  rewards: any[];
  recommendedRewards: any[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  redeemReward: (rewardId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseChallengesData {
  activeChallenges: any[];
  availableChallenges: any[];
  userProgress: any[];
  isLoading: boolean;
  error: string | null;
  joinChallenge: (challengeId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseAchievementsData {
  achievements: any[];
  unlockedAchievements: any[];
  badges: any[];
  gamificationScore: {
    totalScore: number;
    levelScore: number;
    achievementScore: number;
    challengeScore: number;
    streakScore: number;
    rank: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseTransactionsData {
  transactions: LoyaltyTransaction[];
  totalTransactions: number;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook principal pour les données de fidélité d'un utilisateur
 */
export function useLoyalty(userId: string | null): UseLoyaltyData {
  const [user, setUser] = useState<LoyaltyUser | null>(null);
  const [levels, setLevels] = useState<LoyaltyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setLevels([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [userData, levelsData] = await Promise.all([
        loyaltyService.getUser(userId),
        Promise.resolve(loyaltyService.getLevels())
      ]);

      setUser(userData);
      setLevels(levelsData);

      performanceMonitor.debug('Données fidélité chargées', { userId, hasUser: !!userData });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement données fidélité', { userId, error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculer les niveaux actuel et suivant
  const currentLevel = useMemo(() => {
    if (!user || !levels.length) return null;
    return levels.find(level => level.id === user.levelId) || null;
  }, [user, levels]);

  const nextLevel = useMemo(() => {
    if (!user || !levels.length || !currentLevel) return null;
    const currentIndex = levels.findIndex(level => level.id === currentLevel.id);
    return currentIndex >= 0 && currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }, [user, levels, currentLevel]);

  return {
    user,
    levels,
    currentLevel,
    nextLevel,
    isLoading,
    error,
    refresh: fetchData
  };
}

/**
 * Hook pour les récompenses et recommandations
 */
export function useRewards(userId: string | null): UseRewardsData {
  const [rewards, setRewards] = useState<any[]>([]);
  const [recommendedRewards, setRecommendedRewards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allRewards, recommended, categoriesData] = await Promise.all([
        Promise.resolve(loyaltyRewardsManager.getRewards()),
        userId ? loyaltyRewardsManager.getAvailableChallenges(userId).then(() => loyaltyService.getRecommendedRewards(userId)) : Promise.resolve([]),
        Promise.resolve(loyaltyRewardsManager.getCategories())
      ]);

      setRewards(allRewards);
      setRecommendedRewards(recommended);
      setCategories(categoriesData);

      performanceMonitor.debug('Données récompenses chargées', { 
        rewardsCount: allRewards.length, 
        recommendedCount: recommended.length,
        categoriesCount: categoriesData.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement récompenses', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!userId) return;

    try {
      const reward = loyaltyRewardsManager.getReward(rewardId);
      if (!reward) {
        throw new Error('Récompense non trouvée');
      }

      await loyaltyService.redeemPoints(userId, rewardId, reward.pointsCost);

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_reward_redeemed',
        category: 'loyalty',
        userId,
        metadata: { rewardId, pointsCost: reward.pointsCost }
      });

      // Rafraîchir les données
      await fetchData();

      performanceMonitor.info('Récompense utilisée', { userId, rewardId, points: reward.pointsCost });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur utilisation récompense';
      setError(errorMessage);
      performanceMonitor.error('Erreur utilisation récompense', { userId, rewardId, error: err });
      throw err;
    }
  }, [userId, fetchData]);

  return {
    rewards,
    recommendedRewards,
    categories,
    isLoading,
    error,
    redeemReward,
    refresh: fetchData
  };
}

/**
 * Hook pour les défis et missions
 */
export function useChallenges(userId: string | null): UseChallengesData {
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setActiveChallenges([]);
      setAvailableChallenges([]);
      setUserProgress([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [active, available] = await Promise.all([
        Promise.resolve(loyaltyRewardsManager.getActiveChallenges()),
        loyaltyRewardsManager.getAvailableChallenges(userId)
      ]);

      setActiveChallenges(active);
      setAvailableChallenges(available);
      
      // Le progrès utilisateur sera géré par le gestionnaire
      setUserProgress([]);

      performanceMonitor.debug('Données défis chargées', { 
        activeCount: active.length, 
        availableCount: available.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement défis', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    if (!userId) return;

    try {
      await loyaltyRewardsManager.joinChallenge(userId, challengeId);

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_challenge_joined',
        category: 'loyalty',
        userId,
        metadata: { challengeId }
      });

      // Rafraîchir les données
      await fetchData();

      performanceMonitor.info('Utilisateur inscrit au défi', { userId, challengeId });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inscription défi';
      setError(errorMessage);
      performanceMonitor.error('Erreur inscription défi', { userId, challengeId, error: err });
      throw err;
    }
  }, [userId, fetchData]);

  return {
    activeChallenges,
    availableChallenges,
    userProgress,
    isLoading,
    error,
    joinChallenge,
    refresh: fetchData
  };
}

/**
 * Hook pour les achievements et badges
 */
export function useAchievements(userId: string | null): UseAchievementsData {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [gamificationScore, setGamificationScore] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setAchievements([]);
      setUnlockedAchievements([]);
      setBadges([]);
      setGamificationScore(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [allAchievements, score] = await Promise.all([
        Promise.resolve(loyaltyRewardsManager.getAchievements()),
        loyaltyRewardsManager.calculateGamificationScore(userId)
      ]);

      setAchievements(allAchievements);
      setGamificationScore(score);

      // Les achievements débloqués et badges viendront avec les données utilisateur
      const user = await loyaltyService.getUser(userId);
      if (user) {
        setUnlockedAchievements(allAchievements.filter(a => a.unlockedAt));
        setBadges(user.badges || []);
      }

      performanceMonitor.debug('Données achievements chargées', { 
        achievementsCount: allAchievements.length,
        score: score.totalScore
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement achievements', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    achievements,
    unlockedAchievements,
    badges,
    gamificationScore,
    isLoading,
    error,
    refresh: fetchData
  };
}

/**
 * Hook pour l'historique des transactions
 */
export function useTransactions(userId: string | null, limit = 20): UseTransactionsData {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (currentLimit = limit) => {
    if (!userId) {
      setTransactions([]);
      setTotalTransactions(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userTransactions = await loyaltyService.getUserTransactions(userId, currentLimit);
      setTransactions(userTransactions);
      setTotalTransactions(userTransactions.length); // Simplifié

      performanceMonitor.debug('Transactions chargées', { 
        userId, 
        count: userTransactions.length,
        limit: currentLimit
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      performanceMonitor.error('Erreur chargement transactions', { userId, error: err });
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  const loadMore = useCallback(async () => {
    const newLimit = transactions.length + limit;
    await fetchData(newLimit);
  }, [transactions.length, limit, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    transactions,
    totalTransactions,
    isLoading,
    error,
    loadMore,
    refresh: fetchData
  };
}

/**
 * Hook combinant toutes les données de fidélité
 */
export function useLoyaltyComplete(userId: string | null) {
  const loyaltyData = useLoyalty(userId);
  const rewardsData = useRewards(userId);
  const challengesData = useChallenges(userId);
  const achievementsData = useAchievements(userId);
  const transactionsData = useTransactions(userId);

  // État global de chargement
  const isLoading = loyaltyData.isLoading || rewardsData.isLoading || 
                   challengesData.isLoading || achievementsData.isLoading || 
                   transactionsData.isLoading;

  // Erreurs combinées
  const errors = [
    loyaltyData.error,
    rewardsData.error,
    challengesData.error,
    achievementsData.error,
    transactionsData.error
  ].filter(Boolean);

  const error = errors.length > 0 ? errors.join(', ') : null;

  // Fonction de rafraîchissement globale
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loyaltyData.refresh(),
      rewardsData.refresh(),
      challengesData.refresh(),
      achievementsData.refresh(),
      transactionsData.refresh()
    ]);
  }, [loyaltyData.refresh, rewardsData.refresh, challengesData.refresh, 
      achievementsData.refresh, transactionsData.refresh]);

  // Données combinées
  const combinedData = useMemo(() => ({
    user: loyaltyData.user,
    currentLevel: loyaltyData.currentLevel,
    nextLevel: loyaltyData.nextLevel,
    levels: loyaltyData.levels,
    rewards: rewardsData.rewards,
    recommendedRewards: rewardsData.recommendedRewards,
    categories: rewardsData.categories,
    activeChallenges: challengesData.activeChallenges,
    availableChallenges: challengesData.availableChallenges,
    achievements: achievementsData.achievements,
    unlockedAchievements: achievementsData.unlockedAchievements,
    badges: achievementsData.badges,
    gamificationScore: achievementsData.gamificationScore,
    transactions: transactionsData.transactions,
    redeemReward: rewardsData.redeemReward,
    joinChallenge: challengesData.joinChallenge,
    loadMoreTransactions: transactionsData.loadMore
  }), [
    loyaltyData.user, loyaltyData.currentLevel, loyaltyData.nextLevel, loyaltyData.levels,
    rewardsData.rewards, rewardsData.recommendedRewards, rewardsData.categories,
    challengesData.activeChallenges, challengesData.availableChallenges,
    achievementsData.achievements, achievementsData.unlockedAchievements, 
    achievementsData.badges, achievementsData.gamificationScore,
    transactionsData.transactions,
    rewardsData.redeemReward, challengesData.joinChallenge, transactionsData.loadMore
  ]);

  return {
    ...combinedData,
    isLoading,
    error,
    refresh: refreshAll
  };
}

/**
 * Hook pour les actions rapides de fidélité
 */
export function useLoyaltyActions(userId: string | null) {
  const [isProcessing, setIsProcessing] = useState(false);

  const registerToProgram = useCallback(async (preferences?: any) => {
    if (!userId) throw new Error('Utilisateur non connecté');

    setIsProcessing(true);
    try {
      const user = await loyaltyService.registerUser(userId, preferences);
      
      await analyticsService.trackEvent({
        type: 'loyalty_program_joined',
        category: 'loyalty',
        userId,
        metadata: { 
          joinDate: user.joinDate,
          welcomeBonus: 50 // Config par défaut
        }
      });

      return user;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const processOrderPoints = useCallback(async (orderId: string, orderTotal: number, category?: string) => {
    if (!userId) throw new Error('Utilisateur non connecté');

    setIsProcessing(true);
    try {
      await loyaltyService.processOrderForPoints(orderId, userId, orderTotal, category);
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const processReferral = useCallback(async (referredUserId: string) => {
    if (!userId) throw new Error('Utilisateur non connecté');

    setIsProcessing(true);
    try {
      await loyaltyService.processReferral(userId, referredUserId);
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const processBirthday = useCallback(async () => {
    if (!userId) throw new Error('Utilisateur non connecté');

    setIsProcessing(true);
    try {
      await loyaltyService.processBirthday(userId);
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  return {
    isProcessing,
    registerToProgram,
    processOrderPoints,
    processReferral,
    processBirthday
  };
}

/**
 * Hook pour les paramètres de gamification
 */
export function useGamificationSettings() {
  const [settings, setSettings] = useState(() => 
    loyaltyRewardsManager.getGamificationSettings()
  );

  const updateSettings = useCallback((newSettings: Partial<any>) => {
    loyaltyRewardsManager.updateGamificationSettings(newSettings);
    setSettings(loyaltyRewardsManager.getGamificationSettings());
  }, []);

  return {
    settings,
    updateSettings
  };
}

// Export des hooks
export {
  useLoyalty,
  useRewards,
  useChallenges,
  useAchievements,
  useTransactions,
  useLoyaltyComplete,
  useLoyaltyActions,
  useGamificationSettings
};