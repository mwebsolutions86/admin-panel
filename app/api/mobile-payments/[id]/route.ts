/**
 * API Routes pour les Transactions de Paiement Mobile Individuelles
 * Universal Eats - Gestion des transactions spécifiques
 * 
 * Endpoints pour :
 * - Vérification du statut d'une transaction
 * - Gestion des callbacks des fournisseurs
 * - Détails d'une transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { mobilePaymentsService } from '@/lib/mobile-payments-service';
import { analyticsService } from '@/lib/analytics-service';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * GET /api/mobile-payments/[id]
 * Récupère les détails d'une transaction spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'ID de transaction requis'
      }, { status: 400 });
    }

    // Vérifier le statut de la transaction
    const result = await mobilePaymentsService.checkPaymentStatus(transactionId);

    if (result.success) {
      performanceMonitor.info('API: Statut transaction récupéré', { 
        transactionId,
        status: result.status
      });

      return NextResponse.json({
        success: true,
        data: {
          transactionId,
          status: result.status,
          message: result.message,
          externalTransactionId: result.externalTransactionId
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message || 'Transaction non trouvée'
      }, { status: 404 });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur récupération transaction', { 
      transactionId: params.id,
      error 
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération de la transaction',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}

/**
 * POST /api/mobile-payments/[id]/cancel
 * Annule une transaction spécifique
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;
    const body = await request.json();
    const { reason } = body;

    if (!transactionId) {
      return NextResponse.json({
        success: false,
        error: 'ID de transaction requis'
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
          reason: reason || 'Annulation via API'
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
    performanceMonitor.error('API: Erreur annulation transaction', { 
      transactionId: params.id,
      error 
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'annulation de la transaction',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}