/**
 * Gestionnaire Financier et Analyses Avancées
 * Universal Eats - Module de Gestion Financière Complémentaire
 * 
 * Fonctionnalités principales :
 * - Gestion des budgets et prévisions
 * - Analyse de trésorerie et flux de trésorerie
 * - Ratios financiers et KPIs
 * - Tableaux de bord interactifs
 * - Alertes financières intelligentes
 * - Analyses de performance par produit/catégorie
 * - Intégration écosystème (commandes, inventory, analytics)
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { inventoryService } from './inventory-service';
import { analyticsService } from './analytics-service';
import accountingService from './accounting-service';
import {
  Budget,
  BudgetCategory,
  BudgetStatus,
  CashFlow,
  CashFlowType,
  FinancialRatio,
  RatioType,
  RatioTrend,
  ProfitabilityAnalysis,
  ProductProfitability,
  CategoryProfitability,
  FinancialKPI,
  KPICategory,
  FinancialChart,
  ChartType,
  ChartConfig,
  FinancialAlert,
  AlertType,
  AlertCategory,
  FinancialDashboard,
  ExchangeRate,
  Currency,
  AccountingPeriod,
  
} from '@/types/accounting';

export class FinancialManager {
  private static instance: FinancialManager;
  private budgetCache = new Map<string, Budget>();
  private kpiCache = new Map<string, FinancialKPI[]>();
  private alertCache = new Map<string, FinancialAlert[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Seuils d'alerte financiers
  private readonly ALERT_THRESHOLDS = {
    cashFlow: {
      critical: 10000, // 10k MAD
      warning: 25000   // 25k MAD
    },
    profitMargin: {
      critical: 0.05,  // 5%
      warning: 0.10    // 10%
    },
    budgetOverrun: {
      critical: 0.20,  // 20%
      warning: 0.10    // 10%
    },
    liquidityRatio: {
      critical: 1.0,
      warning: 1.5
    }
  };

  private constructor() {
    this.initializeFinancialMonitoring();
  }

  static getInstance(): FinancialManager {
    if (!FinancialManager.instance) {
      FinancialManager.instance = new FinancialManager();
    }
    return FinancialManager.instance;
  }

  /**
   * === GESTION DES BUDGETS ===
   */

  /**
   * Crée un budget pour une période
   */
  async createBudget(
    name: string,
    fiscalYear: string,
    storeId: string,
    categories: Omit<BudgetCategory, 'id'>[]
  ): Promise<Budget> {
    try {
      performanceMonitor.startTimer('budget_create');

      const budgetData = {
        name,
        period: `${fiscalYear}-01-01/${fiscalYear}-12-31`,
        fiscal_year: fiscalYear,
        store_id: storeId,
        status: 'draft' as BudgetStatus,
        created_by: 'current_user', // À remplacer par l'utilisateur actuel
        total_budgeted: categories.reduce((sum, cat) => sum + cat.budgetedAmount, 0),
        actual_amount: 0,
        variance: 0,
        variance_percentage: 0
      };

      const { data, error } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

      if (error) throw error;

      // Créer les catégories budgétaires
      const categoriesData = categories.map(cat => ({
        budget_id: data.id,
        ...cat
      }));

      const { error: categoriesError } = await supabase
        .from('budget_categories')
        .insert(categoriesData);

      if (categoriesError) throw categoriesError;

      const budget: Budget = {
        id: data.id,
        name: data.name,
        period: data.period,
        fiscalYear: data.fiscal_year,
        storeId: data.store_id,
        categories: categories.map(cat => ({
          ...cat,
          id: this.generateId(),
          variance: 0,
          variancePercentage: 0
        })),
        totalBudgeted: data.total_budgeted,
        actualAmount: data.actual_amount,
        variance: data.variance,
        variancePercentage: data.variance_percentage,
        status: data.status,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      this.setBudgetCache(budget.id, budget);
      
      performanceMonitor.endTimer('budget_create');
      performanceMonitor.info('Budget créé', { budgetId: budget.id, storeId, total: budget.totalBudgeted });

      return budget;

    } catch (error) {
      performanceMonitor.error('Erreur création budget', { name, fiscalYear, storeId, error });
      throw new Error('Impossible de créer le budget');
    }
  }

  /**
   * Met à jour un budget avec les dépenses réelles
   */
  async updateBudgetActuals(budgetId: string): Promise<void> {
    try {
      const budget = await this.getBudget(budgetId);
      if (!budget) throw new Error('Budget non trouvé');

      let totalActual = 0;

      for (const category of budget.categories) {
        const actualAmount = await this.getActualSpending(budget.storeId, category.accountId, budget.fiscalYear);
        
        const variance = actualAmount - category.budgetedAmount;
        const variancePercentage = category.budgetedAmount > 0 ? variance / category.budgetedAmount : 0;

        // Mettre à jour en base
        await supabase
          .from('budget_categories')
          .update({
            actual_amount: actualAmount,
            variance,
            variance_percentage: variancePercentage
          })
          .eq('budget_id', budgetId)
          .eq('account_id', category.accountId);

        category.actualAmount = actualAmount;
        category.variance = variance;
        category.variancePercentage = variancePercentage;
        totalActual += actualAmount;
      }

      // Mettre à jour le budget principal
      const totalVariance = totalActual - budget.totalBudgeted;
      const variancePercentage = budget.totalBudgeted > 0 ? totalVariance / budget.totalBudgeted : 0;

      await supabase
        .from('budgets')
        .update({
          actual_amount: totalActual,
          variance: totalVariance,
          variance_percentage: variancePercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', budgetId);

      budget.actualAmount = totalActual;
      budget.variance = totalVariance;
      budget.variancePercentage = variancePercentage;
      budget.updatedAt = new Date().toISOString();

      this.setBudgetCache(budgetId, budget);

      // Vérifier les dépassements et générer des alertes
      await this.checkBudgetAlerts(budget);

      performanceMonitor.info('Budget mis à jour', { budgetId, totalActual });

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour budget', { budgetId, error });
      throw error;
    }
  }

  /**
   * Génère un budget basé sur l'historique
   */
  async generateBudgetFromHistory(
    fiscalYear: string,
    storeId: string,
    referenceYears: number = 2
  ): Promise<Budget> {
    try {
      const categories = await this.generateBudgetCategoriesFromHistory(storeId, fiscalYear, referenceYears);
      const budgetName = `Budget ${fiscalYear} - Universal Eats`;
      
      return await this.createBudget(budgetName, fiscalYear, storeId, categories);

    } catch (error) {
      performanceMonitor.error('Erreur génération budget historique', { fiscalYear, storeId, error });
      throw error;
    }
  }

  /**
   * === GESTION DE TRÉSORERIE ===
   */

  /**
   * Récupère le flux de trésorerie pour une période
   */
  async getCashFlow(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlow[]> {
    try {
      const { data, error } = await supabase
        .from('cash_flows')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date');

      if (error) throw error;

      return (data || []).map(this.mapCashFlowFromDB);

    } catch (error) {
      performanceMonitor.error('Erreur récupération flux trésorerie', { storeId, startDate, endDate, error });
      throw error;
    }
  }

  /**
   * Enregistre un mouvement de trésorerie
   */
  async recordCashFlow(
    date: string,
    storeId: string,
    type: CashFlowType,
    category: string,
    amount: number,
    description: string,
    reference?: string,
    orderId?: string,
    paymentMethod?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('cash_flows')
        .insert({
          date,
          store_id: storeId,
          type,
          category,
          amount,
          description,
          reference,
          order_id: orderId,
          payment_method: paymentMethod,
          created_by: 'system',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Mettre à jour les KPIs de trésorerie
      await this.updateCashFlowKPIs(storeId);

      performanceMonitor.info('Flux de trésorerie enregistré', { storeId, type, amount });

    } catch (error) {
      performanceMonitor.error('Erreur enregistrement flux trésorerie', { storeId, type, error });
      throw error;
    }
  }

  /**
   * Calcule les prévisions de trésorerie
   */
  async forecastCashFlow(
    storeId: string,
    forecastDays: number = 30
  ): Promise<{
    projectedBalance: number;
    inflows: CashFlow[];
    outflows: CashFlow[];
    risks: string[];
    recommendations: string[];
  }> {
    try {
      const now = new Date();
      const forecastEnd = new Date(now.getTime() + forecastDays * 24 * 60 * 60 * 1000);

      // Prévisions basées sur l'historique
      const historicalData = await this.getCashFlow(storeId, 
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), now);

      const currentBalance = await this.getCurrentCashBalance(storeId);
      
      // Calculer les moyennes journalières
      const dailyAverages = this.calculateDailyAverages(historicalData);
      
      // Générer les prévisions
      const inflows: CashFlow[] = [];
      const outflows: CashFlow[] = [];
      
      for (let i = 0; i < forecastDays; i++) {
        const forecastDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        
        // Prévoir les encaissements (ventes)
        const expectedInflow = dailyAverages.avgDailyInflow * (1 + Math.random() * 0.2 - 0.1);
        if (expectedInflow > 0) {
          inflows.push({
            id: this.generateId(),
            date: forecastDate.toISOString(),
            storeId,
            type: 'inflow',
            category: 'Ventes prévues',
            paymentMethod: 'unknown',
            amount: expectedInflow,
            description: `Prévision ventes ${forecastDate.toLocaleDateString('fr-FR')}`,
            createdBy: 'system',
            createdAt: forecastDate.toISOString()
          });
        }

        // Prévoir les décaissements (charges)
        const expectedOutflow = dailyAverages.avgDailyOutflow * (1 + Math.random() * 0.15 - 0.05);
        if (expectedOutflow > 0) {
          outflows.push({
            id: this.generateId(),
            date: forecastDate.toISOString(),
            storeId,
            type: 'outflow',
            category: 'Charges prévues',
            paymentMethod: 'unknown',
            amount: expectedOutflow,
            description: `Prévision charges ${forecastDate.toLocaleDateString('fr-FR')}`,
            createdBy: 'system',
            createdAt: forecastDate.toISOString()
          });
        }
      }

      const totalInflows = inflows.reduce((sum, flow) => sum + flow.amount, 0);
      const totalOutflows = outflows.reduce((sum, flow) => sum + flow.amount, 0);
      const projectedBalance = currentBalance + totalInflows - totalOutflows;

      // Identifier les risques
      const risks: string[] = [];
      if (projectedBalance < this.ALERT_THRESHOLDS.cashFlow.critical) {
        risks.push('Risque de trésorerie critique dans les 30 prochains jours');
      }
      if (dailyAverages.volatility > 0.5) {
        risks.push('Volatilité élevée des flux de trésorerie');
      }

      // Générer des recommandations
      const recommendations: string[] = [];
      if (projectedBalance < 0) {
        recommendations.push('Négocier des délais de paiement avec les fournisseurs');
        recommendations.push('Accélérer les encaissements clients');
      }
      if (dailyAverages.avgDailyOutflow > dailyAverages.avgDailyInflow * 0.9) {
        recommendations.push('Optimiser la gestion des stocks pour réduire les sorties');
      }

      return {
        projectedBalance,
        inflows,
        outflows,
        risks,
        recommendations
      };

    } catch (error) {
      performanceMonitor.error('Erreur prévisions trésorerie', { storeId, forecastDays, error });
      throw error;
    }
  }

  /**
   * === RATIOS FINANCIERS ET KPIs ===
   */

  /**
   * Calcule les ratios financiers
   */
  async calculateFinancialRatios(
    periodId: string,
    storeId: string
  ): Promise<FinancialRatio[]> {
    try {
      const ratios: FinancialRatio[] = [];

      // Récupérer les données comptables
      const balanceSheet = await accountingService.generateFinancialStatement('balance_sheet', periodId, storeId);
      const incomeStatement = await accountingService.generateFinancialStatement('income_statement', periodId, storeId);
      const cashFlowData = await this.getCashFlow(storeId, 
        new Date(periodId.split('-')[0] + '-01-01'), 
        new Date(periodId.split('-')[0] + '-12-31')
      );

      // Ratio de liquidité générale
      const liquidityRatio = this.calculateLiquidityRatio(balanceSheet.data);
      ratios.push({
        id: this.generateId(),
        name: 'Ratio de Liquidité Générale',
        nameFr: 'Ratio de Liquidité Générale',
        type: 'liquidity',
        value: liquidityRatio,
        benchmark: 1.5,
        trend: liquidityRatio >= 1.5 ? 'stable' : 'declining',
        period: periodId,
        storeId,
        calculatedAt: new Date().toISOString()
      });

      // Marge brute
      const grossMargin = incomeStatement.data.grossMargin;
      ratios.push({
        id: this.generateId(),
        name: 'Marge Brute',
        nameFr: 'Marge Brute',
        type: 'profitability',
        value: grossMargin,
        benchmark: 60,
        trend: grossMargin >= 60 ? 'improving' : 'declining',
        period: periodId,
        storeId,
        calculatedAt: new Date().toISOString()
      });

      // ROI (Return on Investment)
      const roi = this.calculateROI(incomeStatement.data, balanceSheet.data);
      ratios.push({
        id: this.generateId(),
        name: 'Return on Investment (ROI)',
        nameFr: 'Retour sur Investissement',
        type: 'profitability',
        value: roi,
        benchmark: 15,
        trend: roi >= 15 ? 'improving' : 'declining',
        period: periodId,
        storeId,
        calculatedAt: new Date().toISOString()
      });

      // Ratio d'endettement
      const debtRatio = this.calculateDebtRatio(balanceSheet.data);
      ratios.push({
        id: this.generateId(),
        name: 'Ratio d\'Endettement',
        nameFr: 'Ratio d\'Endettement',
        type: 'leverage',
        value: debtRatio,
        benchmark: 0.3,
        trend: debtRatio <= 0.3 ? 'stable' : 'declining',
        period: periodId,
        storeId,
        calculatedAt: new Date().toISOString()
      });

      // Ratio de rotation des stocks
      const inventoryTurnover = await this.calculateInventoryTurnover(storeId, periodId);
      ratios.push({
        id: this.generateId(),
        name: 'Rotation des Stocks',
        nameFr: 'Rotation des Stocks',
        type: 'efficiency',
        value: inventoryTurnover,
        benchmark: 12,
        trend: inventoryTurnover >= 12 ? 'improving' : 'declining',
        period: periodId,
        storeId,
        calculatedAt: new Date().toISOString()
      });

      // Sauvegarder les ratios
      for (const ratio of ratios) {
        await this.saveFinancialRatio(ratio);
      }

      return ratios;

    } catch (error) {
      performanceMonitor.error('Erreur calcul ratios financiers', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * === ANALYSES DE RENTABILITÉ ===
   */

  /**
   * Analyse la rentabilité par produit
   */
  async analyzeProductProfitability(
    periodId: string,
    storeId: string
  ): Promise<ProductProfitability[]> {
    try {
      // Récupérer les données des commandes et produits
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          order_items (
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('store_id', storeId)
        .eq('status', 'delivered')
        .gte('created_at', new Date(periodId.split('-')[0] + '-01-01').toISOString())
        .lte('created_at', new Date(periodId.split('-')[0] + '-12-31').toISOString());

      if (error) throw error;

      const productAnalysis = new Map<string, {
        productId: string;
        productName: string;
        revenue: number;
        quantity: number;
        totalCost: number;
      }>();

      // Agréger les données par produit
      for (const order of orders || []) {
        for (const item of order.order_items || []) {
          const existing = productAnalysis.get(item.product_id);
          
          if (existing) {
            existing.revenue += item.total_price || 0;
            existing.quantity += item.quantity;
          } else {
            productAnalysis.set(item.product_id, {
              productId: item.product_id,
              productName: item.product_name,
              revenue: item.total_price || 0,
              quantity: item.quantity,
              totalCost: 0 // Sera calculé avec les coûts d'inventaire
            });
          }
        }
      }

      // Calculer les coûts et marges
      const profitability: ProductProfitability[] = [];
      
      for (const [productId, data] of productAnalysis) {
        const costData = await this.getProductCost(productId, storeId);
        const totalCost = costData.unitCost * data.quantity;
        const profit = data.revenue - totalCost;
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        const averagePrice = data.quantity > 0 ? data.revenue / data.quantity : 0;

        profitability.push({
          productId: data.productId,
          productName: data.productName,
          revenue: data.revenue,
          costs: totalCost,
          profit,
          margin,
          quantity: data.quantity,
          averagePrice
        });
      }

      // Trier par marge décroissante
      profitability.sort((a, b) => b.margin - a.margin);

      return profitability;

    } catch (error) {
      performanceMonitor.error('Erreur analyse rentabilité produit', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * Analyse la rentabilité par catégorie
   */
  async analyzeCategoryProfitability(
    periodId: string,
    storeId: string
  ): Promise<CategoryProfitability[]> {
    try {
      // Récupérer les données des catégories
      const { data: categories, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          products (
            id,
            name
          )
        `)
        .eq('brand_id', (await this.getStoreBrandId(storeId)));

      if (error) throw error;

      const categoryAnalysis: CategoryProfitability[] = [];

      for (const category of categories || []) {
        const categoryProfitability = await this.analyzeProductProfitabilityForCategory(
          category.id, periodId, storeId
        );

        const totalRevenue = categoryProfitability.reduce((sum, p) => sum + p.revenue, 0);
        const totalCosts = categoryProfitability.reduce((sum, p) => sum + p.costs, 0);
        const totalProfit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        categoryAnalysis.push({
          categoryId: category.id,
          categoryName: category.name,
          revenue: totalRevenue,
          costs: totalCosts,
          profit: totalProfit,
          margin,
          productsCount: category.products?.length || 0
        });
      }

      // Trier par marge décroissante
      categoryAnalysis.sort((a, b) => b.margin - a.margin);

      return categoryAnalysis;

    } catch (error) {
      performanceMonitor.error('Erreur analyse rentabilité catégorie', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * === TABLEAU DE BORD FINANCIER ===
   */

  /**
   * Génère le tableau de bord financier en temps réel
   */
  async generateRealTimeDashboard(storeId: string): Promise<FinancialDashboard> {
    try {
      performanceMonitor.startTimer('dashboard_generate');

      const currentPeriod = await this.getCurrentPeriod(storeId);
      const previousPeriod = await this.getPreviousPeriod(storeId, currentPeriod);

      // Générer les KPIs en temps réel
      const kpis = await this.generateRealTimeKPIs(storeId, currentPeriod, previousPeriod);

      // Générer les graphiques
      const charts = await this.generateDashboardCharts(storeId, currentPeriod);

      // Récupérer les alertes actives
      const alerts = await this.getActiveFinancialAlerts(storeId);

      const dashboard: FinancialDashboard = {
        id: this.generateId(),
        storeId,
        period: currentPeriod.name,
        kpis,
        charts,
        alerts,
        lastUpdated: new Date().toISOString()
      };

      performanceMonitor.endTimer('dashboard_generate');
      return dashboard;

    } catch (error) {
      performanceMonitor.error('Erreur génération tableau de bord', { storeId, error });
      throw error;
    }
  }

  /**
   * === SYSTÈME D'ALERTES FINANCIÈRES ===
   */

  /**
   * Surveille la santé financière et génère des alertes
   */
  async monitorFinancialHealth(storeId: string): Promise<FinancialAlert[]> {
    try {
      const alerts: FinancialAlert[] = [];

      // Vérifier la trésorerie
      const cashAlert = await this.checkCashFlowAlerts(storeId);
      if (cashAlert) alerts.push(cashAlert);

      // Vérifier la rentabilité
      const profitAlerts = await this.checkProfitabilityAlerts(storeId);
      alerts.push(...profitAlerts);

      // Vérifier les budgets
      const budgetAlerts = await this.checkBudgetAlertsGlobal(storeId);
      alerts.push(...budgetAlerts);

      // Vérifier les ratios financiers
      const ratioAlerts = await this.checkFinancialRatiosAlerts(storeId);
      alerts.push(...ratioAlerts);

      // Sauvegarder les nouvelles alertes
      for (const alert of alerts) {
        if (!alert.isRead) {
          await this.saveFinancialAlert(alert);
        }
      }

      return alerts;

    } catch (error) {
      performanceMonitor.error('Erreur surveillance santé financière', { storeId, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private initializeFinancialMonitoring(): void {
    // Démarrer la surveillance financière continue
    setInterval(async () => {
      try {
        const stores = await this.getActiveStores();
        for (const store of stores) {
          await this.monitorFinancialHealth(store.id);
        }
      } catch (error) {
        performanceMonitor.error('Erreur surveillance financière continue', { error });
      }
    }, 15 * 60 * 1000); // Toutes les 15 minutes
  }

  private async generateBudgetCategoriesFromHistory(
    storeId: string, 
    fiscalYear: string, 
    referenceYears: number
  ): Promise<Omit<BudgetCategory, 'id'>[]> {
    // Récupérer les données historiques
    const historicalData = await this.getHistoricalSpending(storeId, fiscalYear, referenceYears);
    
    // Analyser les tendances et projeter
    const entries = Object.entries(historicalData as any) as [string, any][];
    return entries.map(([accountCode, data]) => ({
      accountId: data.accountId,
      accountCode,
      accountName: data.accountName,
      budgetedAmount: Math.round(data.averageAmount * 1.1), // Croissance de 10%
      actualAmount: 0,
      variance: 0,
      variancePercentage: 0,
      period: fiscalYear
    }));
  }

  private async getActualSpending(
    storeId: string, 
    accountId: string, 
    fiscalYear: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('debit, credit')
      .eq('store_id', storeId)
      .eq('account_id', accountId)
      .gte('date', `${fiscalYear}-01-01`)
      .lte('date', `${fiscalYear}-12-31`);

    if (error) throw 0;

    return (data || []).reduce((sum, line) => {
      return sum + Math.max(0, line.debit - line.credit);
    }, 0);
  }

  private calculateDailyAverages(cashFlows: CashFlow[]): {
    avgDailyInflow: number;
    avgDailyOutflow: number;
    volatility: number;
  } {
    const dailyData = new Map<string, { inflow: number; outflow: number }>();
    
    // Grouper par jour
    for (const flow of cashFlows) {
      const date = flow.date.split('T')[0];
      const existing = dailyData.get(date) || { inflow: 0, outflow: 0 };
      
      if (flow.type === 'inflow') {
        existing.inflow += flow.amount;
      } else {
        existing.outflow += flow.amount;
      }
      
      dailyData.set(date, existing);
    }

    const inflows = Array.from(dailyData.values()).map(d => d.inflow);
    const outflows = Array.from(dailyData.values()).map(d => d.outflow);

    const avgDailyInflow = inflows.length > 0 ? inflows.reduce((a, b) => a + b, 0) / inflows.length : 0;
    const avgDailyOutflow = outflows.length > 0 ? outflows.reduce((a, b) => a + b, 0) / outflows.length : 0;
    
    // Calcul de la volatilité (coefficient de variation)
    const variance = (data: number[]) => {
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    };

    const inflowVariance = variance(inflows);
    const outflowVariance = variance(outflows);
    const volatility = Math.sqrt((inflowVariance + outflowVariance) / 2) / Math.max(avgDailyInflow + avgDailyOutflow, 1);

    return { avgDailyInflow, avgDailyOutflow, volatility };
  }

  private async getCurrentCashBalance(storeId: string): Promise<number> {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('store_id', storeId)
      .in('code', ['531', '571', '572']);

    if (error) return 0;

    let totalBalance = 0;
    
    for (const account of data || []) {
      const balances = await accountingService['getAccountBalances'](account.id, '');
      totalBalance += balances.closingBalance;
    }

    return totalBalance;
  }

  private calculateLiquidityRatio(balanceSheetData: any): number {
    const currentAssets = balanceSheetData.totalAssets || 0;
    const currentLiabilities = Object.values(balanceSheetData.liabilities || {}).reduce((sum: number, val: any) => sum + val, 0);
    
    return currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  }

  private calculateROI(incomeData: any, balanceData: any): number {
    const netProfit = incomeData.netResult || 0;
    const totalAssets = balanceData.totalAssets || 1;
    
    return (netProfit / totalAssets) * 100;
  }

  private calculateDebtRatio(balanceSheetData: any): number {
    const totalLiabilities = Object.values(balanceSheetData.liabilities || {}).reduce((sum: number, val: any) => sum + val, 0);
    const totalAssets = balanceSheetData.totalAssets || 1;
    
    return totalLiabilities / totalAssets;
  }

  private async calculateInventoryTurnover(storeId: string, periodId: string): Promise<number> {
    try {
      const inventoryAnalytics = await inventoryService.getInventoryAnalytics(storeId);
      return inventoryAnalytics.rotationRate;
    } catch {
      return 0;
    }
  }

  private async getProductCost(productId: string, storeId: string): Promise<{ unitCost: number }> {
    // Récupérer le coût depuis l'inventaire
    const inventoryItems = await inventoryService.getInventory(storeId);
    const item = inventoryItems.find(i => i.productId === productId);
    
    return { unitCost: item?.cost || 0 };
  }

  private async getStoreBrandId(storeId: string): Promise<string> {
    const { data, error } = await supabase
      .from('stores')
      .select('brand_id')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    return data.brand_id;
  }

  private async analyzeProductProfitabilityForCategory(
    categoryId: string, 
    periodId: string, 
    storeId: string
  ): Promise<ProductProfitability[]> {
    // Récupérer les produits de la catégorie et analyser leur rentabilité
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('category_id', categoryId);

    if (error) return [];

    const profitability: ProductProfitability[] = [];
    
    for (const product of products || []) {
      const productProfitability = await this.analyzeProductProfitability(periodId, storeId);
      const productData = productProfitability.find(p => p.productId === product.id);
      
      if (productData) {
        profitability.push(productData);
      }
    }

    return profitability;
  }

  // Méthodes simplifiées pour les autres fonctionnalités
  private async getBudget(budgetId: string): Promise<Budget | null> {
    // Implémentation simplifiée
    return this.getBudgetCache(budgetId);
  }

  private async checkBudgetAlerts(budget: Budget): Promise<void> {
    // Vérifier les dépassements budgétaires
    for (const category of budget.categories) {
      if (category.variancePercentage > this.ALERT_THRESHOLDS.budgetOverrun.critical) {
        await this.createFinancialAlert({
          type: 'budget_overrun',
          severity: 'critical',
          title: 'Dépassement budgétaire critique',
          message: `Catégorie ${category.accountName} dépasse le budget de ${(category.variancePercentage * 100).toFixed(1)}%`,
          category: 'budget',
          value: category.variancePercentage,
          isRead: false,
          isResolved: false
        });
      }
    }
  }

  private async updateCashFlowKPIs(storeId: string): Promise<void> {
    // Mettre à jour les KPIs de trésorerie
  }

  private async generateRealTimeKPIs(storeId: string, currentPeriod: any, previousPeriod: any): Promise<FinancialKPI[]> {
    return []; // À implémenter
  }

  private async generateDashboardCharts(storeId: string, currentPeriod: any): Promise<FinancialChart[]> {
    return []; // À implémenter
  }

  private async getActiveFinancialAlerts(storeId: string): Promise<FinancialAlert[]> {
    const { data, error } = await supabase
      .from('financial_alerts')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) return [];
    
    return (data || []).map(this.mapAlertFromDB);
  }

  private async checkCashFlowAlerts(storeId: string): Promise<FinancialAlert | null> {
    const balance = await this.getCurrentCashBalance(storeId);
    
    if (balance < this.ALERT_THRESHOLDS.cashFlow.critical) {
      return this.createFinancialAlert({
        type: 'low_cash_flow',
        severity: 'critical',
        title: 'Trésorerie critique',
        message: `Solde de trésorerie: ${balance.toFixed(2)} MAD`,
        category: 'cash_flow',
        value: balance,
        isRead: false,
        isResolved: false
      });
    }
    
    return null;
  }

  private async checkProfitabilityAlerts(storeId: string): Promise<FinancialAlert[]> {
    return []; // À implémenter
  }

  private async checkBudgetAlertsGlobal(storeId: string): Promise<FinancialAlert[]> {
    return []; // À implémenter
  }

  private async checkFinancialRatiosAlerts(storeId: string): Promise<FinancialAlert[]> {
    return []; // À implémenter
  }

  private async getActiveStores(): Promise<any[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true);

    if (error) return [];
    return data || [];
  }

  private async getCurrentPeriod(storeId: string): Promise<any> {
    const now = new Date();
    const { data, error } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('store_id', storeId)
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .single();

    if (error) return { name: 'Période courante', id: 'current' };
    return data;
  }

  private async getPreviousPeriod(storeId: string, currentPeriod: any): Promise<any> {
    const { data, error } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('store_id', storeId)
      .lt('end_date', currentPeriod.start_date)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error) return { name: 'Période précédente', id: 'previous' };
    return data;
  }

  private async getHistoricalSpending(storeId: string, fiscalYear: string, referenceYears: number): Promise<any> {
    return {}; // À implémenter
  }

  private async saveFinancialRatio(ratio: FinancialRatio): Promise<void> {
    const { error } = await supabase
      .from('financial_ratios')
      .insert({
        name: ratio.name,
        type: ratio.type,
        value: ratio.value,
        benchmark: ratio.benchmark,
        trend: ratio.trend,
        period: ratio.period,
        store_id: ratio.storeId,
        calculated_at: ratio.calculatedAt
      });

    if (error) performanceMonitor.error('Erreur sauvegarde ratio', { error });
  }

  private async saveFinancialAlert(alert: FinancialAlert): Promise<void> {
    const { error } = await supabase
      .from('financial_alerts')
      .insert({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        category: alert.category,
        value: alert.value,
        threshold: alert.threshold,
        is_read: alert.isRead,
        is_resolved: alert.isResolved,
        created_at: alert.createdAt,
        resolved_at: alert.resolvedAt
      });

    if (error) performanceMonitor.error('Erreur sauvegarde alerte', { error });
  }

  private async createFinancialAlert(alertData: Omit<FinancialAlert, 'id' | 'createdAt'>): Promise<FinancialAlert> {
    const alert: FinancialAlert = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      ...alertData
    };

    await this.saveFinancialAlert(alert);
    return alert;
  }

  private mapCashFlowFromDB(dbCashFlow: any): CashFlow {
    return {
      id: dbCashFlow.id,
      date: dbCashFlow.date,
      storeId: dbCashFlow.store_id,
      type: dbCashFlow.type,
      category: dbCashFlow.category,
      amount: dbCashFlow.amount,
      description: dbCashFlow.description,
      reference: dbCashFlow.reference,
      orderId: dbCashFlow.order_id,
      paymentMethod: dbCashFlow.payment_method,
      createdBy: dbCashFlow.created_by,
      createdAt: dbCashFlow.created_at
    };
  }

  private mapAlertFromDB(dbAlert: any): FinancialAlert {
    return {
      id: dbAlert.id,
      type: dbAlert.type,
      severity: dbAlert.severity,
      title: dbAlert.title,
      message: dbAlert.message,
      category: dbAlert.category,
      value: dbAlert.value,
      threshold: dbAlert.threshold,
      isRead: dbAlert.is_read,
      isResolved: dbAlert.is_resolved,
      createdAt: dbAlert.created_at,
      resolvedAt: dbAlert.resolved_at
    };
  }

  private setBudgetCache(budgetId: string, budget: Budget): void {
    this.budgetCache.set(budgetId, budget);
  }

  private getBudgetCache(budgetId: string): Budget | null {
    return this.budgetCache.get(budgetId) || null;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Instance singleton
export const financialManager = FinancialManager.getInstance();

// Export pour utilisation dans les hooks
export default financialManager;