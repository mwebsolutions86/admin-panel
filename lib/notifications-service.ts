/**
 * Service de Notifications Push Multi-Plateformes
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 * 
 * Ce service unifie les notifications push pour web, mobile (iOS/Android) et desktop
 * avec intégration complète du système de cache et monitoring Phase 1.
 */

import { performanceMonitor } from './performance-monitor';
import { productCache, userCache, CacheUtils } from './cache-service';
import { configManager, ConfigUtils } from './optimization-config';

// Types pour les notifications
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  silent?: boolean;
  requireInteraction?: boolean;
  tag?: string;
  renotify?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  destructive?: boolean;
  requireInteraction?: boolean;
}

export interface DeviceRegistration {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'web' | 'ios' | 'android' | 'desktop';
  pushEndpoint?: string;
  p256dhKey?: string;
  authKey?: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string;
  preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  loyalty: boolean;
  system: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // Format HH:mm
    end: string;   // Format HH:mm
    timezone: string;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'order' | 'promotion' | 'loyalty' | 'system';
  platform: 'all' | 'web' | 'ios' | 'android' | 'desktop';
  variables: string[];
  payload: {
    web: NotificationPayload;
    ios: NotificationPayload;
    android: NotificationPayload;
    desktop: NotificationPayload;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueueItem {
  id: string;
  userId: string;
  templateId?: string;
  payload: NotificationPayload;
  targetPlatforms: string[];
  scheduledAt: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  createdAt: string;
  sentAt?: string;
}

export interface NotificationAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  conversionRate: number;
  last24h: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
}

// Configuration du service
export interface NotificationsConfig {
  enabled: boolean;
  platforms: {
    web: {
      enabled: boolean;
      vapidPublicKey?: string;
      vapidPrivateKey?: string;
    };
    fcm: {
      enabled: boolean;
      serverKey?: string;
      projectId?: string;
    };
    apns: {
      enabled: boolean;
      keyId?: string;
      teamId?: string;
      bundleId?: string;
      privateKey?: string;
    };
  };
  queue: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
  };
  analytics: {
    enabled: boolean;
    retentionDays: number;
  };
}

