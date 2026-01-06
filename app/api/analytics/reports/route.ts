/**
 * API Routes pour les Rapports
 * Universal Eats - Module Analytics Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { reportsService } from '@/lib/reports-service';
import { AnalyticsFilters } from '@/types/analytics';

/**
 * GET /api/analytics/reports
 * Liste tous les rapports configurés
 */
export async function GET(request: NextRequest) {
  try {
    const schedules = reportsService.getSchedules();

    return NextResponse.json({
      data: schedules,
      success: true,
      message: 'Rapports récupérés',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API reports:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur récupération rapports',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics/reports/generate
 * Génère un rapport
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, filters, format } = body;

    if (!configId) {
      return NextResponse.json({
        success: false,
        message: 'configId est requis'
      }, { status: 400 });
    }

    const reportResult = await reportsService.generateReport(configId, filters, format);

    return NextResponse.json({
      data: {
        reportId: reportResult.data.reportId,
        title: reportResult.data.title,
        generatedAt: reportResult.data.generatedAt,
        filename: reportResult.filename,
        summary: reportResult.data.summary,
        insights: reportResult.data.insights,
        recommendations: reportResult.data.recommendations
      },
      success: true,
      message: 'Rapport généré avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur génération rapport:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur génération rapport',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * PUT /api/analytics/reports/schedule
 * Programme un rapport
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, schedule } = body;

    if (!config || !schedule) {
      return NextResponse.json({
        success: false,
        message: 'Configuration et planification requises'
      }, { status: 400 });
    }

    const scheduleId = await reportsService.scheduleReport(config, schedule);

    return NextResponse.json({
      data: { scheduleId },
      success: true,
      message: 'Rapport programmé avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur programmation rapport:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur programmation rapport',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}