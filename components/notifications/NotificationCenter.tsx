/**
 * Centre de Notifications en Temps Réel
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications, useRealtimeNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  Clock, 
  Filter,
  MoreHorizontal,
  Settings,
  Trash2,
  Eye,
  TrendingUp,
  Users,
  Smartphone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationCenterProps {
  userId: string;
  maxNotifications?: number;
  showAnalytics?: boolean;
  className?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'order' | 'promotion' | 'loyalty' | 'system';
  isRead: boolean;
  isUrgent: boolean;
  data?: Record<string, any>;
}

export function NotificationCenter({ 
  userId, 
  maxNotifications = 50, 
  showAnalytics = true,
  className 
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [selectedTab, setSelectedTab] = useState('recent');

  const {
    isInitialized,
    analytics,
    getUserAnalytics,
    markAsOpened,
    sendFromTemplate,
    isLoading
  } = useNotifications({ userId });

  const {
    notifications: realtimeNotifications,
    isListening,
    clearNotifications
  } = useRealtimeNotifications(userId);

  // Notifications de démonstration (en production, ces données viendraient de l'API)
  const demoNotifications: NotificationItem[] = [
    {
      id: '1',
      title: 'Commande confirmée !',
      body: 'Votre commande #12345 a été confirmée par Mama Restaurant. Temps estimé : 25 min',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      type: 'order',
      isRead: false,
      isUrgent: false,
      data: { orderId: '12345', status: 'confirmed' }
    },
    {
      id: '2',
      title: 'Points fidélité gagnés !',
      body: 'Vous avez gagné 50 points ! Total : 250 points. Plus que 50 points pour votre prochaine récompense !',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'loyalty',
      isRead: true,
      isUrgent: false,
      data: { points: 50, totalPoints: 250 }
    },
    {
      id: '3',
      title: 'Offre spéciale !',
      body: 'Profitez de 20% de réduction avec le code SAVE20. Valable jusqu\'au 15 janvier 2025',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      type: 'promotion',
      isRead: false,
      isUrgent: false,
      data: { promoCode: 'SAVE20', discount: '20%' }
    },
    {
      id: '4',
      title: 'Votre commande est prête !',
      body: 'Votre commande #12345 est prête à être récupérée chez Mama Restaurant',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      type: 'order',
      isRead: false,
      isUrgent: true,
      data: { orderId: '12345', status: 'ready' }
    }
  ];

  // Combiner les notifications de démo avec les notifications en temps réel
  useEffect(() => {
    const allNotifications = [
      ...realtimeNotifications.map((notif, index) => ({
        id: `realtime-${index}`,
        title: notif.title,
        body: notif.body,
        timestamp: new Date().toISOString(),
        type: 'order' as const,
        isRead: false,
        isUrgent: false,
        data: notif.data
      })),
      ...demoNotifications
    ].slice(0, maxNotifications);

    setNotifications(allNotifications);
  }, [realtimeNotifications, maxNotifications]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsOpened(notification.id, userId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    }

    // Gérer les actions spécifiques selon le type
    if (notification.data?.orderId) {
      // Rediriger vers la page de commande
      window.location.href = `/orders/${notification.data.orderId}`;
    } else if (notification.data?.promoCode) {
      // Ouvrir la page des promotions
      window.location.href = '/promotions';
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.isRead) {
        markAsOpened(notification.id, userId);
      }
    });
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const clearAllNotifications = () => {
    clearNotifications();
    setNotifications([]);
  };

  const getNotificationIcon = (type: string, isUrgent: boolean) => {
    const iconClass = `h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-muted-foreground'}`;
    
    switch (type) {
      case 'order':
        return <Clock className={iconClass} />;
      case 'promotion':
        return <Bell className={iconClass} />;
      case 'loyalty':
        return <CheckCircle className={iconClass} />;
      case 'system':
        return <Settings className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'promotion':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'loyalty':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'urgent':
        return notification.isUrgent;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.isUrgent).length;

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement du centre de notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Centre de Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isListening ? 'Réception en temps réel' : 'Notifications locales'}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Tout marquer comme lu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearAllNotifications}>
                <Trash2 className="h-4 w-4 mr-2" />
                Tout effacer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings/notifications'}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent" className="relative">
              Récentes
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" disabled={!showAnalytics}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Settings className="h-4 w-4 mr-1" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Onglet Notifications Récentes */}
          <TabsContent value="recent" className="space-y-4">
            {/* Filtres */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Toutes ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Non lues ({unreadCount})
              </Button>
              <Button
                variant={filter === 'urgent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('urgent')}
              >
                Urgentes ({urgentCount})
              </Button>
            </div>

            {/* Liste des notifications */}
            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {filter === 'all' ? 'Aucune notification' : 
                     filter === 'unread' ? 'Aucune notification non lue' :
                     'Aucune notification urgente'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        !notification.isRead ? 'bg-muted/30 border-primary/20' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getNotificationIcon(notification.type, notification.isUrgent)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="h-2 w-2 bg-primary rounded-full"></div>
                              )}
                              {notification.isUrgent && (
                                <Badge variant="destructive" className="text-xs">Urgent</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.body}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={`text-xs ${getNotificationTypeColor(notification.type)}`}>
                                {notification.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.timestamp).toLocaleString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Onglet Analytics */}
          {showAnalytics && (
            <TabsContent value="analytics" className="space-y-4">
              {analytics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.sent}</div>
                    <div className="text-sm text-muted-foreground">Envoyées</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.delivered}</div>
                    <div className="text-sm text-muted-foreground">Livrées</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.opened}</div>
                    <div className="text-sm text-muted-foreground">Ouvertes</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.clicked}</div>
                    <div className="text-sm text-muted-foreground">Clics</div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    Les analytics seront disponibles après avoir reçu vos premières notifications.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          )}

          {/* Onglet Templates */}
          <TabsContent value="templates" className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Les templates de notifications prédéfinies pour différents types d'événements.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-4">
              {['order-confirmed', 'order-preparing', 'order-ready', 'promotion-special', 'loyalty-points'].map((templateId) => (
                <div key={templateId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium capitalize">{templateId.replace('-', ' ')}</h4>
                      <p className="text-sm text-muted-foreground">
                        Template pour {templateId.includes('order') ? 'les commandes' : 
                                        templateId.includes('promotion') ? 'les promotions' : 
                                        templateId.includes('loyalty') ? 'la fidélité' : 'les événements système'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendFromTemplate(templateId, {
                        orderNumber: '12345',
                        storeName: 'Mama Restaurant',
                        estimatedTime: '25'
                      })}
                      disabled={isLoading}
                    >
                      Tester
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}