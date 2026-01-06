/**
 * Hook React pour la Comptabilité et Gestion Financière
 * Universal Eats - Hook de gestion des données comptables
 * 
 * Fonctionnalités principales :
 * - Gestion des écritures comptables
 * - États financiers en temps réel
 * - Tableaux de bord financiers
 * - Calculs TVA et rapports
 * - Analyses de rentabilité
 * - Alertes financières
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import accountingService from '@/lib/accounting-service';
import financialManager from '@/lib/financial-manager';
import {
  AccountingEntry,
  JournalEntryLine,
  Account,
  ChartOfAccounts,
  TrialBalance,
  FinancialStatement,
  VATReport,
  Budget,
  ProfitabilityAnalysis,
  FinancialDashboard,
  FinancialKPI,
  FinancialRatio,
  CashFlow,
  AccountingFilters,
  FinancialPeriod,
  ComplianceReport,
  FinancialAlert,
  FinancialStatementType,
  BudgetStatus,
  ExportConfig
} from '@/types/accounting';

// Types pour le hook
interface UseAccountingOptions {
  storeId: string;
  period?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseEntriesOptions extends UseAccountingOptions {
  filters?: AccountingFilters;
  page?: number;
  limit?: number;
}

interface UseFinancialDashboardOptions extends UseAccountingOptions {
  includeAlerts?: boolean;
  includeCharts?: boolean;
}

/**
 * === HOOK PRINCIPAL POUR LA COMPTABILITÉ ===
 */
export function useAccounting(options: UseAccountingOptions) {
  const { storeId, period, autoRefresh = true, refreshInterval = 30000 } = options;
  const queryClient = useQueryClient();

  // État local
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Actualisation automatique
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, queryClient]);

  // Fonctions utilitaires
  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    setError(`${context}: ${errorMessage}`);
    console.error(`Erreur ${context}:`, error);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    storeId,
    selectedPeriod,
    setSelectedPeriod,
    isLoading,
    setIsLoading,
    error,
    clearError,
    handleError
  };
}

/**
 * === GESTION DES ÉCRITURES COMPTABLES ===
 */
export function useEntries(options: UseEntriesOptions) {
  const { storeId, filters, page = 1, limit = 50 } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  // Query pour récupérer les écritures
  const {
    data: entries,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'entries', storeId, filters, page, limit],
    queryFn: async () => {
      try {
        // Implémentation simplifiée - à adapter avec la vraie API
        const { data, error } = await supabase
          .from('accounting_entries')
          .select(`
            *,
            journal_entry_lines (
              *,
              accounts (code, name)
            )
          `)
          .eq('store_id', storeId)
          .order('date', { ascending: false })
          .range((page - 1) * limit, page * limit);

        if (error) throw error;

        return (data || []).map(mapEntryFromDB);
      } catch (error) {
        accounting.handleError(error, 'Récupération des écritures');
        throw error;
      }
    },
    staleTime: 30000
  });

  // Mutation pour créer une écriture
  const createEntryMutation = useMutation({
    mutationFn: async (entry: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await accountingService.createEntry(entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Création d\'écriture');
    }
  });

  // Mutation pour ajouter des lignes
  const addLinesMutation = useMutation({
    mutationFn: async ({ entryId, lines }: { entryId: string; lines: Omit<JournalEntryLine, 'id' | 'date' | 'storeId'>[] }) => {
      return await accountingService.addEntryLines(entryId, lines);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'entries'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Ajout de lignes');
    }
  });

  // Fonctions d'action
  const createEntry = useCallback(async (entryData: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await createEntryMutation.mutateAsync(entryData);
  }, [createEntryMutation]);

  const addLines = useCallback(async (entryId: string, lines: Omit<JournalEntryLine, 'id' | 'date' | 'storeId'>[]) => {
    return await addLinesMutation.mutateAsync({ entryId, lines });
  }, [addLinesMutation]);

  const refresh = useCallback(() => refetch(), [refetch]);

  return {
    entries: entries || [],
    isLoading: isLoading || createEntryMutation.isPending || addLinesMutation.isPending,
    error: error || createEntryMutation.error || addLinesMutation.error,
    createEntry,
    addLines,
    refresh,
    pagination: {
      page,
      limit,
      hasMore: entries && entries.length === limit
    }
  };
}

