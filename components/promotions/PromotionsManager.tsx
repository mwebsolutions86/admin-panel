/**
 * Composant principal de gestion des promotions (Admin)
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Interface d'administration complète pour :
 * - Vue d'ensemble des promotions
 * - Création et édition de promotions
 * - Gestion des codes coupon
 * - Analytics et rapports
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { usePromotionsActions, usePromotions, useCampaigns } from '@/hooks/use-promotions';
import { Promotion, PromotionType } from '@/lib/promotions-service';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Copy, BarChart3, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PromotionEditor from './PromotionEditor';
import CouponValidator from './CouponValidator';
import PromotionsAnalytics from './PromotionsAnalytics';

interface PromotionsManagerProps {
  userId: string;
}

export default function PromotionsManager({ userId }: PromotionsManagerProps) {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Hooks pour les données
  const { promotions, activePromotions, isLoading, error, refresh } = usePromotions(userId);
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { 
    isProcessing, 
    createPromotion, 
    updatePromotion, 
    deactivatePromotion, 
    clonePromotion,
    generateCoupons 
  } = usePromotionsActions();

  // Filtrer les promotions
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && promotion.isActive) ||
                         (statusFilter === 'inactive' && !promotion.isActive) ||
                         (statusFilter === 'expired' && new Date(promotion.validUntil) < new Date());
    
    const matchesType = typeFilter === 'all' || promotion.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Statistiques des promotions
  const stats = {
    total: promotions.length,
    active: activePromotions.length,
    expired: promotions.filter(p => new Date(p.validUntil) < new Date()).length,
    totalUsage: promotions.reduce((sum, p) => sum + p.usageCount, 0)
  };

  const handleCreatePromotion = async (promotionData: any) => {
    try {
      await createPromotion({
        ...promotionData,
        createdBy: userId
      });
      setIsCreateDialogOpen(false);
      await refresh();
    } catch (error) {
      console.error('Erreur création promotion:', error);
    }
  };

  const handleEditPromotion = async (promotionId: string, updates: any) => {
    try {
      await updatePromotion(promotionId, updates);
      setIsEditDialogOpen(false);
      setSelectedPromotion(null);
      await refresh();
    } catch (error) {
      console.error('Erreur mise à jour promotion:', error);
    }
  };

  const handleDeactivatePromotion = async (promotionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir désactiver cette promotion ?')) {
      try {
        await deactivatePromotion(promotionId, 'Désactivation manuelle par l\'administrateur');
        await refresh();
      } catch (error) {
        console.error('Erreur désactivation promotion:', error);
      }
    }
  };

  const handleClonePromotion = async (promotionId: string) => {
    const newName = prompt('Nom de la nouvelle promotion :');
    if (newName && newName.trim()) {
      try {
        await clonePromotion(promotionId, newName.trim());
        await refresh();
      } catch (error) {
        console.error('Erreur clonage promotion:', error);
      }
    }
  };

  const handleGenerateCoupons = async (promotionId: string) => {
    const count = prompt('Nombre de codes à générer :');
    const validUntil = prompt('Date d\'expiration (YYYY-MM-DD) :');
    
    if (count && !isNaN(Number(count))) {
      try {
        await generateCoupons(promotionId, Number(count), {
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined
        });
        alert('Codes générés avec succès !');
      } catch (error) {
        console.error('Erreur génération codes:', error);
      }
    }
  };

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validUntil = new Date(promotion.validUntil);

    if (!promotion.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    
    if (now < validFrom) {
      return <Badge variant="outline">Programmée</Badge>;
    }
    
    if (now > validUntil) {
      return <Badge variant="destructive">Expirée</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  const getTypeLabel = (type: PromotionType) => {
    const labels = {
      'code_promo': 'Code Promo',
      'reduction_automatique': 'Réduction Auto',
      'livraison_gratuite': 'Livraison Gratuite',
      'buy_x_get_y': 'Buy X Get Y',
      'flash_sale': 'Flash Sale',
      'geolocalisee': 'Géolocalisée',
      'fidelite_exclusive': 'Exclusivité Fidélité'
    };
    return labels[type] || type;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Erreur lors du chargement des promotions : {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Promotions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Promotions Actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-sm text-muted-foreground">Promotions Expirées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalUsage}</div>
            <p className="text-sm text-muted-foreground">Utilisations Totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principaux */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste des Promotions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="validator">Validateur de Codes</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
        </TabsList>

        {/* Onglet Liste */}
        <TabsContent value="list" className="space-y-4">
          {/* Filtres et actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher une promotion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="inactive">Inactives</SelectItem>
                  <SelectItem value="expired">Expirées</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="code_promo">Codes Promo</SelectItem>
                  <SelectItem value="reduction_automatique">Réduction Auto</SelectItem>
                  <SelectItem value="livraison_gratuite">Livraison Gratuite</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                  <SelectItem value="geolocalisee">Géolocalisées</SelectItem>
                  <SelectItem value="fidelite_exclusive">Exclusivité Fidélité</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle promotion</DialogTitle>
                  <DialogDescription>
                    Configurez les détails de votre nouvelle promotion.
                  </DialogDescription>
                </DialogHeader>
                <PromotionEditor
                  onSubmit={handleCreatePromotion}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isLoading={isProcessing}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Liste des promotions */}
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">Chargement des promotions...</div>
            ) : filteredPromotions.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Aucune promotion ne correspond aux filtres'
                      : 'Aucune promotion créée'
                    }
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredPromotions.map((promotion) => (
                <Card key={promotion.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{promotion.name}</h3>
                          {getStatusBadge(promotion)}
                          <Badge variant="outline">
                            {getTypeLabel(promotion.type)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {promotion.description}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-gray-500">Réduction</Label>
                            <div className="font-medium">
                              {promotion.discountType === 'percentage' 
                                ? `${promotion.discountValue}%`
                                : `${promotion.discountValue}€`
                              }
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-500">Validité</Label>
                            <div className="font-medium">
                              {format(new Date(promotion.validFrom), 'dd/MM/yyyy', { locale: fr })}
                              {' - '}
                              {format(new Date(promotion.validUntil), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-500">Utilisations</Label>
                            <div className="font-medium">
                              {promotion.usageCount}
                              {promotion.usageLimit && ` / ${promotion.usageLimit}`}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-500">Créée le</Label>
                            <div className="font-medium">
                              {format(new Date(promotion.createdAt), 'dd/MM/yyyy', { locale: fr })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedPromotion(promotion);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleClonePromotion(promotion.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Dupliquer
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleGenerateCoupons(promotion.id)}>
                            <Gift className="h-4 w-4 mr-2" />
                            Générer Codes
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleDeactivatePromotion(promotion.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Désactiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Onglet Analytics */}
        <TabsContent value="analytics">
          <PromotionsAnalytics />
        </TabsContent>

        {/* Onglet Validateur */}
        <TabsContent value="validator">
          <CouponValidator />
        </TabsContent>

        {/* Onglet Campagnes */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Gestion des Campagnes</h3>
            
            {campaignsLoading ? (
              <div className="text-center py-8">Chargement des campagnes...</div>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <CardTitle>{campaign.name}</CardTitle>
                      <CardDescription>{campaign.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {campaign.promotions.length} promotion(s) • 
                          Du {format(new Date(campaign.startDate), 'dd/MM/yyyy', { locale: fr })} 
                          {' au '} 
                          {format(new Date(campaign.endDate), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <Badge variant={campaign.isActive ? "default" : "secondary"}>
                          {campaign.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la promotion</DialogTitle>
            <DialogDescription>
              Modifiez les détails de la promotion.
            </DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <PromotionEditor
              promotion={selectedPromotion}
              onSubmit={(data) => handleEditPromotion(selectedPromotion.id, data)}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedPromotion(null);
              }}
              isLoading={isProcessing}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}