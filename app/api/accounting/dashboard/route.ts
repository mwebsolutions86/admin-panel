/**
 * API Endpoint - Tableau de Bord Financier
 * Universal Eats - API de gestion financière
 */

import { NextRequest, NextResponse } from 'next/server';
import financialManager from '@/lib/financial-manager';

/**
 * GET /api/accounting/dashboard
 * Récupère le tableau de bord financier d'un magasin
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    const dashboard = await financialManager.generateRealTimeDashboard(storeId);
    
    return NextResponse.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Erreur API dashboard:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération du tableau de bord',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/dashboard/refresh
 * Actualise manuellement les KPIs du tableau de bord
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    // Actualiser les KPIs
    const alerts = await financialManager.monitorFinancialHealth(storeId);
    
    return NextResponse.json({
      success: true,
      message: 'KPIs actualisés avec succès',
      data: {
        alertsCount: alerts.length,
        alerts
      }
    });

  } catch (error) {
    console.error('Erreur API refresh dashboard:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'actualisation des KPIs',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}