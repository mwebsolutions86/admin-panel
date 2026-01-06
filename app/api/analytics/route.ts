/**
 * API Routes pour l'Analytics
 * Universal Eats - Module Analytics Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics-service';
import { reportsService } from '@/lib/reports-service';
import { 
  AnalyticsFilters, 
  KPIConfig, 
  AnalyticsAlert,
  ReportConfig 
} from '@/types/analytics';

/**
 * GET /api/analytics
 * Récupère toutes les métriques analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraire les filtres depuis les paramètres de requête
    const filters: AnalyticsFilters = {};
    
    if (searchParams.has('dateRange')) {
      const dateRangeStr = searchParams.get('dateRange');
      if (dateRangeStr) {
        const [start, end] = dateRangeStr.split(',');
        filters.dateRange = {
          start: new Date(start),
          end: new Date(end)
        };
      }
    }
    
    if (searchParams.has('stores')) {
      const storesStr = searchParams.get('stores');
      filters.stores = storesStr ? storesStr.split(',') : [];
    }
    
    if (searchParams.has('categories')) {
      const categoriesStr = searchParams.get('categories');
      filters.categories = categoriesStr ? categoriesStr.split(',') : [];
    }
    
    if (searchParams.has('orderTypes')) {
      const orderTypesStr = searchParams.get('orderTypes');
      filters.orderTypes = orderTypesStr ? orderTypesStr.split(',') : [];
    }

    // Récupérer toutes les métriques en parallèle
    const [business, customer, operational, product, marketing, performance] = await Promise.all([
      analyticsService.getBusinessMetrics(filters),
      analyticsService.getCustomerMetrics(filters),
      analyticsService.getOperationalMetrics(filters),
      analyticsService.getProductAnalytics(filters),
      analyticsService.getMarketingMetrics(filters),
      analyticsService.getPerformanceMetrics()
    ]);

    return NextResponse.json({
      data: {
        business,
        customer,
        operational,
        product,
        marketing,
        performance
      },
      success: true,
      message: 'Métriques analytics récupérées avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API analytics:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des métriques',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics/track
 * Enregistre un événement analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, category, metadata, userId, storeId, orderId, productId } = body;

    // Validation des paramètres requis
    if (!type || !category) {
      return NextResponse.json({
        success: false,
        message: 'Type et catégorie sont requis'
      }, { status: 400 });
    }

    // Enregistrer l'événement
    await analyticsService.trackEvent({
      type,
      category,
      sessionId: metadata?.sessionId || 'unknown',
      metadata: metadata || {},
      userId,
      storeId,
      orderId,
      productId
    });

    return NextResponse.json({
      success: true,
      message: 'Événement enregistré avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur tracking événement:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de l\'événement',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}