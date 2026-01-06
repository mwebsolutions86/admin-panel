/**
 * Éditeur de Promotions
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Composant pour créer et éditer des promotions avec :
 * - Formulaire complet de configuration
 * - Validation en temps réel
 * - Prévisualisation des paramètres
 * - Intégration avec le système de fidélité
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Promotion, PromotionType, DiscountType, TargetAudience } from '@/lib/promotions-service';
import { CalendarIcon, Info, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PromotionEditorProps {
  promotion?: Promotion;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PromotionFormData {
  name: string;
  description: string;
  type: PromotionType;
  discountType: DiscountType;
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageLimitPerUser?: number;
  isActive: boolean;
  isStackable: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableStores?: string[];
  targetAudience: TargetAudience;
  stackingRules: {
    canStackWithLoyalty: boolean;
    canStackWithOtherPromotions: boolean;
    maxStackingDiscount: number;
    priority: number;
  };
  geoTargeting?: {
    cities: string[];
    zones: string[];
    radius?: number;
  };
  loyaltyRequired?: boolean;
  loyaltyLevelRequired?: string;
}

export default function PromotionEditor({ 
  promotion, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: PromotionEditorProps) {
  const [formData, setFormData] = useState<PromotionFormData>({
    name: '',
    description: '',
    type: 'code_promo',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    isActive: true,
    isStackable: false,
    targetAudience: {
      type: 'all'
    },
    stackingRules: {
      canStackWithLoyalty: false,
      canStackWithOtherPromotions: false,
      maxStackingDiscount: 50,
      priority: 1
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Initialiser avec les données de la promotion existante
  useEffect(() => {
    if (promotion) {
      setFormData({
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        minimumAmount: promotion.minimumAmount,
        maximumDiscount: promotion.maximumDiscount,
        validFrom: new Date(promotion.validFrom),
        validUntil: new Date(promotion.validUntil),
        usageLimit: promotion.usageLimit,
        usageLimitPerUser: promotion.usageLimitPerUser,
        isActive: promotion.isActive,
        isStackable: promotion.isStackable,
        applicableProducts: promotion.applicableProducts || [],
        applicableCategories: promotion.applicableCategories || [],
        applicableStores: promotion.applicableStores || [],
        targetAudience: promotion.targetAudience,
        stackingRules: promotion.stackingRules,
        geoTargeting: promotion.geoTargeting,
        loyaltyRequired: promotion.loyaltyRequired,
        loyaltyLevelRequired: promotion.loyaltyLevelRequired
      });
    }
  }, [promotion]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (formData.discountValue <= 0) {
      newErrors.discountValue = 'La valeur de réduction doit être positive';
    }

    if (formData.type === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Le pourcentage ne peut pas dépasser 100%';
    }

    if (formData.validFrom >= formData.validUntil) {
      newErrors.validUntil = 'La date de fin doit être postérieure à la date de début';
    }

    if (formData.minimumAmount && formData.minimumAmount < 0) {
      newErrors.minimumAmount = 'Le montant minimum ne peut pas être négatif';
    }

    if (formData.maximumDiscount && formData.maximumDiscount < 0) {
      newErrors.maximumDiscount = 'Le montant maximum de réduction ne peut pas être négatif';
    }

    if (formData.usageLimit && formData.usageLimit < 1) {
      newErrors.usageLimit = 'La limite d\'usage doit être au moins 1';
    }

    if (formData.usageLimitPerUser && formData.usageLimitPerUser < 1) {
      newErrors.usageLimitPerUser = 'La limite par utilisateur doit être au moins 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur soumission formulaire:', error);
    }
  };

  const handleInputChange = (field: keyof PromotionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const getDiscountPreview = () => {
    const amount = 50; // Exemple de panier de 50€
    
    switch (formData.discountType) {
      case 'percentage':
        return `${(amount * formData.discountValue / 100).toFixed(2)}€ (${formData.discountValue}%)`;
      case 'fixed_amount':
        return `${Math.min(formData.discountValue, amount).toFixed(2)}€ (montant fixe)`;
      case 'free_delivery':
        return 'Livraison gratuite';
      default:
        return '0.00€';
    }
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const diffTime = formData.validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basique</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="targeting">Ciblage</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>

        {/* Onglet Basique */}
        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la promotion *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Réduction été 2024"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de promotion</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value as PromotionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code_promo">Code Promo</SelectItem>
                  <SelectItem value="reduction_automatique">Réduction Automatique</SelectItem>
                  <SelectItem value="livraison_gratuite">Livraison Gratuite</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                  <SelectItem value="geolocalisee">Géolocalisée</SelectItem>
                  <SelectItem value="fidelite_exclusive">Exclusivité Fidélité</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Décrivez votre promotion..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountType">Type de réduction</Label>
              <Select 
                value={formData.discountType} 
                onValueChange={(value) => handleInputChange('discountType', value as DiscountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Montant fixe (€)</SelectItem>
                  <SelectItem value="free_delivery">Livraison gratuite</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountValue">
                Valeur de réduction
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pourcentage ou montant selon le type sélectionné</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => handleInputChange('discountValue', Number(e.target.value))}
                min="0"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                max={formData.discountType === 'percentage' ? '100' : undefined}
                className={errors.discountValue ? 'border-red-500' : ''}
              />
              {errors.discountValue && (
                <p className="text-sm text-red-500">{errors.discountValue}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumAmount">Montant minimum (optionnel)</Label>
              <Input
                id="minimumAmount"
                type="number"
                value={formData.minimumAmount || ''}
                onChange={(e) => handleInputChange('minimumAmount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.validFrom, 'PPP', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.validFrom}
                    onSelect={(date) => date && handleInputChange('validFrom', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.validUntil, 'PPP', { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.validUntil}
                    onSelect={(date) => date && handleInputChange('validUntil', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.validUntil && (
                <p className="text-sm text-red-500">{errors.validUntil}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Promotion active</Label>
          </div>
        </TabsContent>

        {/* Onglet Règles */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Limite d'usage totale (optionnel)</Label>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit || ''}
                onChange={(e) => handleInputChange('usageLimit', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Illimitée"
                min="1"
              />
              {errors.usageLimit && (
                <p className="text-sm text-red-500">{errors.usageLimit}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="usageLimitPerUser">Limite par utilisateur (optionnel)</Label>
              <Input
                id="usageLimitPerUser"
                type="number"
                value={formData.usageLimitPerUser || ''}
                onChange={(e) => handleInputChange('usageLimitPerUser', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1"
                min="1"
              />
              {errors.usageLimitPerUser && (
                <p className="text-sm text-red-500">{errors.usageLimitPerUser}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maximumDiscount">Montant maximum de réduction (optionnel)</Label>
              <Input
                id="maximumDiscount"
                type="number"
                value={formData.maximumDiscount || ''}
                onChange={(e) => handleInputChange('maximumDiscount', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Illimité"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select 
                value={formData.stackingRules.priority.toString()} 
                onValueChange={(value) => handleInputChange('stackingRules', {
                  ...formData.stackingRules,
                  priority: Number(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Très haute</SelectItem>
                  <SelectItem value="2">2 - Haute</SelectItem>
                  <SelectItem value="3">3 - Normale</SelectItem>
                  <SelectItem value="4">4 - Basse</SelectItem>
                  <SelectItem value="5">5 - Très basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Règles d'empilement</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="canStackWithLoyalty"
                  checked={formData.stackingRules.canStackWithLoyalty}
                  onCheckedChange={(checked) => handleInputChange('stackingRules', {
                    ...formData.stackingRules,
                    canStackWithLoyalty: checked
                  })}
                />
                <Label htmlFor="canStackWithLoyalty">
                  Peut s'empiler avec la fidélité
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="canStackWithOtherPromotions"
                  checked={formData.stackingRules.canStackWithOtherPromotions}
                  onCheckedChange={(checked) => handleInputChange('stackingRules', {
                    ...formData.stackingRules,
                    canStackWithOtherPromotions: checked
                  })}
                />
                <Label htmlFor="canStackWithOtherPromotions">
                  Peut s'empiler avec d'autres promotions
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStackingDiscount">
                  Réduction maximum cumulée (%)
                </Label>
                <Input
                  id="maxStackingDiscount"
                  type="number"
                  value={formData.stackingRules.maxStackingDiscount}
                  onChange={(e) => handleInputChange('stackingRules', {
                    ...formData.stackingRules,
                    maxStackingDiscount: Number(e.target.value)
                  })}
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isStackable"
              checked={formData.isStackable}
              onCheckedChange={(checked) => handleInputChange('isStackable', checked)}
            />
            <Label htmlFor="isStackable">
              Promotion empilable
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 inline" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cette promotion peut être combinée avec d'autres</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
        </TabsContent>

        {/* Onglet Ciblage */}
        <TabsContent value="targeting" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetAudience">Audience cible</Label>
            <Select 
              value={formData.targetAudience.type} 
              onValueChange={(value) => handleInputChange('targetAudience', {
                ...formData.targetAudience,
                type: value as any
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                <SelectItem value="new_customers">Nouveaux clients</SelectItem>
                <SelectItem value="returning_customers">Clients réguliers</SelectItem>
                <SelectItem value="vip">Clients VIP</SelectItem>
                <SelectItem value="loyalty_members">Membres fidélité</SelectItem>
                <SelectItem value="segmented">Segments personnalisés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.targetAudience.type === 'loyalty_members' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="loyaltyRequired"
                  checked={formData.loyaltyRequired}
                  onCheckedChange={(checked) => handleInputChange('loyaltyRequired', checked)}
                />
                <Label htmlFor="loyaltyRequired">
                  Programme de fidélité requis
                </Label>
              </div>

              {formData.loyaltyRequired && (
                <div className="space-y-2">
                  <Label htmlFor="loyaltyLevelRequired">Niveau de fidélité requis (optionnel)</Label>
                  <Select 
                    value={formData.loyaltyLevelRequired || ''} 
                    onValueChange={(value) => handleInputChange('loyaltyLevelRequired', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les niveaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les niveaux</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {formData.type === 'geolocalisee' && (
            <div className="space-y-4">
              <h4 className="font-medium">Ciblage géographique</h4>
              
              <div className="space-y-2">
                <Label htmlFor="cities">Villes cibles</Label>
                <Input
                  id="cities"
                  placeholder="Casablanca, Rabat, Marrakech"
                  value={formData.geoTargeting?.cities.join(', ') || ''}
                  onChange={(e) => handleInputChange('geoTargeting', {
                    ...formData.geoTargeting,
                    cities: e.target.value.split(',').map(city => city.trim()).filter(Boolean)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Rayon (km, optionnel)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={formData.geoTargeting?.radius || ''}
                  onChange={(e) => handleInputChange('geoTargeting', {
                    ...formData.geoTargeting,
                    radius: e.target.value ? Number(e.target.value) : undefined
                  })}
                  placeholder="10"
                  min="1"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Onglet Aperçu */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aperçu de la promotion</CardTitle>
              <CardDescription>
                Voici comment votre promotion apparaîtra aux clients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{formData.name || 'Nom de la promotion'}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.description || 'Description de la promotion'}
                  </p>
                </div>
                <Badge variant="secondary">
                  {formData.type.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-gray-500">Réduction</Label>
                  <div className="text-lg font-bold text-green-600">
                    {getDiscountPreview()}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">Validité</Label>
                  <div className="text-sm">
                    {getDaysRemaining()} jour(s) restant(s)
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">Montant minimum</Label>
                  <div className="text-sm">
                    {formData.minimumAmount ? `${formData.minimumAmount}€` : 'Aucun'}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500">Usage par client</Label>
                  <div className="text-sm">
                    {formData.usageLimitPerUser || 'Illimité'}
                  </div>
                </div>
              </div>

              {formData.targetAudience.type !== 'all' && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-gray-500">Audience cible</Label>
                  <div className="text-sm">
                    {formData.targetAudience.type === 'new_customers' && 'Nouveaux clients uniquement'}
                    {formData.targetAudience.type === 'returning_customers' && 'Clients réguliers uniquement'}
                    {formData.targetAudience.type === 'vip' && 'Clients VIP uniquement'}
                    {formData.targetAudience.type === 'loyalty_members' && 'Membres du programme de fidélité'}
                    {formData.targetAudience.type === 'segmented' && 'Segments personnalisés'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : (promotion ? 'Mettre à jour' : 'Créer')}
        </Button>
      </div>
    </form>
  );
}