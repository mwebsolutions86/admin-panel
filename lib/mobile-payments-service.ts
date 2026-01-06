/**
 * Service de Paiement Mobile Universal Eats
 * Intégration des solutions de paiement mobile marocaines
 * 
 * Fonctionnalités :
 * - Orange Money
 * - Inwi Money
 * - Support extensible pour d'autres solutions
 */

import { supabase } from './supabase';
import { Database } from '@/types/database.types';

// Types pour les paiements mobiles
export interface MobilePaymentProvider {
  name: string;
  code: string;
  isActive: boolean;
  logo?: string;
  color?: string;
}

export interface MobilePaymentTransaction {
  id: string;
  orderId: string;
  providerCode: string;
  providerName: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  externalTransactionId?: string;
  callbackData?: any;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface MobilePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  providerCode: string;
  phoneNumber?: string;
  customerName?: string;
  description?: string;
}

export interface MobilePaymentResult {
  success: boolean;
  transactionId?: string;
  externalTransactionId?: string;
  status: string;
  message: string;
  redirectUrl?: string;
}

// Configuration des fournisseurs de paiement mobile
export const MOBILE_PAYMENT_PROVIDERS: MobilePaymentProvider[] = [
  {
    name: 'Orange Money',
    code: 'orange_money',
    isActive: true,
    logo: '/icons/orange-money.png',
    color: '#FF6600'
  },
  {
    name: 'Inwi Money',
    code: 'inwi_money',
    isActive: true,
    logo: '/icons/inwi-money.png',
    color: '#00A86B'
  },
  {
    name: 'PayZone',
    code: 'payzone',
    isActive: false, // À activer quand disponible
    logo: '/icons/payzone.png',
    color: '#0066CC'
  }
];

class MobilePaymentsService {
  private adapters: Map<string, any> = new Map();
  
  constructor() {
    this.initializeAdapters();
  }

  /**
   * Initialise les adaptateurs pour chaque fournisseur
   */
  private async initializeAdapters() {
    // Import dynamique des adaptateurs
    const { OrangeMoneyAdapter } = await import('./payments/orange-money-adapter');
    const { InwiMoneyAdapter } = await import('./payments/inwi-money-adapter');
    
    this.adapters.set('orange_money', new OrangeMoneyAdapter());
    this.adapters.set('inwi_money', new InwiMoneyAdapter());
  }

  /**
   * Obtient la liste des fournisseurs de paiement actifs
   */
  getActiveProviders(): MobilePaymentProvider[] {
    return MOBILE_PAYMENT_PROVIDERS.filter(provider => provider.isActive);
  }

  /**
   * Obtient un fournisseur par son code
   */
  getProviderByCode(code: string): MobilePaymentProvider | undefined {
    return MOBILE_PAYMENT_PROVIDERS.find(provider => provider.code === code);
  }

