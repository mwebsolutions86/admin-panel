/**
 * Exemples d'Utilisation Pratiques du Système de Notifications
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 * 
 * Ce fichier contient des exemples concrets d'utilisation du système
 * de notifications push dans différents scénarios business.
 */

import { useNotifications } from '@/hooks/use-notifications';
import { userSegmentationService } from '@/lib/user-segmentation';
import { notificationsService } from '@/lib/notifications-service';

// ============================================================================
// EXEMPLE 1 : Notifications de Cycle de Commande
// ============================================================================

export class OrderNotificationExamples {
  
  /**
   * Envoie des notifications pour tous les statuts de commande
   */
  static async sendOrderStatusNotifications() {
    const orderId = 'order-12345';
    const customerId = 'customer-789';
    const storeName = 'Mama Restaurant';
    const estimatedTime = 25;

    try {
      // 1. Confirmation de commande
      await notificationsService.sendNotificationFromTemplate(
        'order-confirmed',
        {
          orderNumber: orderId,
          storeName,
          estimatedTime: estimatedTime.toString()
        },
        customerId
      );

      // 2. Mise à jour du statut (après 5 minutes)
      setTimeout(async () => {
        await notificationsService.sendNotificationFromTemplate(
          'order-preparing',
          {
            orderNumber: orderId,
            storeName
          },
          customerId
        );
      }, 5 * 60 * 1000);

      // 3. Commande prête (après 15 minutes)
      setTimeout(async () => {
        await notificationsService.sendNotificationFromTemplate(
          'order-ready',
          {
            orderNumber: orderId,
            storeName
          },
          customerId
        );
      }, 15 * 60 * 1000);

      // 4. Commande livrée (après 25 minutes)
      setTimeout(async () => {
        await notificationsService.sendNotificationFromTemplate(
          'order-delivered',
          {
            orderNumber: orderId,
            storeName
          },
          customerId
        );
      }, 25 * 60 * 1000);

    } catch (error) {
      console.error('Erreur notifications cycle commande:', error);
    }
  }

  /**
   * Notification urgente pour problème de commande
   */
  static async sendOrderProblemNotification() {
    const orderId = 'order-12345';
    const customerId = 'customer-789';
    const issue = 'Retard de livraison';

    const payload = {
      title: 'Problème avec votre commande',
      body: `Votre commande ${orderId} rencontre un retard. Nous vous contacterons bientôt.`,
      icon: '/icons/warning.png',
      tag: 'order-problem',
      requireInteraction: true,
      data: {
        type: 'order_issue',
        orderId,
        issue,
        urgent: true
      }
    };

    await notificationsService.sendCustomNotification(payload, customerId);
  }

  /**
   * Notification personnalisée pour livraison special
   */
  static async sendSpecialDeliveryNotification() {
    const orderId = 'order-12345';
    const customerId = 'customer-789';
    const deliveryTime = 'Express (15 min)';

    const payload = {
      title: 'Livraison Express !',
      body: `Votre commande ${orderId} sera livrée en ${deliveryTime}`,
      icon: '/icons/express-delivery.png',
      tag: 'express-delivery',
      data: {
        type: 'express_delivery',
        orderId,
        deliveryTime
      }
    };

    await notificationsService.sendCustomNotification(payload, customerId);
  }
}

// ============================================================================
// EXEMPLE 2 : Système de Fidélité
// ============================================================================

export class LoyaltyNotificationExamples {

  /**
   * Notification de points fidélité attribués
   */
  static async sendLoyaltyPointsNotification() {
    const customerId = 'customer-789';
    const pointsEarned = 50;
    const totalPoints = 250;
    const nextRewardThreshold = 300;

    const variables = {
      points: pointsEarned.toString(),
      totalPoints: totalPoints.toString(),
      rewardThreshold: (nextRewardThreshold - totalPoints).toString()
    };

    await notificationsService.sendNotificationFromTemplate(
      'loyalty-points',
      variables,
      customerId
    );
  }