/**
 * === PLAN COMPTABLE ===
 */
export function useChartOfAccounts(options: UseAccountingOptions) {
  const { storeId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: chartOfAccounts,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'chart', storeId],
    queryFn: async () => {
      try {
        return await accountingService.getChartOfAccounts(storeId);
      } catch (error) {
        accounting.handleError(error, 'Récupération du plan comptable');
        throw error;
      }
    },
    staleTime: 300000 // 5 minutes
  });

  // Mutation pour créer un plan comptable
  const createChartMutation = useMutation({
    mutationFn: async (name?: string) => {
      return await accountingService.createChartOfAccounts(storeId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'chart'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Création du plan comptable');
    }
  });

  const createChart = useCallback(async (name?: string) => {
    return await createChartMutation.mutateAsync(name);
  }, [createChartMutation]);

  return {
    chartOfAccounts,
    isLoading: isLoading || createChartMutation.isPending,
    error: error || createChartMutation.error,
    createChart,
    refresh: refetch
  };
}

/**
 * === BALANCE GÉNÉRALE ===
 */
export function useTrialBalance(options: UseAccountingOptions & { periodId: string }) {
  const { storeId, periodId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: trialBalance,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'trial-balance', storeId, periodId],
    queryFn: async () => {
      try {
        return await accountingService.getTrialBalance(periodId, storeId);
      } catch (error) {
        accounting.handleError(error, 'Récupération de la balance');
        throw error;
      }
    },
    staleTime: 60000
  });

  return {
    trialBalance,
    isLoading,
    error,
    refresh: refetch
  };
}

/**
 * === ÉTATS FINANCIERS ===
 */
export function useFinancialStatements(options: UseAccountingOptions & { 
  type: FinancialStatementType;
  periodId: string;
}) {
  const { storeId, type, periodId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: statement,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'statements', type, storeId, periodId],
    queryFn: async () => {
      try {
        return await accountingService.generateFinancialStatement(type, periodId, storeId);
      } catch (error) {
        accounting.handleError(error, `Génération ${type}`);
        throw error;
      }
    },
    staleTime: 120000 // 2 minutes
  });

  return {
    statement,
    isLoading,
    error,
    refresh: refetch
  };
}

/**
 * === TABLEAU DE BORD FINANCIER ===
 */
export function useFinancialDashboard(options: UseFinancialDashboardOptions) {
  const { storeId, includeAlerts = true, includeCharts = true } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: dashboard,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'dashboard', storeId, includeAlerts, includeCharts],
    queryFn: async () => {
      try {
        return await financialManager.generateRealTimeDashboard(storeId);
      } catch (error) {
        accounting.handleError(error, 'Génération du tableau de bord');
        throw error;
      }
    },
    staleTime: 30000,
    refetchInterval: 30000
  });

  // Mutation pour actualiser les KPIs
  const refreshKPIsMutation = useMutation({
    mutationFn: async () => {
      // Implémentation pour actualiser manuellement les KPIs
      queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Actualisation des KPIs');
    }
  });

  const refreshKPIs = useCallback(async () => {
    await refreshKPIsMutation.mutateAsync();
  }, [refreshKPIsMutation]);

  return {
    dashboard,
    isLoading: isLoading || refreshKPIsMutation.isPending,
    error: error || refreshKPIsMutation.error,
    refreshKPIs,
    refresh: refetch
  };
}

/**
 * === GESTION DE LA TVA ===
 */
export function useVATReports(options: UseAccountingOptions & { 
  periodId: string;
  vatRate?: number;
}) {
  const { storeId, periodId, vatRate = 0.20 } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: vatReport,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'vat', storeId, periodId, vatRate],
    queryFn: async () => {
      try {
        return await accountingService.calculateVAT(periodId, storeId, vatRate);
      } catch (error) {
        accounting.handleError(error, 'Calcul de la TVA');
        throw error;
      }
    },
    staleTime: 300000
  });

  return {
    vatReport,
    isLoading,
    error,
    refresh: refetch
  };
}

/**
 * === GESTION DES BUDGETS ===
 */
