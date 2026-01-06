/**
 * Hook React pour la gestion des paiements mobiles
 * Intégration avec le service de paiement mobile
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { mobilePaymentsService, MobilePaymentProvider, MobilePaymentTransaction, MobilePaymentRequest, MobilePaymentResult } from '@/lib/mobile-payments-service';

export interface UseMobilePaymentsReturn {
  // État
  providers: MobilePaymentProvider[];
  transactions: MobilePaymentTransaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createPaymentRequest: (request: MobilePaymentRequest) => Promise<MobilePaymentResult>;
  checkPaymentStatus: (transactionId: string) => Promise<MobilePaymentResult>;
  cancelTransaction: (transactionId: string) => Promise<MobilePaymentResult>;
  getTransactionHistory: (filters?: any) => Promise<MobilePaymentTransaction[]>;
  refreshProviders: () => void;
  clearError: () => void;
  
  // Utilitaires
  isProviderActive: (providerCode: string) => boolean;
  getProviderByCode: (providerCode: string) => MobilePaymentProvider | undefined;
  validatePhoneNumber: (phoneNumber: string) => boolean;
}

export function useMobilePayments(): UseMobilePaymentsReturn {
  const [providers, setProviders] = useState<MobilePaymentProvider[]>([]);
  const [transactions, setTransactions] = useState<MobilePaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial des fournisseurs
  const refreshProviders = useCallback(() => {
    try {
      const activeProviders = mobilePaymentsService.getActiveProviders();
      setProviders(activeProviders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fournisseurs');
    }
  }, []);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  // Création d'une demande de paiement
  const createPaymentRequest = useCallback(async (request: MobilePaymentRequest): Promise<MobilePaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mobilePaymentsService.createPaymentRequest(request);
      
      if (result.success) {
        toast.success('Demande de paiement créée avec succès', {
          description: `Transaction ${result.transactionId} initiée`
        });
        
        // Rafraîchir l'historique des transactions
        await getTransactionHistory();
        
        return result;
      } else {
        const errorMessage = result.message || 'Échec de la création de la demande de paiement';
        setError(errorMessage);
        toast.error('Erreur de paiement', {
          description: errorMessage
        });
        
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      toast.error('Erreur de paiement', {
        description: errorMessage
      });
      
      return {
        success: false,
        status: 'failed',
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérification du statut d'une transaction
  const checkPaymentStatus = useCallback(async (transactionId: string): Promise<MobilePaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mobilePaymentsService.checkPaymentStatus(transactionId);
      
      if (result.success) {
        // Toast selon le statut
        switch (result.status) {
          case 'completed':
            toast.success('Paiement confirmé', {
              description: 'Votre paiement a été traité avec succès'
            });
            break;
          case 'failed':
            toast.error('Paiement échoué', {
              description: result.message || 'Le paiement a échoué'
            });
            break;
          case 'cancelled':
            toast.warning('Paiement annulé', {
              description: 'La transaction a été annulée'
            });
            break;
        }
        
        // Rafraîchir l'historique
        await getTransactionHistory();
        
        return result;
      } else {
        setError(result.message);
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du statut';
      setError(errorMessage);
      return {
        success: false,
        status: 'failed',
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Annulation d'une transaction
  const cancelTransaction = useCallback(async (transactionId: string): Promise<MobilePaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mobilePaymentsService.cancelTransaction(transactionId);
      
      if (result.success) {
        toast.info('Transaction annulée', {
          description: 'La demande de paiement a été annulée'
        });
        
        // Rafraîchir l'historique
        await getTransactionHistory();
        
        return result;
      } else {
        setError(result.message);
        toast.error('Erreur d\'annulation', {
          description: result.message || 'Impossible d\'annuler la transaction'
        });
        
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'annulation';
      setError(errorMessage);
      toast.error('Erreur d\'annulation', {
        description: errorMessage
      });
      
      return {
        success: false,
        status: 'failed',
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Récupération de l'historique des transactions
  const getTransactionHistory = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      const history = await mobilePaymentsService.getTransactionHistory(filters);
      setTransactions(history);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
      toast.error('Erreur', {
        description: errorMessage
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Utilitaires
  const isProviderActive = useCallback((providerCode: string): boolean => {
    return providers.some(provider => provider.code === providerCode && provider.isActive);
  }, [providers]);

  const getProviderByCode = useCallback((providerCode: string): MobilePaymentProvider | undefined => {
    return providers.find(provider => provider.code === providerCode);
  }, [providers]);

  const validatePhoneNumber = useCallback((phoneNumber: string): boolean => {
    // Validation des numéros marocains
    const patterns = [
      /^\+2126\d{8}$/,  // +2126XXXXXXXX
      /^06\d{8}$/,      // 06XXXXXXXX
      /^2126\d{8}$/     // 2126XXXXXXXX
    ];
    
    return patterns.some(pattern => pattern.test(phoneNumber.trim()));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    providers,
    transactions,
    isLoading,
    error,
    
    // Actions
    createPaymentRequest,
    checkPaymentStatus,
    cancelTransaction,
    getTransactionHistory,
    refreshProviders,
    clearError,
    
    // Utilitaires
    isProviderActive,
    getProviderByCode,
    validatePhoneNumber
  };
}

export default useMobilePayments;