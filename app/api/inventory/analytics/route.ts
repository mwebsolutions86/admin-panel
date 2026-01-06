/**
 * API Route pour les Analytics d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Endpoints disponibles :
 * - GET /api/inventory/analytics - Récupérer les analytics d'inventaire
 * - POST /api/inventory/analytics - Générer des rapports personnalisés
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryService } from '../../../../lib/inventory-service';

// GET /api/inventory/analytics - Récupérer les analytics d'inventaire
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraire les paramètres
    const storeId = searchParams.get('storeId');
    const period = searchParams.get('period') || '30d'; // '7d', '30d', '90d', '1y'
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const includeForecasts = searchParams.get('includeForecasts') === 'true';

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    // Récupérer les analytics de base
    const analytics = await inventoryService.getInventoryAnalytics(storeId);

    // Enrichir les données avec des métriques supplémentaires
    const enrichedAnalytics = {
      ...analytics,
      period,
      generatedAt: new Date().toISOString(),
      
      // Métriques supplémentaires
      metrics: {
        ...analytics,
        // Calculs supplémentaires
        efficiency: analytics.totalItems > 0 ? (analytics.totalValue / analytics.totalItems) : 0,
        wasteCost: (analytics.totalValue * analytics.wastePercentage) / 100,
        potentialSavings: analytics.lowStockItems * 10, // Estimation
        reorderFrequency: analytics.rotationRate / 12, // Estimation mensuelle
      },

      // Tendances (si demandées)
      trends: includeTrends ? {
        stockHealth: 'stable', // À calculer avec des données historiques
        wasteTrend: 'decreasing',
        rotationTrend: 'increasing',
        valueTrend: 'stable'
      } : undefined,

      // Prévisions (si demandées)
      forecasts: includeForecasts ? {
        nextMonthDemand: analytics.totalValue * 1.1, // Estimation +10%
        recommendedReorders: analytics.lowStockItems,
        predictedWaste: analytics.wastePercentage * 0.9, // Prévision -10%
        expectedRotation: analytics.rotationRate * 1.05 // Prévision +5%
      } : undefined
    };

    // Calculer les recommandations
    const recommendations = generateRecommendations(enrichedAnalytics);

    return NextResponse.json({
      success: true,
      data: enrichedAnalytics,
      recommendations,
      meta: {
        storeId,
        period,
        includeTrends,
        includeForecasts,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur API inventory analytics GET:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des analytics',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// POST /api/inventory/analytics - Générer des rapports personnalisés
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storeId,
      reportType = 'summary',
      dateRange,
      metrics = [],
      format = 'json',
      includeCharts = false,
      recipients = []
    } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    // Récupérer les analytics de base
    const analytics = await inventoryService.getInventoryAnalytics(storeId);

    // Générer le rapport selon le type
    let reportData;
    switch (reportType) {
      case 'summary':
        reportData = generateSummaryReport(analytics);
        break;
      case 'detailed':
        reportData = generateDetailedReport(analytics, dateRange);
        break;
      case 'performance':
        reportData = generatePerformanceReport(analytics);
        break;
      case 'trends':
        reportData = generateTrendsReport(analytics);
        break;
      default:
        return NextResponse.json(
          { error: `Type de rapport non supporté: ${reportType}` },
          { status: 400 }
        );
    }

    // Formater le rapport
    const formattedReport = {
      id: `report_${Date.now()}`,
      type: reportType,
      storeId,
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || getDefaultDateRange(),
      data: reportData,
      format,
      includeCharts
    };

    return NextResponse.json({
      success: true,
      data: formattedReport,
      message: 'Rapport généré avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur API inventory analytics POST:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la génération du rapport',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Fonctions utilitaires pour générer les rapports
function generateRecommendations(analytics: any): string[] {
  const recommendations: string[] = [];

  // Recommandations basées sur le stock faible
  if (analytics.lowStockItems > 0) {
    recommendations.push(`Réapprovisionner ${analytics.lowStockItems} article(s) en stock faible`);
  }

  // Recommandations basées sur les ruptures
  if (analytics.outOfStockItems > 0) {
    recommendations.push(`URGENT: ${analytics.outOfStockItems} article(s) en rupture de stock`);
  }

  // Recommandations basées sur le gaspillage
  if (analytics.wastePercentage > 5) {
    recommendations.push(`Réduire le gaspillage (actuellement ${analytics.wastePercentage.toFixed(1)}%)`);
  }

  // Recommandations basées sur la rotation
  if (analytics.rotationRate < 10) {
    recommendations.push(`Améliorer la rotation des stocks (actuellement ${analytics.rotationRate.toFixed(1)}%)`);
  }

  // Recommandations sur les coûts
  if (analytics.wastePercentage > 3) {
    recommendations.push(`Optimiser la gestion pour réduire les coûts de gaspillage`);
  }

  return recommendations;
}

function generateSummaryReport(analytics: any) {
  return {
    overview: {
      totalValue: analytics.totalValue,
      totalItems: analytics.totalItems,
      healthScore: calculateHealthScore(analytics)
    },
    issues: {
      lowStock: analytics.lowStockItems,
      outOfStock: analytics.outOfStockItems,
      expiring: analytics.expiringItems
    },
    performance: {
      rotationRate: analytics.rotationRate,
      turnoverTime: analytics.turnoverTime,
      wastePercentage: analytics.wastePercentage
    },
    topIssues: analytics.lowStockItems + analytics.outOfStockItems > 0 ? 
      ['Articles en stock faible', 'Articles en rupture'] : 
      ['Aucun problème critique identifié']
  };
}

function generateDetailedReport(analytics: any, dateRange?: any) {
  return {
    ...generateSummaryReport(analytics),
    trends: {
      stockLevels: 'stable',
      wasteTrend: analytics.wastePercentage > 5 ? 'high' : 'normal',
      rotationTrend: analytics.rotationRate > 15 ? 'good' : 'needs_improvement'
    },
    costAnalysis: {
      totalValue: analytics.totalValue,
      wasteCost: (analytics.totalValue * analytics.wastePercentage) / 100,
      potentialSavings: analytics.lowStockItems * 25 // Estimation
    },
    supplierPerformance: analytics.supplierPerformance || []
  };
}

function generatePerformanceReport(analytics: any) {
  return {
    kpis: {
      inventoryTurnover: analytics.rotationRate,
      daysOfSupply: analytics.turnoverTime,
      wasteRate: analytics.wastePercentage,
      stockAccuracy: 95 // Estimation
    },
    efficiency: {
      valuePerItem: analytics.totalValue / analytics.totalItems,
      ordersPerDay: analytics.rotationRate / 365,
      costPerItem: (analytics.totalValue * analytics.wastePercentage) / (100 * analytics.totalItems)
    },
    benchmarks: {
      industryAverage: {
        rotationRate: 12,
        wastePercentage: 3,
        turnoverTime: 30
      },
      performance: {
        rotation: analytics.rotationRate > 12 ? 'above_average' : 'below_average',
        waste: analytics.wastePercentage < 3 ? 'above_average' : 'below_average',
        turnover: analytics.turnoverTime < 30 ? 'above_average' : 'below_average'
      }
    }
  };
}

function generateTrendsReport(analytics: any) {
  return {
    trends: [
      {
        metric: 'stock_levels',
        direction: 'stable',
        change: 0,
        confidence: 80
      },
      {
        metric: 'waste_rate',
        direction: analytics.wastePercentage > 5 ? 'increasing' : 'stable',
        change: analytics.wastePercentage > 5 ? 15 : 0,
        confidence: 75
      },
      {
        metric: 'rotation_rate',
        direction: analytics.rotationRate > 10 ? 'increasing' : 'stable',
        change: analytics.rotationRate > 10 ? 8 : 0,
        confidence: 70
      }
    ],
    forecasts: {
      next30Days: {
        expectedWaste: analytics.wastePercentage * 0.95,
        expectedRotation: analytics.rotationRate * 1.02,
        expectedReorders: Math.ceil(analytics.lowStockItems * 0.8)
      }
    }
  };
}

function calculateHealthScore(analytics: any): number {
  if (analytics.totalItems === 0) return 100;
  
  const stockHealth = ((analytics.totalItems - analytics.lowStockItems - analytics.outOfStockItems) / analytics.totalItems) * 100;
  const wasteHealth = Math.max(0, 100 - (analytics.wastePercentage * 10));
  const rotationHealth = Math.min(100, analytics.rotationRate * 5);
  
  return Math.round((stockHealth + wasteHealth + rotationHealth) / 3);
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}