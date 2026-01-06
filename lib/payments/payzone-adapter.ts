/**
 * Adaptateur PayZone pour Universal Eats
 * 
 * PayZone Maroc - Service de paiement mobile (à venir)
 * Documentation: À confirmer avec le fournisseur
 */

import { BaseMobilePaymentAdapter, CreatePaymentRequestData, PaymentResult, StatusResult, CancellationResult, ValidationResult, AdapterConfig } from './base-payment-adapter';

export class PayZoneAdapter extends BaseMobilePaymentAdapter {
  name = 'PayZone';
  code = 'payzone';
  isActive = false; // Désactivé par défaut, à activer quand disponible

  private readonly BASE_URL = 'https://api.payzone.ma/v1';
  private readonly TEST_URL = 'https://sandbox-api.payzone.ma/v1';

  constructor() {
    super();
    this.configure({
      apiUrl: this.TEST_URL,
      merchantId: process.env.PAYZONE_MERCHANT_ID || '',
      apiKey: process.env.PAYZONE_API_KEY || '',
      secretKey: process.env.PAYZONE_SECRET_KEY || '',
      webhookUrl: process.env.PAYZONE_WEBHOOK_URL || '',
      timeout: 30000,
      retryAttempts: 3,
      testMode: process.env.NODE_ENV !== 'production'
    });
  }

  /**
   * Crée une demande de paiement PayZone
   */
  async createPaymentRequest(request: CreatePaymentRequestData): Promise<PaymentResult> {
    try {
      if (!this.isActive) {
        return {
          success: false,
          status: 'failed',
          message: 'PayZone n\'est pas encore disponible'
        };
      }

      // Validation du numéro de téléphone
      if (request.phoneNumber && !this.validateMoroccanPhoneNumber(request.phoneNumber)) {
        return {
          success: false,
          status: 'failed',
          message: 'Numéro de téléphone invalide. Format attendu: +2126XXXXXXXX ou 06XXXXXXXX'
        };
      }

      const formattedPhone = request.phoneNumber ? this.formatPhoneNumber(request.phoneNumber) : '';

      // Préparation des données pour l'API PayZone
      const paymentData = {
        merchant_id: this.config.merchantId,
        amount: request.amount,
        currency: request.currency || 'MAD',
        reference: request.description,
        customer_phone: formattedPhone,
        customer_name: request.customerName || '',
        callback_url: this.config.webhookUrl,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/return`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        locale: 'fr',
        metadata: {
          order_id: request.orderId,
          transaction_id: request.transactionId,
          source: 'universal_eats'
        }
      };

      // Appel à l'API PayZone
      const result = await this.makeHttpRequest('/payments/initiate', 'POST', paymentData);

      if (result.success && result.payment_url) {
        return {
          success: true,
          externalTransactionId: result.transaction_id,
          status: 'processing',
          message: result.message || 'Demande de paiement créée avec succès',
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
      console.error('Erreur PayZone - Création paiement:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie le statut d'une transaction PayZone
   */
  async checkPaymentStatus(externalTransactionId: string): Promise<StatusResult> {
    try {
      if (!this.isActive) {
        return {
          success: false,
          status: 'failed',
          message: 'PayZone n\'est pas disponible'
        };
      }

      const result = await this.makeHttpRequest(`/payments/${externalTransactionId}/status`, 'GET');

      if (result.success) {
        const mappedStatus = this.mapCallbackStatus(result.status);
        
        return {
          success: true,
          status: mappedStatus,
          message: result.message || 'Statut récupéré avec succès',
          amount: parseFloat(result.amount) || undefined,
          callbackData: result,
          transactionDate: result.updated_at
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: result.message || 'Erreur lors de la vérification du statut'
        };
      }

    } catch (error) {
      console.error('Erreur PayZone - Vérification statut:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Annule une transaction PayZone
   */
  async cancelTransaction(externalTransactionId: string): Promise<CancellationResult> {
    try {
      if (!this.isActive) {
        return {
          success: false,
          message: 'PayZone n\'est pas disponible'
        };
      }

      const result = await this.makeHttpRequest(`/payments/${externalTransactionId}/cancel`, 'POST', {
        reason: 'Annulation demandée par le marchand'
      });

      if (result.success) {
        return {
          success: true,
          message: result.message || 'Transaction annulée avec succès'
        };
      } else {
        return {
          success: false,
          message: result.message || 'Impossible d\'annuler la transaction'
        };
      }

    } catch (error) {
      console.error('Erreur PayZone - Annulation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Valide les données de callback PayZone
   */
  validateCallbackData(callbackData: any): ValidationResult {
    const errors: string[] = [];

    if (!this.isActive) {
      errors.push('PayZone n\'est pas activé');
      return { isValid: false, errors };
    }

    // Vérification des champs obligatoires
    if (!callbackData.transaction_id) {
      errors.push('transaction_id manquant');
    }

    if (!callbackData.status) {
      errors.push('status manquant');
    }

    if (!callbackData.merchant_id) {
      errors.push('merchant_id manquant');
    }

    // Vérification de la merchant ID
    if (callbackData.merchant_id !== this.config.merchantId) {
      errors.push('merchant_id invalide');
    }

    return {
      isValid: errors.length === 0,
      externalTransactionId: callbackData.transaction_id,
      status: callbackData.status,
      amount: callbackData.amount ? parseFloat(callbackData.amount) : undefined,
      errors
    };
  }

  /**
   * Mappe le statut PayZone vers notre statut interne
   */
  mapCallbackStatus(callbackStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'SUCCESS': 'completed',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'failed'
    };

    return statusMap[callbackStatus.toUpperCase()] || 'pending';
  }

  /**
   * Active l'adaptateur PayZone
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Désactive l'adaptateur PayZone
   */
  deactivate(): void {
    this.isActive = false;
  }
}