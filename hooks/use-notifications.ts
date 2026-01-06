/**
 * Hook React pour les Notifications Push Multi-Plateformes
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 * 
 * Ce hook fournit une interface React simple et intuitive pour utiliser
 * le système de notifications push dans tous les composants.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsService, 
  type NotificationPayload, 
  type DeviceRegistration, 
  type NotificationPreferences, 
  type NotificationTemplate,
  type NotificationAnalytics 
} from '@/lib/notifications-service';
import { performanceMonitor } from '@/lib/performance-monitor';

interface UseNotificationsState {
  isInitialized: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  registeredDevices: DeviceRegistration[];
  analytics: NotificationAnalytics | null;
  templates: NotificationTemplate[];
  error: string | null;
  queueSize: number;
}

interface UseNotificationsActions {
  // Permissions
  requestPermission: () => Promise<NotificationPermission>;
  
  // Appareils
  registerDevice: (platform: 'web' | 'ios' | 'android' | 'desktop') => Promise<string>;
  unregisterDevice: (deviceId: string) => void;
  updatePreferences: (deviceId: string, preferences: Partial<NotificationPreferences>) => void;
  
  // Notifications
  sendFromTemplate: (templateId: string, variables: Record<string, string>, userId?: string) => Promise<string>;
  sendCustom: (payload: NotificationPayload, userId?: string, targetPlatforms?: string[]) => Promise<string>;
  
  // Analytics
  markAsOpened: (notificationId: string, userId: string) => void;
  getUserAnalytics: (userId: string) => NotificationAnalytics | null;
  
  // Templates
  getTemplates: () => NotificationTemplate[];
  saveTemplate: (template: NotificationTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  
  // Utilitaires
  refreshData: () => void;
  clearError: () => void;
}

interface UseNotificationsOptions {
  autoInitialize?: boolean;
  autoRegister?: boolean;
  userId?: string;
  platform?: 'web' | 'ios' | 'android' | 'desktop';
}

/**
 * Hook principal pour les notifications
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsState & UseNotificationsActions {
  const {
    autoInitialize = true,
    autoRegister = false,
    userId,
    platform = 'web'
  } = options;

  const [state, setState] = useState<UseNotificationsState>({
    isInitialized: false,
    isLoading: false,
    permission: typeof window !== 'undefined' ? Notification.permission : 'default',
    registeredDevices: [],
    analytics: null,
    templates: [],
    error: null,
    queueSize: 0
  });

  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Initialisation du service
  const initializeService = useCallback(async () => {
    if (initializedRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await notificationsService.initialize();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          templates: notificationsService.getTemplates()
        }));
      }

      performanceMonitor.info('Notifications hook initialisé avec succès');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur initialisation notifications hook', { error });
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
    } finally {
      initializedRef.current = true;
    }
  }, []);

  // Chargement des données
  const loadData = useCallback(async () => {
    if (!state.isInitialized || !userId) return;

    try {
      const stats = notificationsService.getGlobalStats();
      const userAnalytics = notificationsService.getUserAnalytics(userId);
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          queueSize: stats.queueSize,
          analytics: userAnalytics
        }));
      }
    } catch (error) {
      performanceMonitor.error('Erreur chargement données notifications', { error });
    }
  }, [state.isInitialized, userId]);

  // Effets
  useEffect(() => {
    if (autoInitialize) {
      initializeService();
    }
  }, [autoInitialize, initializeService]);

  useEffect(() => {
    loadData();
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Actions
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const permission = await notificationsService.requestPermission();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          permission,
          isLoading: false
        }));
      }

      performanceMonitor.info('Permission notifications demandée', { permission });
      return permission;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur demande permission notifications', { error });
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
      
      throw error;
    }
  }, []);

  const registerDevice = useCallback(async (devicePlatform: 'web' | 'ios' | 'android' | 'desktop'): Promise<string> => {
    if (!userId) {
      throw new Error('userId requis pour enregistrer un appareil');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      let deviceToken: string;
      let subscription: PushSubscription | undefined;

      if (devicePlatform === 'web') {
        // Enregistrer pour Web Push
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          throw new Error('Web Push non supporté sur ce navigateur');
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          subscription = existingSubscription;
          deviceToken = existingSubscription.endpoint;
        } else {
          // Créer un nouvel abonnement
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidPublicKey) {
            throw new Error('Clé VAPID publique manquante');
          }

          const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
          });
          
          deviceToken = subscription.endpoint;
        }
      } else {
        // Pour mobile, on simule l'obtention du token (en production, utiliser FCM/APNS SDK)
        deviceToken = `${devicePlatform}-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const deviceId = await notificationsService.registerDevice(
        userId,
        deviceToken,
        devicePlatform,
        subscription
      );

      // Recharger les données
      await loadData();

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      }

      performanceMonitor.info('Appareil enregistré pour notifications', {
        deviceId,
        userId,
        platform: devicePlatform
      });

      return deviceId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur enregistrement appareil', { error, userId, platform: devicePlatform });
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
      
      throw error;
    }
  }, [userId, loadData]);

  const unregisterDevice = useCallback((deviceId: string): void => {
    try {
      notificationsService.unregisterDevice(deviceId);
      loadData();
      
      performanceMonitor.info('Appareil désenregistré', { deviceId });
    } catch (error) {
      performanceMonitor.error('Erreur désenregistrement appareil', { error, deviceId });
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
    }
  }, [loadData]);

  const updatePreferences = useCallback((deviceId: string, preferences: Partial<NotificationPreferences>): void => {
    try {
      notificationsService.updateDevicePreferences(deviceId, preferences);
      loadData();
      
      performanceMonitor.debug('Préférences notifications mises à jour', { deviceId, preferences });
    } catch (error) {
      performanceMonitor.error('Erreur mise à jour préférences', { error, deviceId, preferences });
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
    }
  }, [loadData]);

  const sendFromTemplate = useCallback(async (
    templateId: string,
    variables: Record<string, string>,
    targetUserId?: string
  ): Promise<string> => {
    try {
      const notificationUserId = targetUserId || userId;
      if (!notificationUserId) {
        throw new Error('userId requis pour envoyer une notification');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const notificationId = await notificationsService.sendNotificationFromTemplate(
        templateId,
        variables,
        notificationUserId
      );

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          queueSize: prev.queueSize + 1
        }));
      }

      performanceMonitor.info('Notification envoyée depuis template', {
        notificationId,
        templateId,
        userId: notificationUserId,
        variables
      });

      return notificationId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur envoi notification template', { error, templateId, userId });
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
      
      throw error;
    }
  }, [userId]);

  const sendCustom = useCallback(async (
    payload: NotificationPayload,
    targetUserId?: string,
    targetPlatforms?: string[]
  ): Promise<string> => {
    try {
      const notificationUserId = targetUserId || userId;
      if (!notificationUserId) {
        throw new Error('userId requis pour envoyer une notification');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const notificationId = await notificationsService.sendCustomNotification(
        payload,
        notificationUserId,
        targetPlatforms
      );

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          queueSize: prev.queueSize + 1
        }));
      }

      performanceMonitor.info('Notification personnalisée envoyée', {
        notificationId,
        userId: notificationUserId,
        targetPlatforms
      });

      return notificationId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur envoi notification personnalisée', { error, userId });
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
      }
      
      throw error;
    }
  }, [userId]);

  const markAsOpened = useCallback((notificationId: string, targetUserId?: string): void => {
    const notificationUserId = targetUserId || userId;
    if (!notificationUserId) return;

    try {
      notificationsService.markAsOpened(notificationId, notificationUserId);
      loadData();
      
      performanceMonitor.debug('Notification marquée comme ouverte', { notificationId, userId: notificationUserId });
    } catch (error) {
      performanceMonitor.error('Erreur marquage notification ouverte', { error, notificationId });
    }
  }, [userId, loadData]);

  const getUserAnalytics = useCallback((targetUserId?: string): NotificationAnalytics | null => {
    const analyticsUserId = targetUserId || userId;
    if (!analyticsUserId) return null;

    return notificationsService.getUserAnalytics(analyticsUserId);
  }, [userId]);

  const getTemplates = useCallback((): NotificationTemplate[] => {
    return notificationsService.getTemplates();
  }, []);

  const saveTemplate = useCallback((template: NotificationTemplate): void => {
    try {
      notificationsService.saveTemplate(template);
      setState(prev => ({
        ...prev,
        templates: notificationsService.getTemplates()
      }));
      
      performanceMonitor.info('Template sauvegardé via hook', { templateId: template.id });
    } catch (error) {
      performanceMonitor.error('Erreur sauvegarde template', { error, templateId: template.id });
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
    }
  }, []);

  const deleteTemplate = useCallback((templateId: string): void => {
    try {
      notificationsService.deleteTemplate(templateId);
      setState(prev => ({
        ...prev,
        templates: notificationsService.getTemplates()
      }));
      
      performanceMonitor.info('Template supprimé via hook', { templateId });
    } catch (error) {
      performanceMonitor.error('Erreur suppression template', { error, templateId });
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
    }
  }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
    setState(prev => ({ ...prev, templates: notificationsService.getTemplates() }));
  }, [loadData]);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-enregistrement si configuré
  useEffect(() => {
    if (autoRegister && state.permission === 'granted' && state.isInitialized && userId && platform) {
      registerDevice(platform).catch(error => {
        performanceMonitor.error('Erreur auto-enregistrement appareil', { error });
      });
    }
  }, [autoRegister, state.permission, state.isInitialized, userId, platform, registerDevice]);

  return {
    // État
    ...state,
    
    // Actions
    requestPermission,
    registerDevice,
    unregisterDevice,
    updatePreferences,
    sendFromTemplate,
    sendCustom,
    markAsOpened,
    getUserAnalytics,
    getTemplates,
    saveTemplate,
    deleteTemplate,
    refreshData,
    clearError
  };
}

/**
 * Hook simplifié pour les notifications en temps réel
 */
