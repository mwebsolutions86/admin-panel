/**
 * API Routes pour les Webhooks des Fournisseurs de Paiement Mobile
 * Universal Eats - Gestion des callbacks en temps réel
 * 
 * Webhooks pour :
 * - Orange Money callbacks
 * - Inwi Money callbacks
 * - PayZone callbacks (future)
 * - Validation et sécurisation des notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { mobilePaymentsService } from '@/lib/mobile-payments-service';
import { analyticsService } from '@/lib/analytics-service';
import { performanceMonitor } from '@/lib/performance-monitor';

/**
 * POST /api/mobile-payments/webhook/[provider]
 * Reçoit les callbacks des fournisseurs de paiement mobile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toLowerCase();
    const callbackData = await request.json();

    performanceMonitor.info('API: Webhook reçu', { 
      provider,
      hasData: !!callbackData,
      timestamp: new Date().toISOString()
    });

    // Validation du fournisseur
    const supportedProviders = ['orange-money', 'inwi-money', 'payzone'];
    if (!supportedProviders.includes(provider)) {
      performanceMonitor.error('API: Fournisseur webhook non supporté', { provider });
      return NextResponse.json({
        success: false,
        error: 'Fournisseur de paiement non supporté'
      }, { status: 400 });
    }

    // Mapping du nom du fournisseur vers le code interne
    const providerCodeMap: Record<string, string> = {
      'orange-money': 'orange_money',
      'inwi-money': 'inwi_money',
      'payzone': 'payzone'
    };

    const internalProviderCode = providerCodeMap[provider];

    // Validation de base des données de callback
    if (!callbackData || typeof callbackData !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Données de callback invalides'
      }, { status: 400 });
    }

    // Traitement du callback via le service principal
    const processed = await mobilePaymentsService.handlePaymentCallback(
      internalProviderCode, 
      callbackData
    );

    if (processed) {
      // Track analytics du callback réussi
      await analyticsService.trackEvent({
        type: 'mobile_payment_webhook_processed',
        category: 'payment',
        metadata: {
          provider,
          providerCode: internalProviderCode,
          callbackData,
          processedAt: new Date().toISOString()
        }
      });

      performanceMonitor.info('API: Webhook traité avec succès', { 
        provider,
        hasTransactionId: !!callbackData.transaction_id || !!callbackData.order_id
      });

      // Réponse de succès pour le fournisseur
      return NextResponse.json({
        success: true,
        message: 'Callback traité avec succès',
        timestamp: new Date().toISOString()
      });
    } else {
      performanceMonitor.error('API: Échec traitement webhook', { 
        provider,
        callbackData
      });

      return NextResponse.json({
        success: false,
        error: 'Échec du traitement du callback'
      }, { status: 500 });
    }

  } catch (error) {
    performanceMonitor.error('API: Erreur webhook paiement mobile', { 
      provider: params.provider,
      error,
      timestamp: new Date().toISOString()
    });
    
    // Track analytics de l'erreur
    await analyticsService.trackEvent({
      type: 'mobile_payment_webhook_error',
      category: 'payment',
      metadata: {
        provider: params.provider,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du traitement du webhook',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/mobile-payments/webhook/[provider]
 * Test de santé du webhook pour un fournisseur
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toLowerCase();

    // Validation du fournisseur
    const supportedProviders = ['orange-money', 'inwi-money', 'payzone'];
    if (!supportedProviders.includes(provider)) {
      return NextResponse.json({
        success: false,
        error: 'Fournisseur de paiement non supporté'
      }, { status: 400 });
    }

    performanceMonitor.info('API: Test webhook', { provider });

    // Réponse de santé
    return NextResponse.json({
      success: true,
      message: `Webhook ${provider} opérationnel`,
      timestamp: new Date().toISOString(),
      provider,
      status: 'healthy',
      endpoints: {
        webhook: `/api/mobile-payments/webhook/${provider}`,
        callbackTypes: ['payment_status_update', 'payment_completed', 'payment_failed']
      }
    });

  } catch (error) {
    performanceMonitor.error('API: Erreur test webhook', { 
      provider: params.provider,
      error 
    });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du test du webhook',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}