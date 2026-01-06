/**
 * Service de Fidélité et Programme de Récompenses
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Ce service implémente un système de fidélité complet avec :
 * - Programme de points progressif
 * - Niveaux de fidélité (Bronze, Silver, Gold, Platinum)
 * - Récompenses et avantages
 * - Gamification avec badges et achievements
 * - Notifications automatiques
 * - Analytics intégrées
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { userCache, orderCache, CacheUtils } from './cache-service';
import { analyticsService } from './analytics-service';
import { notificationsService } from './notifications-service';

// Types pour le système de fidélité
export interface LoyaltyLevel {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null; // null pour le niveau maximum
  discount: number; // Pourcentage de réduction
  benefits: LoyaltyBenefit[];
  multiplier: number; // Multiplicateur de points
  color: string;
  icon: string;
  requirements: string[];
  description: string;
}

export interface LoyaltyBenefit {
  id: string;
  type: 'discount' | 'free_delivery' | 'early_access' | 'vip_access' | 'birthday_gift' | 'priority_support';
  name: string;
  description: string;
  value: number | string; // Pourcentage ou texte libre
  isActive: boolean;
}

export interface LoyaltyUser {
  id: string;
  userId: string;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  levelId: string;
  joinDate: string;
  lastActivityDate: string;
  ordersCount: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteCategory: string;
  streakDays: number;
  levelProgress: number; // Pourcentage vers le niveau suivant
  birthday: string | null;
  preferences: LoyaltyPreferences;
  referralsCount: number;
  achievements: LoyaltyAchievement[];
  badges: LoyaltyBadge[];
}

export interface LoyaltyPreferences {
  autoRedeem: boolean;
  preferredRewards: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  pointsExpiration: {
    enabled: boolean;
    months: number;
  };
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral' | 'level_up';
  points: number;
  description: string;
  orderId?: string;
  rewardId?: string;
  createdAt: string;
  expiresAt?: string;
  metadata: Record<string, any>;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'free_item' | 'free_delivery' | 'vip_experience' | 'charity_donation';
  pointsCost: number;
  value: number | string; // Pourcentage ou valeur monétaire
  isActive: boolean;
  stock: number | null; // null = illimité
  category: string;
  validUntil?: string;
  terms: string;
  image?: string;
  usageLimitPerUser: number;
  usageCount: number;
}

export interface LoyaltyChallenge {
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

export interface LoyaltyAchievement {
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

export interface LoyaltyBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  earnedAt: string;
  displayOrder: number;
}

export interface LoyaltyEvent {
  id: string;
  name: string;
  description: string;
  type: 'seasonal' | 'anniversary' | 'flash' | 'double_points';
  startDate: string;
  endDate: string;
  multiplier: number;
  bonusRewards: LoyaltyReward[];
  isActive: boolean;
  participatingUsers: number;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number; // Actifs dans les 30 derniers jours
  averagePointsPerUser: number;
  pointsRedemptionRate: number;
  levelDistribution: Record<string, number>;
  topRewards: Array<{ rewardId: string; redemptionCount: number }>;
  revenueFromRewards: number;
  memberRetentionRate: number;
  averageLifetimeValue: number;
  referralSuccessRate: number;
}

// Configuration du programme de fidélité
export interface LoyaltyConfig {
  pointsPerDirham: number; // 1 DH = X points
  levelConfig: LoyaltyLevel[];
  expirationMonths: number;
  minimumPointsForRedemption: number;
  maximumPointsPerTransaction: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  doublePointsEvents: LoyaltyEvent[];
  isActive: boolean;
  termsAndConditions: string;
}

// Niveaux de fidélité par défaut
const DEFAULT_LEVELS: LoyaltyLevel[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    discount: 5,
    multiplier: 1,
    color: '#CD7F32',
    icon: '🥉',
    requirements: ['Créer un compte'],
    benefits: [],
    description: 'Niveau d\'entrée avec réduction de 5%'
  },
  {
    id: 'silver',
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1999,
    discount: 10,
    multiplier: 1.2,
    color: '#C0C0C0',
    icon: '🥈',
    requirements: ['500 points minimum', '5 commandes'],
    benefits: [],
    description: 'Réduction 10% + livraison gratuite'
  },
  {
    id: 'gold',
    name: 'Gold',
    minPoints: 2000,
    maxPoints: 4999,
    discount: 15,
    multiplier: 1.5,
    color: '#FFD700',
    icon: '🥇',
    requirements: ['2000 points minimum', '15 commandes'],
    benefits: [],
    description: 'Réduction 15% + livraison gratuite + early access'
  },
  {
    id: 'platinum',
    name: 'Platinum',
    minPoints: 5000,
    maxPoints: null,
    discount: 20,
    multiplier: 2,
    color: '#E5E4E2',
    icon: '💎',
    requirements: ['5000 points minimum', '50 commandes'],
    benefits: [],
    description: 'Réduction 20% + tous avantages + accès VIP'
  }
];

// Configuration par défaut
const DEFAULT_CONFIG: LoyaltyConfig = {
  pointsPerDirham: 1, // 1 DH = 1 point
  levelConfig: DEFAULT_LEVELS,
  expirationMonths: 12,
  minimumPointsForRedemption: 100,
  maximumPointsPerTransaction: 1000,
  welcomeBonus: 50,
  birthdayBonus: 200,
  referralBonus: 300,
  doublePointsEvents: [],
  isActive: true,
  termsAndConditions: 'Conditions d\'utilisation du programme de fidélité Universal Eats...'
};

/**
 * Service principal de fidélité
 */