export function useBudgets(options: UseAccountingOptions) {
  const { storeId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: budgets,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'budgets', storeId],
    queryFn: async () => {
      // Implémentation simplifiée
      return [];
    },
    staleTime: 300000
  });

  // Mutation pour créer un budget
  const createBudgetMutation = useMutation({
    mutationFn: async ({ name, fiscalYear, categories }: {
      name: string;
      fiscalYear: string;
      categories: any[];
    }) => {
      return await financialManager.createBudget(name, fiscalYear, storeId, categories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'budgets'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Création du budget');
    }
  });

  const createBudget = useCallback(async (name: string, fiscalYear: string, categories: any[]) => {
    return await createBudgetMutation.mutateAsync({ name, fiscalYear, categories });
  }, [createBudgetMutation]);

  return {
    budgets: budgets || [],
    isLoading: isLoading || createBudgetMutation.isPending,
    error: error || createBudgetMutation.error,
    createBudget,
    refresh: refetch
  };
}

/**
 * === ANALYSES DE RENTABILITÉ ===
 */
export function useProfitabilityAnalysis(options: UseAccountingOptions & {
  periodId: string;
}) {
  const { storeId, periodId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: profitability,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'profitability', storeId, periodId],
    queryFn: async () => {
      try {
        return await accountingService.analyzeProfitability(periodId, storeId);
      } catch (error) {
        accounting.handleError(error, 'Analyse de rentabilité');
        throw error;
      }
    },
    staleTime: 300000
  });

  // Analyses par produit et catégorie
  const {
    data: productAnalysis,
    isLoading: productLoading,
    error: productError
  } = useQuery({
    queryKey: ['accounting', 'profitability', 'products', storeId, periodId],
    queryFn: async () => {
      return await financialManager.analyzeProductProfitability(periodId, storeId);
    },
    staleTime: 300000
  });

  const {
    data: categoryAnalysis,
    isLoading: categoryLoading,
    error: categoryError
  } = useQuery({
    queryKey: ['accounting', 'profitability', 'categories', storeId, periodId],
    queryFn: async () => {
      return await financialManager.analyzeCategoryProfitability(periodId, storeId);
    },
    staleTime: 300000
  });

  return {
    profitability,
    productAnalysis: productAnalysis || [],
    categoryAnalysis: categoryAnalysis || [],
    isLoading: isLoading || productLoading || categoryLoading,
    error: error || productError || categoryError,
    refresh: refetch
  };
}

/**
 * === RATIOS FINANCIERS ===
 */
export function useFinancialRatios(options: UseAccountingOptions & {
  periodId: string;
}) {
  const { storeId, periodId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: ratios,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'ratios', storeId, periodId],
    queryFn: async () => {
      try {
        return await financialManager.calculateFinancialRatios(periodId, storeId);
      } catch (error) {
        accounting.handleError(error, 'Calcul des ratios financiers');
        throw error;
      }
    },
    staleTime: 300000
  });

  return {
    ratios: ratios || [],
    isLoading,
    error,
    refresh: refetch
  };
}

/**
 * === FLUX DE TRÉSORERIE ===
 */
export function useCashFlow(options: UseAccountingOptions & {
  startDate: Date;
  endDate: Date;
}) {
  const { storeId, startDate, endDate } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: cashFlow,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'cash-flow', storeId, startDate, endDate],
    queryFn: async () => {
      try {
        return await financialManager.getCashFlow(storeId, startDate, endDate);
      } catch (error) {
        accounting.handleError(error, 'Récupération du flux de trésorerie');
        throw error;
      }
    },
    staleTime: 60000
  });

  // Mutation pour enregistrer un mouvement
  const recordCashFlowMutation = useMutation({
    mutationFn: async (cashFlowData: {
      date: string;
      type: 'inflow' | 'outflow';
      category: string;
      amount: number;
      description: string;
      reference?: string;
      orderId?: string;
      paymentMethod?: string;
    }) => {
      await financialManager.recordCashFlow(
        cashFlowData.date,
        storeId,
        cashFlowData.type,
        cashFlowData.category,
        cashFlowData.amount,
        cashFlowData.description,
        cashFlowData.reference,
        cashFlowData.orderId,
        cashFlowData.paymentMethod
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'dashboard'] });
    },
    onError: (error) => {
      accounting.handleError(error, 'Enregistrement flux de trésorerie');
    }
  });

  const recordCashFlow = useCallback(async (cashFlowData: {
    date: string;
    type: 'inflow' | 'outflow';
    category: string;
    amount: number;
    description: string;
    reference?: string;
    orderId?: string;
    paymentMethod?: string;
  }) => {
    await recordCashFlowMutation.mutateAsync(cashFlowData);
  }, [recordCashFlowMutation]);

  return {
    cashFlow: cashFlow || [],
    isLoading: isLoading || recordCashFlowMutation.isPending,
    error: error || recordCashFlowMutation.error,
    recordCashFlow,
    refresh: refetch
  };
}

