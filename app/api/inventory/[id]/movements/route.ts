/**
 * API Route pour les Mouvements de Stock
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Endpoints disponibles :
 * - GET /api/inventory/[id]/movements - Récupérer les mouvements d'un article
 * - POST /api/inventory/[id]/movements - Enregistrer un nouveau mouvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '../../../../../lib/inventory-service';
import { StockMovement } from '../../../../../lib/inventory-service';

// GET /api/inventory/[id]/movements - Récupérer les mouvements d'un article
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'article d\'inventaire est requis' },
        { status: 400 }
      );
    }

    // Extraire les paramètres de filtrage
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

    // Récupérer les mouvements
    const movements = await inventoryService.getStockMovements(
      '', // storeId sera déterminé par l'article d'inventaire
      id,
      startDate,
      endDate,
      limit
    );

    return NextResponse.json({
      success: true,
      data: movements,
      meta: {
        total: movements.length,
        inventoryItemId: id,
        filters: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          limit
        }
      }
    });

  } catch (error) {
    console.error('Erreur API inventory movements GET:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des mouvements de stock',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/inventory/[id]/movements - Enregistrer un nouveau mouvement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de l\'article d\'inventaire est requis' },
        { status: 400 }
      );
    }

    // Validation des champs requis
    const { 
      type, 
      quantity, 
      reason, 
      performedBy = 'api_user',
      storeId,
      reference,
      lotNumber,
      expiryDate,
      cost,
      notes
    } = body;

    if (!type || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: 'type, quantity et reason sont requis' },
        { status: 400 }
      );
    }

    // Valider le type de mouvement
    const validTypes: StockMovement['type'][] = ['in', 'out', 'adjustment', 'loss'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type de mouvement invalide. Types acceptés: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Enregistrer le mouvement
    const movementData = {
      inventoryItemId: id,
      storeId: storeId || 'unknown', // TODO: Déterminer le storeId depuis l'article d'inventaire
      type,
      quantity: Number(quantity),
      reason,
      performedBy,
      reference,
      lotNumber,
      expiryDate,
      cost: cost ? Number(cost) : undefined,
      notes
    };

    const movementId = await inventoryService.recordStockMovement(movementData);

    return NextResponse.json({
      success: true,
      data: {
        id: movementId,
        ...movementData,
        timestamp: new Date().toISOString()
      },
      message: 'Mouvement de stock enregistré avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur API inventory movements POST:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'enregistrement du mouvement de stock',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}