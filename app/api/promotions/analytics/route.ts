/**
 * API Route pour les Analytics des Promotions
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Endpoint pour récupérer les métriques et analytics des promotions
 */

import { NextRequest, NextResponse } from 'next/server';
import { promotionsService } from '@/lib/promotions-service';
import { couponsManager } from '@/lib/coupons-manager';
import { performanceMonitor } from '@/lib/performance-monitor';

// GET /api/promotions/analytics - Récupérer les analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get('promotionId');
    const dateRange = searchParams.get('dateRange');
    const includeFraudData = searchParams.get('includeFraudData') === 'true';

    if (promotionId) {
      // Analytics pour une promotion spécifique
      const analytics = await promotionsService.getPromotionAnalytics(
        promotionId, 
        dateRange ? parseDateRange(dateRange) : undefined
      );

      return NextResponse.json({
        success: true,
        data: analytics
      });
    } else {
      // Analytics générales (rapport de performance)
      const filters: any = {};
      
      if (dateRange) {
        filters.dateRange = parseDateRange(dateRange);
      }
      if (includeFraudData) {
        filters.includeFraudData = true;
      }

      const performanceReport = await couponsManager.generatePerformanceReport(filters);

      return NextResponse.json({
        success: true,
        data: performanceReport
      });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur récupération analytics', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des analytics'
    }, { status: 500 });
  }
}

// Helper function pour parser les ranges de dates
function parseDateRange(dateRange: string): { start: Date; end: Date } {
  const now = new Date();
  const ranges: Record<string, { start: Date; end: Date }> = {
    '7d': {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: now
    },
    '30d': {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: now
    },
    '90d': {
      start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      end: now
    },
    '365d': {
      start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      end: now
    }
  };

  return ranges[dateRange] || ranges['30d'];
}