/**
 * API Routes pour les Métriques Business
 * Universal Eats - Module Analytics Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics-service';
import { AnalyticsFilters } from '@/types/analytics';

/**
 * GET /api/analytics/business
 * Récupère les métriques business
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: AnalyticsFilters = {};
    
    // Parser les paramètres de filtrage
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
      filters.stores = searchParams.get('stores')?.split(',') || [];
    }
    
    if (searchParams.has('categories')) {
      filters.categories = searchParams.get('categories')?.split(',') || [];
    }

    const metrics = await analyticsService.getBusinessMetrics(filters);

    return NextResponse.json({
      data: metrics,
      success: true,
      message: 'Métriques business récupérées',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API business metrics:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur récupération métriques business',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}