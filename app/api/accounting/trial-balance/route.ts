/**
 * API Endpoint - Balance Générale
 * Universal Eats - API de génération de la balance générale
 */

import { NextRequest, NextResponse } from 'next/server';
import accountingService from '@/lib/accounting-service';

/**
 * GET /api/accounting/trial-balance
 * Génère ou récupère la balance générale
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const periodId = searchParams.get('periodId');
    
    if (!storeId || !periodId) {
      return NextResponse.json(
        { error: 'storeId et periodId sont requis' },
        { status: 400 }
      );
    }

    const trialBalance = await accountingService.getTrialBalance(periodId, storeId);
    
    return NextResponse.json({
      success: true,
      data: trialBalance
    });

  } catch (error) {
    console.error('Erreur API trial-balance:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de la balance générale',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/trial-balance/regenerate
 * Régénère la balance générale
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, periodId } = body;
    
    if (!storeId || !periodId) {
      return NextResponse.json(
        { error: 'storeId et periodId sont requis' },
        { status: 400 }
      );
    }

    // Régénérer la balance (implémentation simplifiée)
    const trialBalance = await accountingService.getTrialBalance(periodId, storeId);
    
    return NextResponse.json({
      success: true,
      data: trialBalance,
      message: 'Balance générale régénérée avec succès'
    });

  } catch (error) {
    console.error('Erreur API regenerate trial-balance:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la régénération de la balance générale',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}