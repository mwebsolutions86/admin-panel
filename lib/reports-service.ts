/**
 * Service de Rapports Automatisés
 * Universal Eats - Module Analytics Phase 2
 */

import { analyticsService } from './analytics-service';
import { performanceMonitor } from './performance-monitor';
import { 
  ReportConfig, 
  ReportData, 
  AnalyticsFilters, 
  BusinessMetrics, 
  CustomerMetrics, 
  OperationalMetrics, 
  ProductAnalytics, 
  MarketingMetrics, 
  PerformanceMetrics 
} from '@/types/analytics';

export interface ReportSchedule {
  id: string;
  reportConfigId: string;
  cronExpression: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  recipients: string[];
}

export class ReportsService {
  private static instance: ReportsService;
  private schedules: Map<string, ReportSchedule> = new Map();
  private reportQueue: Array<{
    config: ReportConfig;
    filters?: AnalyticsFilters;
    scheduledAt?: Date;
  }> = [];

  private constructor() {
    this.initializeSchedules();
    this.startScheduler();
  }

  static getInstance(): ReportsService {
    if (!ReportsService.instance) {
      ReportsService.instance = new ReportsService();
    }
    return ReportsService.instance;
  }

  /**
   * === GESTION DES RAPPORTS ===
   */

  /**
   * Génère un rapport complet
   */
  async generateReport(
    configId: string, 
    filters?: AnalyticsFilters,
    format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf'
  ): Promise<{ data: ReportData; file?: Blob; filename: string }> {
    performanceMonitor.info('Génération rapport débutée', { configId, format });

    try {
      // Générer les données du rapport
      const reportData = await analyticsService.generateReport(configId, filters);
      
      // Générer le fichier selon le format
      const fileData = await this.generateReportFile(reportData, format);
      const filename = this.generateFilename(configId, format, reportData.generatedAt);

      performanceMonitor.info('Rapport généré avec succès', { configId, format });
      
      return {
        data: reportData,
        file: fileData,
        filename
      };

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport', { configId, error });
      throw error;
    }
  }

  /**
   * Programme un rapport automatique
   */
  async scheduleReport(config: ReportConfig, schedule: {
    cronExpression: string;
    recipients: string[];
    filters?: AnalyticsFilters;
  }): Promise<string> {
    const scheduleId = this.generateId();
    
    const newSchedule: ReportSchedule = {
      id: scheduleId,
      reportConfigId: config.id,
      cronExpression: schedule.cronExpression,
      isActive: true,
      nextRun: this.calculateNextRun(schedule.cronExpression),
      recipients: schedule.recipients
    };

    this.schedules.set(scheduleId, newSchedule);
    
    performanceMonitor.info('Rapport programmé', { scheduleId, configId: config.id });
    
    return scheduleId;
  }

  /**
   * Exécute tous les rapports programmés
   */
  async executeScheduledReports(): Promise<void> {
    const now = new Date();
    const dueSchedules = Array.from(this.schedules.values())
      .filter(schedule => schedule.isActive && schedule.nextRun <= now);

    for (const schedule of dueSchedules) {
      try {
        await this.executeSchedule(schedule);
      } catch (error) {
        performanceMonitor.error('Erreur exécution rapport programmé', { 
          scheduleId: schedule.id, 
          error 
        });
      }
    }
  }

  /**
   * === EXPORT ET FORMATAGE ===
   */

  /**
   * Exporte un rapport en PDF
   */
  async exportToPDF(reportData: ReportData): Promise<Blob> {
    // Simulation de génération PDF
    // Dans une implémentation réelle, on utiliserait une bibliothèque comme jsPDF ou Puppeteer
    const htmlContent = this.generateHTMLReport(reportData);
    
    // Simuler un PDF (en réalité, il faudrait convertir HTML en PDF)
    const blob = new Blob([htmlContent], { type: 'application/pdf' });
    
    return blob;
  }

  /**
   * Exporte un rapport en Excel
   */
  async exportToExcel(reportData: ReportData): Promise<Blob> {
    // Simulation de génération Excel
    // Dans une implémentation réelle, on utiliserait une bibliothèque comme ExcelJS
    const csvContent = this.generateCSVReport(reportData);
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    
    return blob;
  }

  /**
   * Exporte un rapport en CSV
   */
  async exportToCSV(reportData: ReportData): Promise<Blob> {
    const csvContent = this.generateCSVReport(reportData);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return blob;
  }