  /**
   * Crée une demande de paiement mobile
   */
  async createPaymentRequest(request: MobilePaymentRequest): Promise<MobilePaymentResult> {
    try {
      // Vérification des paramètres
      const provider = this.getProviderByCode(request.providerCode);
      if (!provider || !provider.isActive) {
        throw new Error(`Fournisseur de paiement non disponible: ${request.providerCode}`);
      }

      // Récupération de la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', request.orderId)
        .single();

      if (orderError || !order) {
        throw new Error('Commande non trouvée');
      }

      // Création de la transaction en base
      const transactionData: Omit<MobilePaymentTransaction, 'id'> = {
        orderId: request.orderId,
        providerCode: request.providerCode,
        providerName: provider.name,
        amount: request.amount,
        currency: request.currency,
        phoneNumber: request.phoneNumber || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const { data: transaction, error: transactionError } = await supabase
        .from('mobile_payments_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (transactionError) {
        throw new Error(`Erreur lors de la création de la transaction: ${transactionError.message}`);
      }

      // Appel à l'adaptateur du fournisseur
      const adapter = this.adapters.get(request.providerCode);
      if (!adapter) {
        throw new Error(`Adaptateur non trouvé pour: ${request.providerCode}`);
      }

      const result = await adapter.createPaymentRequest({
        ...request,
        transactionId: transaction.id,
        description: request.description || `Commande #${order.order_number}`
      });

      // Mise à jour de la transaction avec les données externes
      await supabase
        .from('mobile_payments_transactions')
        .update({
          externalTransactionId: result.externalTransactionId,
          callbackData: result.callbackData,
          status: 'processing'
        })
        .eq('id', transaction.id);

      // Mise à jour du statut de paiement de la commande
      await supabase
        .from('orders')
        .update({
          payment_method: `mobile_${request.providerCode}`,
          payment_status: 'pending'
        })
        .eq('id', request.orderId);

      return {
        success: true,
        transactionId: transaction.id,
        externalTransactionId: result.externalTransactionId,
        status: 'processing',
        message: 'Demande de paiement créée avec succès',
        redirectUrl: result.redirectUrl
      };

    } catch (error) {
      console.error('Erreur lors de la création de la demande de paiement:', error);
      
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async checkPaymentStatus(transactionId: string): Promise<MobilePaymentResult> {
    try {
      // Récupération de la transaction
      const { data: transaction, error } = await supabase
        .from('mobile_payments_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction non trouvée');
      }

      // Appel à l'adaptateur pour vérifier le statut
      const adapter = this.adapters.get(transaction.providerCode);
      if (!adapter) {
        throw new Error(`Adaptateur non trouvé pour: ${transaction.providerCode}`);
      }

      const statusResult = await adapter.checkPaymentStatus(transaction.externalTransactionId);

      // Mise à jour de la transaction
      const updateData: any = {
        status: statusResult.status,
        callbackData: statusResult.callbackData,
        completedAt: statusResult.status === 'completed' ? new Date().toISOString() : null
      };

      if (statusResult.status === 'completed') {
        updateData.payment_status = 'completed';
        
        // Mise à jour du statut de la commande
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed'
          })
          .eq('id', transaction.orderId);

        // Intégration avec le système de fidélité
        await this.updateLoyaltyPoints(transaction.orderId, transaction.amount);
        
        // Intégration avec les promotions
        await this.updatePromotionUsage(transaction.orderId);
        
      } else if (statusResult.status === 'failed') {
        updateData.errorMessage = statusResult.message;
        
        // Mise à jour du statut de la commande
        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled'
          })
          .eq('id', transaction.orderId);
      }

      await supabase
        .from('mobile_payments_transactions')
        .update(updateData)
        .eq('id', transactionId);

