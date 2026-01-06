/**
 * API Route pour les Alertes d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Endpoints disponibles :
 * - GET /api/inventory/alerts - Récupérer les alertes actives
 * - POST /api/inventory/alerts - Marquer des alertes comme lues
 * - DELETE /api/inventory/alerts - Résoudre des alertes
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '../../../../lib/inventory-service';

// GET /api/inventory/alerts - Récupérer les alertes actives
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraire les paramètres
    const storeId = searchParams.get('storeId');
    const severity = searchParams.get('severity'); // 'critical', 'warning', 'info'
    const type = searchParams.get('type'); // 'low_stock', 'out_of_stock', etc.
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

    // Récupérer les alertes
    const alerts = await inventoryService.getActiveAlerts(storeId || undefined);

    // Filtrer les alertes si des paramètres sont fournis
    let filteredAlerts = alerts;
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    // Limiter le nombre de résultats
    filteredAlerts = filteredAlerts.slice(0, limit);

    // Calculer les statistiques
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      unread: alerts.filter(a => !a.isRead).length
    };

    return NextResponse.json({
      success: true,
      data: filteredAlerts,
      stats,
      meta: {
        total: filteredAlerts.length,
        filters: {
          storeId,
          severity,
          type,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Erreur API inventory alerts GET:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des alertes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/inventory/alerts - Marquer des alertes comme lues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertIds, action = 'mark_read' } = body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'alertIds (tableau) est requis' },
        { status: 400 }
      );
    }

    const results: Array<{ id: any; status: string }> = [];
    const errors: Array<{ id: any; error: string }> = [];

    // Traiter chaque alerte
    for (const alertId of alertIds) {
      try {
        if (action === 'mark_read') {
          await inventoryService.markAlertAsRead(alertId);
          results.push({ id: alertId, status: 'marked_as_read' });
        } else if (action === 'resolve') {
          await inventoryService.resolveAlert(alertId);
          results.push({ id: alertId, status: 'resolved' });
        } else {
          errors.push({ id: alertId, error: 'Action non supportée' });
        }
      } catch (error) {
        errors.push({ 
          id: alertId, 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        });
      }
    }

    const response: any = {
      success: true,
      message: `${results.length} alerte(s) ${action === 'mark_read' ? 'marcée(s) comme lue(s)' : 'résolue(s)'} avec succès`,
      results
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.success = false;
      response.message = `${results.length} alerte(s) traitées avec succès, ${errors.length} erreur(s)`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur API inventory alerts POST:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du traitement des alertes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/inventory/alerts - Actions en masse (marquer comme résolues)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const severity = searchParams.get('severity');
    const action = searchParams.get('action') || 'resolve_all';

    if (action === 'resolve_all') {
      // Récupérer toutes les alertes pour le magasin
      const alerts = await inventoryService.getActiveAlerts(storeId || undefined);
      
      let filteredAlerts = alerts;
      
      // Filtrer par sévérité si spécifié
      if (severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
      }

      const results: Array<{ id: any; status: string }> = [];
      const errors: Array<{ id: any; error: string }> = [];

      // Résoudre toutes les alertes filtrées
      for (const alert of filteredAlerts) {
        try {
          await inventoryService.resolveAlert(alert.id);
          results.push({ id: alert.id, status: 'resolved' });
        } catch (error) {
          errors.push({ 
            id: alert.id, 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `${results.length} alerte(s) résolue(s) avec succès`,
        results,
        errors: errors.length > 0 ? errors : undefined,
        meta: {
          totalProcessed: results.length,
          totalErrors: errors.length,
          filters: { storeId, severity }
        }
      });
    }

    return NextResponse.json(
      { error: 'Action non supportée' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erreur API inventory alerts DELETE:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la résolution des alertes',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}