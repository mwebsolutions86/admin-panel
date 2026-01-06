/**
 * Service Worker pour Web Push Notifications
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 */

// Configuration du service worker
const CACHE_NAME = 'universal-eats-notifications-v1';
const NOTIFICATION_CLICK_ACTION = 'notification-click';

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installé');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/offline.html',
        '/icons/notification-icon-192x192.png',
        '/icons/notification-icon-512x512.png'
      ]);
    })
  );
  
  self.skipWaiting();
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activé');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Réception des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue:', event);
  
  let notificationData = {
    title: 'Universal Eats',
    body: 'Vous avez une nouvelle notification',
    icon: '/icons/notification-icon-192x192.png',
    badge: '/icons/notification-badge.png',
    tag: 'default',
    requireInteraction: false,
    data: {}
  };
  
  // Extraire les données de la notification
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: {
          ...notificationData.data,
          ...pushData.data,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('[SW] Erreur parsing notification push:', error);
    }
  }
  
  // Afficher la notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      data: notificationData.data,
      actions: notificationData.actions || [],
      timestamp: Date.now()
    })
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  // Gérer les actions spécifiques
  if (action === 'mark-delivered' && notificationData.orderId) {
    // Marquer la commande comme récupérée
    handleMarkDelivered(notificationData.orderId);
  } else if (action === 'apply-promo' && notificationData.promoCode) {
    // Appliquer le code promo
    handleApplyPromo(notificationData.promoCode);
  } else {
    // Action par défaut - ouvrir l'application
    handleDefaultAction(notificationData);
  }
});

// Fonction pour marquer une commande comme livrée
async function handleMarkDelivered(orderId: string) {
  try {
    // Envoyer un message à l'application principale
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_ACTION',
        action: 'mark-delivered',
        orderId: orderId
      });
    });
    
    // Ouvrir l'application si nécessaire
    const url = `/orders/${orderId}`;
    await self.clients.openWindow(url);
  } catch (error) {
    console.error('[SW] Erreur marquage commande livrée:', error);
  }
}

// Fonction pour appliquer un code promo
async function handleApplyPromo(promoCode: string) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_ACTION',
        action: 'apply-promo',
        promoCode: promoCode
      });
    });
    
    // Ouvrir la page des promotions
    const url = `/promotions?code=${encodeURIComponent(promoCode)}`;
    await self.clients.openWindow(url);
  } catch (error) {
    console.error('[SW] Erreur application code promo:', error);
  }
}

// Fonction pour l'action par défaut
async function handleDefaultAction(notificationData: any) {
  try {
    let url = '/';
    
    // Déterminer l'URL en fonction du type de notification
    if (notificationData.type === 'order' && notificationData.orderId) {
      url = `/orders/${notificationData.orderId}`;
    } else if (notificationData.type === 'promotion') {
      url = '/promotions';
    } else if (notificationData.type === 'loyalty') {
      url = '/loyalty';
    } else if (notificationData.type === 'system') {
      url = '/system';
    }
    
    // Envoyer un message à l'application principale
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLICKED',
        notificationData: notificationData
      });
    });
    
    // Ouvrir l'application
    await self.clients.openWindow(url);
  } catch (error) {
    console.error('[SW] Erreur action par défaut:', error);
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Erreur service worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Promise rejetée non gérée:', event.reason);
});

// Sync en arrière-plan pour les notifications en attente
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncPendingNotifications());
  }
});

// Fonction de synchronisation des notifications en attente
async function syncPendingNotifications() {
  try {
    // Récupérer les notifications en attente depuis IndexedDB
    const pendingNotifications = await getPendingNotifications();
    
    for (const notification of pendingNotifications) {
      try {
        await self.registration.showNotification(notification.title, notification.options);
        await removePendingNotification(notification.id);
      } catch (error) {
        console.error('[SW] Erreur envoi notification en attente:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Erreur sync notifications:', error);
  }
}

// Utilitaires pour IndexedDB (simplifié)
async function getPendingNotifications() {
  // En production, utiliser une vraie implémentation IndexedDB
  return [];
}

async function removePendingNotification(id: string) {
  // En production, implémenter la suppression d'IndexedDB
}