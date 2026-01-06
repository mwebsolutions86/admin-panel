/**
 * API Endpoint - États Financiers
 * Universal Eats - API de génération des états financiers
 */

import { NextRequest, NextResponse } from 'next/server';
import accountingService from '@/lib/accounting-service';
import { FinancialStatementType } from '@/types/accounting';

/**
 * GET /api/accounting/statements
 * Génère ou récupère un état financier
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const periodId = searchParams.get('periodId');
    const type = searchParams.get('type') as FinancialStatementType;
    
    if (!storeId || !periodId || !type) {
      return NextResponse.json(
        { error: 'storeId, periodId et type sont requis' },
        { status: 400 }
      );
    }

    const validTypes: FinancialStatementType[] = [
      'balance_sheet',
      'income_statement', 
      'cash_flow',
      'equity_changes',
      'notes'
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type non supporté. Types valides: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const statement = await accountingService.generateFinancialStatement(type, periodId, storeId);
    
    return NextResponse.json({
      success: true,
      data: statement
    });

  } catch (error) {
    console.error('Erreur API statements:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de l\'état financier',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/statements/approve
 * Approuve un état financier
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, statementId, approvedBy } = body;
    
    if (!storeId || !statementId || !approvedBy) {
      return NextResponse.json(
        { error: 'storeId, statementId et approvedBy sont requis' },
        { status: 400 }
      );
    }

    // Simuler l'approbation (dans un vrai système, ceci mettrait à jour la base de données)
    const approvalResult = {
      statementId,
      approvedBy,
      approvedAt: new Date().toISOString(),
      status: 'approved'
    };

    return NextResponse.json({
      success: true,
      data: approvalResult,
      message: 'État financier approuvé avec succès'
    });

  } catch (error) {
    console.error('Erreur API approve statement:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'approbation de l\'état financier',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}