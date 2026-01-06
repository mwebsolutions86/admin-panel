/**
 * Composant PaymentStatusTracker
 * Suivi en temps réel du statut d'une transaction de paiement mobile
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Smartphone,
  Loader2,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobilePaymentTransaction, mobilePaymentsService } from '@/lib/mobile-payments-service';

interface PaymentStatusTrackerProps {
  transactionId: string;
  onStatusChange?: (status: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function PaymentStatusTracker({
  transactionId,
  onStatusChange,
  autoRefresh = true,
  refreshInterval = 5000, // 5 secondes par défaut
  className
}: PaymentStatusTrackerProps) {
  const [transaction, setTransaction] = useState<MobilePaymentTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTransactionStatus = async () => {
    try {
      setIsRefreshing(true);
      const result = await mobilePaymentsService.checkPaymentStatus(transactionId);
      
      if (result.success) {
        // Récupérer la transaction complète depuis la base de données
        const history = await mobilePaymentsService.getTransactionHistory({
          limit: 1,
          // Note: Il faudrait une méthode pour récupérer une transaction par ID
        });
        
        // Pour l'instant, on utilise les données du résultat
        setTransaction({
          id: transactionId,
          orderId: '',
          providerCode: result.externalTransactionId ? 'unknown' : 'unknown',
          providerName: 'Paiement Mobile',
          amount: 0,
          currency: 'MAD',
          phoneNumber: '',
          status: result.status as any,
          externalTransactionId: result.externalTransactionId,
          createdAt: new Date().toISOString(),
          completedAt: result.status === 'completed' ? new Date().toISOString() : undefined,
          errorMessage: result.status === 'failed' ? result.message : undefined
        });
        
        setError(null);
        
        // Callback pour informer le parent du changement de statut
        if (onStatusChange) {
          onStatusChange(result.status);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification du statut');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactionStatus();
  }, [transactionId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (transaction?.status === 'pending' || transaction?.status === 'processing') {
        fetchTransactionStatus();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [transaction, autoRefresh, refreshInterval]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          label: 'En attente',
          description: 'En attente de confirmation du client'
        };
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          label: 'En cours',
          description: 'Transaction en cours de traitement'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600 bg-green-50 border-green-200',
          label: 'Complétée',
          description: 'Paiement confirmé avec succès'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600 bg-red-50 border-red-200',
          label: 'Échouée',
          description: 'Le paiement a échoué'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: 'Annulée',
          description: 'Transaction annulée'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          label: 'Inconnu',
          description: 'Statut non reconnu'
        };
    }
  };

  const getProgressValue = () => {
    switch (transaction?.status) {
      case 'pending': return 25;
      case 'processing': return 75;
      case 'completed': return 100;
      case 'failed': return 0;
      case 'cancelled': return 0;
      default: return 0;
    }
  };

  const handleManualRefresh = () => {
    fetchTransactionStatus();
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateString));
  };

  if (isLoading && !transaction) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement du statut du paiement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !transaction) {
    return (
      <Card className={cn('w-full border-red-200', className)}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Erreur: {error}</span>
          </div>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!transaction) return null;

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;
  const progressValue = getProgressValue();

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Suivi du Paiement
          </div>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statut principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg border', statusConfig.color)}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{statusConfig.label}</h3>
              <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusConfig.color}>
            {transaction.status}
          </Badge>
        </div>

        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Informations de la transaction */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">ID Transaction</span>
              <p className="font-mono text-sm">{transaction.id}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Fournisseur</span>
              <p className="text-sm">{transaction.providerName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Montant</span>
              <p className="font-semibold">
                {new Intl.NumberFormat('fr-MA', {
                  style: 'currency',
                  currency: transaction.currency
                }).format(transaction.amount)}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Téléphone</span>
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <p className="font-mono text-sm">{transaction.phoneNumber}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Horodatages */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Créée le:</span>
            <span>{formatDate(transaction.createdAt)}</span>
          </div>
          {transaction.completedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Terminée le:</span>
              <span>{formatDate(transaction.completedAt)}</span>
            </div>
          )}
        </div>

        {/* Message d'erreur si applicable */}
        {transaction.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erreur de paiement</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{transaction.errorMessage}</p>
          </div>
        )}

        {/* Instructions selon le statut */}
        {transaction.status === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Prochaines étapes:</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Vérifiez votre téléphone pour une notification de paiement</li>
                  <li>• Ouvrez votre application Orange Money ou Inwi Money</li>
                  <li>• Confirmez le paiement avec votre code PIN</li>
                  <li>• Cette page se mettra à jour automatiquement</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {transaction.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Paiement réussi!</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              Votre commande a été confirmée et sera traitée immédiatement.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentStatusTracker;