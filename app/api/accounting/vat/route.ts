/**
 * API Endpoint - Rapports TVA
 * Universal Eats - API de gestion de la TVA
 */

import { NextRequest, NextResponse } from 'next/server';
import accountingService from '@/lib/accounting-service';

/**
 * GET /api/accounting/vat
 * Récupère ou génère un rapport TVA pour une période
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const periodId = searchParams.get('periodId');
    const vatRate = parseFloat(searchParams.get('vatRate') || '0.20');
    
    if (!storeId || !periodId) {
      return NextResponse.json(
        { error: 'storeId et periodId sont requis' },
        { status: 400 }
      );
    }

    const vatReport = await accountingService.calculateVAT(periodId, storeId, vatRate);
    
    return NextResponse.json({
      success: true,
      data: vatReport
    });

  } catch (error) {
    console.error('Erreur API VAT:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors du calcul de la TVA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/vat/submit
 * Soumet un rapport TVA aux autorités fiscales
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, periodId, vatReportId } = body;
    
    if (!storeId || !periodId || !vatReportId) {
      return NextResponse.json(
        { error: 'storeId, periodId et vatReportId sont requis' },
        { status: 400 }
      );
    }

    // Simuler la soumission du rapport TVA
    // Dans un vrai environnement, ceci intégrerait avec les APIs gouvernementales
    
    const submissionResult = {
      reportId: vatReportId,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      reference: `TVA-${storeId}-${periodId}-${Date.now()}`,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 jours
    };

    return NextResponse.json({
      success: true,
      data: submissionResult,
      message: 'Rapport TVA soumis avec succès'
    });

  } catch (error) {
    console.error('Erreur API VAT submit:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la soumission du rapport TVA',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}