/**
 * === ALERTES FINANCIÈRES ===
 */
export function useFinancialAlerts(options: UseAccountingOptions) {
  const { storeId } = options;
  const accounting = useAccounting(options);
  const queryClient = useQueryClient();

  const {
    data: alerts,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['accounting', 'alerts', storeId],
    queryFn: async () => {
      try {
        return await financialManager.monitorFinancialHealth(storeId);
      } catch (error) {
        accounting.handleError(error, 'Récupération des alertes');
        throw error;
      }
    },
    staleTime: 30000,
    refetchInterval: 30000
  });

  return {
    alerts: alerts || [],
    isLoading,
    error,
    refresh: refetch
  };
}

/**
 * === EXPORT COMPTABLE ===
 */
export function useAccountingExport() {
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: async ({ config, format }: {
      config: ExportConfig;
      format: 'pdf' | 'excel' | 'csv' | 'xml';
    }) => {
      // Implémentation de l'export
      switch (format) {
        case 'pdf':
          return await exportToPDF(config);
        case 'excel':
          return await exportToExcel(config);
        case 'csv':
          return await exportToCSV(config);
        case 'xml':
          return await exportToXML(config);
        default:
          throw new Error(`Format non supporté: ${format}`);
      }
    }
  });

  const exportData = useCallback(async (config: ExportConfig, format: 'pdf' | 'excel' | 'csv' | 'xml') => {
    return await exportMutation.mutateAsync({ config, format });
  }, [exportMutation]);

  return {
    exportData,
    isExporting: exportMutation.isPending,
    exportError: exportMutation.error
  };
}

/**
 * === FONCTIONS D'EXPORT ===
 */
async function exportToPDF(config: ExportConfig): Promise<Blob> {
  // Implémentation de l'export PDF
  throw new Error('Export PDF non implémenté');
}

async function exportToExcel(config: ExportConfig): Promise<Blob> {
  // Implémentation de l'export Excel
  throw new Error('Export Excel non implémenté');
}

async function exportToCSV(config: ExportConfig): Promise<Blob> {
  // Implémentation de l'export CSV
  throw new Error('Export CSV non implémenté');
}

async function exportToXML(config: ExportConfig): Promise<Blob> {
  // Implémentation de l'export XML
  throw new Error('Export XML non implémenté');
}

/**
 * === FONCTIONS UTILITAIRES ===
 */
function mapEntryFromDB(dbEntry: any): AccountingEntry {
  return {
    id: dbEntry.id,
    date: dbEntry.date,
    journal: dbEntry.journal,
    entryNumber: dbEntry.entry_number,
    description: dbEntry.description,
    reference: dbEntry.reference,
    amount: dbEntry.amount,
    currency: dbEntry.currency,
    storeId: dbEntry.store_id,
    createdBy: dbEntry.created_by,
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at,
    isPosted: dbEntry.is_posted,
    isReversed: dbEntry.is_reversed,
    reversalOf: dbEntry.reversal_of,
    attachments: dbEntry.attachments || [],
    lines: (dbEntry.journal_entry_lines || []).map(mapJournalLineFromDB)
  };
}

function mapJournalLineFromDB(dbLine: any): JournalEntryLine {
  return {
    id: dbLine.id,
    accountId: dbLine.account_id,
    accountCode: dbLine.account_code,
    accountName: dbLine.account_name,
    debit: dbLine.debit,
    credit: dbLine.credit,
    description: dbLine.description,
    costCenter: dbLine.cost_center,
    project: dbLine.project,
    inventoryItemId: dbLine.inventory_item_id,
    orderId: dbLine.order_id,
    storeId: dbLine.store_id,
    date: dbLine.date
  };
}