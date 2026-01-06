/**
 * Affichage des Promotions pour les Clients
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Interface client pour afficher et utiliser les promotions :
 * - Liste des promotions disponibles
 * - Application de codes promo
 * - Promotions recommandées
 * - Historique des promotions utilisées
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { usePromotions, useRecommendedPromotions, useCouponValidation } from '@/hooks/use-promotions';
import { Promotion } from '@/lib/promotions-service';
import { CouponValidationRequest } from '@/lib/coupons-manager';
import { 
  Gift, 
  Tag, 
  Clock, 
  MapPin, 
  Star, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PromotionsDisplayProps {
  userId: string;
  location?: { lat: number; lng: number };
  onPromotionApplied?: (promotionId: string, discount: number) => void;
}

export default function PromotionsDisplay({ 
  userId, 
  location, 
  onPromotionApplied 
}: PromotionsDisplayProps) {
  const [activeTab, setActiveTab] = useState('available');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  const { 
    activePromotions, 
    userPromotions, 
    isLoading, 
    applyPromotion 
  } = usePromotions(userId, location);
  
  const { 
    recommendations, 
    isLoading: recommendationsLoading 
  } = useRecommendedPromotions(userId);
  
  const { 
    validationResult, 
    isValidating, 
    validateCoupon, 
    clearValidation 
  } = useCouponValidation();

  const handleApplyCode = async () => {
    if (!promoCode.trim()) return;

    const request: CouponValidationRequest = {
      code: promoCode.trim(),
      userId,
      ipAddress: '192.168.1.1', // En réalité, récupéré du serveur
      userAgent: navigator.userAgent,
      orderData: {
        totalAmount: 50.00, // Montant par défaut pour la démo
        products: [],
        storeId: 'default_store'
      },
      location
    };

    try {
      const result = await validateCoupon(request);
      
      if (result.isValid && result.appliedPromotion) {
        setAppliedPromotion(result.appliedPromotion);
        setShowCodeInput(false);
        setPromoCode('');
        
        // Notifier le parent
        if (onPromotionApplied) {
          onPromotionApplied(result.appliedPromotion.id, result.discount);
        }
      }
    } catch (error) {
      console.error('Erreur validation code:', error);
    }
  };

  const handleUsePromotion = async (promotion: Promotion) => {
    try {
      const result = await applyPromotion(promotion.id, {
        totalAmount: 50.00,
        products: [],
        storeId: 'default_store',
        location
      });

      if (result.isValid) {
        setAppliedPromotion(promotion);
        
        if (onPromotionApplied) {
          onPromotionApplied(promotion.id, result.discount);
        }
      }
    } catch (error) {
      console.error('Erreur application promotion:', error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // Toast notification would be ideal here
  };

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validUntil = new Date(promotion.validUntil);

    if (now < validFrom) {
      return { label: 'Bientôt disponible', color: 'outline' as const };
    }
    
    if (now > validUntil) {
      return { label: 'Expirée', color: 'secondary' as const };
    }
    
    if (!promotion.isActive) {
      return { label: 'Inactive', color: 'secondary' as const };
    }
    
    return { label: 'Active', color: 'default' as const };
  };

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case 'code_promo':
        return <Tag className="h-5 w-5" />;
      case 'livraison_gratuite':
        return <MapPin className="h-5 w-5" />;
      case 'flash_sale':
        return <TrendingUp className="h-5 w-5" />;
      case 'fidelite_exclusive':
        return <Star className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const getDiscountText = (promotion: Promotion) => {
    switch (promotion.discountType) {
      case 'percentage':
        return `-${promotion.discountValue}%`;
      case 'fixed_amount':
        return `-${promotion.discountValue}€`;
      case 'free_delivery':
        return 'Livraison gratuite';
      default:
        return 'Réduction';
    }
  };

  return (
    <div className="space-y-6">
      {/* Code promo input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Code Promo</span>
          </CardTitle>
          <CardDescription>
            Utilisez un code promo pour obtenir une réduction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showCodeInput ? (
            <Button 
              onClick={() => setShowCodeInput(true)}
              variant="outline"
              className="w-full"
            >
              <Tag className="h-4 w-4 mr-2" />
              Entrer un code promo
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Ex: UE2024SAVE"
                  className="flex-1 font-mono"
                />
                <Button 
                  onClick={handleApplyCode}
                  disabled={!promoCode.trim() || isValidating}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Appliquer'
                  )}
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowCodeInput(false);
                  setPromoCode('');
                  clearValidation();
                }}
              >
                Annuler
              </Button>
            </div>
          )}

          {validationResult && (
            <Alert variant={validationResult.isValid ? "default" : "destructive"}>
              {validationResult.isValid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationResult.isValid 
                  ? `Code appliqué ! Réduction de ${validationResult.discount.toFixed(2)}€`
                  : validationResult.reasons.join(', ')
                }
              </AlertDescription>
            </Alert>
          )}

          {appliedPromotion && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Promotion appliquée : {appliedPromotion.name}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setAppliedPromotion(null)}
                  >
                    Retirer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Onglets des promotions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Disponibles</TabsTrigger>
          <TabsTrigger value="recommended">Recommandées</TabsTrigger>
          <TabsTrigger value="my-promotions">Mes Promotions</TabsTrigger>
        </TabsList>

        {/* Promotions disponibles */}
        <TabsContent value="available" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Chargement des promotions...</p>
            </div>
          ) : activePromotions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucune promotion disponible pour le moment</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activePromotions.map((promotion) => (
                <Card key={promotion.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getPromotionIcon(promotion.type)}
                          <h3 className="font-semibold">{promotion.name}</h3>
                          <Badge {...getPromotionStatus(promotion)}>
                            {getPromotionStatus(promotion).label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {promotion.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Gift className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-600">
                              {getDiscountText(promotion)}
                            </span>
                          </div>
                          
                          {promotion.minimumAmount && (
                            <div className="text-gray-500">
                              Min. {promotion.minimumAmount}€
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatDistanceToNow(new Date(promotion.validUntil), { 
                                locale: fr, 
                                addSuffix: true 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {promotion.type === 'code_promo' && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => copyCode('DEMO2024')}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copier
                          </Button>
                        )}
                        
                        <Button 
                          size="sm"
                          onClick={() => handleUsePromotion(promotion)}
                          disabled={appliedPromotion?.id === promotion.id}
                        >
                          {appliedPromotion?.id === promotion.id ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Appliquée
                            </>
                          ) : (
                            'Utiliser'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Promotions recommandées */}
        <TabsContent value="recommended" className="space-y-4">
          {recommendationsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Chargement des recommandations...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucune recommandation pour le moment</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((promotion) => (
                <Card key={promotion.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="h-5 w-5 text-blue-500" />
                          <h3 className="font-semibold">{promotion.name}</h3>
                          <Badge variant="secondary">Recommandée</Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {promotion.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Gift className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-600">
                              {getDiscountText(promotion)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Users className="h-4 w-4" />
                            <span>{promotion.usageCount} utilisations</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => handleUsePromotion(promotion)}
                        disabled={appliedPromotion?.id === promotion.id}
                      >
                        {appliedPromotion?.id === promotion.id ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Appliquée
                          </>
                        ) : (
                          'Utiliser'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Promotions personnelles */}
        <TabsContent value="my-promotions" className="space-y-4">
          {userPromotions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucune promotion personnalisée</p>
                  <p className="text-sm">Rejoignez le programme de fidélité pour des offres exclusives</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {userPromotions.map((promotion) => (
                <Card key={promotion.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="h-5 w-5 text-purple-500" />
                          <h3 className="font-semibold">{promotion.name}</h3>
                          <Badge variant="outline">Exclusivité</Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {promotion.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Gift className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-green-600">
                              {getDiscountText(promotion)}
                            </span>
                          </div>
                          
                          {promotion.loyaltyRequired && (
                            <Badge variant="secondary" className="text-xs">
                              Fidélité
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button 
                        size="sm"
                        onClick={() => handleUsePromotion(promotion)}
                        disabled={appliedPromotion?.id === promotion.id}
                      >
                        {appliedPromotion?.id === promotion.id ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Appliquée
                          </>
                        ) : (
                          'Utiliser'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Promotion actuellement appliquée */}
      {appliedPromotion && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span>Promotion Appliquée</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800">
                  {appliedPromotion.name}
                </h3>
                <p className="text-sm text-green-600">
                  {getDiscountText(appliedPromotion)} - {appliedPromotion.description}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAppliedPromotion(null)}
              >
                Retirer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}