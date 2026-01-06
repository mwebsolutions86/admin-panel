/**
 * Validateur de Codes Coupon en Temps Réel
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Interface pour valider et tester les codes promo :
 * - Validation en temps réel avec feedback
 * - Tests de sécurité et détection de fraude
 * - Simulation de commandes pour validation
 * - Historique des validations
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useCouponValidation } from '@/hooks/use-promotions';
import { CouponValidationRequest } from '@/lib/coupons-manager';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  MapPin,
  Smartphone,
  Users,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CouponValidator() {
  const [code, setCode] = useState('');
  const [userId, setUserId] = useState('');
  const [orderAmount, setOrderAmount] = useState('50.00');
  const [selectedStore, setSelectedStore] = useState('store_1');
  const [validationHistory, setValidationHistory] = useState<any[]>([]);
  
  const { validationResult, isValidating, error, validateCoupon, clearValidation } = useCouponValidation();

  const handleValidateCode = async () => {
    if (!code.trim()) {
      return;
    }

    const request: CouponValidationRequest = {
      code: code.trim(),
      userId: userId.trim() || undefined,
      ipAddress: '192.168.1.1', // En réalité, récupéré du serveur
      userAgent: navigator.userAgent,
      orderData: {
        totalAmount: Number(orderAmount),
        products: [
          { id: '1', category: 'burger', price: 15.00 },
          { id: '2', category: 'drink', price: 3.50 }
        ],
        storeId: selectedStore
      },
      location: {
        lat: 33.5731,
        lng: -7.5898,
        city: 'Casablanca',
        country: 'Morocco'
      }
    };

    try {
      const result = await validateCoupon(request);
      
      // Ajouter à l'historique
      const historyEntry = {
        timestamp: new Date().toISOString(),
        code: code.trim(),
        userId: userId.trim() || 'Anonyme',
        isValid: result.isValid,
        discount: result.discount,
        finalAmount: result.finalAmount,
        securityScore: result.securityChecks.passed ? 100 : 0,
        validationTime: Date.now()
      };
      
      setValidationHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Garder les 50 dernières
      
    } catch (err) {
      console.error('Erreur validation:', err);
    }
  };

  const handleClear = () => {
    setCode('');
    setUserId('');
    clearValidation();
  };

  const getStatusIcon = (isValid: boolean, isValidating: boolean) => {
    if (isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (isValid === undefined) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
    
    return isValid ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getSecurityLevel = (securityChecks: any) => {
    if (!securityChecks) return { level: 'unknown', color: 'gray', score: 0 };
    
    if (securityChecks.passed && !securityChecks.suspicious) {
      return { level: 'Sécurisé', color: 'green', score: 100 };
    }
    
    if (securityChecks.warnings && securityChecks.warnings.length > 0) {
      return { level: 'Attention', color: 'yellow', score: 60 };
    }
    
    if (securityChecks.suspicious) {
      return { level: 'Suspect', color: 'red', score: 20 };
    }
    
    return { level: 'Moyen', color: 'blue', score: 80 };
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de validation */}
      <Card>
        <CardHeader>
          <CardTitle>Validateur de Codes Coupon</CardTitle>
          <CardDescription>
            Testez et validez vos codes promo en temps réel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code Coupon *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: UE2024SAVE"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userId">ID Utilisateur (optionnel)</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user_123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderAmount">Montant de la commande (€)</Label>
              <Input
                id="orderAmount"
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(e.target.value)}
                placeholder="50.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="store">Magasin</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store_1">Casablanca Centre</SelectItem>
                  <SelectItem value="store_2">Casablanca Anfa</SelectItem>
                  <SelectItem value="store_3">Rabat Hassan</SelectItem>
                  <SelectItem value="store_4">Marrakech Gueliz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleValidateCode}
              disabled={!code.trim() || isValidating}
              className="flex-1"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                'Valider le Code'
              )}
            </Button>
            
            <Button variant="outline" onClick={handleClear}>
              Effacer
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Résultat de validation */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(validationResult.isValid, false)}
              <span>
                {validationResult.isValid ? 'Code Valide' : 'Code Invalide'}
              </span>
              {validationResult.coupon && (
                <Badge variant="secondary">
                  {validationResult.coupon.code}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.isValid ? (
              <div className="space-y-4">
                {/* Résultats principaux */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      -{validationResult.discount.toFixed(2)}€
                    </div>
                    <div className="text-sm text-green-700">Réduction appliquée</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {validationResult.finalAmount.toFixed(2)}€
                    </div>
                    <div className="text-sm text-blue-700">Nouveau total</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {((validationResult.discount / (validationResult.finalAmount + validationResult.discount)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-700">Taux de réduction</div>
                  </div>
                </div>

                {/* Détails de sécurité */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Vérifications de Sécurité
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Score de sécurité</span>
                        <Badge variant={getSecurityLevel(validationResult.securityChecks).color === 'green' ? 'default' : 'secondary'}>
                          {getSecurityLevel(validationResult.securityChecks).score}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Niveau de sécurité</span>
                        <Badge variant={getSecurityLevel(validationResult.securityChecks).color as any}>
                          {getSecurityLevel(validationResult.securityChecks).level}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center">
                          <Smartphone className="h-3 w-3 mr-1" />
                          Limite restante
                        </span>
                        <span className="text-sm font-mono">
                          {validationResult.rateLimitInfo.remaining} / heure
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Reset à
                        </span>
                        <span className="text-sm">
                          {format(new Date(validationResult.rateLimitInfo.resetTime), 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {validationResult.securityChecks.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Avertissements :</div>
                          <ul className="list-disc list-inside text-sm">
                            {validationResult.securityChecks.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Informations sur le coupon */}
                {validationResult.coupon && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Détails du Coupon</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-gray-500">ID Promotion</Label>
                        <div className="font-mono">{validationResult.coupon.promotionId}</div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-500">Utilisations</Label>
                        <div>
                          {validationResult.coupon.usageCount}
                          {validationResult.coupon.maxUsage && ` / ${validationResult.coupon.maxUsage}`}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-500">Valide jusqu'au</Label>
                        <div>
                          {format(new Date(validationResult.coupon.validUntil), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-500">Statut</Label>
                        <Badge variant={validationResult.coupon.isActive ? 'default' : 'secondary'}>
                          {validationResult.coupon.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Code invalide</div>
                      <ul className="list-disc list-inside text-sm">
                        {validationResult.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>

                {validationResult.securityChecks.suspicious && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-medium">Activité suspecte détectée</div>
                        <ul className="list-disc list-inside text-sm">
                          {validationResult.securityChecks.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historique des validations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Historique des Validations</span>
          </CardTitle>
          <CardDescription>
            Dernières validations effectuées ({validationHistory.length} / 50)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune validation effectuée
            </div>
          ) : (
            <div className="space-y-2">
              {validationHistory.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(entry.isValid, false)}
                    <div>
                      <div className="font-medium font-mono">{entry.code}</div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                        {' • '}
                        {entry.userId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    {entry.isValid && (
                      <div className="text-right">
                        <div className="font-medium text-green-600">-{entry.discount.toFixed(2)}€</div>
                        <div className="text-gray-500">{entry.finalAmount.toFixed(2)}€ final</div>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <Badge variant={entry.securityScore >= 80 ? 'default' : entry.securityScore >= 50 ? 'secondary' : 'destructive'}>
                        {entry.securityScore}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}