      return {
        success: true,
        transactionId,
        externalTransactionId: transaction.externalTransactionId,
        status: statusResult.status,
        message: statusResult.message
      };

    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
      
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Annule une transaction
   */
  async cancelTransaction(transactionId: string): Promise<MobilePaymentResult> {
    try {
      const { data: transaction, error } = await supabase
        .from('mobile_payments_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction non trouvée');
      }

      if (transaction.status === 'completed') {
        throw new Error('Impossible d\'annuler une transaction déjà complétée');
      }

      // Appel à l'adaptateur pour annuler
      const adapter = this.adapters.get(transaction.providerCode);
      if (adapter && transaction.externalTransactionId) {
        await adapter.cancelTransaction(transaction.externalTransactionId);
      }

      // Mise à jour de la transaction
      await supabase
        .from('mobile_payments_transactions')
        .update({
          status: 'cancelled',
          completedAt: new Date().toISOString()
        })
        .eq('id', transactionId);

      // Mise à jour du statut de la commande
      await supabase
        .from('orders')
        .update({
          payment_status: 'cancelled',
          status: 'cancelled'
        })
        .eq('id', transaction.orderId);

      return {
        success: true,
        transactionId,
        status: 'cancelled',
        message: 'Transaction annulée avec succès'
      };

    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Obtient l'historique des transactions
   */
  async getTransactionHistory(filters?: {
    providerCode?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<MobilePaymentTransaction[]> {
    let query = supabase
      .from('mobile_payments_transactions')
      .select(`
        *,
        orders (
          id,
          order_number,
          customer_name,
          total_amount
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.providerCode) {
      query = query.eq('provider_code', filters.providerCode);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Génère des statistiques de paiement
   */
  async getPaymentStatistics(dateFrom: string, dateTo: string) {
    try {
      const { data: transactions, error } = await supabase
        .from('mobile_payments_transactions')
        .select('provider_code, status, amount, created_at')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) {
        throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
      }

      const stats = {
        totalTransactions: transactions.length,
        totalAmount: 0,
        successRate: 0,
        providers: {} as Record<string, { count: number; amount: number }>,
        dailyTransactions: {} as Record<string, number>
      };

      let successfulTransactions = 0;

      transactions.forEach(transaction => {
        // Total
        stats.totalAmount += transaction.amount;
        
        // Succès
        if (transaction.status === 'completed') {
          successfulTransactions++;
        }

        // Par fournisseur
        if (!stats.providers[transaction.provider_code]) {
          stats.providers[transaction.provider_code] = { count: 0, amount: 0 };
        }
        stats.providers[transaction.provider_code].count++;
        stats.providers[transaction.provider_code].amount += transaction.amount;

        // Par jour
        const date = transaction.created_at.split('T')[0];
        stats.dailyTransactions[date] = (stats.dailyTransactions[date] || 0) + 1;
      });

      stats.successRate = transactions.length > 0 
        ? (successfulTransactions / transactions.length) * 100 
        : 0;

      return stats;

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  }

  /**
   * Met à jour les points de fidélité
   */
  private async updateLoyaltyPoints(orderId: string, amount: number) {
    try {
      // Récupération de la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('customer_phone')
        .eq('id', orderId)
        .single();

      if (orderError || !order?.customer_phone) return;

      // Calcul des points (1 point pour 10 MAD)
      const points = Math.floor(amount / 10);

      if (points > 0) {
        await supabase
          .from('loyalty_points')
          .upsert({
            customer_phone: order.customer_phone,
            points_earned: points,
            order_id: orderId,
            created_at: new Date().toISOString()
          });
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour des points de fidélité:', error);
    }
  }

  /**
   * Met à jour l'utilisation des promotions
   */
  private async updatePromotionUsage(orderId: string) {
    try {
      // Cette fonction sera appelée après un paiement réussi
      // pour valider l'utilisation des codes promo
      console.log('Mise à jour de l\'utilisation des promotions pour la commande:', orderId);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour des promotions:', error);
    }
  }

  /**
   * Callback pour les notifications de paiement
   */
  async handlePaymentCallback(providerCode: string, callbackData: any): Promise<boolean> {
    try {
      const adapter = this.adapters.get(providerCode);
      if (!adapter) {
        console.error(`Adaptateur non trouvé pour: ${providerCode}`);
        return false;
      }

      // Validation des données de callback
      const validatedData = adapter.validateCallbackData(callbackData);
      if (!validatedData.isValid) {
        console.error('Données de callback invalides:', validatedData.errors);
        return false;
      }

      // Récupération de la transaction par external ID
      const { data: transaction, error } = await supabase
        .from('mobile_payments_transactions')
        .select('*')
        .eq('external_transaction_id', validatedData.externalTransactionId)
        .single();

      if (error || !transaction) {
        console.error('Transaction non trouvée pour le callback');
        return false;
      }

      // Mise à jour du statut
      const newStatus = adapter.mapCallbackStatus(validatedData.status);
      
      await supabase
        .from('mobile_payments_transactions')
        .update({
          status: newStatus,
          callback_data: callbackData,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', transaction.id);

      // Mise à jour de la commande si nécessaire
      if (newStatus === 'completed') {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed'
          })
          .eq('id', transaction.orderId);

        // Intégration fidélité et promotions
        await this.updateLoyaltyPoints(transaction.orderId, transaction.amount);
        await this.updatePromotionUsage(transaction.orderId);
      }

      return true;

    } catch (error) {
      console.error('Erreur lors du traitement du callback:', error);
      return false;
    }
  }
}

// Export de l'instance singleton
export const mobilePaymentsService = new MobilePaymentsService();
export default mobilePaymentsService;