// Templates de notifications par défaut
const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'order-confirmed',
    name: 'Commande Confirmée',
    type: 'order',
    platform: 'all',
    variables: ['orderNumber', 'storeName', 'estimatedTime'],
    payload: {
      web: {
        title: 'Commande confirmée !',
        body: 'Votre commande #{orderNumber} a été confirmée par {storeName}. Temps estimé : {estimatedTime} min',
        icon: '/icons/order-confirmed.png',
        tag: 'order-update',
        requireInteraction: true,
        data: { type: 'order_status', status: 'confirmed' }
      },
      ios: {
        title: 'Commande confirmée !',
        body: 'Votre commande #{orderNumber} est confirmée',
        badge: '1',
        data: { type: 'order_status', status: 'confirmed' }
      },
      android: {
        title: 'Commande confirmée !',
        body: 'Votre commande #{orderNumber} est confirmée',
        icon: '@mipmap/ic_notification',
        data: { type: 'order_status', status: 'confirmed' }
      },
      desktop: {
        title: 'Commande confirmée !',
        body: 'Votre commande #{orderNumber} a été confirmée',
        icon: '/icons/order-confirmed.png',
        tag: 'order-update',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'order-preparing',
    name: 'En Préparation',
    type: 'order',
    platform: 'all',
    variables: ['orderNumber', 'storeName'],
    payload: {
      web: {
        title: 'En préparation',
        body: 'Votre commande #{orderNumber} est en cours de préparation chez {storeName}',
        icon: '/icons/preparing.png',
        tag: 'order-update',
        data: { type: 'order_status', status: 'preparing' }
      },
      ios: {
        title: 'En préparation',
        body: 'Commande #{orderNumber} en préparation',
        data: { type: 'order_status', status: 'preparing' }
      },
      android: {
        title: 'En préparation',
        body: 'Commande #{orderNumber} en préparation',
        icon: '@mipmap/ic_notification',
        data: { type: 'order_status', status: 'preparing' }
      },
      desktop: {
        title: 'En préparation',
        body: 'Votre commande #{orderNumber} est en préparation',
        icon: '/icons/preparing.png',
        tag: 'order-update'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'order-ready',
    name: 'Prête',
    type: 'order',
    platform: 'all',
    variables: ['orderNumber', 'storeName'],
    payload: {
      web: {
        title: 'Commande prête !',
        body: 'Votre commande #{orderNumber} est prête à être récupérée',
        icon: '/icons/ready.png',
        tag: 'order-update',
        requireInteraction: true,
        actions: [
          {
            action: 'mark-delivered',
            title: 'Marquer comme récupérée',
            requireInteraction: true
          }
        ],
        data: { type: 'order_status', status: 'ready' }
      },
      ios: {
        title: 'Commande prête !',
        body: 'Votre commande #{orderNumber} est prête',
        badge: '1',
        data: { type: 'order_status', status: 'ready' }
      },
      android: {
        title: 'Commande prête !',
        body: 'Votre commande #{orderNumber} est prête',
        icon: '@mipmap/ic_notification',
        data: { type: 'order_status', status: 'ready' }
      },
      desktop: {
        title: 'Commande prête !',
        body: 'Votre commande #{orderNumber} est prête',
        icon: '/icons/ready.png',
        tag: 'order-update',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'order-delivered',
    name: 'Livrée',
    type: 'order',
    platform: 'all',
    variables: ['orderNumber', 'storeName'],
    payload: {
      web: {
        title: 'Commande livrée !',
        body: 'Votre commande #{orderNumber} a été livrée avec succès',
        icon: '/icons/delivered.png',
        tag: 'order-update',
        data: { type: 'order_status', status: 'delivered' }
      },
      ios: {
        title: 'Commande livrée !',
        body: 'Votre commande #{orderNumber} est livrée',
        data: { type: 'order_status', status: 'delivered' }
      },
      android: {
        title: 'Commande livrée !',
        body: 'Votre commande #{orderNumber} est livrée',
        icon: '@mipmap/ic_notification',
        data: { type: 'order_status', status: 'delivered' }
      },
      desktop: {
        title: 'Commande livrée !',
        body: 'Votre commande #{orderNumber} a été livrée',
        icon: '/icons/delivered.png',
        tag: 'order-update'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'promotion-special',
    name: 'Promotion Spéciale',
    type: 'promotion',
    platform: 'all',
    variables: ['promoCode', 'discount', 'expiryDate'],
    payload: {
      web: {
        title: 'Offre spéciale !',
        body: 'Profitez de {discount} de réduction avec le code {promoCode}. Valable jusqu\'au {expiryDate}',
        icon: '/icons/promotion.png',
        tag: 'promotion',
        requireInteraction: true,
        actions: [
          {
            action: 'apply-promo',
            title: 'Utiliser l\'offre',
            requireInteraction: true
          }
        ],
        data: { type: 'promotion', promoCode: '{promoCode}' }
      },
      ios: {
        title: 'Offre spéciale !',
        body: '{discount} de réduction avec {promoCode}',
        data: { type: 'promotion', promoCode: '{promoCode}' }
      },
      android: {
        title: 'Offre spéciale !',
        body: '{discount} de réduction avec {promoCode}',
        icon: '@mipmap/ic_notification',
        data: { type: 'promotion', promoCode: '{promoCode}' }
      },
      desktop: {
        title: 'Offre spéciale !',
        body: 'Profitez de {discount} de réduction avec {promoCode}',
        icon: '/icons/promotion.png',
        tag: 'promotion',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-points',
    name: 'Points Fidélité',
    type: 'loyalty',
    platform: 'all',
    variables: ['points', 'totalPoints', 'rewardThreshold'],
    payload: {
      web: {
        title: 'Points fidélité gagnés !',
        body: 'Vous avez gagné {points} points ! Total : {totalPoints} points. Plus que {rewardThreshold} points pour votre prochaine récompense !',
        icon: '/icons/loyalty.png',
        tag: 'loyalty',
        data: { type: 'loyalty', points: '{points}', totalPoints: '{totalPoints}' }
      },
      ios: {
        title: 'Points fidélité !',
        body: '+{points} points gagnés ! Total : {totalPoints}',
        data: { type: 'loyalty', points: '{points}' }
      },
      android: {
        title: 'Points fidélité !',
        body: '+{points} points gagnés ! Total : {totalPoints}',
        icon: '@mipmap/ic_notification',
        data: { type: 'loyalty', points: '{points}' }
      },
      desktop: {
        title: 'Points fidélité gagnés !',
        body: 'Vous avez gagné {points} points ! Total : {totalPoints}',
        icon: '/icons/loyalty.png',
        tag: 'loyalty'
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'system-maintenance',
    name: 'Maintenance Système',
    type: 'system',
    platform: 'all',
    variables: ['maintenanceTime', 'duration', 'description'],
    payload: {
      web: {
        title: 'Maintenance programmée',
        body: 'Une maintenance est prévue le {maintenanceTime} pour une durée de {duration}. {description}',
        icon: '/icons/maintenance.png',
        tag: 'system',
        requireInteraction: true,
        data: { type: 'system', category: 'maintenance' }
      },
      ios: {
        title: 'Maintenance',
        body: 'Maintenance le {maintenanceTime} pour {duration}',
        data: { type: 'system', category: 'maintenance' }
      },
      android: {
        title: 'Maintenance programmée',
        body: 'Maintenance le {maintenanceTime} pour {duration}',
        icon: '@mipmap/ic_notification',
        data: { type: 'system', category: 'maintenance' }
      },
      desktop: {
        title: 'Maintenance programmée',
        body: 'Une maintenance est prévue le {maintenanceTime} pour {duration}',
        icon: '/icons/maintenance.png',
        tag: 'system',
        requireInteraction: true
      }
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Configuration par défaut
const DEFAULT_CONFIG: NotificationsConfig = {
  enabled: true,
  platforms: {
    web: {
      enabled: true,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
    },
    fcm: {
      enabled: true,
      serverKey: process.env.FCM_SERVER_KEY,
      projectId: process.env.FCM_PROJECT_ID
    },
    apns: {
      enabled: true,
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
      bundleId: process.env.APNS_BUNDLE_ID,
      privateKey: process.env.APNS_PRIVATE_KEY
    }
  },
  queue: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000,
    batchSize: 100
  },
  analytics: {
    enabled: true,
    retentionDays: 30
  }
};

/**
 * Service principal de notifications push multi-plateformes
 */
export class NotificationsService {
  private config: NotificationsConfig;
  private templates: Map<string, NotificationTemplate> = new Map();
  private deviceRegistrations: Map<string, DeviceRegistration> = new Map();
  private notificationQueue: NotificationQueueItem[] = [];
  private analytics: Map<string, NotificationAnalytics> = new Map();
  private isInitialized = false;
  private processingQueue = false;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initializeTemplates();
    this.loadFromCache();
    
    performanceMonitor.info('NotificationsService initialisé', {
      templates: this.templates.size,
      config: this.config
    });
  }

  /**
   * Initialise les templates par défaut
   */
  private initializeTemplates() {
    DEFAULT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
    performanceMonitor.debug('Templates de notifications initialisés', {
      count: this.templates.size
    });
  }

  /**
   * Charge les données depuis le cache Phase 1
   */
  private loadFromCache() {
    try {
      // Charger les appareils enregistrés
      const cachedDevices = userCache.get<DeviceRegistration[]>('notification_devices');
      if (cachedDevices && Array.isArray(cachedDevices)) {
        cachedDevices.forEach((device: DeviceRegistration) => {
          this.deviceRegistrations.set(device.id, device);
        });
      }

      // Charger la configuration
      const cachedConfig = userCache.get('notifications_config');
      if (cachedConfig) {
        this.config = { ...this.config, ...cachedConfig };
      }

      // Charger les analytics
      const cachedAnalytics = userCache.get('notifications_analytics');
      if (cachedAnalytics) {
        Object.entries(cachedAnalytics).forEach(([userId, analytics]) => {
          this.analytics.set(userId, analytics as NotificationAnalytics);
        });
      }

      performanceMonitor.info('Données de notifications chargées depuis le cache');
    } catch (error) {
      performanceMonitor.error('Erreur chargement cache notifications', { error });
    }
  }

  /**
   * Sauvegarde dans le cache Phase 1
   */
  private saveToCache() {
    try {
      // Sauvegarder les appareils enregistrés
      const devices = Array.from(this.deviceRegistrations.values());
      userCache.set('notification_devices', devices, 30 * 60 * 1000); // 30 minutes

      // Sauvegarder la configuration
      userCache.set('notifications_config', this.config, 60 * 60 * 1000); // 1 heure

      // Sauvegarder les analytics
      const analyticsObj = Object.fromEntries(this.analytics);
      userCache.set('notifications_analytics', analyticsObj, 15 * 60 * 1000); // 15 minutes

      performanceMonitor.debug('Données de notifications sauvegardées');
    } catch (error) {
      performanceMonitor.error('Erreur sauvegarde cache notifications', { error });
    }
  }

  /**
   * Initialise le service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      performanceMonitor.info('Initialisation du service de notifications');

      // Initialiser Web Push si activé
      if (this.config.platforms.web.enabled) {
        await this.initializeWebPush();
      }

      // Initialiser FCM si activé
      if (this.config.platforms.fcm.enabled) {
        await this.initializeFCM();
      }

      // Initialiser APNS si activé
      if (this.config.platforms.apns.enabled) {
        await this.initializeAPNS();
      }

      // Démarrer le traitement de la queue
      if (this.config.queue.enabled) {
        this.startQueueProcessing();
      }

      this.isInitialized = true;
      performanceMonitor.info('Service de notifications initialisé avec succès');

    } catch (error) {
      performanceMonitor.error('Erreur initialisation service notifications', { error });
      throw error;
    }
  }

  /**
   * Initialise Web Push API
   */
  private async initializeWebPush(): Promise<void> {
    if (!this.config.platforms.web.vapidPublicKey) {
      throw new Error('Clé VAPID publique manquante pour Web Push');
    }

    performanceMonitor.info('Web Push initialisé', {
      vapidPublicKey: this.config.platforms.web.vapidPublicKey.substring(0, 20) + '...'
    });
  }

  /**
   * Initialise Firebase Cloud Messaging
   */
  private async initializeFCM(): Promise<void> {
    if (!this.config.platforms.fcm.serverKey) {
      throw new Error('Clé serveur FCM manquante');
    }

    performanceMonitor.info('FCM initialisé', {
      projectId: this.config.platforms.fcm.projectId
    });
  }

  /**
   * Initialise Apple Push Notification Service
   */
  private async initializeAPNS(): Promise<void> {
    if (!this.config.platforms.apns.privateKey) {
      throw new Error('Clé privée APNS manquante');
    }

    performanceMonitor.info('APNS initialisé', {
      bundleId: this.config.platforms.apns.bundleId,
      teamId: this.config.platforms.apns.teamId
    });
  }

  /**
   * Demande les permissions pour les notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Les notifications ne sont pas supportées sur ce navigateur');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    performanceMonitor.info('Permission notifications demandée', {
      permission,
      userAgent: navigator.userAgent
    });

    return permission;
  }

  /**
   * Envoie une notification directe (payload brut) en ajoutant un item à la queue
   */
  async sendRawNotification(payload: NotificationPayload, targetPlatforms: string[] = ['all']): Promise<void> {
    const queueItem: NotificationQueueItem = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: '',
      templateId: undefined,
      payload,
      targetPlatforms,
      scheduledAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: this.config.queue.maxRetries,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.notificationQueue.push(queueItem);
    if (!this.processingQueue) {
      // start processing in background
      this.processQueue();
    }
  }

  /**
   * Enregistre un appareil pour recevoir les notifications
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'web' | 'ios' | 'android' | 'desktop',
    subscription?: PushSubscription
  ): Promise<string> {
    try {
      const deviceId = `${userId}-${platform}-${Date.now()}`;
      
      const registration: DeviceRegistration = {
        id: deviceId,
        userId,
        deviceToken,
        platform,
        pushEndpoint: subscription?.endpoint,
        p256dhKey: subscription ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh') || []))) : undefined,
        authKey: subscription ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth') || []))) : undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        preferences: {
          orderUpdates: true,
          promotions: true,
          loyalty: true,
          system: true,
          marketing: false,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            timezone: 'Africa/Casablanca'
          }
        }
      };

      this.deviceRegistrations.set(deviceId, registration);
      
      // Mettre à jour le cache
      this.saveToCache();

      performanceMonitor.info('Appareil enregistré pour notifications', {
        deviceId,
        userId,
        platform
      });

      return deviceId;
    } catch (error) {
      performanceMonitor.error('Erreur enregistrement appareil', { error, userId, platform });
      throw error;
    }
  }

  /**
   * Met à jour les préférences d'un appareil
   */
  updateDevicePreferences(
    deviceId: string,
    preferences: Partial<NotificationPreferences>
  ): void {
    const device = this.deviceRegistrations.get(deviceId);
    if (!device) {
      throw new Error('Appareil non trouvé');
    }

    device.preferences = { ...device.preferences, ...preferences };
    device.lastSeenAt = new Date().toISOString();
    
    this.saveToCache();

    performanceMonitor.debug('Préférences appareil mises à jour', {
      deviceId,
      preferences
    });
  }

  /**
   * Désenregistre un appareil
   */
  unregisterDevice(deviceId: string): void {
    const device = this.deviceRegistrations.get(deviceId);
    if (!device) {
      return;
    }

    device.isActive = false;
    this.saveToCache();

    performanceMonitor.info('Appareil désenregistré', { deviceId, userId: device.userId });
  }

  /**
   * Envoie une notification en utilisant un template
   */
  async sendNotificationFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    userId: string,
    targetPlatforms?: string[]
  ): Promise<string> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Template non trouvé: ${templateId}`);
      }

      const userDevices = this.getUserDevices(userId);
      const validDevices = userDevices.filter(device => {
        if (!device.isActive) return false;
        
        // Vérifier les préférences
        const prefs = device.preferences;
        if (!this.isNotificationAllowed(template.type, prefs)) {
          return false;
        }

        // Vérifier les heures silencieuses
        if (prefs.quietHours.enabled && this.isQuietHours(prefs.quietHours)) {
          return false;
        }

        // Filtrer par plateforme si spécifié
        if (targetPlatforms && !targetPlatforms.includes(device.platform)) {
          return false;
        }

        return true;
      });

      if (validDevices.length === 0) {
        performanceMonitor.warn('Aucun appareil valide trouvé pour notification', {
          templateId,
          userId,
          targetPlatforms
        });
        return '';
      }

      const queueItem: NotificationQueueItem = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        templateId,
        payload: this.processTemplate(template, variables),
        targetPlatforms: validDevices.map(d => d.platform),
        scheduledAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: this.config.queue.maxRetries,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      this.notificationQueue.push(queueItem);
      
      // Démarrer le traitement si nécessaire
      if (!this.processingQueue) {
        this.processQueue();
      }

      performanceMonitor.info('Notification ajoutée à la queue', {
        queueItemId: queueItem.id,
        templateId,
        userId,
        deviceCount: validDevices.length
      });

      return queueItem.id;
    } catch (error) {
      performanceMonitor.error('Erreur envoi notification template', { error, templateId, userId });
      throw error;
    }
  }

  /**
   * Envoie une notification personnalisée
   */
  async sendCustomNotification(
    payload: NotificationPayload,
    userId: string,
    targetPlatforms?: string[]
  ): Promise<string> {
    try {
      const userDevices = this.getUserDevices(userId);
      const validDevices = userDevices.filter(device => {
        if (!device.isActive) return false;
        if (targetPlatforms && !targetPlatforms.includes(device.platform)) {
          return false;
        }
        return true;
      });

      if (validDevices.length === 0) {
        performanceMonitor.warn('Aucun appareil valide trouvé pour notification personnalisée', {
          userId,
          targetPlatforms
        });
        return '';
      }

      const queueItem: NotificationQueueItem = {
        id: `custom-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        payload,
        targetPlatforms: validDevices.map(d => d.platform),
        scheduledAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: this.config.queue.maxRetries,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      this.notificationQueue.push(queueItem);
      
      if (!this.processingQueue) {
        this.processQueue();
      }

      performanceMonitor.info('Notification personnalisée ajoutée à la queue', {
        queueItemId: queueItem.id,
        userId,
        deviceCount: validDevices.length
      });

      return queueItem.id;
    } catch (error) {
      performanceMonitor.error('Erreur envoi notification personnalisée', { error, userId });
      throw error;
    }
  }

  /**
   * Traite un template avec les variables
   */
  private processTemplate(template: NotificationTemplate, variables: Record<string, string>): NotificationPayload {
    const processString = (str: string): string => {
      return str.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    const platform = 'web'; // Par défaut, peut être ajusté selon le contexte
    const basePayload = template.payload[platform];

    return {
      ...basePayload,
      title: processString(basePayload.title),
      body: processString(basePayload.body),
      data: basePayload.data ? Object.fromEntries(
        Object.entries(basePayload.data).map(([key, value]) => [
          key,
          typeof value === 'string' ? processString(value) : value
        ])
      ) : undefined
    };
  }

  /**
   * Vérifie si une notification est autorisée selon les préférences
   */
  private isNotificationAllowed(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'order':
        return preferences.orderUpdates;
      case 'promotion':
        return preferences.promotions;
      case 'loyalty':
        return preferences.loyalty;
      case 'system':
        return preferences.system;
      default:
        return true;
    }
  }

  /**
   * Vérifie si on est dans les heures silencieuses
   */
  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: quietHours.timezone
    });

    return currentTime >= quietHours.start && currentTime <= quietHours.end;
  }

  /**
   * Récupère les appareils d'un utilisateur
   */
  private getUserDevices(userId: string): DeviceRegistration[] {
    return Array.from(this.deviceRegistrations.values())
      .filter(device => device.userId === userId && device.isActive);
  }

  /**
   * Démarre le traitement de la queue
   */
  private startQueueProcessing(): void {
    setInterval(() => {
      if (!this.processingQueue && this.notificationQueue.length > 0) {
        this.processQueue();
      }
    }, 1000); // Vérifier toutes les secondes
  }

  /**
   * Traite la queue de notifications
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;

    try {
      const pendingItems = this.notificationQueue.filter(item => item.status === 'pending');
      
      if (pendingItems.length === 0) {
        this.processingQueue = false;
        return;
      }

      const batch = pendingItems.slice(0, this.config.queue.batchSize);
      
      performanceMonitor.debug('Traitement queue notifications', {
        batchSize: batch.length,
        queueSize: this.notificationQueue.length
      });

      await Promise.allSettled(
        batch.map(item => this.processNotificationItem(item))
      );

      // Nettoyer les éléments terminés
      this.notificationQueue = this.notificationQueue.filter(
        item => item.status === 'pending' || item.status === 'processing'
      );

    } catch (error) {
      performanceMonitor.error('Erreur traitement queue notifications', { error });
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Traite un élément de notification individuel
   */
  private async processNotificationItem(item: NotificationQueueItem): Promise<void> {
    try {
      item.status = 'processing';
      
      const userDevices = this.getUserDevices(item.userId);
      const targetDevices = userDevices.filter(device => 
        item.targetPlatforms.includes(device.platform)
      );

      const results = await Promise.allSettled(
        targetDevices.map(device => this.sendToDevice(device, item.payload))
      );

      // Analyser les résultats
      const successes = results.filter(result => result.status === 'fulfilled').length;
      const failures = results.filter(result => result.status === 'rejected').length;

      if (successes > 0) {
        item.status = 'sent';
        item.sentAt = new Date().toISOString();
        this.updateAnalytics(item.userId, 'sent', successes);
        this.updateAnalytics(item.userId, 'delivered', successes);
      }

      if (failures > 0) {
        item.attempts++;
        
        if (item.attempts >= item.maxAttempts) {
          item.status = 'failed';
          item.error = `${failures} échecs sur ${targetDevices.length} appareils`;
          this.updateAnalytics(item.userId, 'failed', failures);
        } else {
          item.status = 'pending';
          // Reprogrammer avec délai exponentiel
          setTimeout(() => {
            const queueItem = this.notificationQueue.find(q => q.id === item.id);
            if (queueItem) {
              queueItem.status = 'pending';
            }
          }, item.attempts * this.config.queue.retryDelay);
        }
      }

      performanceMonitor.debug('Notification traitée', {
        itemId: item.id,
        successes,
        failures,
        status: item.status
      });

    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur traitement notification', { error, itemId: item.id });
    }
  }

  /**
   * Envoie une notification à un appareil spécifique
   */
  private async sendToDevice(device: DeviceRegistration, payload: NotificationPayload): Promise<void> {
    switch (device.platform) {
      case 'web':
        return this.sendWebPush(device, payload);
      case 'ios':
        return this.sendAPNS(device, payload);
      case 'android':
        return this.sendFCM(device, payload);
      case 'desktop':
        return this.sendDesktopNotification(device, payload);
      default:
        throw new Error(`Plateforme non supportée: ${device.platform}`);
    }
  }

  /**
   * Envoie une notification Web Push
   */
  private async sendWebPush(device: DeviceRegistration, payload: NotificationPayload): Promise<void> {
    // Implémentation simplifiée - en production, utiliser une vraie lib comme web-push
    if (!device.pushEndpoint) {
      throw new Error('Endpoint Push manquant pour Web Push');
    }

    performanceMonitor.debug('Envoi Web Push', {
      deviceId: device.id,
      endpoint: device.pushEndpoint.substring(0, 50) + '...'
    });

    // Simulation d'envoi (remplacer par l'implémentation réelle)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Envoie une notification FCM (Android)
   */
  private async sendFCM(device: DeviceRegistration, payload: NotificationPayload): Promise<void> {
    if (!device.deviceToken) {
      throw new Error('Token FCM manquant');
    }

    performanceMonitor.debug('Envoi FCM', {
      deviceId: device.id,
      token: device.deviceToken.substring(0, 20) + '...'
    });

    // Simulation d'envoi (remplacer par l'implémentation réelle)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Envoie une notification APNS (iOS)
   */
  private async sendAPNS(device: DeviceRegistration, payload: NotificationPayload): Promise<void> {
    if (!device.deviceToken) {
      throw new Error('Token APNS manquant');
    }

    performanceMonitor.debug('Envoi APNS', {
      deviceId: device.id,
      token: device.deviceToken.substring(0, 20) + '...'
    });

    // Simulation d'envoi (remplacer par l'implémentation réelle)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Envoie une notification desktop native
   */
  private async sendDesktopNotification(device: DeviceRegistration, payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') {
      throw new Error('Permission notifications non accordée');
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Tracking du clic
      this.updateAnalytics(device.userId, 'clicked', 1);
      
      // Ouvrir l'application si configuré
      if (payload.data?.actionUrl) {
        window.open(payload.data.actionUrl, '_blank');
      }
    };

    // Auto-fermeture après 10 secondes si pas d'interaction requise
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    performanceMonitor.debug('Notification desktop envoyée', {
      deviceId: device.id,
      title: payload.title
    });
  }

  /**
   * Met à jour les analytics
   */
  private updateAnalytics(userId: string, metric: keyof NotificationAnalytics, value: number): void {
    if (!this.config.analytics.enabled) return;

    let analytics = this.analytics.get(userId);
    if (!analytics) {
      analytics = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0,
        conversionRate: 0,
        last24h: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0
        }
      };
      this.analytics.set(userId, analytics);
    }

    if (metric in analytics) {
      (analytics as any)[metric] += value;
    }

    // Calculer le taux de conversion
    if (analytics.sent > 0) {
      analytics.conversionRate = (analytics.clicked / analytics.sent) * 100;
    }

    // Mettre à jour les stats 24h
    const now = new Date();
    const last24hKey = `last24h_${metric}`;
    if (last24hKey in analytics) {
      (analytics as any)[last24hKey] += value;
    }

    this.saveToCache();
  }

  /**
   * Marque une notification comme ouverte
   */
  markAsOpened(notificationId: string, userId: string): void {
    this.updateAnalytics(userId, 'opened', 1);
    performanceMonitor.debug('Notification marquée comme ouverte', { notificationId, userId });
  }

  /**
   * Récupère les analytics d'un utilisateur
   */
  getUserAnalytics(userId: string): NotificationAnalytics | null {
    return this.analytics.get(userId) || null;
  }

  /**
   * Récupère tous les templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Récupère un template par ID
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Ajoute ou met à jour un template
   */
  saveTemplate(template: NotificationTemplate): void {
    template.updatedAt = new Date().toISOString();
    this.templates.set(template.id, template);
    performanceMonitor.info('Template sauvegardé', { templateId: template.id });
  }

  /**
   * Supprime un template
   */
  deleteTemplate(templateId: string): void {
    this.templates.delete(templateId);
    performanceMonitor.info('Template supprimé', { templateId });
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(updates: Partial<NotificationsConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveToCache();
    performanceMonitor.info('Configuration notifications mise à jour', { updates });
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): NotificationsConfig {
    return { ...this.config };
  }

  /**
   * Obtient les statistiques globales
   */
  getGlobalStats(): {
    totalDevices: number;
    totalTemplates: number;
    queueSize: number;
    enabledPlatforms: string[];
  } {
    return {
      totalDevices: this.deviceRegistrations.size,
      totalTemplates: this.templates.size,
      queueSize: this.notificationQueue.length,
      enabledPlatforms: Object.entries(this.config.platforms)
        .filter(([_, config]) => config.enabled)
        .map(([platform]) => platform)
    };
  }
}

// Instance globale du service
export const notificationsService = new NotificationsService();

// Initialisation automatique si côté client
if (typeof window !== 'undefined') {
  notificationsService.initialize().catch(error => {
    console.error('Erreur initialisation notifications:', error);
  });
}