export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return;

    const initializeListener = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Écouter les messages du service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
            setNotifications(prev => [event.data.payload, ...prev.slice(0, 49)]); // Garder les 50 dernières
          }
        });

        setIsListening(true);
        performanceMonitor.info('Listener notifications temps réel activé', { userId });
        
      } catch (error) {
        performanceMonitor.error('Erreur activation listener notifications', { error, userId });
      }
    };

    initializeListener();

    return () => {
      setIsListening(false);
    };
  }, [userId]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    isListening,
    clearNotifications
  };
}

/**
 * Hook pour les préférences de notifications
 */
export function useNotificationPreferences(deviceId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    if (!deviceId) return;

    setIsLoading(true);
    notificationsService.updateDevicePreferences(deviceId, updates);
    
    // Recharger les préférences
    const devices = notificationsService.getGlobalStats();
    // Note: En production, il faudrait récupérer les préférences spécifiques à l'appareil
    
    setIsLoading(false);
  }, [deviceId]);

  return {
    preferences,
    updatePreferences,
    isLoading
  };
}

/**
 * Utilitaire pour convertir la clé VAPID
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook pour vérifier la compatibilité du navigateur
 */
export function useNotificationCompatibility() {
  const [compatibility, setCompatibility] = useState({
    webPush: false,
    serviceWorker: false,
    notifications: false,
    fullSupport: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const webPush = 'serviceWorker' in navigator && 'PushManager' in window;
    const serviceWorker = 'serviceWorker' in navigator;
    const notifications = 'Notification' in window;

    setCompatibility({
      webPush,
      serviceWorker,
      notifications,
      fullSupport: webPush && serviceWorker && notifications
    });
  }, []);

  return compatibility;
}

/**
 * Hook pour les analytics avancées
 */
export function useNotificationAnalytics(userId?: string) {
  const analytics = useNotifications({ userId });
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const getDetailedAnalytics = useCallback(() => {
    const userAnalytics = analytics.getUserAnalytics(userId);
    if (!userAnalytics) return null;

    return {
      ...userAnalytics,
      timeRange,
      conversionRate: userAnalytics.sent > 0 ? (userAnalytics.clicked / userAnalytics.sent) * 100 : 0,
      deliveryRate: userAnalytics.sent > 0 ? (userAnalytics.delivered / userAnalytics.sent) * 100 : 0,
      openRate: userAnalytics.delivered > 0 ? (userAnalytics.opened / userAnalytics.delivered) * 100 : 0,
      clickRate: userAnalytics.opened > 0 ? (userAnalytics.clicked / userAnalytics.opened) * 100 : 0
    };
  }, [analytics, userId, timeRange]);

  return {
    ...analytics,
    timeRange,
    setTimeRange,
    detailedAnalytics: getDetailedAnalytics()
  };
}