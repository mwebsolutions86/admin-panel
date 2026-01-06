/**
 * Historique des Transactions de Fidélité
 * Universal Eats - Système de Fidélité
 * 
 * Affiche l'historique complet des transactions avec :
 * - Types de transactions (gains, dépenses, expiré, etc.)
 * - Filtres par période et type
 * - Pagination infinie
 * - Statistiques de l'historique
 */

import React, { useState, useMemo } from 'react';

interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral' | 'level_up';
  points: number;
  description: string;
  orderId?: string;
  rewardId?: string;
  createdAt: string;
  expiresAt?: string;
  metadata: Record<string, any>;
}

interface TransactionsHistoryProps {
  transactions: LoyaltyTransaction[];
  showFullHistory?: boolean;
  className?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

  // Configuration des types de transaction (module scope)
  function getTransactionConfig(type: string) {
    const configs: Record<string, { icon: string; color: string; bg: string; border: string; label: string }> = {
      earned: { icon: '💰', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Points gagnés' },
      redeemed: { icon: '🎁', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Points utilisés' },
      expired: { icon: '⏰', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Points expirés' },
      bonus: { icon: '🎉', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Bonus' },
      referral: { icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Parrainage' },
      level_up: { icon: '⬆️', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Montée de niveau' }
    };
    return configs[type as keyof typeof configs] || configs.earned;
  }

export function TransactionsHistory({ 
  transactions, 
  showFullHistory = false,
  className = '',
  onLoadMore,
  hasMore = false
}: TransactionsHistoryProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'points_desc' | 'points_asc'>('newest');

  // Filtrer et trier les transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Filtrer par type
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    // Filtrer par période
    if (filterPeriod !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (filterPeriod) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }

      if (filterPeriod !== 'all') {
        filtered = filtered.filter(tx => new Date(tx.createdAt) >= cutoffDate);
      }
    }

    // Trier
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'points_desc':
          return Math.abs(b.points) - Math.abs(a.points);
        case 'points_asc':
          return Math.abs(a.points) - Math.abs(b.points);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, filterType, filterPeriod, sortOrder]);

  // (getTransactionConfig moved to module scope)

  // Formatter la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `Il y a ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `Il y a ${hours} heure${hours !== 1 ? 's' : ''}`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `Il y a ${days} jour${days !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Formatter l'heure
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalEarned = transactions
      .filter(tx => tx.points > 0)
      .reduce((sum, tx) => sum + tx.points, 0);
    
    const totalSpent = transactions
      .filter(tx => tx.points < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.points), 0);

    const thisMonth = transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      const now = new Date();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const thisMonthEarned = thisMonth
      .filter(tx => tx.points > 0)
      .reduce((sum, tx) => sum + tx.points, 0);

    return {
      totalEarned,
      totalSpent,
      thisMonthEarned,
      transactionCount: transactions.length
    };
  }, [transactions]);

  // Types uniques pour le filtre
  const transactionTypes = [
    { id: 'all', label: 'Tous', count: transactions.length },
    { id: 'earned', label: 'Gagnés', count: transactions.filter(tx => tx.type === 'earned').length },
    { id: 'redeemed', label: 'Utilisés', count: transactions.filter(tx => tx.type === 'redeemed').length },
    { id: 'bonus', label: 'Bonus', count: transactions.filter(tx => tx.type === 'bonus').length },
    { id: 'referral', label: 'Parrainage', count: transactions.filter(tx => tx.type === 'referral').length },
    { id: 'expired', label: 'Expirés', count: transactions.filter(tx => tx.type === 'expired').length }
  ];

  if (!showFullHistory && transactions.length === 0) {
    return (
      <div className={`transactions-history ${className}`}>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📜</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune transaction
          </h3>
          <p className="text-gray-600">
            Vos transactions de fidélité apparaîtront ici
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transactions-history ${className}`}>
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalEarned}</div>
          <div className="text-sm text-green-700">Points gagnés</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalSpent}</div>
          <div className="text-sm text-blue-700">Points utilisés</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.thisMonthEarned}</div>
          <div className="text-sm text-purple-700">Ce mois</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{stats.transactionCount}</div>
          <div className="text-sm text-gray-700">Transactions</div>
        </div>
      </div>

      {/* Filtres et contrôles */}
      <div className="mb-6 space-y-4">
        {/* Filtre par type */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Type de transaction</h4>
          <div className="flex flex-wrap gap-2">
            {transactionTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label}
                {type.count > 0 && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                    {type.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres de période et tri */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filtre par période */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Période</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="3months">3 derniers mois</option>
            </select>
          </div>

          {/* Tri */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Trier par</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="points_desc">Plus de points</option>
              <option value="points_asc">Moins de points</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📜</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune transaction trouvée
          </h3>
          <p className="text-gray-600">
            Aucune transaction ne correspond à vos critères de filtre
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
            />
          ))}

          {/* Bouton charger plus */}
          {onLoadMore && hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={onLoadMore}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Charger plus de transactions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant élément de transaction individuelle
interface TransactionItemProps {
  transaction: LoyaltyTransaction;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const config = getTransactionConfig(transaction.type);
  const isPositive = transaction.points > 0;
  const isNegative = transaction.points < 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`border rounded-lg p-4 transition-all hover:shadow-md ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between">
        {/* Icône et description */}
        <div className="flex items-center space-x-3">
          <div className={`text-2xl ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900">{transaction.description}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600">
                {formatDate(transaction.createdAt)} à {formatTime(transaction.createdAt)}
              </span>
              {transaction.orderId && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Commande #{transaction.orderId}
                </span>
              )}
              {transaction.rewardId && (
                <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  Récompense
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Points */}
        <div className="text-right">
          <div className={`text-xl font-bold ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
          }`}>
            {isPositive ? '+' : ''}{transaction.points}
          </div>
          <div className="text-sm text-gray-500">points</div>
        </div>
      </div>

      {/* Métadonnées supplémentaires */}
      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(transaction.metadata).map(([key, value]) => (
              <span
                key={key}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {key}: {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date d'expiration */}
      {transaction.expiresAt && (
        <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          Expire le {formatDate(transaction.expiresAt)}
        </div>
      )}
    </div>
  );
}