  /**
   * Notification de récompense disponible
   */
  static async sendRewardAvailableNotification() {
    const customerId = 'customer-789';
    const rewardName = 'Réduction 20% sur votre prochaine commande';
    const expiryDate = '15 février 2025';

    const payload = {
      title: 'Récompense disponible !',
      body: `${rewardName}. Utilisable jusqu'au ${expiryDate}`,
      icon: '/icons/reward.png',
      tag: 'loyalty-reward',
      requireInteraction: true,
      actions: [
        {
          action: 'claim-reward',
          title: 'Utiliser maintenant',
          requireInteraction: true
        }
      ],
      data: {
        type: 'loyalty_reward',
        rewardName,
        expiryDate
      }
    };

    await notificationsService.sendCustomNotification(payload, customerId);
  }

  /**
   * Notification d'upgrade de niveau fidélité
   */
  static async sendLoyaltyTierUpgradeNotification() {
    const customerId = 'customer-789';
    const oldTier = 'Bronze';
    const newTier = 'Silver';
    const benefits = 'Livraison gratuite + Accès offres exclusives';

    const payload = {
      title: `Félicitations ! Niveau ${newTier} atteint !`,
      body: `Vous passez du niveau ${oldTier} au niveau ${newTier}. ${benefits}`,
      icon: '/icons/tier-upgrade.png',
      tag: 'loyalty-upgrade',
      requireInteraction: true,
      data: {
        type: 'loyalty_upgrade',
        oldTier,
        newTier,
        benefits
      }
    };

    await notificationsService.sendCustomNotification(payload, customerId);
  }
}

// ============================================================================
// EXEMPLE 3 : Promotions et Marketing
// ============================================================================

export class PromotionNotificationExamples {

  /**
   * Promotion personnalisée selon segmentation
   */
  static async sendPersonalizedPromotion() {
    const customerId = 'customer-789';
    
    // Récupérer les segments de l'utilisateur
    const userSegments = userSegmentationService.getUserSegments(customerId);
    const isFrequentCustomer = userSegments.some(s => s.id === 'frequent-customers');
    const isHighValueCustomer = userSegments.some(s => s.id === 'high-value-customers');
    
    let templateId = 'promotion-special';
    let variables: Record<string, string> = {};

    if (isHighValueCustomer) {
      // Offre premium pour clients à haute valeur
      variables = {
        promoCode: 'VIP30',
        discount: '30%',
        expiryDate: '31 janvier 2025'
      };
    } else if (isFrequentCustomer) {
      // Offre fidélité pour clients fréquents
      variables = {
        promoCode: 'FIDEL20',
        discount: '20%',
        expiryDate: '31 janvier 2025'
      };
    } else {
      // Offre standard
      variables = {
        promoCode: 'WELCOME15',
        discount: '15%',
        expiryDate: '31 janvier 2025'
      };
    }

    await notificationsService.sendNotificationFromTemplate(
      templateId,
      variables,
      customerId
    );
  }

  /**
   * Promotion géolocalisée
   */
  static async sendLocationBasedPromotion() {
    // Récupérer les utilisateurs de Casablanca
    const casablancaUsers = userSegmentationService.getSegmentUsers('casablanca-users');
    
    for (const userId of casablancaUsers) {
      // Vérifier les préférences utilisateur
      const profile = userSegmentationService.getUserProfile(userId);
      if (profile?.preferences?.notifications?.promotions) {
        
        await notificationsService.sendNotificationFromTemplate(
          'promotion-special',
          {
            promoCode: 'CASA25',
            discount: '25%',
            expiryDate: '15 février 2025',
            location: 'Casablanca'
          },
          userId
        );
      }
    }
  }

  /**
   * Promotion pour utilisateurs inactifs
   */
  static async sendWinBackPromotion() {
    // Récupérer les utilisateurs inactifs
    const dormantUsers = userSegmentationService.getSegmentUsers('dormant-users');
    
    for (const userId of dormantUsers) {
      const profile = userSegmentationService.getUserProfile(userId);
      if (profile?.preferences?.notifications?.marketing) {
        
        const payload = {
          title: 'On vous manque !',
          body: 'Revenez avec 25% de réduction sur votre prochaine commande',
          icon: '/icons/welcome-back.png',
          tag: 'winback',
          requireInteraction: true,
          actions: [
            {
              action: 'order-now',
              title: 'Commander maintenant',
              requireInteraction: true
            }
          ],
          data: {
            type: 'winback',
            discount: '25%',
            promoCode: 'COMEBACK25'
          }
        };

        await notificationsService.sendCustomNotification(payload, userId);
      }
    }
  }
}

