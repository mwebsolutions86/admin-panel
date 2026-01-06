/**
 * Intégration du Système de Notifications pour la Fidélité
 * Universal Eats - Notifications Automatiques
 * 
 * Ce module étend le service de notifications existant pour ajouter :
 * - Templates de notifications spécifiques à la fidélité
 * - Logique d'envoi automatique basée sur les événements
 * - Notifications de progression et de récompenses
 * - Alertes pour les points expirés et niveaux
 */

import { notificationsService, NotificationTemplate } from '../lib/notifications-service';
import { loyaltyService } from '../lib/loyalty-service';
import { loyaltyRewardsManager } from '../lib/loyalty-rewards-manager';
import { performanceMonitor } from '../lib/performance-monitor';
import { userCache } from '../lib/cache-service';

// Types pour les notifications de fidélité
export interface LoyaltyNotificationData {
  userId: string;
  type: 'points_earned' | 'level_up' | 'reward_available' | 'challenge_completed' | 'points_expiring' | 'birthday_bonus' | 'referral_bonus' | 'streak_milestone';
  data: Record<string, any>;
  scheduledAt?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Templates de notifications de fidélité
const LOYALTY_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'loyalty-welcome',
    name: 'Bienvenue au Programme de Fidélité',
    type: 'loyalty',
    platform: 'all',
    variables: ['welcomeBonus', 'levelName', 'levelBenefits'],
    payload: {
      web: {
        title: '🎉 Bienvenue dans notre Programme de Fidélité !',
        body: 'Félicitations ! Vous avez reçu {welcomeBonus} points de bienvenue. Vous êtes maintenant niveau {levelName}. {levelBenefits}',
        icon: '/icons/loyalty-welcome.png',
        tag: 'loyalty-welcome',
        requireInteraction: true,
        data: { type: 'loyalty_welcome', welcomeBonus: '{welcomeBonus}' }
      },
      ios: {
        title: 'Programme de Fidélité',
        body: 'Bienvenue ! +{welcomeBonus} points offerts',
        badge: '1',
        data: { type: 'loyalty_welcome', welcomeBonus: '{welcomeBonus}' }
      },
      android: {
        title: 'Programme de Fidélité',
        body: 'Bienvenue ! +{welcomeBonus} points offerts',
        icon: '@mipmap/ic_loyalty',
        data: { type: 'loyalty_welcome', welcomeBonus: '{welcomeBonus}' }
      },
      desktop: {
        title: 'Bienvenue dans notre Programme de Fidélité !',
        body: 'Félicitations ! Vous avez reçu {welcomeBonus} points de bienvenue',
        icon: '/icons/loyalty-welcome.png',
        tag: 'loyalty-welcome',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-points-earned',
    name: 'Points de Fidélité Gagnés',
    type: 'loyalty',
    platform: 'all',
    variables: ['points', 'totalPoints', 'nextRewardThreshold'],
    payload: {
      web: {
        title: '✨ Points de fidélité gagnés !',
        body: 'Vous avez gagné {points} points ! Total : {totalPoints} points. Plus que {nextRewardThreshold} points pour votre prochaine récompense !',
        icon: '/icons/points-earned.png',
        tag: 'loyalty-points',
        data: { type: 'points_earned', points: '{points}', totalPoints: '{totalPoints}' }
      },
      ios: {
        title: 'Points fidélité !',
        body: '+{points} points gagnés ! Total : {totalPoints}',
        data: { type: 'points_earned', points: '{points}', totalPoints: '{totalPoints}' }
      },
      android: {
        title: 'Points fidélité !',
        body: '+{points} points gagnés ! Total : {totalPoints}',
        icon: '@mipmap/ic_points',
        data: { type: 'points_earned', points: '{points}', totalPoints: '{totalPoints}' }
      },
      desktop: {
        title: 'Points de fidélité gagnés !',
        body: 'Vous avez gagné {points} points ! Total : {totalPoints}',
        icon: '/icons/points-earned.png',
        tag: 'loyalty-points'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-level-up',
    name: 'Montée de Niveau',
    type: 'loyalty',
    platform: 'all',
    variables: ['levelName', 'levelIcon', 'discount', 'bonus'],
    payload: {
      web: {
        title: '🏆 Félicitations ! Nouveau niveau atteint !',
        body: 'Vous êtes maintenant niveau {levelName} {levelIcon} ! Profitez de {discount}% de réduction + {bonus} points de bonus !',
        icon: '/icons/level-up.png',
        tag: 'loyalty-level-up',
        requireInteraction: true,
        actions: [
          {
            action: 'view-benefits',
            title: 'Voir mes avantages',
            requireInteraction: true
          }
        ],
        data: { type: 'level_up', levelName: '{levelName}', discount: '{discount}' }
      },
      ios: {
        title: 'Niveau {levelName} !',
        body: 'Félicitations ! +{bonus} points de bonus',
        badge: '1',
        data: { type: 'level_up', levelName: '{levelName}', bonus: '{bonus}' }
      },
      android: {
        title: 'Niveau {levelName} !',
        body: 'Félicitations ! +{bonus} points de bonus',
        icon: '@mipmap/ic_level_up',
        data: { type: 'level_up', levelName: '{levelName}', bonus: '{bonus}' }
      },
      desktop: {
        title: 'Félicitations ! Nouveau niveau atteint !',
        body: 'Vous êtes maintenant niveau {levelName} {levelIcon} !',
        icon: '/icons/level-up.png',
        tag: 'loyalty-level-up',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-reward-available',
    name: 'Récompense Disponible',
    type: 'loyalty',
    platform: 'all',
    variables: ['rewardName', 'pointsCost', 'discount', 'expiryDate'],
    payload: {
      web: {
        title: '🎁 Nouvelle récompense disponible !',
        body: 'Récupérez "{rewardName}" pour seulement {pointsCost} points ! {discount} de réduction. Valable jusqu\'au {expiryDate}',
        icon: '/icons/reward-available.png',
        tag: 'loyalty-reward',
        requireInteraction: true,
        actions: [
          {
            action: 'redeem-reward',
            title: 'Utiliser maintenant',
            requireInteraction: true
          }
        ],
        data: { type: 'reward_available', rewardName: '{rewardName}', pointsCost: '{pointsCost}' }
      },
      ios: {
        title: 'Récompense !',
        body: '"{rewardName}" pour {pointsCost} points',
        data: { type: 'reward_available', rewardName: '{rewardName}', pointsCost: '{pointsCost}' }
      },
      android: {
        title: 'Récompense disponible !',
        body: '"{rewardName}" pour {pointsCost} points',
        icon: '@mipmap/ic_reward',
        data: { type: 'reward_available', rewardName: '{rewardName}', pointsCost: '{pointsCost}' }
      },
      desktop: {
        title: 'Nouvelle récompense disponible !',
        body: 'Récupérez "{rewardName}" pour {pointsCost} points',
        icon: '/icons/reward-available.png',
        tag: 'loyalty-reward',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-challenge-completed',
    name: 'Défi Complété',
    type: 'loyalty',
    platform: 'all',
    variables: ['challengeName', 'pointsReward', 'badgeName'],
    payload: {
      web: {
        title: '🎯 Défi complété !',
        body: 'Félicitations ! Vous avez terminé "{challengeName}" et gagné {pointsReward} points + {badgeName} !',
        icon: '/icons/challenge-completed.png',
        tag: 'loyalty-challenge',
        data: { type: 'challenge_completed', challengeName: '{challengeName}', pointsReward: '{pointsReward}' }
      },
      ios: {
        title: 'Défi terminé !',
        body: '"{challengeName}" complété ! +{pointsReward} points',
        data: { type: 'challenge_completed', challengeName: '{challengeName}', pointsReward: '{pointsReward}' }
      },
      android: {
        title: 'Défi complété !',
        body: '"{challengeName}" complété ! +{pointsReward} points',
        icon: '@mipmap/ic_challenge',
        data: { type: 'challenge_completed', challengeName: '{challengeName}', pointsReward: '{pointsReward}' }
      },
      desktop: {
        title: 'Défi complété !',
        body: 'Félicitations ! Vous avez terminé "{challengeName}"',
        icon: '/icons/challenge-completed.png',
        tag: 'loyalty-challenge'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-points-expiring',
    name: 'Points Expirant Bientôt',
    type: 'loyalty',
    platform: 'all',
    variables: ['expiringPoints', 'expiryDate', 'daysLeft'],
    payload: {
      web: {
        title: '⏰ Vos points expirent bientôt !',
        body: 'Attention ! {expiringPoints} points expirent le {expiryDate}. Plus que {daysLeft} jours pour les utiliser !',
        icon: '/icons/points-expiring.png',
        tag: 'loyalty-expiring',
        requireInteraction: true,
        actions: [
          {
            action: 'view-rewards',
            title: 'Voir les récompenses',
            requireInteraction: true
          }
        ],
        data: { type: 'points_expiring', expiringPoints: '{expiringPoints}', daysLeft: '{daysLeft}' }
      },
      ios: {
        title: 'Points expirant !',
        body: '{expiringPoints} points expirent dans {daysLeft} jours',
        data: { type: 'points_expiring', expiringPoints: '{expiringPoints}', daysLeft: '{daysLeft}' }
      },
      android: {
        title: 'Points expirant !',
        body: '{expiringPoints} points expirent dans {daysLeft} jours',
        icon: '@mipmap/ic_expiring',
        data: { type: 'points_expiring', expiringPoints: '{expiringPoints}', daysLeft: '{daysLeft}' }
      },
      desktop: {
        title: 'Vos points expirent bientôt !',
        body: 'Attention ! {expiringPoints} points expirent le {expiryDate}',
        icon: '/icons/points-expiring.png',
        tag: 'loyalty-expiring',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-birthday-bonus',
    name: 'Bonus d\'Anniversaire',
    type: 'loyalty',
    platform: 'all',
    variables: ['birthdayBonus', 'totalPoints'],
    payload: {
      web: {
        title: '🎂 Joyeux Anniversaire !',
        body: 'Nous vous offrons {birthdayBonus} points pour votre anniversaire ! Total actuel : {totalPoints} points. Profitez-en !',
        icon: '/icons/birthday.png',
        tag: 'loyalty-birthday',
        requireInteraction: true,
        actions: [
          {
            action: 'view-rewards',
            title: 'Voir les récompenses',
            requireInteraction: true
          }
        ],
        data: { type: 'birthday_bonus', birthdayBonus: '{birthdayBonus}' }
      },
      ios: {
        title: 'Joyeux Anniversaire !',
        body: '+{birthdayBonus} points offerts !',
        badge: '1',
        data: { type: 'birthday_bonus', birthdayBonus: '{birthdayBonus}' }
      },
      android: {
        title: 'Joyeux Anniversaire !',
        body: '+{birthdayBonus} points offerts !',
        icon: '@mipmap/ic_birthday',
        data: { type: 'birthday_bonus', birthdayBonus: '{birthdayBonus}' }
      },
      desktop: {
        title: 'Joyeux Anniversaire !',
        body: 'Nous vous offrons {birthdayBonus} points pour votre anniversaire !',
        icon: '/icons/birthday.png',
        tag: 'loyalty-birthday',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-referral-bonus',
    name: 'Bonus de Parrainage',
    type: 'loyalty',
    platform: 'all',
    variables: ['referralBonus', 'friendName', 'totalReferrals'],
    payload: {
      web: {
        title: '👥 Parrainage réussi !',
        body: '{friendName} s\'est inscrit grâce à votre code ! Vous gagnez {referralBonus} points. Total parrainages : {totalReferrals}',
        icon: '/icons/referral.png',
        tag: 'loyalty-referral',
        data: { type: 'referral_bonus', referralBonus: '{referralBonus}', friendName: '{friendName}' }
      },
      ios: {
        title: 'Parrainage réussi !',
        body: '+{referralBonus} points pour votre parrainage',
        data: { type: 'referral_bonus', referralBonus: '{referralBonus}', friendName: '{friendName}' }
      },
      android: {
        title: 'Parrainage réussi !',
        body: '+{referralBonus} points pour votre parrainage',
        icon: '@mipmap/ic_referral',
        data: { type: 'referral_bonus', referralBonus: '{referralBonus}', friendName: '{friendName}' }
      },
      desktop: {
        title: 'Parrainage réussi !',
        body: '{friendName} s\'est inscrit grâce à votre code ! Vous gagnez {referralBonus} points',
        icon: '/icons/referral.png',
        tag: 'loyalty-referral'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-streak-milestone',
    name: 'Étape de Série',
    type: 'loyalty',
    platform: 'all',
    variables: ['streakDays', 'milestone', 'bonusPoints'],
    payload: {
      web: {
        title: '🔥 Série impressionnante !',
        body: 'Félicitations ! {streakDays} jours consécutifs de commande ! Étape {milestone} atteinte : +{bonusPoints} points bonus !',
        icon: '/icons/streak.png',
        tag: 'loyalty-streak',
        data: { type: 'streak_milestone', streakDays: '{streakDays}', milestone: '{milestone}', bonusPoints: '{bonusPoints}' }
      },
      ios: {
        title: 'Série de {streakDays} jours !',
        body: 'Étape {milestone} atteinte ! +{bonusPoints} points',
        data: { type: 'streak_milestone', streakDays: '{streakDays}', milestone: '{milestone}', bonusPoints: '{bonusPoints}' }
      },
      android: {
        title: 'Série de {streakDays} jours !',
        body: 'Étape {milestone} atteinte ! +{bonusPoints} points',
        icon: '@mipmap/ic_streak',
        data: { type: 'streak_milestone', streakDays: '{streakDays}', milestone: '{milestone}', bonusPoints: '{bonusPoints}' }
      },
      desktop: {
        title: 'Série impressionnante !',
        body: 'Félicitations ! {streakDays} jours consécutifs de commande !',
        icon: '/icons/streak.png',
        tag: 'loyalty-streak'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Service d'intégration des notifications de fidélité
 */
export class LoyaltyNotificationsService {
  private static instance: LoyaltyNotificationsService;
  private initialized = false;
  private notificationQueue: LoyaltyNotificationData[] = [];
  private processingQueue = false;

  private constructor() {}

  static getInstance(): LoyaltyNotificationsService {
    if (!LoyaltyNotificationsService.instance) {
      LoyaltyNotificationsService.instance = new LoyaltyNotificationsService();
    }
    return LoyaltyNotificationsService.instance;
  }

  /**
   * Initialise le service et enregistre les templates
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Enregistrer les templates de fidélité
      LOYALTY_NOTIFICATION_TEMPLATES.forEach(template => {
        notificationsService.saveTemplate(template);
      });

      // Démarrer le traitement de la queue
      this.startQueueProcessing();

      this.initialized = true;
      performanceMonitor.info('Service de notifications fidélité initialisé', {
        templatesCount: LOYALTY_NOTIFICATION_TEMPLATES.length
      });

    } catch (error) {
      performanceMonitor.error('Erreur initialisation notifications fidélité', { error });
      throw error;
    }
  }

  /**
   * === NOTIFICATIONS AUTOMATIQUES ===
   */

  /**
   * Notifie l'ajout de points
   */
  async notifyPointsEarned(userId: string, points: number, totalPoints: number): Promise<void> {
    try {
      const nextRewardThreshold = this.getNextRewardThreshold(totalPoints);
      const pointsToNext = nextRewardThreshold - totalPoints;

      // Ne notifier que si c'est un montant significatif ou près d'une récompense
      if (points >= 50 || pointsToNext <= 100) {
        await this.queueNotification({
          userId,
          type: 'points_earned',
          priority: pointsToNext <= 50 ? 'high' : 'medium',
          data: {
            points: points.toString(),
            totalPoints: totalPoints.toString(),
            nextRewardThreshold: pointsToNext.toString()
          }
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur notification points gagnés', { userId, points, error });
    }
  }

  /**
   * Notifie une montée de niveau
   */
  async notifyLevelUp(userId: string, newLevel: any, bonus: number): Promise<void> {
    try {
      await this.queueNotification({
        userId,
        type: 'level_up',
        priority: 'high',
        data: {
          levelName: newLevel.name,
          levelIcon: newLevel.icon,
          discount: newLevel.discount.toString(),
          bonus: bonus.toString()
        }
      });

    } catch (error) {
      performanceMonitor.error('Erreur notification montée niveau', { userId, level: newLevel.name, error });
    }
  }

  /**
   * Notifie une récompense disponible
   */
  async notifyRewardAvailable(userId: string, reward: any): Promise<void> {
    try {
      await this.queueNotification({
        userId,
        type: 'reward_available',
        priority: 'medium',
        data: {
          rewardName: reward.name,
          pointsCost: reward.pointsCost.toString(),
          discount: typeof reward.value === 'number' ? `${reward.value}%` : reward.value,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        }
      });

    } catch (error) {
      performanceMonitor.error('Erreur notification récompense', { userId, rewardId: reward.id, error });
    }
  }

  /**
   * Notifie la complétion d'un défi
   */
  async notifyChallengeCompleted(userId: string, challenge: any): Promise<void> {
    try {
      await this.queueNotification({
        userId,
        type: 'challenge_completed',
        priority: 'medium',
        data: {
          challengeName: challenge.name,
          pointsReward: challenge.reward.points.toString(),
          badgeName: challenge.reward.badgeId ? 'Badge spécial' : ''
        }
      });

    } catch (error) {
      performanceMonitor.error('Erreur notification défi complété', { userId, challengeId: challenge.id, error });
    }
  }

  /**
   * Notifie les points expirant bientôt
   */
  async notifyPointsExpiring(userId: string, expiringPoints: number, daysLeft: number): Promise<void> {
    try {
      if (daysLeft <= 7 && expiringPoints >= 100) {
        await this.queueNotification({
          userId,
          type: 'points_expiring',
          priority: daysLeft <= 3 ? 'urgent' : 'high',
          data: {
            expiringPoints: expiringPoints.toString(),
            expiryDate: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
            daysLeft: daysLeft.toString()
          }
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur notification points expirant', { userId, expiringPoints, error });
    }
  }

  /**
   * Notifie le bonus d'anniversaire
   */
  async notifyBirthdayBonus(userId: string, birthdayBonus: number, totalPoints: number): Promise<void> {
    try {
      await this.queueNotification({
        userId,
        type: 'birthday_bonus',
        priority: 'high',
        data: {
          birthdayBonus: birthdayBonus.toString(),
          totalPoints: totalPoints.toString()
        }
      });

    } catch (error) {
      performanceMonitor.error('Erreur notification anniversaire', { userId, birthdayBonus, error });
    }
  }

  /**
   * Notifie le bonus de parrainage
   */
  async notifyReferralBonus(userId: string, referralBonus: number, friendName: string, totalReferrals: number): Promise<void> {
    try {
      await this.queueNotification({
        userId,
        type: 'referral_bonus',
        priority: 'medium',
        data: {
          referralBonus: referralBonus.toString(),
          friendName,
          totalReferrals: totalReferrals.toString()
        }
      });

    } catch (error) {
      performanceMonitor.error('Erreur notification parrainage', { userId, friendName, error });
    }
  }

  /**
   * Notifie une étape de série
   */
  async notifyStreakMilestone(userId: string, streakDays: number, milestone: number, bonusPoints: number): Promise<void> {
    try {
      if (milestone % 5 === 0) { // Notifications tous les 5 jours
        await this.queueNotification({
          userId,
          type: 'streak_milestone',
          priority: 'medium',
          data: {
            streakDays: streakDays.toString(),
            milestone: milestone.toString(),
            bonusPoints: bonusPoints.toString()
          }
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur notification série', { userId, streakDays, milestone, error });
    }
  }

  /**
   * === GESTION DE LA QUEUE ===
   */

  /**
   * Ajoute une notification à la queue
   */
  private async queueNotification(notification: LoyaltyNotificationData): Promise<void> {
    this.notificationQueue.push(notification);
    
    // Traiter immédiatement si pas déjà en cours
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Traite la queue de notifications
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.notificationQueue.length === 0) return;
    
    this.processingQueue = true;

    try {
      const notifications = [...this.notificationQueue];
      this.notificationQueue = [];

      // Grouper par utilisateur et traiter par lots
      const userNotifications = new Map<string, LoyaltyNotificationData[]>();
      
      notifications.forEach(notification => {
        if (!userNotifications.has(notification.userId)) {
          userNotifications.set(notification.userId, []);
        }
        userNotifications.get(notification.userId)!.push(notification);
      });

      // Traiter chaque utilisateur
      for (const [userId, userNotifs] of userNotifications.entries()) {
        try {
          // Trier par priorité
          userNotifs.sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

          // Envoyer la notification la plus importante
          const topNotification = userNotifs[0];
          await this.sendLoyaltyNotification(topNotification);

          // Programmer les autres avec un délai
          for (let i = 1; i < userNotifs.length; i++) {
            setTimeout(() => {
              this.sendLoyaltyNotification(userNotifs[i]);
            }, i * 2000); // Délai progressif
          }

        } catch (error) {
          performanceMonitor.error('Erreur traitement notifications utilisateur', { userId, error });
        }
      }

    } catch (error) {
      performanceMonitor.error('Erreur traitement queue notifications fidélité', { error });
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Envoie une notification de fidélité
   */
  private async sendLoyaltyNotification(notification: LoyaltyNotificationData): Promise<void> {
    try {
      const templateMap: Record<string, string> = {
        'points_earned': 'loyalty-points-earned',
        'level_up': 'loyalty-level-up',
        'reward_available': 'loyalty-reward-available',
        'challenge_completed': 'loyalty-challenge-completed',
        'points_expiring': 'loyalty-points-expiring',
        'birthday_bonus': 'loyalty-birthday-bonus',
        'referral_bonus': 'loyalty-referral-bonus',
        'streak_milestone': 'loyalty-streak-milestone'
      };

      const templateId = templateMap[notification.type];
      if (!templateId) {
        throw new Error(`Template non trouvé pour le type: ${notification.type}`);
      }

      await notificationsService.sendNotificationFromTemplate(
        templateId,
        notification.data,
        notification.userId
      );

      performanceMonitor.debug('Notification fidélité envoyée', {
        userId: notification.userId,
        type: notification.type,
        priority: notification.priority
      });

    } catch (error) {
      performanceMonitor.error('Erreur envoi notification fidélité', {
        userId: notification.userId,
        type: notification.type,
        error
      });
    }
  }

  /**
   * Démarre le traitement automatique de la queue
   */
  private startQueueProcessing(): void {
    // Vérifier la queue toutes les 30 secondes
    setInterval(() => {
      if (this.notificationQueue.length > 0 && !this.processingQueue) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * === UTILITAIRES ===
   */

  /**
   * Calcule le seuil pour la prochaine récompense
   */
  private getNextRewardThreshold(currentPoints: number): number {
    const milestones = [100, 250, 500, 1000, 2000, 5000];
    return milestones.find(milestone => milestone > currentPoints) || currentPoints;
  }

  /**
   * Vérifie si un utilisateur doit recevoir des notifications
   */
  private async shouldSendNotification(userId: string, type: string): Promise<boolean> {
    try {
      // Vérifier les préférences utilisateur
      const user = await loyaltyService.getUser(userId);
      if (!user || !user.preferences) return false;

      // Logique de filtrage selon le type
      switch (type) {
        case 'points_earned':
        case 'level_up':
        case 'challenge_completed':
          return user.preferences.pushNotifications;
        case 'reward_available':
        case 'points_expiring':
          return user.preferences.pushNotifications;
        case 'birthday_bonus':
        case 'referral_bonus':
        case 'streak_milestone':
          return user.preferences.pushNotifications;
        default:
          return true;
      }
    } catch (error) {
      performanceMonitor.error('Erreur vérification préférences notification', { userId, type, error });
      return false;
    }
  }

  /**
   * === MÉTHODES PUBLIQUES ===
   */

  /**
   * Envoie une notification personnalisée
   */
  async sendCustomLoyaltyNotification(
    userId: string,
    type: string,
    data: Record<string, any>,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    await this.queueNotification({
      userId,
      type: type as any,
      data,
      priority
    });
  }

  /**
   * Programme une notification pour plus tard
   */
  async scheduleLoyaltyNotification(
    userId: string,
    type: string,
    data: Record<string, any>,
    scheduledAt: Date,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<void> {
    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.queueNotification({
          userId,
          type: type as any,
          data,
          priority
        });
      }, delay);
    }
  }

  /**
   * Récupère les statistiques de notifications
   */
  getNotificationStats(): {
    queueSize: number;
    initialized: boolean;
    templatesCount: number;
  } {
    return {
      queueSize: this.notificationQueue.length,
      initialized: this.initialized,
      templatesCount: LOYALTY_NOTIFICATION_TEMPLATES.length
    };
  }
}

// Instance singleton
export const loyaltyNotificationsService = LoyaltyNotificationsService.getInstance();

// Export pour utilisation directe
export default loyaltyNotificationsService;

// Initialisation automatique
if (typeof window === 'undefined') {
  // Côté serveur, initialiser automatiquement
  loyaltyNotificationsService.initialize().catch(error => {
    console.error('Erreur initialisation service notifications fidélité:', error);
  });
}