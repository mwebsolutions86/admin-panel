/**
 * API Route pour les Campagnes de Promotions
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Endpoint pour gérer les campagnes de promotions
 */

import { NextRequest, NextResponse } from 'next/server';
import { promotionsService } from '@/lib/promotions-service';
import { performanceMonitor } from '@/lib/performance-monitor';

// GET /api/promotions/campaigns - Récupérer les campagnes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, inactive, all
    const includePromotions = searchParams.get('includePromotions') === 'true';

    // En réalité, il faudrait une méthode getCampaigns dans promotionsService
    // Pour la démo, on simule des données
    const mockCampaigns = [
      {
        id: 'campaign_1',
        name: 'Campagne Été 2024',
        description: 'Promotions spéciales pour l\'été',
        promotions: ['promo_1', 'promo_2', 'promo_3'],
        startDate: '2024-06-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        budget: 10000,
        spent: 6500,
        targetMetrics: {
          targetUsage: 1000,
          targetRevenue: 50000,
          targetROI: 3.0
        },
        channels: ['push_notification', 'email', 'social_media'],
        isActive: true,
        createdAt: '2024-05-15T10:00:00Z'
      },
      {
        id: 'campaign_2',
        name: 'Back to School',
        description: 'Promotions pour la rentrée',
        promotions: ['promo_4', 'promo_5'],
        startDate: '2024-09-01T00:00:00Z',
        endDate: '2024-09-30T23:59:59Z',
        budget: 5000,
        spent: 1200,
        targetMetrics: {
          targetUsage: 500,
          targetRevenue: 25000,
          targetROI: 2.5
        },
        channels: ['push_notification', 'in_app'],
        isActive: true,
        createdAt: '2024-08-15T14:30:00Z'
      }
    ];

    let campaigns = mockCampaigns;

    // Filtrer par statut
    if (status === 'active') {
      campaigns = campaigns.filter(c => c.isActive);
    } else if (status === 'inactive') {
      campaigns = campaigns.filter(c => !c.isActive);
    }

    // Inclure les promotions si demandé
    if (includePromotions) {
      const campaignsWithPromotions = await Promise.all(
        campaigns.map(async (campaign) => {
          const promotions = await Promise.all(
            campaign.promotions.map(async (promoId) => {
              try {
                return await promotionsService.getPromotion(promoId);
              } catch {
                return null;
              }
            })
          );
          
          return {
            ...campaign,
            promotions: promotions.filter(Boolean)
          };
        })
      );
      campaigns = campaignsWithPromotions;
    }

    performanceMonitor.info('API: Campagnes récupérées', { 
      count: campaigns.length,
      status,
      includePromotions
    });

    return NextResponse.json({
      success: true,
      data: campaigns,
      meta: {
        count: campaigns.length,
        status,
        includePromotions
      }
    });

  } catch (error) {
    performanceMonitor.error('API: Erreur récupération campagnes', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des campagnes'
    }, { status: 500 });
  }
}

// POST /api/promotions/campaigns - Créer une nouvelle campagne
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      promotions, 
      startDate, 
      endDate, 
      budget, 
      targetMetrics,
      channels,
      isActive = true
    } = body;

    // Validation des champs requis
    if (!name || !description || !promotions || !startDate || !endDate || !budget) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants: name, description, promotions, startDate, endDate, budget'
      }, { status: 400 });
    }

    const campaignData = {
      name,
      description,
      promotions: promotions || [],
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      budget: Number(budget),
      spent: 0,
      targetMetrics: targetMetrics || {
        targetUsage: 0,
        targetRevenue: 0,
        targetROI: 0
      },
      channels: channels || ['push_notification'],
      isActive
    };

    const campaign = await promotionsService.createCampaign(campaignData);

    performanceMonitor.info('API: Campagne créée', { 
      campaignId: campaign.id,
      name: campaign.name,
      promotionsCount: campaign.promotions.length
    });

    return NextResponse.json({
      success: true,
      data: campaign
    }, { status: 201 });

  } catch (error) {
    performanceMonitor.error('API: Erreur création campagne', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de la campagne'
    }, { status: 500 });
  }
}