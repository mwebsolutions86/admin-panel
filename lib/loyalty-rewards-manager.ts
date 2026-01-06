/**
 * Gestionnaire des Niveaux et Récompenses
 * Universal Eats - Système de Fidélité Avancé
 * 
 * Ce module gère :
 * - Configuration et gestion des niveaux de fidélité
 * - Système de récompenses dynamique
 * - Défis et missions spéciales
 * - Événements saisonniers
 * - Gamification avancée avec achievements
 */

import { loyaltyService, LoyaltyLevel, LoyaltyReward, LoyaltyChallenge, LoyaltyEvent, LoyaltyAchievement } from './loyalty-service';
import { performanceMonitor } from './performance-monitor';
import { userCache, CacheUtils } from './cache-service';
import { analyticsService } from './analytics-service';

// Types étendus pour la gestion avancée
export interface RewardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  rewards: LoyaltyReward[];
}

export interface ChallengeProgress {
  challengeId: string;
  userId: string;
  currentProgress: number;
  targetProgress: number;
  startDate: string;
  lastUpdateDate: string;
  isCompleted: boolean;
  completedAt?: string;
  rewardClaimed: boolean;
}

export interface EventParticipation {
  eventId: string;
  userId: string;
  joinDate: string;
  multiplier: number;
  pointsEarned: number;
  rewardsClaimed: string[];
  isActive: boolean;
}

export interface SeasonalBonus {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  startDate: string;
  endDate: string;
  applicableCategories: string[];
  minimumOrderValue: number;
  isActive: boolean;
}

export interface GamificationSettings {
  showProgress: boolean;
  showLeaderboard: boolean;
  showAchievements: boolean;
  showBadges: boolean;
  shareOnSocial: boolean;
  celebrateMilestones: boolean;
  soundEffects: boolean;
  animationLevel: 'none' | 'subtle' | 'full';
}

// Configuration des récompenses par défaut
const DEFAULT_REWARDS: LoyaltyReward[] = [
  {
    id: 'discount_5',
    name: 'Réduction 5%',
    description: 'Réduction de 5% sur votre prochaine commande',
    type: 'discount',
    pointsCost: 100,
    value: 5,
    isActive: true,
    stock: null,
    category: 'discounts',
    terms: 'Valable sur toutes les commandes. Non cumulable avec d\'autres offres.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'discount_10',
    name: 'Réduction 10%',
    description: 'Réduction de 10% sur votre prochaine commande',
    type: 'discount',
    pointsCost: 200,
    value: 10,
    isActive: true,
    stock: null,
    category: 'discounts',
    terms: 'Valable sur toutes les commandes. Non cumulable avec d\'autres offres.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'discount_15',
    name: 'Réduction 15%',
    description: 'Réduction de 15% sur votre prochaine commande',
    type: 'discount',
    pointsCost: 350,
    value: 15,
    isActive: true,
    stock: null,
    category: 'discounts',
    terms: 'Valable sur toutes les commandes. Non cumulable avec d\'autres offres.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'free_delivery',
    name: 'Livraison Gratuite',
    description: 'Livraison gratuite sur votre prochaine commande',
    type: 'free_delivery',
    pointsCost: 150,
    value: 'Gratuit',
    isActive: true,
    stock: null,
    category: 'delivery',
    terms: 'Valable sur toutes les commandes. Frais de livraison normalement applicables offerts.',
    usageLimitPerUser: 2,
    usageCount: 0
  },
  {
    id: 'free_appetizer',
    name: 'Entrée Gratuite',
    description: 'Une entrée gratuite de votre choix',
    type: 'free_item',
    pointsCost: 250,
    value: 'Entrée',
    isActive: true,
    stock: null,
    category: 'food',
    terms: 'Valable sur les entrées du menu. Une seule entrée par récompense.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'free_dessert',
    name: 'Dessert Gratuit',
    description: 'Un dessert gratuit de votre choix',
    type: 'free_item',
    pointsCost: 300,
    value: 'Dessert',
    isActive: true,
    stock: null,
    category: 'food',
    terms: 'Valable sur les desserts du menu. Un seul dessert par récompense.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'vip_experience',
    name: 'Expérience VIP',
    description: 'Accès VIP avec avantages exclusifs',
    type: 'vip_experience',
    pointsCost: 1000,
    value: 'VIP',
    isActive: true,
    stock: 50,
    category: 'experiences',
    terms: 'Accès VIP pour une journée. Incluye accompagnement personnalisé.',
    usageLimitPerUser: 1,
    usageCount: 0
  },
  {
    id: 'charity_donation',
    name: 'Don Caritatif',
    description: 'Don de 10€ à une œuvre caritative',
    type: 'charity_donation',
    pointsCost: 500,
    value: '10€',
    isActive: true,
    stock: null,
    category: 'charity',
    terms: 'Don effectué à une œuvre caritative partenaire. Reçu fiscal disponible.',
    usageLimitPerUser: 5,
    usageCount: 0
  }
];

