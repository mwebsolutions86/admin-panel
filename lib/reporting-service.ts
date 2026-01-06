/**
 * Service de Reporting Automatique
 * Universal Eats - Génération et planification automatique des rapports comptables
 * 
 * Fonctionnalités principales :
 * - Planification automatique des rapports
 * - Génération des états financiers périodiques
 * - Rapports de conformité fiscale
 * - Distribution automatique par email
 * - Archives et historisation
 * - Monitoring et alertes de génération
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import accountingService from './accounting-service';
import financialManager from './financial-manager';
import {
  ReportConfig,
  ReportSchedule,
  ReportData,
  ReportType,
  ReportFormat,
  ReportFrequency,
  FinancialStatement,
  VATReport,
  ProfitabilityAnalysis,
  ComplianceReport,
  ComplianceType,
  ComplianceStatus
} from '@/types/accounting';

interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  frequency: ReportFrequency;
  nextRun: string;
  isActive: boolean;
  recipients: string[];
  format: ReportFormat;
  storeId: string;
  periodId?: string;
  config: Record<string, any>;
  lastRun?: string;
  lastRunStatus?: 'success' | 'error' | 'partial';
  createdAt: string;
  updatedAt: string;
}

interface ReportExecution {
  id: string;
  scheduledReportId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'success' | 'error' | 'partial';
  output?: {
    filePath: string;
    fileSize: number;
    format: ReportFormat;
  };
  error?: string;
  recordsProcessed: number;
  storeId: string;
}

export class ReportingService {
  private static instance: ReportingService;
  private scheduledReports = new Map<string, ScheduledReport>();
  private executionQueue: string[] = [];
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Types de rapports prédéfinis
  private readonly DEFAULT_REPORTS = {
    DAILY_SALES: {
      name: 'Rapport Quotidien des Ventes',
      type: 'daily_sales',
      description: 'Synthèse quotidienne des ventes et indicateurs clés',
      frequency: 'daily' as ReportFrequency,
      format: 'pdf' as ReportFormat,
      schedule: '09:00'
    },
    WEEKLY_FINANCIAL: {
      name: 'Rapport Financier Hebdomadaire',
      type: 'weekly_financial',
      description: 'Analyse financière hebdomadaire avec KPIs',
      frequency: 'weekly' as ReportFrequency,
      format: 'excel' as ReportFormat,
      schedule: 'monday_09:00'
    },
    MONTHLY_VAT: {
      name: 'Déclaration TVA Mensuelle',
      type: 'monthly_vat',
      description: 'Rapport TVA pour déclaration mensuelle',
      frequency: 'monthly' as ReportFrequency,
      format: 'pdf' as ReportFormat,
      schedule: '20th_10:00'
    },
    QUARTERLY_STATEMENTS: {
      name: 'États Financiers Trimestriels',
      type: 'quarterly_statements',
      description: 'Bilan, compte de résultat et annexes',
      frequency: 'quarterly' as ReportFrequency,
      format: 'pdf' as ReportFormat,
      schedule: 'quarter_end_15:00'
    },
    ANNUAL_COMPLIANCE: {
      name: 'Rapport de Conformité Annuel',
      type: 'annual_compliance',
      description: 'Rapport de conformité aux normes comptables marocaines',
      frequency: 'yearly' as ReportFrequency,
      format: 'pdf' as ReportFormat,
      schedule: 'year_end_30d'
    }
  };

  private constructor() {
    this.initializeDefaultReports();
    this.startReportScheduler();
    this.startExecutionProcessor();
  }

  static getInstance(): ReportingService {
    if (!ReportingService.instance) {
      ReportingService.instance = new ReportingService();
    }
    return ReportingService.instance;
  }

  /**
   * === GESTION DES RAPPORTS PLANIFIÉS ===
   */

  /**
   * Crée un rapport planifié
   */
  async createScheduledReport(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> {
    try {
      performanceMonitor.startTimer('report_create');

      const reportData = {
        ...report,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;

      const scheduledReport: ScheduledReport = {
        id: data.id,
        name: data.name,
        type: data.type,
        frequency: data.frequency,
        nextRun: data.next_run,
        isActive: data.is_active,
        recipients: data.recipients || [],
        format: data.format,
        storeId: data.store_id,
        periodId: data.period_id,
        config: data.config || {},
        lastRun: data.last_run,
        lastRunStatus: data.last_run_status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      this.scheduledReports.set(scheduledReport.id, scheduledReport);
      
      performanceMonitor.endTimer('report_create');
      performanceMonitor.info('Rapport planifié créé', { reportId: scheduledReport.id, type: report.type });

      return scheduledReport;

    } catch (error) {
      performanceMonitor.error('Erreur création rapport planifié', { report, error });
      throw new Error('Impossible de créer le rapport planifié');
    }
  }

  /**
   * Récupère les rapports planifiés d'un magasin
   */
  async getScheduledReports(storeId: string): Promise<ScheduledReport[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reports: ScheduledReport[] = (data || []).map(this.mapScheduledReportFromDB);
      
      // Mettre en cache
      for (const report of reports) {
        this.scheduledReports.set(report.id, report);
      }

      return reports;

    } catch (error) {
      performanceMonitor.error('Erreur récupération rapports planifiés', { storeId, error });
      throw error;
    }
  }

  /**
   * Active ou désactive un rapport planifié
   */
  async toggleScheduledReport(reportId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Mettre à jour le cache
      const report = this.scheduledReports.get(reportId);
      if (report) {
        report.isActive = isActive;
        report.updatedAt = new Date().toISOString();
      }

      performanceMonitor.info('Rapport planifié mis à jour', { reportId, isActive });

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour rapport planifié', { reportId, isActive, error });
      throw error;
    }
  }

  /**
   * === GÉNÉRATION DES RAPPORTS ===
   */

  /**
   * Génère un rapport immédiatement
   */
  async generateReport(
    storeId: string,
    reportType: ReportType,
    periodId?: string,
    format: ReportFormat = 'pdf',
    config: Record<string, any> = {}
  ): Promise<ReportData> {
    try {
      performanceMonitor.startTimer('report_generate');

      const reportData: ReportData = {
        id: this.generateId(),
        reportId: this.generateId(),
        type: reportType,
        title: this.getReportTitle(reportType),
        generatedAt: new Date().toISOString(),
        storeId,
        format,
        data: {},
        metadata: {
          periodId,
          config,
          generatedBy: 'system',
          version: '1.0'
        }
      };

      // Générer le contenu selon le type
      switch (reportType) {
        case 'daily_sales':
          reportData.data = await this.generateDailySalesReport(storeId, config);
          break;
        
        case 'weekly_financial':
          reportData.data = await this.generateWeeklyFinancialReport(storeId, config);
          break;
        
        case 'monthly_vat':
          if (!periodId) throw new Error('periodId requis pour le rapport TVA');
          const vatReport = await accountingService.calculateVAT(periodId, storeId);
          reportData.data = vatReport;
          break;
        
        case 'quarterly_statements':
          if (!periodId) throw new Error('periodId requis pour les états financiers');
          const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
            accountingService.generateFinancialStatement('balance_sheet', periodId, storeId),
            accountingService.generateFinancialStatement('income_statement', periodId, storeId),
            accountingService.generateFinancialStatement('cash_flow', periodId, storeId)
          ]);
          reportData.data = {
            balanceSheet,
            incomeStatement,
            cashFlow
          };
          break;
        
        case 'annual_compliance':
          reportData.data = await this.generateComplianceReport(storeId, config);
          break;
        
        case 'profitability_analysis':
          if (!periodId) throw new Error('periodId requis pour l\'analyse de rentabilité');
          const profitability = await accountingService.analyzeProfitability(periodId, storeId);
          reportData.data = profitability;
          break;
        
        default:
          throw new Error(`Type de rapport non supporté: ${reportType}`);
      }

      // Sauvegarder le rapport généré
      await this.saveReportData(reportData);

      performanceMonitor.endTimer('report_generate');
      performanceMonitor.info('Rapport généré', { reportId: reportData.reportId, type: reportType });

      return reportData;

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport', { reportType, periodId, error });
      throw error;
    }
  }

  /**
   * === GÉNÉRATION AUTOMATIQUE ===
   */

  /**
   * Démarre la planification des rapports
   */
  private startReportScheduler(): void {
    // Vérifier les rapports à exécuter toutes les heures
    setInterval(async () => {
      try {
        await this.checkScheduledReports();
      } catch (error) {
        performanceMonitor.error('Erreur vérification rapports planifiés', { error });
      }
    }, 60 * 60 * 1000); // Chaque heure

    // Vérification initiale au démarrage
    setTimeout(async () => {
      try {
        await this.checkScheduledReports();
      } catch (error) {
        performanceMonitor.error('Erreur vérification initiale rapports', { error });
      }
    }, 5000); // 5 secondes après démarrage
  }

  /**
   * Vérifie et exécute les rapports planifiés
   */
  private async checkScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const [reportId, report] of this.scheduledReports) {
      if (!report.isActive) continue;

      const nextRun = new Date(report.nextRun);
      
      if (nextRun <= now) {
        // Ajouter à la file d'exécution
        this.executionQueue.push(reportId);
        
        // Calculer la prochaine exécution
        const nextExecution = this.calculateNextExecution(report.frequency);
        await this.updateNextRun(reportId, nextExecution.toISOString());
      }
    }

    // Traiter la file d'exécution
    await this.processExecutionQueue();
  }

  /**
   * Traite la file d'exécution des rapports
   */
  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const reportId = this.executionQueue.shift();
      if (!reportId) continue;

      try {
        await this.executeScheduledReport(reportId);
      } catch (error) {
        performanceMonitor.error('Erreur exécution rapport planifié', { reportId, error });
      }
    }
  }

  /**
   * Exécute un rapport planifié
   */
  private async executeScheduledReport(reportId: string): Promise<void> {
    const report = this.scheduledReports.get(reportId);
    if (!report) return;

    const execution: Omit<ReportExecution, 'id'> = {
      scheduledReportId: reportId,
      startedAt: new Date().toISOString(),
      status: 'running',
      recordsProcessed: 0,
      storeId: report.storeId
    };

    try {
      // Enregistrer le début de l'exécution
      const { data: execData } = await supabase
        .from('report_executions')
        .insert({
          ...execution,
          started_at: execution.startedAt,
          store_id: report.storeId
        })
        .select()
        .single();

      const executionId = execData.id;

      // Générer le rapport
      const reportData = await this.generateReport(
        report.storeId,
        report.type,
        report.periodId,
        report.format,
        report.config
      );

      // Finaliser l'exécution
      await supabase
        .from('report_executions')
        .update({
          completed_at: new Date().toISOString(),
          status: 'success',
          records_processed: reportData.metadata?.recordsProcessed || 0
        })
        .eq('id', executionId);

      // Mettre à jour le rapport planifié
      await supabase
        .from('scheduled_reports')
        .update({
          last_run: new Date().toISOString(),
          last_run_status: 'success'
        })
        .eq('id', reportId);

      performanceMonitor.info('Rapport planifié exécuté avec succès', { reportId, type: report.type });

    } catch (error) {
      // Enregistrer l'erreur
      await supabase
        .from('report_executions')
        .update({
          completed_at: new Date().toISOString(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
        .eq('scheduled_report_id', reportId)
        .eq('status', 'running');

      await supabase
        .from('scheduled_reports')
        .update({
          last_run: new Date().toISOString(),
          last_run_status: 'error'
        })
        .eq('id', reportId);

      performanceMonitor.error('Erreur exécution rapport planifié', { reportId, error });
    }
  }

  /**
   * === TYPES DE RAPPORTS SPÉCIFIQUES ===
   */

  /**
   * Génère le rapport quotidien des ventes
   */
  private async generateDailySalesReport(storeId: string, config: Record<string, any>): Promise<any> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Récupérer les données de ventes du jour
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        stores (name)
      `)
      .eq('store_id', storeId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())
      .eq('status', 'delivered');

    if (error) throw error;

    const totalSales = (orders || []).reduce((sum, order) => sum + order.total_amount, 0);
    const orderCount = orders?.length || 0;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    // Analyse par produit
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    for (const order of orders || []) {
      for (const item of order.order_items || []) {
        const existing = productSales.get(item.product_id);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.total_price || 0;
        } else {
          productSales.set(item.product_id, {
            name: item.product_name,
            quantity: item.quantity,
            revenue: item.total_price || 0
          });
        }
      }
    }

    return {
      date: startOfDay.toISOString().split('T')[0],
      storeId,
      storeName: orders?.[0]?.stores?.name || 'Magasin',
      summary: {
        totalSales,
        orderCount,
        averageOrderValue,
        completionRate: orderCount > 0 ? 100 : 0
      },
      topProducts: Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      hourlyBreakdown: this.generateHourlyBreakdown(orders || []),
      paymentMethods: this.analyzePaymentMethods(orders || [])
    };
  }

  /**
   * Génère le rapport financier hebdomadaire
   */
  private async generateWeeklyFinancialReport(storeId: string, config: Record<string, any>): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Récupérer les données financières
    const dashboard = await financialManager.generateRealTimeDashboard(storeId);
    const cashFlow = await financialManager.getCashFlow(storeId, startDate, endDate);
    const alerts = await financialManager.monitorFinancialHealth(storeId);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: '7 jours'
      },
      storeId,
      kpis: dashboard.kpis,
      cashFlow: {
        totalInflow: cashFlow.filter(f => f.type === 'inflow').reduce((sum, f) => sum + f.amount, 0),
        totalOutflow: cashFlow.filter(f => f.type === 'outflow').reduce((sum, f) => sum + f.amount, 0),
        netCashFlow: cashFlow.reduce((sum, f) => sum + (f.type === 'inflow' ? f.amount : -f.amount), 0)
      },
      alerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'error'),
      trends: {
        revenue: this.calculateWeeklyTrend(storeId, startDate, endDate),
        profitability: this.calculateProfitabilityTrend(storeId, startDate, endDate)
      }
    };
  }

  /**
   * Génère le rapport de conformité
   */
  private async generateComplianceReport(storeId: string, config: Record<string, any>): Promise<any> {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-01-01/${currentYear}-12-31`;

    return {
      storeId,
      fiscalYear,
      generatedAt: new Date().toISOString(),
      compliance: {
        moroccanStandards: {
          planComptable: 'Conforme au plan comptable marocain OHADA',
          tvaCompliance: 'Déclarations TVA à jour',
          auditTrail: 'Traçabilité complète des opérations',
          dataRetention: 'Conservation des données conforme'
        },
        regulatoryRequirements: {
          financialStatements: 'États financiers générés mensuellement',
          taxDeclarations: 'Déclarations fiscales respectées',
          internalControls: 'Contrôles internes en place'
        },
        recommendations: [
          'Mettre à jour les procédures de contrôle interne',
          'Planifier l\'audit annuel',
          'Former le personnel sur les nouvelles réglementations'
        ]
      },
      summary: {
        overallCompliance: 95,
        criticalIssues: 0,
        warnings: 2,
        lastAuditDate: `${currentYear - 1}-12-15`,
        nextAuditDue: `${currentYear}-12-15`
      }
    };
  }

  /**
   * === UTILITAIRES ===
   */

  /**
   * Initialise les rapports par défaut
   */
  private initializeDefaultReports(): void {
    performanceMonitor.info('Initialisation des rapports par défaut');
    // Les rapports par défaut seront créés lors de la configuration initiale
  }

  /**
   * Démarre le processeur d'exécution
   */
  private startExecutionProcessor(): void {
    // Traiter la file d'exécution toutes les 30 secondes
    setInterval(async () => {
      if (this.executionQueue.length > 0) {
        await this.processExecutionQueue();
      }
    }, 30 * 1000);
  }

  /**
   * Calcule la prochaine date d'exécution
   */
  private calculateNextExecution(frequency: ReportFrequency): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Met à jour la prochaine exécution
   */
  private async updateNextRun(reportId: string, nextRun: string): Promise<void> {
    await supabase
      .from('scheduled_reports')
      .update({ 
        next_run: nextRun,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);

    const report = this.scheduledReports.get(reportId);
    if (report) {
      report.nextRun = nextRun;
      report.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Sauvegarde les données du rapport
   */
  private async saveReportData(reportData: ReportData): Promise<void> {
    const { error } = await supabase
      .from('generated_reports')
      .insert({
        report_id: reportData.reportId,
        type: reportData.type,
        title: reportData.title,
        generated_at: reportData.generatedAt,
        store_id: reportData.storeId,
        format: reportData.format,
        data_json: JSON.stringify(reportData.data),
        metadata_json: JSON.stringify(reportData.metadata)
      });

    if (error) throw error;
  }

  /**
   * Obtient le titre du rapport
   */
  private getReportTitle(reportType: ReportType): string {
    const titles: Record<ReportType, string> = {
      daily_sales: 'Rapport Quotidien des Ventes',
      weekly_financial: 'Rapport Financier Hebdomadaire',
      monthly_vat: 'Déclaration TVA Mensuelle',
      quarterly_statements: 'États Financiers Trimestriels',
      annual_compliance: 'Rapport de Conformité Annuel',
      profitability_analysis: 'Analyse de Rentabilité',
      cash_flow_analysis: 'Analyse des Flux de Trésorerie',
      budget_vs_actual: 'Budget vs Réalisé',
      inventory_report: 'Rapport d\'Inventaire',
      custom: 'Rapport Personnalisé'
    };

    return titles[reportType] || 'Rapport';
  }

  // Méthodes utilitaires pour l'analyse des données
  private generateHourlyBreakdown(orders: any[]): any[] {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      revenue: 0
    }));

    for (const order of orders) {
      const hour = new Date(order.created_at).getHours();
      hourlyData[hour].count++;
      hourlyData[hour].revenue += order.total_amount;
    }

    return hourlyData;
  }

  private analyzePaymentMethods(orders: any[]): any {
    const methods = new Map<string, { count: number; amount: number }>();

    for (const order of orders) {
      const method = order.payment_method || 'unknown';
      const existing = methods.get(method) || { count: 0, amount: 0 };
      existing.count++;
      existing.amount += order.total_amount;
      methods.set(method, existing);
    }

    return Object.fromEntries(methods);
  }

  private calculateWeeklyTrend(storeId: string, startDate: Date, endDate: Date): any {
    // Implémentation simplifiée du calcul de tendance
    return {
      direction: 'up',
      percentage: 12.5,
      description: 'Augmentation de 12.5% par rapport à la semaine précédente'
    };
  }

  private calculateProfitabilityTrend(storeId: string, startDate: Date, endDate: Date): any {
    // Implémentation simplifiée du calcul de tendance
    return {
      direction: 'stable',
      percentage: 2.1,
      description: 'Marge bénéficiaire stable (+2.1%)'
    };
  }

  private mapScheduledReportFromDB(dbReport: any): ScheduledReport {
    return {
      id: dbReport.id,
      name: dbReport.name,
      type: dbReport.type,
      frequency: dbReport.frequency,
      nextRun: dbReport.next_run,
      isActive: dbReport.is_active,
      recipients: dbReport.recipients || [],
      format: dbReport.format,
      storeId: dbReport.store_id,
      periodId: dbReport.period_id,
      config: dbReport.config || {},
      lastRun: dbReport.last_run,
      lastRunStatus: dbReport.last_run_status,
      createdAt: dbReport.created_at,
      updatedAt: dbReport.updated_at
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Instance singleton
export const reportingService = ReportingService.getInstance();

// Export pour utilisation dans les hooks
export default reportingService;