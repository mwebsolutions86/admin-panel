/**
 * API Routes pour les Paiements Mobiles
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Endpoints RESTful pour la gestion des paiements mobiles :
 * - Création de demandes de paiement
 * - Gestion des transactions
 * - Intégration Orange Money et Inwi Money
 */

import { NextRequest, NextResponse } from 'next/server';
import { mobilePaymentsService } from '@/lib/mobile-payments-service';
import { analyticsService } from '@/lib/analytics-service';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * GET /api/mobile-payments
 * Récupère la liste des fournisseurs et statistiques
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'providers';
    
    if (action === 'providers') {
      // Récupérer les fournisseurs de paiement actifs
      const providers = mobilePaymentsService.getActiveProviders();
      
      performanceMonitor.info('API: Fournisseurs de paiement récupérés', { 
        count: providers.length,
        activeProviders: providers.filter(p => p.isActive).length
      });

      return NextResponse.json({
        success: true,
        data: providers,
        meta: {
          count: providers.length,
          activeCount: providers.filter(p => p.isActive).length
        }
      });
    }
    
    else if (action === 'statistics') {
      // Récupérer les statistiques de paiement
      const dateFrom = searchParams.get('dateFrom') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = searchParams.get('dateTo') || new Date().toISOString();
      
      const statistics = await mobilePaymentsService.getPaymentStatistics(dateFrom, dateTo);
      
      return NextResponse.json({
        success: true,
        data: statistics,
        meta: {
          dateFrom,
          dateTo,
          period: `${dateFrom} - ${dateTo}`
        }
      });
    }
    
    else if (action === 'history') {
      // Récupérer l'historique des transactions
      const filters: any = {};
      
      if (searchParams.get('providerCode')) {
        filters.providerCode = searchParams.get('providerCode');
      }
      
      if (searchParams.get('status')) {
        filters.status = searchParams.get('status');
      }
      
      if (searchParams.get('dateFrom')) {
        filters.dateFrom = searchParams.get('dateFrom');
      }
      
      if (searchParams.get('dateTo')) {
        filters.dateTo = searchParams.get('dateTo');
      }
      
      if (searchParams.get('limit')) {
        filters.limit = parseInt(searchParams.get('limit') || '50');
      }
      
      const history = await mobilePaymentsService.getTransactionHistory(filters);
      
      performanceMonitor.info('API: Historique paiements récupéré', { 
        count: history.length,
        filters: Object.keys(filters)
      });

      return NextResponse.json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          filters
        }
      });
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Action non reconnue'
      }, { status: 400 });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur récupération paiements mobiles', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des données de paiement',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST /api/mobile-payments
 * Crée une nouvelle demande de paiement mobile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      orderId,
      amount,
      currency = 'MAD',
      providerCode,
      phoneNumber,
      customerName,
      description 
    } = body;

    // Validation des champs requis
    if (!orderId || !amount || !providerCode) {
      return NextResponse.json({
        success: false,
        error: 'Champs requis manquants: orderId, amount, providerCode'
      }, { status: 400 });
    }

    // Validation du montant
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Le montant doit être un nombre positif'
      }, { status: 400 });
    }

    // Validation du numéro de téléphone si fourni
    if (phoneNumber) {
      const phonePatterns = [
        /^\+2126\d{8}$/,
        /^06\d{8}$/,
        /^2126\d{8}$/
      ];
      
      const isValidPhone = phonePatterns.some(pattern => pattern.test(phoneNumber.trim()));
      
      if (!isValidPhone) {
        return NextResponse.json({
          success: false,
          error: 'Format de numéro invalide. Utilisez: +2126XXXXXXXX ou 06XXXXXXXX'
        }, { status: 400 });
      }
    }

    const paymentRequest = {
      orderId,
      amount,
      currency,
      providerCode,
      phoneNumber: phoneNumber?.trim(),
      customerName: customerName?.trim(),
      description: description || `Paiement commande ${orderId}`
    };

    // Créer la demande de paiement
    const result = await mobilePaymentsService.createPaymentRequest(paymentRequest);

    if (result.success) {
      // Track analytics
      await analyticsService.trackEvent({
        type: 'mobile_payment_requested',
        category: 'payment',
        orderId,
        metadata: {
          providerCode,
          amount,
          currency,
          transactionId: result.transactionId
        }
      });

      performanceMonitor.info('API: Demande de paiement créée', { 
        orderId,
        providerCode,
        amount,
        transactionId: result.transactionId
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId: result.transactionId,
          externalTransactionId: result.externalTransactionId,
          status: result.status,
          message: result.message,
          redirectUrl: result.redirectUrl
        }
      }, { status: 201 });
    } else {
      performanceMonitor.error('API: Échec création demande paiement', { 
        orderId,
        providerCode,
        amount,
        error: result.message
      });

      return NextResponse.json({
        success: false,
        error: result.message || 'Échec de la création de la demande de paiement'
      }, { status: 400 });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur création demande paiement', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la création de la demande de paiement',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * PUT /api/mobile-payments
 * Annule une transaction existante
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, reason } = body;

    // Validation des champs requis
    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'transactionId est requis'
      }, { status: 400 });
    }

    // Annuler la transaction
    const result = await mobilePaymentsService.cancelTransaction(transactionId);

    if (result.success) {
      // Track analytics
      await analyticsService.trackEvent({
        type: 'mobile_payment_cancelled',
        category: 'payment',
        metadata: {
          transactionId,
          reason: reason || 'Annulation manuelle'
        }
      });

      performanceMonitor.info('API: Transaction annulée', { 
        transactionId,
        reason
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId,
          status: 'cancelled',
          message: result.message
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || 'Impossible d\'annuler la transaction'
      }, { status: 400 });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur annulation transaction', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'annulation de la transaction',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}