// Défis par défaut
const DEFAULT_CHALLENGES: LoyaltyChallenge[] = [
  {
    id: 'first_order',
    name: 'Première Commande',
    description: 'Passez votre première commande',
    type: 'orders',
    target: 1,
    progress: 0,
    reward: {
      points: 100,
      badgeId: 'badge_first_order'
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 an
    isActive: true,
    participants: 0,
    difficulty: 'easy'
  },
  {
    id: 'weekly_spender',
    name: 'Grand Dépensier Hebdomadaire',
    description: 'Dépensez plus de 200€ cette semaine',
    type: 'spending',
    target: 200,
    progress: 0,
    reward: {
      points: 500,
      badgeId: 'badge_weekly_spender'
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
    isActive: true,
    participants: 0,
    difficulty: 'medium'
  },
  {
    id: 'streak_7_days',
    name: 'Série de 7 Jours',
    description: 'Commandez pendant 7 jours consécutifs',
    type: 'streak',
    target: 7,
    progress: 0,
    reward: {
      points: 300,
      badgeId: 'badge_streak_7'
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
    isActive: true,
    participants: 0,
    difficulty: 'hard'
  },
  {
    id: 'category_explorer',
    name: 'Explorateur de Catégories',
    description: 'Commandez dans 5 catégories différentes',
    type: 'category',
    target: 5,
    progress: 0,
    reward: {
      points: 400,
      badgeId: 'badge_category_explorer'
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 jours
    isActive: true,
    participants: 0,
    difficulty: 'medium'
  },
  {
    id: 'social_referrer',
    name: 'Parrain Social',
    description: 'Parrainez 3 amis qui passent commande',
    type: 'referral',
    target: 3,
    progress: 0,
    reward: {
      points: 900,
      badgeId: 'badge_social_referrer'
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 jours
    isActive: true,
    participants: 0,
    difficulty: 'expert'
  }
];

// Achievements par défaut
const DEFAULT_ACHIEVEMENTS: LoyaltyAchievement[] = [
  {
    id: 'first_order',
    name: 'Première Étape',
    description: 'Passez votre première commande',
    icon: '🎯',
    category: 'orders',
    requirement: {
      type: 'orders_count',
      value: 1
    },
    rarity: 'common',
    pointsReward: 50,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'regular_customer',
    name: 'Client Régulier',
    description: 'Passez 10 commandes',
    icon: '🔄',
    category: 'orders',
    requirement: {
      type: 'orders_count',
      value: 10
    },
    rarity: 'common',
    pointsReward: 100,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'big_spender',
    name: 'Gros Dépensier',
    description: 'Dépensez plus de 500€ au total',
    icon: '💰',
    category: 'spending',
    requirement: {
      type: 'total_spent',
      value: 500
    },
    rarity: 'rare',
    pointsReward: 200,
    progress: 0,
    maxProgress: 500
  },
  {
    id: 'loyalty_champion',
    name: 'Champion de la Fidélité',
    description: 'Atteignez le niveau Platinum',
    icon: '👑',
    category: 'loyalty',
    requirement: {
      type: 'loyalty_level',
      value: 4
    },
    rarity: 'epic',
    pointsReward: 500,
    progress: 0,
    maxProgress: 4
  },
  {
    id: 'social_butterfly',
    name: 'Papillon Social',
    description: 'Parrainez 5 amis',
    icon: '🦋',
    category: 'social',
    requirement: {
      type: 'referrals_count',
      value: 5
    },
    rarity: 'rare',
    pointsReward: 300,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'foodie_explorer',
    name: 'Explorateur Gastronomique',
    description: 'Essayez 20 produits différents',
    icon: '🍽️',
    category: 'special',
    requirement: {
      type: 'unique_products',
      value: 20
    },
    rarity: 'epic',
    pointsReward: 400,
    progress: 0,
    maxProgress: 20
  },
  {
    id: 'anniversary_king',
    name: 'Roi de l\'Anniversaire',
    description: 'Fêtez 3 anniversaires avec nous',
    icon: '🎂',
    category: 'special',
    requirement: {
      type: 'birthday_orders',
      value: 3
    },
    rarity: 'legendary',
    pointsReward: 1000,
    progress: 0,
    maxProgress: 3
  }
];

// Événements saisonniers par défaut
const DEFAULT_EVENTS: LoyaltyEvent[] = [
  {
    id: 'new_year_2024',
    name: 'Bonne Année 2024',
    description: 'Doublez vos points pour commencer l\'année en beauté !',
    type: 'double_points',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z',
    multiplier: 2,
    bonusRewards: [],
    isActive: false,
    participatingUsers: 0
  },
  {
    id: 'valentines_day',
    name: 'Saint-Valentin',
    description: 'Amour et points doublés pour la Saint-Valentin',
    type: 'seasonal',
    startDate: '2024-02-10T00:00:00Z',
    endDate: '2024-02-16T23:59:59Z',
    multiplier: 1.5,
    bonusRewards: [
      // Ajouter des récompenses spéciales Valentine
    ],
    isActive: false,
    participatingUsers: 0
  },
  {
    id: 'summer_flash',
    name: 'Flash Été',
    description: 'Points triplés pour l\'été !',
    type: 'flash',
    startDate: '2024-06-21T00:00:00Z',
    endDate: '2024-06-21T23:59:59Z',
    multiplier: 3,
    bonusRewards: [],
    isActive: false,
    participatingUsers: 0
  }
];

/**
 * Gestionnaire des niveaux et récompenses
 */
export class LoyaltyRewardsManager {
  private static instance: LoyaltyRewardsManager;
  private rewards: Map<string, LoyaltyReward> = new Map();
  private challenges: Map<string, LoyaltyChallenge> = new Map();
  private achievements: Map<string, LoyaltyAchievement> = new Map();
  private events: Map<string, LoyaltyEvent> = new Map();
  private categories: Map<string, RewardCategory> = new Map();
  private userProgress: Map<string, ChallengeProgress[]> = new Map();
  private gamificationSettings: GamificationSettings;

  private constructor() {
    this.gamificationSettings = {
      showProgress: true,
      showLeaderboard: true,
      showAchievements: true,
      showBadges: true,
      shareOnSocial: false,
      celebrateMilestones: true,
      soundEffects: true,
      animationLevel: 'subtle'
    };

    this.initializeDefaults();
    this.loadFromCache();
    this.startPeriodicTasks();
  }

  static getInstance(): LoyaltyRewardsManager {
    if (!LoyaltyRewardsManager.instance) {
      LoyaltyRewardsManager.instance = new LoyaltyRewardsManager();
    }
    return LoyaltyRewardsManager.instance;
  }

  /**
   * === GESTION DES RÉCOMPENSES ===
   */

  /**
   * Initialise les récompenses par défaut
   */
  private initializeDefaults(): void {
    try {
      // Initialiser les récompenses
      DEFAULT_REWARDS.forEach(reward => {
        this.rewards.set(reward.id, reward);
      });

      // Initialiser les défis
      DEFAULT_CHALLENGES.forEach(challenge => {
        this.challenges.set(challenge.id, challenge);
      });

      // Initialiser les achievements
      DEFAULT_ACHIEVEMENTS.forEach(achievement => {
        this.achievements.set(achievement.id, achievement);
      });

      // Initialiser les événements
      DEFAULT_EVENTS.forEach(event => {
        this.events.set(event.id, event);
      });

      // Initialiser les catégories
      this.initializeCategories();

      performanceMonitor.info('Gestionnaire récompenses initialisé', {
        rewards: this.rewards.size,
        challenges: this.challenges.size,
        achievements: this.achievements.size,
        events: this.events.size
      });

    } catch (error) {
      performanceMonitor.error('Erreur initialisation gestionnaire récompenses', { error });
    }
  }

  /**
   * Initialise les catégories de récompenses
   */
  private initializeCategories(): void {
    const categories: RewardCategory[] = [
      {
        id: 'discounts',
        name: 'Réductions',
        description: 'Réductions sur vos commandes',
        icon: '🏷️',
        color: '#FF6B6B',
        displayOrder: 1,
        isActive: true,
        rewards: []
      },
      {
        id: 'delivery',
        name: 'Livraison',
        description: 'Avantages de livraison',
        icon: '🚚',
        color: '#4ECDC4',
        displayOrder: 2,
        isActive: true,
        rewards: []
      },
      {
        id: 'food',
        name: 'Nourriture',
        description: 'Produits gratuits',
        icon: '🍕',
        color: '#45B7D1',
        displayOrder: 3,
        isActive: true,
        rewards: []
      },
      {
        id: 'experiences',
        name: 'Expériences',
        description: 'Expériences VIP exclusives',
        icon: '⭐',
        color: '#96CEB4',
        displayOrder: 4,
        isActive: true,
        rewards: []
      },
      {
        id: 'charity',
        name: 'Caritatif',
        description: 'Don à des œuvres caritatives',
        icon: '❤️',
        color: '#FECA57',
        displayOrder: 5,
        isActive: true,
        rewards: []
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
      // Associer les récompenses à leurs catégories
      const categoryRewards = Array.from(this.rewards.values())
        .filter(reward => reward.category === category.id);
      category.rewards = categoryRewards;
    });
  }

  /**
   * Récupère toutes les récompenses disponibles
   */
  getRewards(): LoyaltyReward[] {
    return Array.from(this.rewards.values()).filter(reward => reward.isActive);
  }

  /**
   * Récupère une récompense par ID
   */
  getReward(rewardId: string): LoyaltyReward | undefined {
    return this.rewards.get(rewardId);
  }

  /**
   * Récupère les récompenses par catégorie
   */
  getRewardsByCategory(categoryId: string): LoyaltyReward[] {
    return this.getRewards().filter(reward => reward.category === categoryId);
  }

  /**
   * Ajoute ou met à jour une récompense
   */
  async addOrUpdateReward(reward: LoyaltyReward): Promise<void> {
    try {
      this.rewards.set(reward.id, reward);
      
      // Mettre à jour la catégorie
      const category = this.categories.get(reward.category);
      if (category) {
        const existingIndex = category.rewards.findIndex(r => r.id === reward.id);
        if (existingIndex >= 0) {
          category.rewards[existingIndex] = reward;
        } else {
          category.rewards.push(reward);
        }
      }

      // Sauvegarder en cache
      this.saveToCache();

      performanceMonitor.info('Récompense ajoutée/mise à jour', { rewardId: reward.id, name: reward.name });

    } catch (error) {
      performanceMonitor.error('Erreur ajout/mise à jour récompense', { rewardId: reward.id, error });
      throw error;
    }
  }

  /**
   * === GESTION DES DÉFIS ===
   */

  /**
   * Récupère tous les défis actifs
   */
  getActiveChallenges(): LoyaltyChallenge[] {
    const now = new Date();
    return Array.from(this.challenges.values())
      .filter(challenge => 
        challenge.isActive && 
        new Date(challenge.startDate) <= now &&
        new Date(challenge.endDate) >= now
      );
  }

  /**
   * Récupère les défis disponibles pour un utilisateur
   */
  async getAvailableChallenges(userId: string): Promise<LoyaltyChallenge[]> {
    try {
      const activeChallenges = this.getActiveChallenges();
      const userProgress = await this.getUserChallengeProgress(userId);

      return activeChallenges.filter(challenge => {
        // Vérifier si l'utilisateur a déjà terminé ce défi
        const progress = userProgress.find(p => p.challengeId === challenge.id);
        return !progress?.isCompleted;
      });

    } catch (error) {
      performanceMonitor.error('Erreur récupération défis disponibles', { userId, error });
      return [];
    }
  }

  /**
   * Participe à un défi
   */
  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        throw new Error('Défi non trouvé');
      }

      const userProgress = await this.getUserChallengeProgress(userId);
      const existingProgress = userProgress.find(p => p.challengeId === challengeId);

      if (existingProgress) {
        throw new Error('Utilisateur déjà inscrit à ce défi');
      }

      // Créer le progrès
      const progress: ChallengeProgress = {
        challengeId,
        userId,
        currentProgress: 0,
        targetProgress: challenge.target,
        startDate: new Date().toISOString(),
        lastUpdateDate: new Date().toISOString(),
        isCompleted: false,
        rewardClaimed: false
      };

      // Sauvegarder
      userProgress.push(progress);
      this.userProgress.set(userId, userProgress);

      // Mettre à jour les participants du défi
      challenge.participants++;
      this.challenges.set(challengeId, challenge);

      performanceMonitor.info('Utilisateur inscrit au défi', { userId, challengeId });

    } catch (error) {
      performanceMonitor.error('Erreur inscription défi', { userId, challengeId, error });
      throw error;
    }
  }

  /**
   * Met à jour le progrès d'un défi
   */
  async updateChallengeProgress(userId: string, challengeId: string, progressIncrement: number): Promise<void> {
    try {
      const userProgress = await this.getUserChallengeProgress(userId);
      const progress = userProgress.find(p => p.challengeId === challengeId);

      if (!progress) {
        throw new Error('Progrès de défi non trouvé');
      }

      progress.currentProgress = Math.min(progress.currentProgress + progressIncrement, progress.targetProgress);
      progress.lastUpdateDate = new Date().toISOString();

      // Vérifier si le défi est complété
      if (progress.currentProgress >= progress.targetProgress && !progress.isCompleted) {
        progress.isCompleted = true;
        progress.completedAt = new Date().toISOString();

        // Accorder la récompense
        await this.grantChallengeReward(userId, challengeId);

        performanceMonitor.info('Défi complété', { userId, challengeId });
      }

      this.userProgress.set(userId, userProgress);
      this.saveToCache();

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour progrès défi', { userId, challengeId, error });
      throw error;
    }
  }

  /**
   * Accorde la récompense d'un défi complété
   */
  private async grantChallengeReward(userId: string, challengeId: string): Promise<void> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) return;

      // Accorder les points
      await loyaltyService.addPoints(
        userId,
        challenge.reward.points,
        `Récompense défi: ${challenge.name}`,
        undefined,
        { challengeId, type: 'challenge_reward' }
      );

      // Accorder un badge si spécifié
      if (challenge.reward.badgeId) {
        // Logique d'octroi de badge
      }

      performanceMonitor.info('Récompense de défi accordée', { userId, challengeId, points: challenge.reward.points });

    } catch (error) {
      performanceMonitor.error('Erreur récompense défi', { userId, challengeId, error });
    }
  }

  /**
   * === GESTION DES ACHIEVEMENTS ===
   */

  /**
   * Récupère tous les achievements
   */
  getAchievements(): LoyaltyAchievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Vérifie et met à jour les achievements d'un utilisateur
   */
  async checkAndUpdateAchievements(userId: string): Promise<LoyaltyAchievement[]> {
    try {
      const user = await loyaltyService.getUser(userId);
      if (!user) return [];

      const unlockedAchievements: LoyaltyAchievement[] = [];

      for (const achievement of this.achievements.values()) {
        const currentProgress = await this.calculateAchievementProgress(user, achievement);
        
        if (currentProgress >= achievement.requirement.value && !achievement.unlockedAt) {
          achievement.unlockedAt = new Date().toISOString();
          achievement.progress = currentProgress;
          
          // Accorder les points
          await loyaltyService.addPoints(
            userId,
            achievement.pointsReward,
            `Achievement débloqué: ${achievement.name}`,
            undefined,
            { achievementId: achievement.id, type: 'achievement' }
          );

          unlockedAchievements.push(achievement);
          
          performanceMonitor.info('Achievement débloqué', { userId, achievementId: achievement.id });
        }
      }

      return unlockedAchievements;

    } catch (error) {
      performanceMonitor.error('Erreur vérification achievements', { userId, error });
      return [];
    }
  }

  /**
   * Calcule le progrès d'un achievement pour un utilisateur
   */
  private async calculateAchievementProgress(user: any, achievement: LoyaltyAchievement): Promise<number> {
    try {
      switch (achievement.requirement.type) {
        case 'orders_count':
          return user.ordersCount;
        case 'total_spent':
          return user.totalSpent;
        case 'loyalty_level':
          const levelIndex = loyaltyService.getLevels().findIndex(l => l.id === user.levelId);
          return levelIndex + 1;
        case 'referrals_count':
          return user.referralsCount;
        case 'unique_products':
          // Calculer le nombre de produits uniques commandés
          return 0; // Simplifié
        case 'birthday_orders':
          // Calculer les commandes d'anniversaire
          return 0; // Simplifié
        default:
          return 0;
      }
    } catch (error) {
      performanceMonitor.error('Erreur calcul progrès achievement', { achievementId: achievement.id, error });
      return 0;
    }
  }

  /**
   * === GESTION DES ÉVÉNEMENTS ===
   */

  /**
   * Récupère tous les événements actifs
   */
  getActiveEvents(): LoyaltyEvent[] {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => 
        event.isActive && 
        new Date(event.startDate) <= now &&
        new Date(event.endDate) >= now
      );
  }

  /**
   * Participe à un événement
   */
  async joinEvent(userId: string, eventId: string): Promise<EventParticipation> {
    try {
      const event = this.events.get(eventId);
      if (!event) {
        throw new Error('Événement non trouvé');
      }

      const participation: EventParticipation = {
        eventId,
        userId,
        joinDate: new Date().toISOString(),
        multiplier: event.multiplier,
        pointsEarned: 0,
        rewardsClaimed: [],
        isActive: true
      };

      event.participatingUsers++;
      this.events.set(eventId, event);

      performanceMonitor.info('Utilisateur inscrit à l\'événement', { userId, eventId });

      return participation;

    } catch (error) {
      performanceMonitor.error('Erreur inscription événement', { userId, eventId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES CATÉGORIES ===
   */

  /**
   * Récupère toutes les catégories
   */
  getCategories(): RewardCategory[] {
    return Array.from(this.categories.values())
      .filter(category => category.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Récupère une catégorie par ID
   */
  getCategory(categoryId: string): RewardCategory | undefined {
    return this.categories.get(categoryId);
  }

  /**
   * === GESTION DU PROGRÈS UTILISATEUR ===
   */

  /**
   * Récupère le progrès des défis d'un utilisateur
   */
  private async getUserChallengeProgress(userId: string): Promise<ChallengeProgress[]> {
    // Utiliser le cache ou retourner un tableau vide
    return this.userProgress.get(userId) || [];
  }

  /**
   * === GAMIFICATION ===
   */

  /**
   * Récupère les paramètres de gamification
   */
  getGamificationSettings(): GamificationSettings {
    return { ...this.gamificationSettings };
  }

  /**
   * Met à jour les paramètres de gamification
   */
  updateGamificationSettings(settings: Partial<GamificationSettings>): void {
    this.gamificationSettings = { ...this.gamificationSettings, ...settings };
    this.saveToCache();
    performanceMonitor.info('Paramètres gamification mis à jour', { settings });
  }

  /**
   * Calcule le score de gamification d'un utilisateur
   */
  async calculateGamificationScore(userId: string): Promise<{
    totalScore: number;
    levelScore: number;
    achievementScore: number;
    challengeScore: number;
    streakScore: number;
    rank: string;
  }> {
    try {
      const user = await loyaltyService.getUser(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Calculer les scores composants
      const levelScore = user.totalPoints * 0.1; // 10% des points totaux
      const achievementScore = user.achievements.length * 100; // 100 points par achievement
      const challengeScore = user.badges.length * 50; // 50 points par badge
      const streakScore = user.streakDays * 10; // 10 points par jour de streak

      const totalScore = Math.round(levelScore + achievementScore + challengeScore + streakScore);

      // Déterminer le rang
      let rank = 'Débutant';
      if (totalScore >= 1000) rank = 'Expert';
      if (totalScore >= 5000) rank = 'Maître';
      if (totalScore >= 10000) rank = 'Légende';

      return {
        totalScore,
        levelScore: Math.round(levelScore),
        achievementScore,
        challengeScore,
        streakScore,
        rank
      };

    } catch (error) {
      performanceMonitor.error('Erreur calcul score gamification', { userId, error });
      return {
        totalScore: 0,
        levelScore: 0,
        achievementScore: 0,
        challengeScore: 0,
        streakScore: 0,
        rank: 'Débutant'
      };
    }
  }

  /**
   * === MÉTHODES UTILITAIRES ===
   */

  /**
   * Charge les données depuis le cache
   */
  private loadFromCache(): void {
    try {
      const cachedRewards = userCache.get<LoyaltyReward[]>('loyalty_rewards');
      if (cachedRewards && Array.isArray(cachedRewards)) {
        cachedRewards.forEach((reward: LoyaltyReward) => {
          this.rewards.set(reward.id, reward);
        });
      }

      const cachedChallenges = userCache.get<LoyaltyChallenge[]>('loyalty_challenges');
      if (cachedChallenges && Array.isArray(cachedChallenges)) {
        cachedChallenges.forEach((challenge: LoyaltyChallenge) => {
          this.challenges.set(challenge.id, challenge);
        });
      }

      const cachedAchievements = userCache.get<LoyaltyAchievement[]>('loyalty_achievements');
      if (cachedAchievements && Array.isArray(cachedAchievements)) {
        cachedAchievements.forEach((achievement: LoyaltyAchievement) => {
          this.achievements.set(achievement.id, achievement);
        });
      }

      const cachedEvents = userCache.get<LoyaltyEvent[]>('loyalty_events');
      if (cachedEvents && Array.isArray(cachedEvents)) {
        cachedEvents.forEach((event: LoyaltyEvent) => {
          this.events.set(event.id, event);
        });
      }

      const cachedCategories = userCache.get<RewardCategory[]>('loyalty_categories');
      if (cachedCategories && Array.isArray(cachedCategories)) {
        cachedCategories.forEach((category: RewardCategory) => {
          this.categories.set(category.id, category);
        });
      }

      performanceMonitor.debug('Données gestionnaire récompenses chargées depuis le cache');

    } catch (error) {
      performanceMonitor.error('Erreur chargement cache gestionnaire récompenses', { error });
    }
  }

  /**
   * Sauvegarde les données dans le cache
   */
  private saveToCache(): void {
    try {
      userCache.set('loyalty_rewards', Array.from(this.rewards.values()), 60 * 60 * 1000);
      userCache.set('loyalty_challenges', Array.from(this.challenges.values()), 60 * 60 * 1000);
      userCache.set('loyalty_achievements', Array.from(this.achievements.values()), 60 * 60 * 1000);
      userCache.set('loyalty_events', Array.from(this.events.values()), 60 * 60 * 1000);
      userCache.set('loyalty_categories', Array.from(this.categories.values()), 60 * 60 * 1000);

      performanceMonitor.debug('Données gestionnaire récompenses sauvegardées');

    } catch (error) {
      performanceMonitor.error('Erreur sauvegarde cache gestionnaire récompenses', { error });
    }
  }

  /**
   * Démarre les tâches périodiques
   */
  private startPeriodicTasks(): void {
    // Nettoyage des événements expirés (tous les jours)
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, 24 * 60 * 60 * 1000);

    // Mise à jour des défis actifs (toutes les heures)
    setInterval(() => {
      this.updateActiveChallenges();
    }, 60 * 60 * 1000);
  }

  /**
   * Nettoie les événements expirés
   */
  private cleanupExpiredEvents(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [eventId, event] of this.events.entries()) {
      if (new Date(event.endDate) < now) {
        event.isActive = false;
        this.events.set(eventId, event);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      performanceMonitor.info('Événements expirés nettoyés', { count: cleaned });
      this.saveToCache();
    }
  }

  /**
   * Met à jour les défis actifs
   */
  private updateActiveChallenges(): void {
    const now = new Date();
    let updated = 0;

    for (const [challengeId, challenge] of this.challenges.entries()) {
      const isCurrentlyActive = 
        challenge.isActive && 
        new Date(challenge.startDate) <= now &&
        new Date(challenge.endDate) >= now;

      // Mettre à jour l'activité si nécessaire
      const shouldBeActive = new Date(challenge.startDate) <= now && new Date(challenge.endDate) >= now;
      if (challenge.isActive !== shouldBeActive) {
        challenge.isActive = shouldBeActive;
        this.challenges.set(challengeId, challenge);
        updated++;
      }
    }

    if (updated > 0) {
      performanceMonitor.info('Défis actifs mis à jour', { count: updated });
      this.saveToCache();
    }
  }

  /**
   * === API PUBLIQUES ===
   */

  /**
   * Récupère les statistiques du gestionnaire
   */
  getStatistics(): {
    totalRewards: number;
    activeChallenges: number;
    totalAchievements: number;
    activeEvents: number;
    categoriesCount: number;
  } {
    return {
      totalRewards: this.rewards.size,
      activeChallenges: this.getActiveChallenges().length,
      totalAchievements: this.achievements.size,
      activeEvents: this.getActiveEvents().length,
      categoriesCount: this.categories.size
    };
  }

  /**
   * Génère un rapport de performance des récompenses
   */
  async generateRewardsReport(): Promise<{
    topRewards: Array<{ reward: LoyaltyReward; redemptionCount: number; revenue: number }>;
    categoryPerformance: Array<{ category: string; redemptions: number; revenue: number }>;
    challengeParticipation: Array<{ challenge: string; participants: number; completionRate: number }>;
  }> {
    try {
      // Rapport simplifié - en production, utiliser de vraies données
      const topRewards = Array.from(this.rewards.values())
        .slice(0, 5)
        .map(reward => ({
          reward,
          redemptionCount: Math.floor(Math.random() * 500) + 50,
          revenue: Math.floor(Math.random() * 10000) + 1000
        }));

      const categoryPerformance = this.getCategories().map(category => ({
        category: category.name,
        redemptions: Math.floor(Math.random() * 1000) + 100,
        revenue: Math.floor(Math.random() * 5000) + 500
      }));

      const challengeParticipation = this.getActiveChallenges().map(challenge => ({
        challenge: challenge.name,
        participants: challenge.participants,
        completionRate: Math.floor(Math.random() * 80) + 10
      }));

      return {
        topRewards,
        categoryPerformance,
        challengeParticipation
      };

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport récompenses', { error });
      throw error;
    }
  }
}

// Instance singleton
export const loyaltyRewardsManager = LoyaltyRewardsManager.getInstance();

// Export pour utilisation dans les hooks et composants
export default loyaltyRewardsManager;