// ============================================================================
// EXEMPLE 4 : Notifications Système
// ============================================================================

export class SystemNotificationExamples {

  /**
   * Notification de maintenance programmée
   */
  static async sendMaintenanceNotification() {
    const maintenanceTime = 'Dimanche 15 janvier 2025 à 02:00';
    const duration = '2 heures';
    const description = 'Mise à jour des systèmes pour améliorer vos performances.';

    const variables = {
      maintenanceTime,
      duration,
      description
    };

    // Envoyer à tous les utilisateurs actifs
    const activeUsers = userSegmentationService.getSegmentUsers('push-enabled');
    
    for (const userId of activeUsers) {
      await notificationsService.sendNotificationFromTemplate(
        'system-maintenance',
        variables,
        userId
      );
    }
  }

  /**
   * Notification de nouvelle fonctionnalité
   */
  static async sendNewFeatureNotification() {
    const featureName = 'Commandes groupées';
    const description = 'Maintenant vous pouvez commander pour plusieurs personnes en même temps !';
    const benefits = 'Parfait pour les bureaux et les événements';

    const payload = {
      title: `Nouvelle fonctionnalité : ${featureName}`,
      body: `${description} ${benefits}`,
      icon: '/icons/new-feature.png',
      tag: 'new-feature',
      requireInteraction: true,
      actions: [
        {
          action: 'try-feature',
          title: 'Essayer maintenant',
          requireInteraction: true
        }
      ],
      data: {
        type: 'new_feature',
        featureName,
        description
      }
    };

    // Envoyer aux utilisateurs les plus actifs
    const activeUsers = userSegmentationService.getSegmentUsers('frequent-customers');
    
    for (const userId of activeUsers) {
      await notificationsService.sendCustomNotification(payload, userId);
    }
  }

  /**
   * Notification de sécurité importante
   */
  static async sendSecurityAlert() {
    const payload = {
      title: 'Mise à jour de sécurité requise',
      body: 'Veuillez mettre à jour votre application pour garantir la sécurité de vos données.',
      icon: '/icons/security.png',
      tag: 'security-alert',
      requireInteraction: true,
      data: {
        type: 'security_alert',
        priority: 'high'
      }
    };

    // Envoyer à tous les utilisateurs
    const allUsers = userSegmentationService.getUserSegments('push-enabled');
    
    for (const userId of allUsers) {
      await notificationsService.sendCustomNotification(payload, userId);
    }
  }
}

// ============================================================================
// EXEMPLE 5 : Intégration avec les Hooks React
// ============================================================================

import { useState, useEffect } from 'react';

