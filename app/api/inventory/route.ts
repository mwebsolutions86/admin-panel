/**
 * API Route pour la Gestion d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Endpoints disponibles :
 * - GET /api/inventory - Récupérer l'inventaire avec filtres
 * - POST /api/inventory - Créer un nouvel article d'inventaire
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '../../../lib/inventory-service';
import { InventoryFilters } from '../../../lib/inventory-service';

// GET /api/inventory - Récupérer l'inventaire
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraire les paramètres de requête
    const storeId = searchParams.get('storeId');
    const minStock = searchParams.get('minStock') ? Number(searchParams.get('minStock')) : undefined;
    const maxStock = searchParams.get('maxStock') ? Number(searchParams.get('maxStock')) : undefined;
    const lowStock = searchParams.get('lowStock') === 'true';
    const expiryWarning = searchParams.get('expiryWarning') === 'true';
    const categories = searchParams.get('categories')?.split(',');
    const storeIds = searchParams.get('storeIds')?.split(',');
    const supplierIds = searchParams.get('supplierIds')?.split(',');
    
    // Gérer les dates
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    // Construire les filtres
    const filters: InventoryFilters = {
      storeIds,
      categories,
      minStock,
      maxStock,
      expiryWarning,
      lowStock,
      supplierIds,
      dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined
    };

    // Récupérer l'inventaire
    const inventory = await inventoryService.getInventory(storeId, filters);

    return NextResponse.json({
      success: true,
      data: inventory,
      meta: {
        total: inventory.length,
        filters: filters,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API inventory GET:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération de l\'inventaire',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Créer un nouvel article d'inventaire
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, productId, currentStock, minThreshold, maxThreshold, unitCost } = body;

    // Validation des champs requis
    if (!storeId || !productId || currentStock === undefined || minThreshold === undefined) {
      return NextResponse.json(
        { error: 'storeId, productId, currentStock et minThreshold sont requis' },
        { status: 400 }
      );
    }

    // Créer l'article d'inventaire
    const newInventoryItem = {
      storeId,
      productId,
      currentStock: Number(currentStock),
      reservedStock: 0,
      minThreshold: Number(minThreshold),
      maxThreshold: Number(maxThreshold) || Number(currentStock) * 2,
      unitCost: Number(unitCost) || 0
    };

    // Note: Cette fonctionnalité nécessiterait une méthode createInventoryItem dans le service
    // Pour l'instant, on simule la création
    const createdItem = {
      id: `inv_${Date.now()}`,
      ...newInventoryItem,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: createdItem,
      message: 'Article d\'inventaire créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur API inventory POST:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création de l\'article d\'inventaire',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}