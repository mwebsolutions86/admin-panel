/**
 * Interface d'Administration des Paiements Mobiles
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Page de gestion complète des paiements mobiles :
 * - Tableau de bord avec statistiques
 * - Gestion des transactions
 * - Configuration des fournisseurs
 * - Monitoring en temps réel
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Smartphone, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  BarChart3,
  History,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mobilePaymentsService, MobilePaymentProvider, MobilePaymentTransaction } from '@/lib/mobile-payments-service';
import { useMobilePayments } from '@/hooks/use-mobile-payments';
import { MetricsCard } from '@/components/analytics/MetricsCard';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import PaymentProviderCard from '@/components/payments/PaymentProviderCard';
import PaymentStatusTracker from '@/components/payments/PaymentStatusTracker';

export default function PaymentsPage() {
  const {
    providers,
    transactions,
    isLoading,
    error,
    getTransactionHistory,
    checkPaymentStatus,
    cancelTransaction,
    refreshProviders,
    clearError
  } = useMobilePayments();

  const [selectedProvider, setSelectedProvider] = useState<MobilePaymentProvider | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<MobilePaymentTransaction | null>(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, [dateRange, statusFilter, providerFilter]);

  const loadData = async () => {
    try {
      // Charger l'historique des transactions
      const filters: any = {};
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      if (providerFilter !== 'all') {
        filters.providerCode = providerFilter;
      }
      
      if (searchTerm) {
        filters.search = searchTerm;
      }

      await getTransactionHistory(filters);

      // Charger les statistiques
      const stats = await mobilePaymentsService.getPaymentStatistics(
        dateRange.from.toISOString(),
        dateRange.to.toISOString()
      );
      setStatistics(stats);

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
    }
  };

  const handleRefresh = () => {
    loadData();
    refreshProviders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'outline'
    };

    const colors: Record<string, string> = {
      pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
      processing: 'text-blue-700 bg-blue-50 border-blue-200',
      completed: 'text-green-700 bg-green-50 border-green-200',
      failed: 'text-red-700 bg-red-50 border-red-200',
      cancelled: 'text-gray-700 bg-gray-50 border-gray-200'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(dateString));
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.id.toLowerCase().includes(searchLower) ||
        transaction.phoneNumber.includes(searchTerm) ||
        transaction.providerName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paiements Mobiles</h1>
          <p className="text-gray-600 mt-1">
            Gestion et surveillance des paiements mobile money
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Actualiser
        </Button>
      </div>

      {/* Erreurs */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={clearError}>
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        {/* Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Métriques principales */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricsCard
                title="Transactions Totales"
                value={statistics.totalTransactions || 0}
                icon={CreditCard}
                color="blue"
                description="Sur la période sélectionnée"
              />
              <MetricsCard
                title="Montant Total"
                value={statistics.totalAmount || 0}
                unit="MAD"
                icon={TrendingUp}
                color="green"
                description="Volume des paiements"
              />
              <MetricsCard
                title="Taux de Réussite"
                value={statistics.successRate || 0}
                unit="%"
                icon={CheckCircle}
                color="purple"
                trend={statistics.successRate > 80 ? 'up' : 'down'}
                trendValue={5.2}
                description="Transactions réussies"
              />
              <MetricsCard
                title="Fournisseurs Actifs"
                value={providers.filter(p => p.isActive).length}
                icon={Smartphone}
                color="orange"
                description="Solutions de paiement"
              />
            </div>
          )}

          {/* Répartition par fournisseur */}
          {statistics?.providers && (
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Fournisseur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(statistics.providers).map(([providerCode, data]: [string, any]) => (
                    <div key={providerCode} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold capitalize">
                          {providerCode.replace('_', ' ')}
                        </h3>
                        <Badge variant="outline">{data.count} transactions</Badge>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(data.amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {((data.amount / statistics.totalAmount) * 100).toFixed(1)}% du total
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions Récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <p className="font-medium">{transaction.providerName}</p>
                        <p className="text-sm text-gray-600">
                          {transaction.phoneNumber} • {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Aucune transaction trouvée
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des transactions */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle>Filtres et Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Recherche</Label>
                  <Input
                    id="search"
                    placeholder="ID transaction, téléphone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="processing">En cours</SelectItem>
                      <SelectItem value="completed">Complétée</SelectItem>
                      <SelectItem value="failed">Échouée</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="provider">Fournisseur</Label>
                  <Select value={providerFilter} onValueChange={setProviderFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les fournisseurs</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.code} value={provider.code}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Période</Label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des transactions */}
          <Card>
            <CardHeader>
              <CardTitle>
                Transactions ({filteredTransactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowStatusTracker(true);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <p className="font-medium">{transaction.providerName}</p>
                        <p className="text-sm text-gray-600">
                          ID: {transaction.id.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.phoneNumber} • {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Aucune transaction trouvée avec les filtres actuels
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des fournisseurs */}
        <TabsContent value="providers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <PaymentProviderCard
                key={provider.code}
                provider={provider}
                isSelected={selectedProvider?.code === provider.code}
                onSelect={() => setSelectedProvider(provider)}
              />
            ))}
          </div>

          {selectedProvider && (
            <Card>
              <CardHeader>
                <CardTitle>Configuration: {selectedProvider.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Code Fournisseur</Label>
                    <Input value={selectedProvider.code} disabled />
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <Select value={selectedProvider.isActive ? 'active' : 'inactive'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button>Enregistrer</Button>
                  <Button variant="outline">Tester la Configuration</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sécurité et audit */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Surveillance de Sécurité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <p>Module de sécurité en cours de développement</p>
                <p className="text-sm">Fonctionnalités à venir :</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• Détection de fraude en temps réel</li>
                  <li>• Audit des transactions</li>
                  <li>• Alertes de sécurité</li>
                  <li>• Rapports de conformité</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de suivi de transaction */}
      {showStatusTracker && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Suivi de Transaction</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStatusTracker(false)}
              >
                Fermer
              </Button>
            </div>
            <PaymentStatusTracker
              transactionId={selectedTransaction.id}
              onStatusChange={(status) => {
                console.log('Statut mis à jour:', status);
                // Recharger les données si nécessaire
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}