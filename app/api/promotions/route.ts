/**
 * API Routes pour les Promotions
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Endpoints RESTful pour la gestion complète des promotions :
 * - CRUD des promotions
 * - Validation des codes
 * - Analytics
 * - Gestion des campagnes
 */

import { NextRequest, NextResponse } from 'next/server';
import { promotionsService } from '@/lib/promotions-service';
import { couponsManager } from '@/lib/coupons-manager';
import { analyticsService } from '@/lib/analytics-service';
import { performanceMonitor } from '@/lib/performance-monitor';

// GET /api/promotions - Récupérer toutes les promotions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const storeId = searchParams.get('storeId');
    
    const filters: any = {};
    
    if (type) filters.type = type;
    if (storeId) filters.storeId = storeId;
    if (userId) filters.userId = userId;
    
    // Ajouter la géolocalisation si disponible
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      filters.location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    }

    let promotions;
    
    if (status === 'active') {
      promotions = await promotionsService.getActivePromotions(filters);
    } else {
      // Pour l'admin, récupérer toutes les promotions (implémentation simplifiée)
      promotions = await promotionsService.getActivePromotions(filters);
    }

    performanceMonitor.info('API: Promotions récupérées', { 
      count: promotions.length,
      filters: Object.keys(filters)
    });

    return NextResponse.json({
      success: true,
      data: promotions,
      meta: {
        count: promotions.length,
        filters: Object.keys(filters)
      }
    });

  } catch (error) {
    performanceMonitor.error('API: Erreur récupération promotions', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des promotions'
    }, { status: 500 });
  }
}

// POST /api/promotions - Créer une nouvelle promotion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      type, 
      discountType, 
      discountValue,
      validFrom,
      validUntil,
      createdBy,
      ...otherFields 
    } = body;

    // Validation des champs requis
    if (!name || !description || !type || !discountType || !discountValue || !validFrom || !validUntil || !createdBy) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants'
      }, { status: 400 });
    }

    const promotionData = {
      name,
      description,
      type,
      discountType,
      discountValue: Number(discountValue),
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
      createdBy,
      isActive: true,
      isStackable: false,
      usageCount: 0,
      targetAudience: {
        type: 'all'
      },
      stackingRules: {
        canStackWithLoyalty: false,
        canStackWithOtherPromotions: false,
        maxStackingDiscount: 50,
        priority: 1
      },
      metadata: {},
      ...otherFields
    };

    const promotion = await promotionsService.createPromotion(promotionData);

    // Track analytics
    await analyticsService.trackEvent({
      type: 'promotion_created',
      category: 'promotion',
      userId: createdBy,
      metadata: {
        promotionId: promotion.id,
        type: promotion.type,
        discountValue: promotion.discountValue
      }
    });

    performanceMonitor.info('API: Promotion créée', { 
      promotionId: promotion.id,
      name: promotion.name,
      createdBy
    });

    return NextResponse.json({
      success: true,
      data: promotion
    }, { status: 201 });

  } catch (error) {
    performanceMonitor.error('API: Erreur création promotion', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de la promotion'
    }, { status: 500 });
  }
}