export class LoyaltyService {
  private static instance: LoyaltyService;
  private config: LoyaltyConfig;
  private userCache = new Map<string, LoyaltyUser>();
  private transactionCache = new Map<string, LoyaltyTransaction[]>();
  private analytics: Map<string, LoyaltyAnalytics> = new Map();

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initializeCache();
    this.startPeriodicTasks();
  }

  static getInstance(): LoyaltyService {
    if (!LoyaltyService.instance) {
      LoyaltyService.instance = new LoyaltyService();
    }
    return LoyaltyService.instance;
  }

  /**
   * === GESTION DES UTILISATEURS ===
   */

  /**
   * Inscrit un utilisateur au programme de fidélité
   */
  async registerUser(userId: string, preferences?: Partial<LoyaltyPreferences>): Promise<LoyaltyUser> {
    try {
      const existingUser = await this.getUser(userId);
      if (existingUser) {
        throw new Error('Utilisateur déjà inscrit au programme de fidélité');
      }

      const loyaltyUser: LoyaltyUser = {
        id: `loyalty_${userId}`,
        userId,
        totalPoints: this.config.welcomeBonus,
        availablePoints: this.config.welcomeBonus,
        usedPoints: 0,
        levelId: 'bronze',
        joinDate: new Date().toISOString(),
        lastActivityDate: new Date().toISOString(),
        ordersCount: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        favoriteCategory: '',
        streakDays: 0,
        levelProgress: 0,
        birthday: null,
        preferences: {
          autoRedeem: false,
          preferredRewards: [],
          emailNotifications: true,
          pushNotifications: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          },
          pointsExpiration: {
            enabled: true,
            months: this.config.expirationMonths
          },
          ...preferences
        },
        referralsCount: 0,
        achievements: [],
        badges: []
      };

      // Sauvegarder en base
      const { error } = await supabase
        .from('loyalty_users')
        .insert([loyaltyUser]);

      if (error) throw error;

      // Ajouter à la cache
      this.userCache.set(userId, loyaltyUser);
      userCache.set(`loyalty_user_${userId}`, loyaltyUser, 60 * 60 * 1000); // 1 heure

      // Créer la transaction de bienvenue
      await this.addTransaction(userId, {
        type: 'bonus',
        points: this.config.welcomeBonus,
        description: 'Bonus de bienvenue',
        metadata: { source: 'registration' }
      });

      // Envoyer notification
      await this.sendWelcomeNotification(userId, loyaltyUser);

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_user_registered',
        category: 'loyalty',
        userId,
        metadata: { level: 'bronze', welcomeBonus: this.config.welcomeBonus }
      });

      performanceMonitor.info('Utilisateur inscrit au programme de fidélité', {
        userId,
        welcomeBonus: this.config.welcomeBonus
      });

      return loyaltyUser;

    } catch (error) {
      performanceMonitor.error('Erreur inscription fidélité', { userId, error });
      throw error;
    }
  }

  /**
   * Récupère les informations de fidélité d'un utilisateur
   */
  async getUser(userId: string): Promise<LoyaltyUser | null> {
    try {
      // Vérifier le cache local
      const cached = this.userCache.get(userId);
      if (cached) {
        return cached;
      }

      // Vérifier le cache système
      const cacheKey = `loyalty_user_${userId}`;
      const systemCached = userCache.get<LoyaltyUser>(cacheKey);
      if (systemCached) {
        this.userCache.set(userId, systemCached);
        return systemCached;
      }

      // Récupérer depuis la base
      const { data, error } = await supabase
        .from('loyalty_users')
        .select('*')
        .eq('userId', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Utilisateur non trouvé
        }
        throw error;
      }

      // Mettre à jour les statistiques calculées
      const updatedUser = await this.updateUserCalculations(data);

      // Mettre en cache
      this.userCache.set(userId, updatedUser);
      userCache.set(cacheKey, updatedUser, 60 * 60 * 1000);

      return updatedUser;

    } catch (error) {
      performanceMonitor.error('Erreur récupération utilisateur fidélité', { userId, error });
      throw error;
    }
  }

  /**
   * Met à jour les informations d'un utilisateur
   */
  async updateUser(userId: string, updates: Partial<LoyaltyUser>): Promise<LoyaltyUser> {
    try {
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        throw new Error('Utilisateur non trouvé dans le programme de fidélité');
      }

      const updatedUser = { ...existingUser, ...updates };

      // Mettre à jour la base
      const { error } = await supabase
        .from('loyalty_users')
        .update(updatedUser)
        .eq('userId', userId);

      if (error) throw error;

      // Mettre à jour le cache
      this.userCache.set(userId, updatedUser);
      userCache.set(`loyalty_user_${userId}`, updatedUser, 60 * 60 * 1000);

      performanceMonitor.debug('Utilisateur fidélité mis à jour', { userId, updates });

      return updatedUser;

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour utilisateur fidélité', { userId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES POINTS ===
   */

  /**
   * Ajoute des points à un utilisateur
   */
  async addPoints(userId: string, points: number, description: string, orderId?: string, metadata?: Record<string, any>): Promise<LoyaltyTransaction> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('Utilisateur non inscrit au programme de fidélité');
      }

      // Calculer les points avec multiplicateur de niveau
      const level = this.getLevelById(user.levelId);
      const finalPoints = Math.round(points * (level?.multiplier || 1));

      // Vérifier la limite maximum par transaction
      const pointsToAdd = Math.min(finalPoints, this.config.maximumPointsPerTransaction);

      // Mettre à jour l'utilisateur
      const updatedUser = await this.updateUser(userId, {
        totalPoints: user.totalPoints + pointsToAdd,
        availablePoints: user.availablePoints + pointsToAdd,
        lastActivityDate: new Date().toISOString()
      });

      // Mettre à jour le progrès du niveau
      await this.updateLevelProgress(userId);

      // Créer la transaction
      const transaction = await this.addTransaction(userId, {
        type: 'earned',
        points: pointsToAdd,
        description,
        orderId,
        metadata: {
          basePoints: points,
          multiplier: level?.multiplier || 1,
          ...metadata
        }
      });

      // Vérifier si le niveau change
      await this.checkLevelUpgrade(userId);

      // Envoyer notification de gains
      await this.sendPointsEarnedNotification(userId, pointsToAdd, user.availablePoints + pointsToAdd);

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_points_earned',
        category: 'loyalty',
        userId,
        orderId,
        metadata: { points: pointsToAdd, total: updatedUser.totalPoints }
      });

      performanceMonitor.info('Points ajoutés', { userId, points: pointsToAdd, description });

      return transaction;

    } catch (error) {
      performanceMonitor.error('Erreur ajout points', { userId, points, error });
      throw error;
    }
  }

  /**
   * Utilise des points pour une récompense
   */
  async redeemPoints(userId: string, rewardId: string, pointsCost: number): Promise<LoyaltyTransaction> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error('Utilisateur non inscrit au programme de fidélité');
      }

      // Vérifier les points disponibles
      if (user.availablePoints < pointsCost) {
        throw new Error('Points insuffisants');
      }

      // Vérifier le minimum pour le rachat
      if (pointsCost < this.config.minimumPointsForRedemption) {
        throw new Error(`Minimum ${this.config.minimumPointsForRedemption} points requis`);
      }

      // Mettre à jour l'utilisateur
      const updatedUser = await this.updateUser(userId, {
        availablePoints: user.availablePoints - pointsCost,
        usedPoints: user.usedPoints + pointsCost
      });

      // Créer la transaction
      const transaction = await this.addTransaction(userId, {
        type: 'redeemed',
        points: -pointsCost,
        description: `Utilisation de récompense: ${rewardId}`,
        rewardId,
        metadata: { redemptionType: 'reward' }
      });

      // Envoyer notification de rachat
      await this.sendPointsRedeemedNotification(userId, pointsCost, rewardId);

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_points_redeemed',
        category: 'loyalty',
        userId,
        metadata: { points: pointsCost, rewardId }
      });

      performanceMonitor.info('Points utilisés', { userId, points: pointsCost, rewardId });

      return transaction;

    } catch (error) {
      performanceMonitor.error('Erreur utilisation points', { userId, pointsCost, error });
      throw error;
    }
  }

  /**
   * === GESTION DES NIVEAUX ===
   */

  /**
   * Récupère tous les niveaux disponibles
   */
  getLevels(): LoyaltyLevel[] {
    return this.config.levelConfig;
  }

  /**
   * Récupère un niveau par son ID
   */
  getLevelById(levelId: string): LoyaltyLevel | undefined {
    return this.config.levelConfig.find(level => level.id === levelId);
  }

  /**
   * Détermine le niveau d'un utilisateur basé sur ses points
   */
  getUserLevel(points: number): LoyaltyLevel {
    for (const level of this.config.levelConfig) {
      if (points >= level.minPoints && (level.maxPoints === null || points <= level.maxPoints)) {
        return level;
      }
    }
    return this.config.levelConfig[0]; // Bronze par défaut
  }

  /**
   * Met à jour le progrès du niveau d'un utilisateur
   */
  async updateLevelProgress(userId: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) return;

      const currentLevel = this.getLevelById(user.levelId);
      if (!currentLevel || currentLevel.maxPoints === null) {
        // Niveau maximum atteint
        await this.updateUser(userId, { levelProgress: 100 });
        return;
      }

      const progress = ((user.totalPoints - currentLevel.minPoints) / (currentLevel.maxPoints - currentLevel.minPoints)) * 100;
      const clampedProgress = Math.min(Math.max(progress, 0), 100);

      await this.updateUser(userId, { levelProgress: clampedProgress });

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour progrès niveau', { userId, error });
    }
  }

  /**
   * Vérifie et applique une montée de niveau
   */
  async checkLevelUpgrade(userId: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) return;

      const newLevel = this.getUserLevel(user.totalPoints);
      if (newLevel.id !== user.levelId) {
        const oldLevel = this.getLevelById(user.levelId);

        // Mettre à jour le niveau
        await this.updateUser(userId, {
          levelId: newLevel.id,
          levelProgress: 0
        });

        // Ajouter bonus de montée de niveau
        const levelUpBonus = Math.round(newLevel.minPoints * 0.1); // 10% du minimum du nouveau niveau
        await this.addPoints(userId, levelUpBonus, `Bonus montée de niveau: ${oldLevel?.name} → ${newLevel.name}`, undefined, {
          levelUpgrade: true,
          oldLevel: oldLevel?.id,
          newLevel: newLevel.id
        });

        // Accorder des badges si disponibles
        await this.grantLevelBadges(userId, newLevel.id);

        // Envoyer notification de montée de niveau
        await this.sendLevelUpNotification(userId, newLevel, levelUpBonus);

        // Track analytics
        await analyticsService.trackEvent({
          type: 'loyalty_level_up',
          category: 'loyalty',
          userId,
          metadata: { oldLevel: oldLevel?.id, newLevel: newLevel.id, bonus: levelUpBonus }
        });

        performanceMonitor.info('Utilisateur monté de niveau', {
          userId,
          oldLevel: oldLevel?.name,
          newLevel: newLevel.name,
          bonus: levelUpBonus
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur vérification montée niveau', { userId, error });
    }
  }

  /**
   * === GESTION DES TRANSACTIONS ===
   */

  /**
   * Ajoute une transaction
   */
  async addTransaction(userId: string, transactionData: Omit<LoyaltyTransaction, 'id' | 'userId' | 'createdAt'>): Promise<LoyaltyTransaction> {
    try {
      const transaction: LoyaltyTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        createdAt: new Date().toISOString(),
        ...transactionData
      };

      // Sauvegarder en base
      const { error } = await supabase
        .from('loyalty_transactions')
        .insert([transaction]);

      if (error) throw error;

      // Mettre en cache local
      const userTransactions = this.transactionCache.get(userId) || [];
      userTransactions.unshift(transaction);
      this.transactionCache.set(userId, userTransactions.slice(0, 100)); // Garder les 100 dernières

      performanceMonitor.debug('Transaction fidélité ajoutée', { userId, type: transaction.type, points: transaction.points });

      return transaction;

    } catch (error) {
      performanceMonitor.error('Erreur ajout transaction', { userId, error });
      throw error;
    }
  }

  /**
   * Récupère l'historique des transactions d'un utilisateur
   */
  async getUserTransactions(userId: string, limit = 50): Promise<LoyaltyTransaction[]> {
    try {
      // Vérifier le cache local
      const cached = this.transactionCache.get(userId);
      if (cached && cached.length >= limit) {
        return cached.slice(0, limit);
      }

      // Récupérer depuis la base
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Mettre en cache
      this.transactionCache.set(userId, data || []);

      return data || [];

    } catch (error) {
      performanceMonitor.error('Erreur récupération transactions', { userId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES RÉCOMPENSES ===
   */

  /**
   * Récupère toutes les récompenses disponibles
   */
  async getRewards(): Promise<LoyaltyReward[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('isActive', true)
        .order('pointsCost', { ascending: true });

      if (error) throw error;

      return data || [];

    } catch (error) {
      performanceMonitor.error('Erreur récupération récompenses', { error });
      throw error;
    }
  }

  /**
   * Récupère les récompenses recommandées pour un utilisateur
   */
  async getRecommendedRewards(userId: string): Promise<LoyaltyReward[]> {
    try {
      const user = await this.getUser(userId);
      if (!user) return [];

      const allRewards = await this.getRewards();

      // Filtrer selon les points disponibles et les préférences
      return allRewards
        .filter(reward => 
          reward.pointsCost <= user.availablePoints &&
          (reward.stock === null || reward.stock > reward.usageCount)
        )
        .sort((a, b) => {
          // Priorité aux récompenses préférées
          const aPreferred = user.preferences.preferredRewards.includes(a.id) ? 1 : 0;
          const bPreferred = user.preferences.preferredRewards.includes(b.id) ? 1 : 0;
          
          if (aPreferred !== bPreferred) {
            return bPreferred - aPreferred;
          }

          // Puis par rapport valeur/points
          const aRatio = this.getRewardValueRatio(a);
          const bRatio = this.getRewardValueRatio(b);
          
          return bRatio - aRatio;
        })
        .slice(0, 10);

    } catch (error) {
      performanceMonitor.error('Erreur recommandations récompenses', { userId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES BADGES ET ACHIEVEMENTS ===
   */

  /**
   * Accorde des badges pour une montée de niveau
   */
  async grantLevelBadges(userId: string, levelId: string): Promise<void> {
    try {
      const level = this.getLevelById(levelId);
      if (!level) return;

      const badgeId = `badge_${levelId}`;
      
      const user = await this.getUser(userId);
      if (!user) return;

      // Vérifier si le badge existe déjà
      const existingBadge = user.badges.find(b => b.id === badgeId);
      if (existingBadge) return;

      const newBadge: LoyaltyBadge = {
        id: badgeId,
        name: `Badge ${level.name}`,
        description: `Atteint le niveau ${level.name} dans le programme de fidélité`,
        icon: level.icon,
        color: level.color,
        rarity: levelId as any,
        earnedAt: new Date().toISOString(),
        displayOrder: this.config.levelConfig.findIndex(l => l.id === levelId)
      };

      const updatedBadges = [...user.badges, newBadge];
      await this.updateUser(userId, { badges: updatedBadges });

      // Track analytics
      await analyticsService.trackEvent({
        type: 'loyalty_badge_earned',
        category: 'loyalty',
        userId,
        metadata: { badgeId, levelId }
      });

      performanceMonitor.info('Badge accordé', { userId, badgeId, levelId });

    } catch (error) {
      performanceMonitor.error('Erreur attribution badge', { userId, levelId, error });
    }
  }

  /**
   * === NOTIFICATIONS ===
   */

  /**
   * Envoie une notification de bienvenue
   */
  private async sendWelcomeNotification(userId: string, user: LoyaltyUser): Promise<void> {
    try {
      const level = this.getLevelById(user.levelId);
      
      await notificationsService.sendNotificationFromTemplate(
        'loyalty-welcome',
        {
          welcomeBonus: this.config.welcomeBonus.toString(),
          levelName: level?.name || 'Bronze',
          levelBenefits: level?.description || ''
        },
        userId
      );

    } catch (error) {
      performanceMonitor.error('Erreur notification bienvenue', { userId, error });
    }
  }

  /**
   * Envoie une notification de gains de points
   */
  private async sendPointsEarnedNotification(userId: string, points: number, totalPoints: number): Promise<void> {
    try {
      await notificationsService.sendNotificationFromTemplate(
        'loyalty-points',
        {
          points: points.toString(),
          totalPoints: totalPoints.toString(),
          rewardThreshold: this.getNextRewardThreshold(totalPoints).toString()
        },
        userId
      );

    } catch (error) {
      performanceMonitor.error('Erreur notification points gagnés', { userId, error });
    }
  }

  /**
   * Envoie une notification de utilisation de points
   */
  private async sendPointsRedeemedNotification(userId: string, points: number, rewardId: string): Promise<void> {
    try {
      await notificationsService.sendNotificationFromTemplate(
        'loyalty-redeemed',
        {
          points: points.toString(),
          rewardId
        },
        userId
      );

    } catch (error) {
      performanceMonitor.error('Erreur notification points utilisés', { userId, error });
    }
  }

  /**
   * Envoie une notification de montée de niveau
   */
  private async sendLevelUpNotification(userId: string, newLevel: LoyaltyLevel, bonus: number): Promise<void> {
    try {
      await notificationsService.sendNotificationFromTemplate(
        'loyalty-level-up',
        {
          levelName: newLevel.name,
          levelIcon: newLevel.icon,
          discount: newLevel.discount.toString(),
          bonus: bonus.toString()
        },
        userId
      );

    } catch (error) {
      performanceMonitor.error('Erreur notification montée niveau', { userId, error });
    }
  }

  /**
   * === ANALYTICS ===
   */

  /**
   * Récupère les analytics du programme de fidélité
   */
  async getAnalytics(): Promise<LoyaltyAnalytics> {
    try {
      const cacheKey = 'loyalty_analytics';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Calculer les métriques (simplifié)
      const analytics: LoyaltyAnalytics = {
        totalMembers: await this.getTotalMembers(),
        activeMembers: await this.getActiveMembers(),
        averagePointsPerUser: await this.getAveragePointsPerUser(),
        pointsRedemptionRate: await this.getPointsRedemptionRate(),
        levelDistribution: await this.getLevelDistribution(),
        topRewards: await this.getTopRewards(),
        revenueFromRewards: 0, // À calculer
        memberRetentionRate: await this.getMemberRetentionRate(),
        averageLifetimeValue: await this.getAverageLifetimeValue(),
        referralSuccessRate: await this.getReferralSuccessRate()
      };

      this.setCache(cacheKey, analytics, 15 * 60 * 1000); // 15 minutes
      return analytics;

    } catch (error) {
      performanceMonitor.error('Erreur analytics fidélité', { error });
      throw error;
    }
  }

  /**
   * === MÉTHODES UTILITAIRES ===
   */

  /**
   * Calcule le ratio valeur/points d'une récompense
   */
  private getRewardValueRatio(reward: LoyaltyReward): number {
    if (typeof reward.value === 'number') {
      return reward.value / reward.pointsCost;
    }
    return 1; // Valeur par défaut pour les récompenses non-numériques
  }

  /**
   * Calcule le seuil pour la prochaine récompense
   */
  private getNextRewardThreshold(currentPoints: number): number {
    const milestones = [100, 250, 500, 1000, 2000, 5000];
    return milestones.find(milestone => milestone > currentPoints) || currentPoints;
  }

  /**
   * Initialise le cache avec les données existantes
   */
  private initializeCache(): void {
    try {
      // Charger les utilisateurs actifs depuis la base
      this.loadActiveUsersCache();

      performanceMonitor.info('Cache fidélité initialisé');

    } catch (error) {
      performanceMonitor.error('Erreur initialisation cache fidélité', { error });
    }
  }

  /**
   * Charge les utilisateurs actifs en cache
   */
  private async loadActiveUsersCache(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('loyalty_users')
        .select('*')
        .order('lastActivityDate', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (data) {
        data.forEach(user => {
          this.userCache.set(user.userId, user);
          userCache.set(`loyalty_user_${user.userId}`, user, 60 * 60 * 1000);
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur chargement cache utilisateurs', { error });
    }
  }

  /**
   * Démarre les tâches périodiques
   */
  private startPeriodicTasks(): void {
    // Nettoyage des points expirés (tous les jours à minuit)
    setInterval(() => {
      this.cleanExpiredPoints().catch(error => {
        performanceMonitor.error('Erreur nettoyage points expirés', { error });
      });
    }, 24 * 60 * 60 * 1000);

    // Mise à jour des statistiques (toutes les heures)
    setInterval(() => {
      this.updateAnalytics().catch(error => {
        performanceMonitor.error('Erreur mise à jour analytics', { error });
      });
    }, 60 * 60 * 1000);
  }

  /**
   * Nettoie les points expirés
   */
  private async cleanExpiredPoints(): Promise<void> {
    try {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() - this.config.expirationMonths);

      const { data: expiredTransactions, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('type', 'earned')
        .lt('createdAt', expirationDate.toISOString())
        .is('expiresAt', null);

      if (error) throw error;

      if (expiredTransactions) {
        for (const transaction of expiredTransactions) {
          // Marquer comme expiré
          await this.addTransaction(transaction.userId, {
            type: 'expired',
            points: -transaction.points,
            description: 'Points expirés',
            metadata: { originalTransactionId: transaction.id }
          });

          // Mettre à jour l'utilisateur
          const user = await this.getUser(transaction.userId);
          if (user) {
            await this.updateUser(transaction.userId, {
              availablePoints: Math.max(0, user.availablePoints - transaction.points)
            });
          }
        }
      }

      performanceMonitor.info('Nettoyage points expirés terminé', { count: expiredTransactions?.length || 0 });

    } catch (error) {
      performanceMonitor.error('Erreur nettoyage points expirés', { error });
    }
  }

  /**
   * Met à jour les analytics
   */
  private async updateAnalytics(): Promise<void> {
    try {
      // Invalider le cache analytics
      this.analytics.clear();

      performanceMonitor.debug('Analytics fidélité mises à jour');

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour analytics', { error });
    }
  }

  /**
   * Met à jour les calculs utilisateur
   */
  private async updateUserCalculations(user: LoyaltyUser): Promise<LoyaltyUser> {
    try {
      // Calculer la valeur moyenne des commandes
      const averageOrderValue = user.ordersCount > 0 ? user.totalSpent / user.ordersCount : 0;

      // Calculer la série de jours consécutifs (simplifié)
      const streakDays = await this.calculateStreakDays(user.userId);

      return {
        ...user,
        averageOrderValue,
        streakDays
      };

    } catch (error) {
      performanceMonitor.error('Erreur calcul mises à jour utilisateur', { userId: user.userId, error });
      return user;
    }
  }

  /**
   * Calcule la série de jours consécutifs
   */
  private async calculateStreakDays(userId: string): Promise<number> {
    try {
      // Simplifié - retourner 0 pour l'instant
      return 0;

    } catch (error) {
      return 0;
    }
  }

  // Méthodes utilitaires pour les analytics (simplifiées)
  private async getTotalMembers(): Promise<number> {
    const { count } = await supabase
      .from('loyalty_users')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  }

  private async getActiveMembers(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await supabase
      .from('loyalty_users')
      .select('*', { count: 'exact', head: true })
      .gte('lastActivityDate', thirtyDaysAgo.toISOString());

    return count || 0;
  }

  private async getAveragePointsPerUser(): Promise<number> {
    const { data } = await supabase
      .from('loyalty_users')
      .select('totalPoints');

    if (!data || data.length === 0) return 0;

    const totalPoints = data.reduce((sum, user) => sum + user.totalPoints, 0);
    return Math.round(totalPoints / data.length);
  }

  private async getPointsRedemptionRate(): Promise<number> {
    // Simplifié - retourner 75%
    return 0.75;
  }

  private async getLevelDistribution(): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('loyalty_users')
      .select('levelId');

    if (!data) return {};

    const distribution: Record<string, number> = {};
    data.forEach(user => {
      distribution[user.levelId] = (distribution[user.levelId] || 0) + 1;
    });

    return distribution;
  }

  private async getTopRewards(): Promise<Array<{ rewardId: string; redemptionCount: number }>> {
    // Simplifié
    return [
      { rewardId: 'reward_1', redemptionCount: 150 },
      { rewardId: 'reward_2', redemptionCount: 120 }
    ];
  }

  private async getMemberRetentionRate(): Promise<number> {
    // Simplifié - retourner 68%
    return 0.68;
  }

  private async getAverageLifetimeValue(): Promise<number> {
    // Simplifié - retourner 150€
    return 150;
  }

  private async getReferralSuccessRate(): Promise<number> {
    // Simplifié - retourner 25%
    return 0.25;
  }

  // Méthodes de cache
  private getFromCache(key: string): any {
    return userCache.get(`loyalty_${key}`);
  }

  private setCache(key: string, data: any, ttl?: number): void {
    userCache.set(`loyalty_${key}`, data, ttl);
  }

  /**
   * === API PUBLIQUES ===
   */

  /**
   * Traite une commande pour ajouter les points de fidélité
   */
  async processOrderForPoints(orderId: string, userId: string, orderTotal: number, category?: string): Promise<void> {
    try {
      const points = Math.round(orderTotal * this.config.pointsPerDirham);
      
      await this.addPoints(
        userId,
        points,
        `Points pour commande #${orderId}`,
        orderId,
        { category, orderTotal }
      );

      // Mettre à jour les statistiques de l'utilisateur
      const user = await this.getUser(userId);
      if (user) {
        await this.updateUser(userId, {
          ordersCount: user.ordersCount + 1,
          totalSpent: user.totalSpent + orderTotal,
          favoriteCategory: category || user.favoriteCategory
        });
      }

      performanceMonitor.info('Points fidélité traités pour commande', {
        orderId,
        userId,
        orderTotal,
        points
      });

    } catch (error) {
      performanceMonitor.error('Erreur traitement points commande', { orderId, userId, error });
      throw error;
    }
  }

  /**
   * Traite un parrainage réussi
   */
  async processReferral(referrerId: string, referredId: string): Promise<void> {
    try {
      // Bonus pour le parrain
      await this.addPoints(
        referrerId,
        this.config.referralBonus,
        `Bonus parrainage pour ${referredId}`,
        undefined,
        { referralType: 'referrer', referredUserId: referredId }
      );

      // Bonus pour le filleul (si première commande)
      const referredUser = await this.getUser(referredId);
      if (referredUser && referredUser.ordersCount === 1) {
        await this.addPoints(
          referredId,
          Math.round(this.config.referralBonus * 0.5),
          `Bonus parrainage en tant que filleul`,
          undefined,
          { referralType: 'referred', referrerId }
        );
      }

      // Mettre à jour les compteurs de parrainage
      const referrer = await this.getUser(referrerId);
      if (referrer) {
        await this.updateUser(referrerId, {
          referralsCount: referrer.referralsCount + 1
        });
      }

      performanceMonitor.info('Parrainage traité', { referrerId, referredId });

    } catch (error) {
      performanceMonitor.error('Erreur traitement parrainage', { referrerId, referredId, error });
      throw error;
    }
  }

  /**
   * Traite un anniversaire
   */
  async processBirthday(userId: string): Promise<void> {
    try {
      await this.addPoints(
        userId,
        this.config.birthdayBonus,
        'Bonus d\'anniversaire',
        undefined,
        { birthday: true }
      );

      performanceMonitor.info('Bonus anniversaire accordé', { userId });

    } catch (error) {
      performanceMonitor.error('Erreur traitement anniversaire', { userId, error });
    }
  }

  /**
   * Récupère la configuration du programme
   */
  getConfig(): LoyaltyConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<LoyaltyConfig>): void {
    this.config = { ...this.config, ...updates };
    performanceMonitor.info('Configuration fidélité mise à jour', { updates });
  }
}

// Instance singleton
export const loyaltyService = LoyaltyService.getInstance();

// Export pour utilisation dans les hooks
export default loyaltyService;