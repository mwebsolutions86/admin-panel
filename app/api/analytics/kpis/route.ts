/**
 * API Routes pour les KPIs
 * Universal Eats - Module Analytics Phase 2
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/analytics-service';
import { KPIConfig } from '@/types/analytics';

/**
 * GET /api/analytics/kpis
 * Récupère tous les KPIs configurés
 */
export async function GET(request: NextRequest) {
  try {
    const kpis = analyticsService.getKPIConfigs();

    return NextResponse.json({
      data: kpis,
      success: true,
      message: 'KPIs récupérés',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur API KPIs:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur récupération KPIs',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * PUT /api/analytics/kpis
 * Met à jour un KPI
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const kpi: KPIConfig = body;

    if (!kpi.id) {
      return NextResponse.json({
        success: false,
        message: 'ID du KPI requis'
      }, { status: 400 });
    }

    await analyticsService.updateKPIConfig(kpi);

    return NextResponse.json({
      data: kpi,
      success: true,
      message: 'KPI mis à jour avec succès',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur mise à jour KPI:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur mise à jour KPI',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST /api/analytics/kpis/check
 * Vérifie les seuils des KPIs
 */
export async function POST(request: NextRequest) {
  try {
    const alerts = await analyticsService.checkKPIThresholds();

    return NextResponse.json({
      data: alerts,
      success: true,
      message: 'Vérification des seuils effectuée',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur vérification seuils:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur vérification seuils',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}