export function OrderTrackingComponent({ orderId, customerId }: { orderId: string; customerId: string }) {
  const [orderStatus, setOrderStatus] = useState('confirmed');
  const [estimatedTime, setEstimatedTime] = useState(25);
  
  const { sendFromTemplate, isLoading } = useNotifications({ 
    userId: customerId,
    autoInitialize: true 
  });

  // Simuler les changements de statut
  useEffect(() => {
    const updateOrderStatus = async () => {
      try {
        switch (orderStatus) {
          case 'confirmed':
            // Statut initial - déjà confirmé
            break;
            
          case 'preparing':
            await sendFromTemplate('order-preparing', {
              orderNumber: orderId,
              storeName: 'Mama Restaurant'
            });
            break;
            
          case 'ready':
            await sendFromTemplate('order-ready', {
              orderNumber: orderId,
              storeName: 'Mama Restaurant'
            });
            break;
            
          case 'delivered':
            await sendFromTemplate('order-delivered', {
              orderNumber: orderId,
              storeName: 'Mama Restaurant'
            });
            
            // Bonus : offrir des points fidélité
            setTimeout(async () => {
              await sendFromTemplate('loyalty-points', {
                points: '50',
                totalPoints: '300',
                rewardThreshold: '50'
              });
            }, 1000);
            break;
        }
      } catch (error) {
        console.error('Erreur notification statut commande:', error);
      }
    };

    updateOrderStatus();
  }, [orderStatus, orderId, sendFromTemplate]);

  const updateStatus = (newStatus: string) => {
    setOrderStatus(newStatus);
  };

  return (
    <div className="order-tracking">
      <h3>Suivi de commande {orderId}</h3>
      <p>Statut actuel: {orderStatus}</p>
      <p>Temps estimé: {estimatedTime} minutes</p>
      
      <div className="status-buttons">
        <button 
          onClick={() => updateStatus('preparing')}
          disabled={isLoading}
        >
          En préparation
        </button>
        <button 
          onClick={() => updateStatus('ready')}
          disabled={isLoading}
        >
          Prête
        </button>
        <button 
          onClick={() => updateStatus('delivered')}
          disabled={isLoading}
        >
          Livrée
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLE 6 : Campaign Marketing Automatisée
// ============================================================================

export class MarketingCampaignExamples {
  
  /**
   * Campagne "Happy Hour" automatisée
   */
  static async runHappyHourCampaign() {
    const currentHour = new Date().getHours();
    
    // Happy Hour : 17h-19h
    if (currentHour >= 17 && currentHour <= 19) {
      // Cibler les utilisateurs actifs de Casablanca
      const targetUsers = userSegmentationService.getSegmentUsers('casablanca-users');
      
      for (const userId of targetUsers) {
        const profile = userSegmentationService.getUserProfile(userId);
        
        // Vérifier les préférences et l'activité récente
        if (profile?.preferences?.notifications?.promotions && 
            profile.behavior?.orderFrequency === 'high') {
          
          await notificationsService.sendNotificationFromTemplate(
            'promotion-special',
            {
              promoCode: 'HAPPY25',
              discount: '25%',
              expiryDate: '19:00',
              message: 'Happy Hour en cours !'
            },
            userId
          );
        }
      }
    }
  }

  /**
   * Campagne de rappel de panier abandoné
   */
  static async sendAbandonedCartReminder() {
    // Simuler des utilisateurs avec panier abandoné
    const abandonedCartUsers = ['user1', 'user2', 'user3'];
    
    for (const userId of abandonedCartUsers) {
      const profile = userSegmentationService.getUserProfile(userId);
      
      if (profile?.preferences?.notifications?.marketing) {
        const payload = {
          title: 'Votre panier vous attend !',
          body: 'Complétez votre commande et bénéficiez de 10% de réduction',
          icon: '/icons/cart-reminder.png',
          tag: 'abandoned-cart',
          requireInteraction: true,
          actions: [
            {
              action: 'complete-order',
              title: 'Finaliser ma commande',
              requireInteraction: true
            }
          ],
          data: {
            type: 'cart_reminder',
            discount: '10%',
            promoCode: 'REMEMBER10'
          }
        };

        await notificationsService.sendCustomNotification(payload, userId);
      }
    }
  }

  /**
   * Campagne d\'anniversaire client
   */
  static async sendBirthdayCampaign() {
    // Récupérer les utilisateurs dont c'est l'anniversaire aujourd'hui
    const today = new Date();
    const birthdayUsers = this.getBirthdayUsers(today);
    
    for (const userId of birthdayUsers) {
      const profile = userSegmentationService.getUserProfile(userId);
      
      if (profile?.preferences?.notifications?.marketing) {
        const payload = {
          title: 'Joyeux anniversaire ! 🎉',
          body: 'Profitez de 50% de réduction pour celebrate votre jour spécial !',
          icon: '/icons/birthday.png',
          tag: 'birthday',
          requireInteraction: true,
          actions: [
            {
              action: 'celebrate-order',
              title: 'Commander pour celebrate',
              requireInteraction: true
            }
          ],
          data: {
            type: 'birthday',
            discount: '50%',
            promoCode: 'BIRTHDAY50'
          }
        };

        await notificationsService.sendCustomNotification(payload, userId);
      }
    }
  }

  private static getBirthdayUsers(today: Date): string[] {
    // En production, cette méthode ferait une requête base de données
    // pour trouver les utilisateurs dont c'est l'anniversaire aujourd'hui
    return ['user1', 'user2', 'user3']; // Exemple
  }
}

// ============================================================================
// EXEMPLE 7 : Composant React Avancé
// ============================================================================

export function NotificationDashboard() {
  const [selectedCampaign, setSelectedCampaign] = useState('order-status');
  const { 
    sendFromTemplate, 
    getUserAnalytics, 
    isLoading, 
    analytics,
    templates 
  } = useNotifications({ 
    userId: 'admin-user',
    autoInitialize: true 
  });

  const runCampaign = async (campaignType: string) => {
    try {
      switch (campaignType) {
        case 'order-status':
          await OrderNotificationExamples.sendOrderStatusNotifications();
          break;
          
        case 'loyalty-points':
          await LoyaltyNotificationExamples.sendLoyaltyPointsNotification();
          break;
          
        case 'promotion':
          await PromotionNotificationExamples.sendPersonalizedPromotion();
          break;
          
        case 'happy-hour':
          await MarketingCampaignExamples.runHappyHourCampaign();
          break;
          
        case 'birthday':
          await MarketingCampaignExamples.sendBirthdayCampaign();
          break;
      }
      
      console.log('Campagne exécutée:', campaignType);
    } catch (error) {
      console.error('Erreur campagne:', error);
    }
  };

  return (
    <div className="notification-dashboard">
      <h2>Dashboard Notifications</h2>
      
      <div className="analytics-section">
        <h3>Analytics</h3>
        {analytics && (
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Envoyées</h4>
              <p>{analytics.sent}</p>
            </div>
            <div className="stat-card">
              <h4>Livrées</h4>
              <p>{analytics.delivered}</p>
            </div>
            <div className="stat-card">
              <h4>Ouvertes</h4>
              <p>{analytics.opened}</p>
            </div>
            <div className="stat-card">
              <h4>Conversion</h4>
              <p>{analytics.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="campaigns-section">
        <h3>Campagnes</h3>
        <div className="campaign-buttons">
          <button 
            onClick={() => runCampaign('order-status')}
            disabled={isLoading}
          >
            Test Statuts Commande
          </button>
          <button 
            onClick={() => runCampaign('loyalty-points')}
            disabled={isLoading}
          >
            Points Fidélité
          </button>
          <button 
            onClick={() => runCampaign('promotion')}
            disabled={isLoading}
          >
            Promotion Personnalisée
          </button>
          <button 
            onClick={() => runCampaign('happy-hour')}
            disabled={isLoading}
          >
            Happy Hour
          </button>
          <button 
            onClick={() => runCampaign('birthday')}
            disabled={isLoading}
          >
            Anniversaire
          </button>
        </div>
      </div>

      <div className="templates-section">
        <h3>Templates Disponibles</h3>
        <ul>
          {templates.map(template => (
            <li key={template.id}>
              <strong>{template.name}</strong> - {template.type}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITAIRES
// ============================================================================

export const NotificationUtils = {
  /**
   * Formatage des dates pour les notifications
   */
  formatNotificationTime: (date: Date): string => {
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Calcul du temps estimé de livraison
   */
  calculateDeliveryTime: (orderTime: Date, preparationTime: number): string => {
    const deliveryTime = new Date(orderTime.getTime() + preparationTime * 60000);
    return `vers ${deliveryTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  },

  /**
   * Génération de codes promo dynamiques
   */
  generatePromoCode: (userId: string, campaign: string): string => {
    const timestamp = Date.now().toString().slice(-4);
    const userHash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString(36).substring(0, 3);
    
    return `${campaign.toUpperCase()}${userHash}${timestamp}`;
  },

  /**
   * Validation des préférences utilisateur
   */
  validateUserPreferences: (preferences: any): boolean => {
    return preferences &&
           typeof preferences.orderUpdates === 'boolean' &&
           typeof preferences.promotions === 'boolean' &&
           typeof preferences.loyalty === 'boolean';
  }
};

// Export de toutes les classes et utilitaires
export default {
  OrderNotificationExamples,
  LoyaltyNotificationExamples,
  PromotionNotificationExamples,
  SystemNotificationExamples,
  MarketingCampaignExamples,
  NotificationUtils
};