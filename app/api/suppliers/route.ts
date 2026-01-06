/**
 * API Route pour la Gestion des Fournisseurs
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Endpoints disponibles :
 * - GET /api/suppliers - Récupérer la liste des fournisseurs
 * - POST /api/suppliers - Créer un nouveau fournisseur
 */

import { NextRequest, NextResponse } from 'next/server';
import { suppliersManager } from '../../../lib/suppliers-manager';
import { SupplierFilters } from '../../../lib/suppliers-manager';

// GET /api/suppliers - Récupérer la liste des fournisseurs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraire les paramètres de filtrage
    const status = searchParams.get('status')?.split(',') as any;
    const type = searchParams.get('type')?.split(',') as any;
    const location = searchParams.get('location') || undefined;
    const performanceMin = searchParams.get('performanceMin') ? Number(searchParams.get('performanceMin')) : undefined;
    const certificationRequired = searchParams.get('certificationRequired') || undefined;
    const contractActive = searchParams.get('contractActive') === 'true';
    const minOrders = searchParams.get('minOrders') ? Number(searchParams.get('minOrders')) : undefined;

    // Construire les filtres
    const filters: SupplierFilters = {
      status,
      type,
      location,
      performanceMin,
      certificationRequired,
      contractActive,
      minOrders
    };

    // Récupérer les fournisseurs
    const suppliers = await suppliersManager.getSuppliers(filters);

    // Calculer les statistiques
    const stats = {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === 'active').length,
      inactive: suppliers.filter(s => s.status === 'inactive').length,
      suspended: suppliers.filter(s => s.status === 'suspended').length,
      averageScore: suppliers.length > 0 
        ? suppliers.reduce((sum, s) => sum + s.performance.overallScore, 0) / suppliers.length 
        : 0,
      totalOrders: suppliers.reduce((sum, s) => sum + s.performance.totalOrders, 0),
      totalValue: suppliers.reduce((sum, s) => sum + s.performance.totalValue, 0)
    };

    return NextResponse.json({
      success: true,
      data: suppliers,
      stats,
      meta: {
        total: suppliers.length,
        filters: filters
      }
    });

  } catch (error) {
    console.error('Erreur API suppliers GET:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des fournisseurs',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation des champs requis
    const {
      name,
      code,
      type,
      contact,
      address,
      commercial,
      certifications = [],
      compliance,
      notes
    } = body;

    if (!name || !code || !type || !contact || !address || !commercial) {
      return NextResponse.json(
        { 
          error: 'name, code, type, contact, address et commercial sont requis',
          requiredFields: ['name', 'code', 'type', 'contact', 'address', 'commercial']
        },
        { status: 400 }
      );
    }

    // Valider le type de fournisseur
    const validTypes = ['manufacturer', 'distributor', 'local', 'import'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type de fournisseur invalide. Types acceptés: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Créer le fournisseur
    const supplierData = {
      name,
      code,
      type,
      status: 'active' as const,
      contact,
      address,
      commercial,
      certifications,
      compliance: compliance || {},
      notes
    };

    const newSupplier = await suppliersManager.createSupplier(supplierData);

    return NextResponse.json({
      success: true,
      data: newSupplier,
      message: 'Fournisseur créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur API suppliers POST:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création du fournisseur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}