  /**
   * Exporte un rapport en JSON
   */
  async exportToJSON(reportData: ReportData): Promise<Blob> {
    const jsonContent = JSON.stringify(reportData, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    
    return blob;
  }

  /**
   * === ANALYSE ET INSIGHTS ===
   */

  /**
   * Génère des insights automatiques
   */
  generateInsights(reportData: ReportData): string[] {
    const insights: string[] = [];
    
    // Analyse du chiffre d'affaires
    if (reportData.metrics.business.totalRevenue > 0) {
      const growth = reportData.metrics.business.revenueGrowth;
      if (growth.trend === 'up' && growth.percentage > 10) {
        insights.push(`🚀 Excellente croissance du CA: +${growth.percentage.toFixed(1)}%`);
      } else if (growth.trend === 'down' && Math.abs(growth.percentage) > 5) {
        insights.push(`⚠️ Baisse du CA de ${Math.abs(growth.percentage).toFixed(1)}% à analyser`);
      }
    }

    // Analyse de la satisfaction client
    if (reportData.metrics.operational.customerSatisfaction < 4.0) {
      insights.push(`🎯 Satisfaction client à améliorer: ${reportData.metrics.operational.customerSatisfaction.toFixed(1)}/5`);
    }

    // Analyse des temps de livraison
    if (reportData.metrics.operational.averageDeliveryTime > 35) {
      insights.push(`⏰ Temps de livraison élevé: ${reportData.metrics.operational.averageDeliveryTime.toFixed(1)} minutes`);
    }

    // Analyse des produits
    const topProduct = reportData.metrics.product.topSellingProducts[0];
    if (topProduct) {
      insights.push(`🏆 Produit star: "${topProduct.productName}" (${topProduct.salesCount} ventes)`);
    }

    // Analyse de la rétention client
    if (reportData.metrics.customer.customerRetentionRate < 0.6) {
      insights.push(`🔄 Taux de rétention faible: ${(reportData.metrics.customer.customerRetentionRate * 100).toFixed(1)}%`);
    }

    return insights;
  }

  /**
   * Génère des recommandations automatiques
   */
  generateRecommendations(reportData: ReportData): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur les performances
    if (reportData.metrics.business.revenueGrowth.trend === 'down') {
      recommendations.push('Analyser les causes de la baisse et mettre en place un plan de relance');
      recommendations.push('Renforcer les actions marketing et promotions');
    }

    if (reportData.metrics.operational.averageDeliveryTime > 30) {
      recommendations.push('Optimiser les routes de livraison et la gestion des livreurs');
      recommendations.push('Améliorer la communication avec les clients sur les délais');
    }

    if (reportData.metrics.customer.customerSegments.atRisk > 100) {
      recommendations.push('Mettre en place une campagne de rétention ciblée');
      recommendations.push('Améliorer le programme de fidélité');
    }

    if (reportData.metrics.business.averageOrderValue < 30) {
      recommendations.push('Promouvoir les produits à forte valeur ajoutée');
      recommendations.push('Optimiser les suggestions de produits complémentaires');
    }

    // Recommandations d'optimisation
    if (reportData.metrics.product.menuAnalysis.outOfStock > 5) {
      recommendations.push('Améliorer la gestion des stocks et l\'approvisionnement');
    }

    return recommendations;
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private initializeSchedules(): void {
    // Rapports par défaut programmés
    const defaultSchedules: Array<Omit<ReportSchedule, 'id' | 'nextRun'>> = [
      {
        reportConfigId: 'daily_summary',
        cronExpression: '0 8 * * *', // Tous les jours à 8h
        isActive: true,
        recipients: ['admin@universaleats.com']
      },
      {
        reportConfigId: 'weekly_analysis',
        cronExpression: '0 9 * * 1', // Tous les lundi à 9h
        isActive: true,
        recipients: ['manager@universaleats.com']
      }
    ];

    defaultSchedules.forEach(schedule => {
      const scheduleId = this.generateId();
      const fullSchedule: ReportSchedule = {
        ...schedule,
        id: scheduleId,
        nextRun: this.calculateNextRun(schedule.cronExpression)
      };
      this.schedules.set(scheduleId, fullSchedule);
    });

    performanceMonitor.info('Rapports programmés initialisés', { count: this.schedules.size });
  }

  private startScheduler(): void {
    // Vérifier les rapports à exécuter toutes les minutes
    setInterval(async () => {
      await this.executeScheduledReports();
    }, 60000);
  }

  private async executeSchedule(schedule: ReportSchedule): Promise<void> {
    performanceMonitor.info('Exécution rapport programmé', { scheduleId: schedule.id });

    try {
      // Trouver la configuration du rapport
      const reportConfig = this.getReportConfig(schedule.reportConfigId);
      if (!reportConfig) {
        throw new Error(`Configuration de rapport non trouvée: ${schedule.reportConfigId}`);
      }

      // Générer le rapport
      const reportResult = await this.generateReport(
        schedule.reportConfigId,
        reportConfig.filters,
        reportConfig.format
      );

      // Envoyer par email (simulation)
      await this.sendReportEmail(schedule.recipients, reportResult);

      // Mettre à jour la planification
      schedule.lastRun = new Date();
      schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
      this.schedules.set(schedule.id, schedule);

      performanceMonitor.info('Rapport programmé exécuté avec succès', { 
        scheduleId: schedule.id 
      });

    } catch (error) {
      performanceMonitor.error('Erreur exécution rapport programmé', { 
        scheduleId: schedule.id, 
        error 
      });
      throw error;
    }
  }

  private async generateReportFile(reportData: ReportData, format: string): Promise<Blob | undefined> {
    switch (format) {
      case 'pdf':
        return await this.exportToPDF(reportData);
      case 'excel':
        return await this.exportToExcel(reportData);
      case 'csv':
        return await this.exportToCSV(reportData);
      case 'json':
        return await this.exportToJSON(reportData);
      default:
        return undefined;
    }
  }

  private generateHTMLReport(reportData: ReportData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Rapport Analytics - Universal Eats</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .insights { background: #e8f5e8; padding: 15px; border-radius: 5px; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rapport Analytics Universal Eats</h1>
        <p>Période: ${new Date(reportData.dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(reportData.dateRange.end).toLocaleDateString('fr-FR')}</p>
        <p>Généré le: ${new Date(reportData.generatedAt).toLocaleString('fr-FR')}</p>
    </div>

    <div class="section">
        <h2>Résumé Exécutif</h2>
        <div class="metric">
            <strong>Chiffre d'affaires:</strong> ${reportData.summary.totalRevenue.toFixed(2)}€
        </div>
        <div class="metric">
            <strong>Commandes:</strong> ${reportData.summary.totalOrders}
        </div>
        <div class="metric">
            <strong>Clients:</strong> ${reportData.summary.totalCustomers}
        </div>
        <div class="metric">
            <strong>Panier moyen:</strong> ${reportData.summary.averageOrderValue.toFixed(2)}€
        </div>
    </div>

    <div class="section insights">
        <h2>Insights Principaux</h2>
        <ul>
            ${reportData.insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
    </div>

    <div class="section recommendations">
        <h2>Recommandations</h2>
        <ul>
            ${reportData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>
    `;
  }

  private generateCSVReport(reportData: ReportData): string {
    const rows = [
      ['Métrique', 'Valeur'],
      ['Chiffre d\'affaires total', reportData.summary.totalRevenue.toFixed(2)],
      ['Nombre de commandes', reportData.summary.totalOrders.toString()],
      ['Nombre de clients', reportData.summary.totalCustomers.toString()],
      ['Panier moyen', reportData.summary.averageOrderValue.toFixed(2)],
      ['Satisfaction client', reportData.summary.customerSatisfaction.toFixed(1)],
      ['', ''],
      ['Insights'],
      ...reportData.insights.map(insight => ['', insight]),
      ['', ''],
      ['Recommandations'],
      ...reportData.recommendations.map(rec => ['', rec])
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private generateFilename(configId: string, format: string, timestamp: string): string {
    const date = new Date(timestamp).toISOString().split('T')[0];
    return `rapport-${configId}-${date}.${format}`;
  }

  private getReportConfig(configId: string): ReportConfig | null {
    // Simulation - dans une implémentation réelle, on chargerait depuis une base
    const configs: Record<string, ReportConfig> = {
      'daily_summary': {
        id: 'daily_summary',
        name: 'Résumé quotidien',
        description: 'Rapport quotidien des performances',
        type: 'daily',
        frequency: 'daily',
        format: 'pdf',
        recipients: ['admin@universaleats.com'],
        filters: {},
        isActive: true
      },
      'weekly_analysis': {
        id: 'weekly_analysis',
        name: 'Analyse hebdomadaire',
        description: 'Rapport hebdomadaire avec tendances',
        type: 'weekly',
        frequency: 'weekly',
        format: 'excel',
        recipients: ['manager@universaleats.com'],
        filters: {},
        isActive: true
      }
    };

    return configs[configId] || null;
  }

  private async sendReportEmail(recipients: string[], reportResult: {
    data: ReportData;
    file?: Blob;
    filename: string;
  }): Promise<void> {
    // Simulation d'envoi d'email
    performanceMonitor.info('Envoi rapport par email', { 
      recipients: recipients.join(', '),
      filename: reportResult.filename
    });
    
    // Dans une implémentation réelle, on utiliserait un service d'email comme SendGrid, Nodemailer, etc.
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simulation de calcul de la prochaine exécution
    // Dans une implémentation réelle, on utiliserait une bibliothèque comme node-cron
    const now = new Date();
    const nextRun = new Date(now);
    
    // Pour la démo, on programme dans 1 heure
    nextRun.setHours(nextRun.getHours() + 1);
    
    return nextRun;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * === API PUBLIQUES ===
   */

  /**
   * Récupère toutes les planifications
   */
  getSchedules(): ReportSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Active/désactive une planification
   */
  toggleSchedule(scheduleId: string, isActive: boolean): void {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      schedule.isActive = isActive;
      if (isActive) {
        schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
      }
      this.schedules.set(scheduleId, schedule);
    }
  }

  /**
   * Supprime une planification
   */
  deleteSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId);
  }
}

// Instance singleton
export const reportsService = ReportsService.getInstance();

export default reportsService;