/**
 * API Routes pour les Métriques Client
 * Universal Eats - Module Analytics Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics-service';
import { AnalyticsFilters } from '@/types/analytics';

/**
 * GET /api/analytics/customers
 * Récupère les métriques client
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
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

    const metrics = await analyticsService.getCustomerMetrics(filters);

    return NextResponse.json({
      data: metrics,
      success: true,
      message: 'Métriques client récupérées',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API customer metrics:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur récupération métriques client',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}