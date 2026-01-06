/**
 * Adaptateur Orange Money pour Universal Eats
 * 
 * Orange Money Maroc - API de paiement mobile
 * Documentation: https://developer.orange.com/orange-money/
 */

import { BaseMobilePaymentAdapter, CreatePaymentRequestData, PaymentResult, StatusResult, CancellationResult, ValidationResult, AdapterConfig } from './base-payment-adapter';

export class OrangeMoneyAdapter extends BaseMobilePaymentAdapter {
  name = 'Orange Money';
  code = 'orange_money';
  isActive = true;

  private readonly BASE_URL = 'https://api.orange.com/orange-money-webpay/dev/v1';
  private readonly TEST_URL = 'https://api.orange.com/orange-money-webpay/dev/v1';

  constructor() {
    super();
    this.configure({
      apiUrl: this.TEST_URL, // Par défaut en mode test
      merchantId: process.env.ORANGE_MONEY_MERCHANT_ID || '',
      apiKey: process.env.ORANGE_MONEY_API_KEY || '',
      secretKey: process.env.ORANGE_MONEY_SECRET_KEY || '',
      webhookUrl: process.env.ORANGE_MONEY_WEBHOOK_URL || '',
      timeout: 30000,
      retryAttempts: 3,
      testMode: process.env.NODE_ENV !== 'production'
    });
  }

  /**
   * Crée une demande de paiement Orange Money
   */
  async createPaymentRequest(request: CreatePaymentRequestData): Promise<PaymentResult> {
    try {
      // Validation des données
      if (!this.validateMoroccanPhoneNumber(request.phoneNumber || '')) {
        return {
          success: false,
          status: 'failed',
          message: 'Numéro de téléphone invalide. Format attendu: +2126XXXXXXXX ou 06XXXXXXXX'
        };
      }

      const formattedPhone = this.formatPhoneNumber(request.phoneNumber!);

      // Préparation des données pour l'API Orange Money
      const paymentData = {
        merchant_key: this.config.merchantId,
        currency: request.currency || 'MAD',
        order_id: request.transactionId,
        reference: request.description,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/return`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        notif_url: this.config.webhookUrl,
        lang: 'fr',
        reference2: request.orderId,
        env: this.config.testMode ? 'TEST' : 'PRODUCTION'
      };

      // Appel à l'API Orange Money
      const result = await this.makeHttpRequest('/webpayment', 'POST', paymentData);

      if (result.status === 'SUCCESS' && result.payment_url) {
        return {
          success: true,
          externalTransactionId: result.order_id,
          status: 'processing',
          message: 'Demande de paiement créée avec succès',
          redirectUrl: result.payment_url,
          callbackData: result
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: result.message || 'Erreur lors de la création de la demande de paiement'
        };
      }

    } catch (error) {
      console.error('Erreur Orange Money - Création paiement:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie le statut d'une transaction Orange Money
   */
  async checkPaymentStatus(externalTransactionId: string): Promise<StatusResult> {
    try {
      // Orange Money utilise merchant_key et order_id pour vérifier le statut
      const statusData = {
        merchant_key: this.config.merchantId,
        order_id: externalTransactionId,
        lang: 'fr'
      };

      const result = await this.makeHttpRequest('/status', 'POST', statusData);

      if (result.status === 'SUCCESS') {
        const mappedStatus = this.mapCallbackStatus(result.payment_status);
        
        return {
          success: true,
          status: mappedStatus,
          message: result.message || 'Statut récupéré avec succès',
          amount: parseFloat(result.amount) || undefined,
          callbackData: result,
          transactionDate: result.payment_date
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: result.message || 'Erreur lors de la vérification du statut'
        };
      }

    } catch (error) {
      console.error('Erreur Orange Money - Vérification statut:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Annule une transaction Orange Money
   */
  async cancelTransaction(externalTransactionId: string): Promise<CancellationResult> {
    try {
      // Orange Money ne permet pas toujours l'annulation de transactions
      // On va plutôt marquer la transaction comme annulée dans notre système
      console.warn('Orange Money: Annulation de transaction non supportée par l\'API');
      
      return {
        success: true,
        message: 'Transaction marquée comme annulée (Orange Money ne supporte pas l\'annulation directe)'
      };

    } catch (error) {
      console.error('Erreur Orange Money - Annulation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Valide les données de callback Orange Money
   */
  validateCallbackData(callbackData: any): ValidationResult {
    const errors: string[] = [];

    // Vérification des champs obligatoires
    if (!callbackData.order_id) {
      errors.push('order_id manquant');
    }

    if (!callbackData.status) {
      errors.push('status manquant');
    }

    if (!callbackData.merchant_key) {
      errors.push('merchant_key manquant');
    }

    // Vérification de la merchant key
    if (callbackData.merchant_key !== this.config.merchantId) {
      errors.push('merchant_key invalide');
    }

    return {
      isValid: errors.length === 0,
      externalTransactionId: callbackData.order_id,
      status: callbackData.status,
      amount: callbackData.amount ? parseFloat(callbackData.amount) : undefined,
      errors
    };
  }

  /**
   * Mappe le statut Orange Money vers notre statut interne
   */
  mapCallbackStatus(callbackStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'SUCCESS': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'CANCEL': 'cancelled',
      'ERROR': 'failed'
    };

    return statusMap[callbackStatus.toUpperCase()] || 'pending';
  }

  /**
   * Génère l'URL de paiement avec les paramètres corrects
   */
  generatePaymentUrl(paymentData: any): string {
    const baseUrl = this.config.testMode ? 'https://sandbox-api.orange.com' : 'https://api.orange.com';
    const params = new URLSearchParams({
      merchant_key: this.config.merchantId,
      currency: paymentData.currency || 'MAD',
      order_id: paymentData.order_id,
      reference: paymentData.reference,
      return_url: paymentData.return_url,
      cancel_url: paymentData.cancel_url,
      notif_url: paymentData.notif_url,
      lang: 'fr'
    });

    return `${baseUrl}/orange-money-webpay/dev/v1/webpayment?${params.toString()}`;
  }

  /**
   * Valide la signature du callback Orange Money
   */
  validateCallbackSignature(callbackData: any): boolean {
    // Orange Money utilise une signature basée sur les paramètres
    // Cette implémentation dépend de la configuration spécifique
    try {
      const expectedSignature = callbackData.signature;
      const dataToSign = {
        order_id: callbackData.order_id,
        status: callbackData.status,
        amount: callbackData.amount,
        merchant_key: callbackData.merchant_key
      };

      const computedSignature = this.generateSignature(dataToSign);
      return expectedSignature === computedSignature;

    } catch (error) {
      console.error('Erreur lors de la validation de la signature:', error);
      return false;
    }
  }
}