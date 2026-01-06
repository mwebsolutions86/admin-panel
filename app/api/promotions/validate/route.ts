/**
 * API Route pour la Validation des Codes Promo
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Endpoint spécialisé pour valider les codes promo en temps réel
 */

import { NextRequest, NextResponse } from 'next/server';
import { couponsManager } from '@/lib/coupons-manager';
import { performanceMonitor } from '@/lib/performance-monitor';

// POST /api/promotions/validate - Valider un code promo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      code, 
      userId, 
      orderData, 
      location, 
      ipAddress,
      userAgent 
    } = body;

    // Validation des champs requis
    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Code requis'
      }, { status: 400 });
    }

    const validationRequest = {
      code: code.toString().trim(),
      userId,
      ipAddress: ipAddress || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: userAgent || request.headers.get('user-agent') || 'unknown',
      orderData,
      location
    };

    const result = await couponsManager.validateCoupon(validationRequest);

    performanceMonitor.info('API: Code promo validé', {
      code: validationRequest.code,
      isValid: result.isValid,
      userId: userId || 'anonymous'
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    performanceMonitor.error('API: Erreur validation code promo', { error });
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation du code'
    }, { status: 500 });
  }
}