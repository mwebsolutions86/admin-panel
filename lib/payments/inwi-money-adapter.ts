/**
 * Adaptateur Inwi Money pour Universal Eats
 * 
 * Inwi Money Maroc - Service de paiement mobile
 * Documentation: https://www.inwi.ma/particuliers/inwi-money/
 */

import { BaseMobilePaymentAdapter, CreatePaymentRequestData, PaymentResult, StatusResult, CancellationResult, ValidationResult, AdapterConfig } from './base-payment-adapter';

export class InwiMoneyAdapter extends BaseMobilePaymentAdapter {
  name = 'Inwi Money';
  code = 'inwi_money';
  isActive = true;

  private readonly BASE_URL = 'https://api.inwi.ma/mobile-money/v1';
  private readonly TEST_URL = 'https://sandbox-api.inwi.ma/mobile-money/v1';

  constructor() {
    super();
    this.configure({
      apiUrl: this.TEST_URL, // Par défaut en mode test
      merchantId: process.env.INWI_MONEY_MERCHANT_ID || '',
      apiKey: process.env.INWI_MONEY_API_KEY || '',
      secretKey: process.env.INWI_MONEY_SECRET_KEY || '',
      webhookUrl: process.env.INWI_MONEY_WEBHOOK_URL || '',
      timeout: 30000,
      retryAttempts: 3,
      testMode: process.env.NODE_ENV !== 'production'
    });
  }

