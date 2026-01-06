/**
 * Composant de Gestion des Préférences de Notifications
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 */

'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  Clock, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Settings, 
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface NotificationPreferencesProps {
  userId: string;
  deviceId?: string;
  className?: string;
}

export function NotificationPreferences({ userId, deviceId, className }: NotificationPreferencesProps) {
  const {
    isInitialized,
    permission,
    registeredDevices,
    requestPermission,
    registerDevice,
    unregisterDevice,
    updatePreferences,
    isLoading,
    error
  } = useNotifications({ userId });

  const [activeTab, setActiveTab] = useState('general');
  const [preferences, setPreferences] = useState({
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
  });

  const handlePermissionRequest = async () => {
    try {
      await requestPermission();
    } catch (error) {
      console.error('Erreur demande permission:', error);
    }
  };

  const handleDeviceRegistration = async (platform: 'web' | 'ios' | 'android' | 'desktop') => {
    try {
      await registerDevice(platform);
    } catch (error) {
      console.error('Erreur enregistrement appareil:', error);
    }
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    updatePreferences(deviceId || '', { [key]: value });
  };

  const handleQuietHoursChange = (field: string, value: string) => {
    const updated = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value
      }
    };
    setPreferences(updated);
    updatePreferences(deviceId || '', { quietHours: updated.quietHours });
  };

  const getPermissionIcon = (perm: NotificationPermission) => {
    switch (perm) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web':
        return <Monitor className="h-4 w-4" />;
      case 'ios':
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Tablet className="h-4 w-4" />;
    }
  };

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Initialisation des notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Préférences de Notifications
        </CardTitle>
        <CardDescription>
          Gérez vos préférences pour recevoir les notifications push
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="devices">Appareils</TabsTrigger>
            <TabsTrigger value="quiet-hours">Heures silencieuses</TabsTrigger>
            <TabsTrigger value="advanced">Avancé</TabsTrigger>
          </TabsList>

          {/* Onglet Général */}
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Permission Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Autorisez Universal Eats à vous envoyer des notifications
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getPermissionIcon(permission)}
                  <Button 
                    onClick={handlePermissionRequest}
                    disabled={permission === 'granted' || isLoading}
                    variant={permission === 'granted' ? 'secondary' : 'default'}
                  >
                    {permission === 'granted' ? 'Activé' : 'Demander'}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Types de notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications de commande</Label>
                      <p className="text-sm text-muted-foreground">
                        Statuts de commande, confirmations, livraisons
                      </p>
                    </div>
                    <Switch
                      checked={preferences.orderUpdates}
                      onCheckedChange={(checked) => handlePreferenceChange('orderUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Promotions et offres</Label>
                      <p className="text-sm text-muted-foreground">
                        Offres spéciales, codes promo, réductions
                      </p>
                    </div>
                    <Switch
                      checked={preferences.promotions}
                      onCheckedChange={(checked) => handlePreferenceChange('promotions', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Programme de fidélité</Label>
                      <p className="text-sm text-muted-foreground">
                        Points attribués, récompenses disponibles
                      </p>
                    </div>
                    <Switch
                      checked={preferences.loyalty}
                      onCheckedChange={(checked) => handlePreferenceChange('loyalty', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications système</Label>
                      <p className="text-sm text-muted-foreground">
                        Maintenance, nouvelles fonctionnalités
                      </p>
                    </div>
                    <Switch
                      checked={preferences.system}
                      onCheckedChange={(checked) => handlePreferenceChange('system', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing</Label>
                      <p className="text-sm text-muted-foreground">
                        Nouveautés, actualités, enquêtes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Appareils */}
          <TabsContent value="devices" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Appareils enregistrés</h3>
                  <p className="text-sm text-muted-foreground">
                    Gérez les appareils qui reçoivent vos notifications
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleDeviceRegistration('web')}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Ajouter Web
                  </Button>
                </div>
              </div>

              {registeredDevices.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun appareil enregistré</p>
                  <Button 
                    onClick={() => handleDeviceRegistration('web')}
                    className="mt-4"
                    disabled={isLoading}
                  >
                    Enregistrer votre premier appareil
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {registeredDevices.map((device) => (
                    <div 
                      key={device.id} 
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(device.platform)}
                        <div>
                          <p className="font-medium capitalize">{device.platform}</p>
                          <p className="text-sm text-muted-foreground">
                            Enregistré le {new Date(device.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={device.isActive ? 'default' : 'secondary'}>
                          {device.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unregisterDevice(device.id)}
                        >
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Heures silencieuses */}
          <TabsContent value="quiet-hours" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Heures silencieuses</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactivez les notifications pendant certaines heures
                  </p>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('quietHours', {
                      ...preferences.quietHours,
                      enabled: checked
                    })
                  }
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Heure de début</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Heure de fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select 
                      value={preferences.quietHours.timezone}
                      onValueChange={(value) => handleQuietHoursChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Casablanca">Casablanca (UTC+1)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Les notifications d'urgence (sécurité, problèmes de commande) seront toujours envoyées même pendant les heures silencieuses.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Onglet Avancé */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Paramètres avancés</h3>
              
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Ces paramètres affectent la manière dont vous recevez les notifications.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Configuration technique</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Service: {isInitialized ? 'Initialisé' : 'Non initialisé'}</p>
                      <p>Queue de notifications: {registeredDevices.length} appareils</p>
                      <p>Compatibilité navigateur: Vérifiée</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Support</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Si vous rencontrez des problèmes avec les notifications :
                    </p>
                    <div className="space-y-2 text-sm">
                      <p>• Vérifiez que les notifications sont autorisées dans votre navigateur</p>
                      <p>• Assurez-vous qu'Universal Eats n'est pas en mode "Ne pas déranger"</p>
                      <p>• Redémarrez votre navigateur après modification des préférences</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}