  /**
   * Crée une demande de paiement Inwi Money
   */
  async createPaymentRequest(request: CreatePaymentRequestData): Promise<PaymentResult> {
    try {
      // Validation du numéro de téléphone
      if (request.phoneNumber && !this.validateMoroccanPhoneNumber(request.phoneNumber)) {
        return {
          success: false,
          status: 'failed',
          message: 'Numéro de téléphone invalide. Format attendu: +2126XXXXXXXX ou 06XXXXXXXX'
        };
      }

      const formattedPhone = request.phoneNumber ? this.formatPhoneNumber(request.phoneNumber) : '';

      // Préparation des données pour l'API Inwi Money
      const paymentData = {
        merchant_id: this.config.merchantId,
        amount: request.amount,
        currency: request.currency || 'MAD',
        transaction_id: request.transactionId,
        reference: request.description,
        customer_phone: formattedPhone,
        customer_name: request.customerName || '',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/return`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/cancel`,
        notify_url: this.config.webhookUrl,
        language: 'fr',
        metadata: {
          order_id: request.orderId,
          source: 'universal_eats'
        }
      };

      // Appel à l'API Inwi Money
      const result = await this.makeHttpRequest('/payments', 'POST', paymentData);

      if (result.status === 'SUCCESS' || result.status === 'PENDING') {
        return {
          success: true,
          externalTransactionId: result.transaction_id,
          status: 'processing',
          message: result.message || 'Demande de paiement créée avec succès',
          redirectUrl: result.payment_url,
          authorizationCode: result.authorization_code,
          callbackData: result
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: result.message || 'Erreur lors de la création de la demande de paiement',
          callbackData: result
        };
      }

    } catch (error) {
      console.error('Erreur Inwi Money - Création paiement:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie le statut d'une transaction Inwi Money
   */
  async checkPaymentStatus(externalTransactionId: string): Promise<StatusResult> {
    try {
      const statusData = {
        merchant_id: this.config.merchantId,
        transaction_id: externalTransactionId
      };

      const result = await this.makeHttpRequest(`/payments/${externalTransactionId}/status`, 'GET', statusData);

      if (result.status === 'SUCCESS' || result.status === 'COMPLETED') {
        const mappedStatus = this.mapCallbackStatus(result.status);
        
        return {
          success: true,
          status: mappedStatus,
          message: result.message || 'Statut récupéré avec succès',
          amount: parseFloat(result.amount) || undefined,
          callbackData: result,
          transactionDate: result.updated_at || result.completed_at
        };
      } else if (result.status === 'FAILED') {
        return {
          success: false,
          status: 'failed',
          message: result.error_message || 'Échec de la transaction'
        };
      } else {
        return {
          success: true, // Même en attente, on considérons que la requête a réussi
          status: 'pending',
          message: result.message || 'Transaction en cours de traitement',
          callbackData: result
        };
      }

    } catch (error) {
      console.error('Erreur Inwi Money - Vérification statut:', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Annule une transaction Inwi Money
   */
  async cancelTransaction(externalTransactionId: string): Promise<CancellationResult> {
    try {
      const cancelData = {
        merchant_id: this.config.merchantId,
        transaction_id: externalTransactionId,
        reason: 'Annulation demandée par le marchand'
      };

      const result = await this.makeHttpRequest(`/payments/${externalTransactionId}/cancel`, 'POST', cancelData);

      if (result.status === 'SUCCESS' || result.status === 'CANCELLED') {
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
      console.error('Erreur Inwi Money - Annulation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Valide les données de callback Inwi Money
   */
  validateCallbackData(callbackData: any): ValidationResult {
    const errors: string[] = [];

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

    if (!callbackData.amount) {
      errors.push('amount manquant');
    }

    // Vérification de la merchant ID
    if (callbackData.merchant_id !== this.config.merchantId) {
      errors.push('merchant_id invalide');
    }

    // Vérification de la signature si disponible
    if (callbackData.signature && !this.validateCallbackSignature(callbackData)) {
      errors.push('signature invalide');
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
   * Mappe le statut Inwi Money vers notre statut interne
   */
  mapCallbackStatus(callbackStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'INITIATED': 'processing',
      'SUCCESS': 'completed',
      'COMPLETED': 'completed',
      'PAID': 'completed',
      'FAILED': 'failed',
      'ERROR': 'failed',
      'CANCELLED': 'cancelled',
      'CANCELED': 'cancelled',
      'EXPIRED': 'failed'
    };

    return statusMap[callbackStatus.toUpperCase()] || 'pending';
  }

  /**
   * Génère une demande de paiement USSD pour Inwi Money
   */
  generateUSSDRequest(paymentData: any): string {
    // Code USSD Inwi Money: *110#
    // Format: *110*amount*merchant_id*transaction_id#
    const ussdCode = `*110*${paymentData.amount}*${this.config.merchantId}*${paymentData.transaction_id}#`;
    return ussdCode;
  }

  /**
   * Valide la signature du callback Inwi Money
   */
  validateCallbackSignature(callbackData: any): boolean {
    try {
      const expectedSignature = callbackData.signature;
      if (!expectedSignature) return true; // Si pas de signature, on accepte

      // Données à signer (ordre important)
      const dataToSign = [
        callbackData.transaction_id,
        callbackData.status,
        callbackData.amount,
        callbackData.merchant_id,
        callbackData.created_at
      ].join('|');

      const computedSignature = this.generateSignature(dataToSign);
      return expectedSignature === computedSignature;

    } catch (error) {
      console.error('Erreur lors de la validation de la signature Inwi Money:', error);
      return false;
    }
  }

  /**
   * Envoie une notification push au client
   */
  async sendPushNotification(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const notificationData = {
        merchant_id: this.config.merchantId,
        phone_number: this.formatPhoneNumber(phoneNumber),
        message: message,
        language: 'fr'
      };

      const result = await this.makeHttpRequest('/notifications', 'POST', notificationData);
      return result.status === 'SUCCESS';

    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification push:', error);
      return false;
    }
  }

  /**
   * Génère un QR Code pour le paiement
   */
  async generateQRCode(transactionId: string): Promise<string | null> {
    try {
      const qrData = {
        merchant_id: this.config.merchantId,
        transaction_id: transactionId,
        type: 'payment'
      };

      const result = await this.makeHttpRequest('/qr-codes', 'POST', qrData);

      if (result.status === 'SUCCESS' && result.qr_code) {
        return result.qr_code;
      }

      return null;

    } catch (error) {
      console.error('Erreur lors de la génération du QR Code:', error);
      return null;
    }
  }

  /**
   * Valide les limites de transaction Inwi Money
   */
  validateTransactionLimits(amount: number): { isValid: boolean; message?: string } {
    // Limites Inwi Money (à vérifier selon la documentation officielle)
    const MIN_AMOUNT = 1; // 1 MAD minimum
    const MAX_AMOUNT = 50000; // 50,000 MAD maximum par transaction
    const DAILY_LIMIT = 200000; // 200,000 MAD maximum par jour
    const MONTHLY_LIMIT = 1000000; // 1,000,000 MAD maximum par mois

    if (amount < MIN_AMOUNT) {
      return {
        isValid: false,
        message: `Le montant minimum est de ${MIN_AMOUNT} MAD`
      };
    }

    if (amount > MAX_AMOUNT) {
      return {
        isValid: false,
        message: `Le montant maximum par transaction est de ${MAX_AMOUNT} MAD`
      };
    }

    // Note: Les limites journalières et mensuelles devraient être vérifiées côté serveur
    // en fonction de l'historique des transactions du client

    return { isValid: true };
  }
}