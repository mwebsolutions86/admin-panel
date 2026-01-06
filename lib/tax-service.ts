/**
 * Service de Calculs TVA et Fiscalité Marocaine
 * Universal Eats - Conformité fiscale selon la réglementation marocaine
 * 
 * Fonctionnalités principales :
 * - Calcul automatique de la TVA selon les taux marocains
 * - Génération des déclarations fiscales
 * - Gestion des différents régimes fiscaux
 * - Conformité OHADA et réglementation marocaine
 * - Intégration avec les écritures comptables
 * - Alertes de conformité et échéances
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import accountingService from './accounting-service';
import {
  TaxCalculation,
  TaxType,
  VATReport,
  VATReportStatus,
  ComplianceReport,
  ComplianceType,
  ComplianceStatus,
  AccountingEntry,
  JournalEntryLine
} from '@/types/accounting';

// Taux de TVA selon la réglementation marocaine
export const VAT_RATES = {
  STANDARD: 0.20,     // 20% - Taux standard
  REDUCED: 0.10,      // 10% - Taux réduit (alimentation, etc.)
  SUPER_REDUCED: 0.07, // 7% - Taux super-réduit (certains produits)
  ZERO: 0.00,         // 0% - Exonéré
  EXEMPT: null        // Exonéré sans droit à déduction
} as const;

// Régimes fiscaux pour restaurants au Maroc
export const TAX_REGIMES = {
  REAL_NORMAL: {
    name: 'Régime Réel Normal',
    description: 'TVA au taux normal avec droit à déduction',
    threshold: 500000, // 500,000 MAD
    vatRate: VAT_RATES.STANDARD,
    isDefault: true
  },
  REAL_SIMPLIFIE: {
    name: 'Régime Réel Simplifié',
    description: 'TVA avec simplification des obligations',
    threshold: 2000000, // 2,000,000 MAD
    vatRate: VAT_RATES.STANDARD,
    isDefault: false
  },
  FORFAIT: {
    name: 'Régime Forfaitaire',
    description: 'Taxe professionnelle forfaitaire',
    threshold: 500000, // 500,000 MAD
    vatRate: VAT_RATES.ZERO,
    isDefault: false
  },
  EXEMPTION: {
    name: 'Régime d\'Exemption',
    description: 'Exonération de TVA',
    threshold: 0,
    vatRate: VAT_RATES.EXEMPT,
    isDefault: false
  }
} as const;

export interface VATCalculation {
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  isRecoverable: boolean;
  category: 'standard' | 'reduced' | 'super_reduced' | 'exempt' | 'zero';
}

export interface TaxObligation {
  id: string;
  type: TaxType;
  name: string;
  description: string;
  frequency: 'monthly' | 'quarterly' | 'annually';
  dueDate: string;
  isMandatory: boolean;
  lastFiled?: string;
  nextDueDate: string;
  status: 'compliant' | 'due' | 'overdue' | 'pending';
}

export interface MoroccoCompliance {
  fiscalYear: number;
  regime: keyof typeof TAX_REGIMES;
  obligations: TaxObligation[];
  lastAuditDate?: string;
  nextAuditDate?: string;
  complianceScore: number;
  recommendations: string[];
}

export class TaxService {
  private static instance: TaxService;
  private vatCache = new Map<string, VATCalculation[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeTaxObligations();
  }

  static getInstance(): TaxService {
    if (!TaxService.instance) {
      TaxService.instance = new TaxService();
    }
    return TaxService.instance;
  }

  /**
   * === CALCULS TVA ===
   */

  /**
   * Calcule la TVA pour un montant donné
   */
  calculateVAT(
    amount: number,
    category: 'standard' | 'reduced' | 'super_reduced' | 'exempt' | 'zero' = 'standard',
    isRecoverable: boolean = true
  ): VATCalculation {
    let vatRate: number;
    let baseAmount: number;

    switch (category) {
      case 'standard':
        vatRate = VAT_RATES.STANDARD;
        baseAmount = amount;
        break;
      case 'reduced':
        vatRate = VAT_RATES.REDUCED;
        baseAmount = amount;
        break;
      case 'super_reduced':
        vatRate = VAT_RATES.SUPER_REDUCED;
        baseAmount = amount;
        break;
      case 'zero':
        vatRate = VAT_RATES.ZERO;
        baseAmount = amount;
        break;
      case 'exempt':
        vatRate = VAT_RATES.EXEMPT;
        baseAmount = amount;
        break;
      default:
        vatRate = VAT_RATES.STANDARD;
        baseAmount = amount;
    }

    const vatAmount = vatRate ? baseAmount * vatRate : 0;
    const totalAmount = baseAmount + vatAmount;

    return {
      baseAmount,
      vatRate: vatRate || 0,
      vatAmount,
      totalAmount,
      isRecoverable: isRecoverable && vatRate !== null,
      category
    };
  }

  /**
   * Calcule la TVA pour une commande restaurant
   */
  async calculateOrderVAT(orderId: string): Promise<VATCalculation[]> {
    try {
      performanceMonitor.startTimer('order_vat_calculation');

      // Récupérer les détails de la commande
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (tax_rate, category)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!order) throw new Error('Commande non trouvée');

      const vatCalculations: VATCalculation[] = [];

      // Calculer la TVA pour chaque article
      for (const item of order.order_items || []) {
        const product = item.products;
        if (!product) continue;

        // Déterminer la catégorie TVA selon le type de produit
        let category: VATCalculation['category'] = 'standard';
        
        if (product.category) {
          // Logique simplifiée - à adapter selon la vraie catégorisation
          if (product.category.toLowerCase().includes('aliment') || 
              product.category.toLowerCase().includes('nourriture')) {
            category = 'reduced'; // 10% pour l'alimentation
          }
        }

        const itemVat = this.calculateVAT(
          item.total_price || 0,
          category,
          true
        );

        vatCalculations.push(itemVat);
      }

      // Calculer la TVA sur les frais de livraison
      if (order.delivery_fee_applied > 0) {
        const deliveryVat = this.calculateVAT(order.delivery_fee_applied, 'standard', true);
        vatCalculations.push(deliveryVat);
      }

      performanceMonitor.endTimer('order_vat_calculation');
      return vatCalculations;

    } catch (error) {
      performanceMonitor.error('Erreur calcul TVA commande', { orderId, error });
      throw error;
    }
  }

  /**
   * Calcule la TVA pour une période donnée
   */
  async calculatePeriodVAT(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    sales: VATCalculation[];
    purchases: VATCalculation[];
    totalVATPayable: number;
    totalVATRecoverable: number;
    netVAT: number;
  }> {
    try {
      performanceMonitor.startTimer('period_vat_calculation');

      // Récupérer les commandes de la période
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (tax_rate, category)
          )
        `)
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'delivered');

      if (error) throw error;

      // Calculer la TVA sur les ventes
      const sales: VATCalculation[] = [];
      for (const order of orders || []) {
        const orderVat = await this.calculateOrderVAT(order.id);
        sales.push(...orderVat);
      }

      // Simuler la TVA sur les achats (à implémenter avec de vraies données d'achat)
      const purchases: VATCalculation[] = [];
      // purchases.push(this.calculateVAT(purchaseAmount, 'standard', true));

      const totalVATPayable = sales
        .filter(vat => vat.vatAmount > 0)
        .reduce((sum, vat) => sum + vat.vatAmount, 0);

      const totalVATRecoverable = purchases
        .filter(vat => vat.isRecoverable)
        .reduce((sum, vat) => sum + vat.vatAmount, 0);

      const netVAT = totalVATPayable - totalVATRecoverable;

      performanceMonitor.endTimer('period_vat_calculation');

      return {
        sales,
        purchases,
        totalVATPayable,
        totalVATRecoverable,
        netVAT
      };

    } catch (error) {
      performanceMonitor.error('Erreur calcul TVA période', { storeId, startDate, endDate, error });
      throw error;
    }
  }

  /**
   * === GÉNÉRATION DES DÉCLARATIONS ===
   */

  /**
   * Génère un rapport TVA mensuel
   */
  async generateMonthlyVATReport(
    storeId: string,
    year: number,
    month: number
  ): Promise<VATReport> {
    try {
      performanceMonitor.startTimer('monthly_vat_report');

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const vatData = await this.calculatePeriodVAT(storeId, startDate, endDate);

      const vatReport: VATReport = {
        id: this.generateId(),
        periodId: `${year}-${month.toString().padStart(2, '0')}`,
        storeId,
        vatRate: VAT_RATES.STANDARD,
        taxableSales: vatData.sales.reduce((sum, vat) => sum + vat.baseAmount, 0),
        vatOnSales: vatData.totalVATPayable,
        taxablePurchases: vatData.purchases.reduce((sum, vat) => sum + vat.baseAmount, 0),
        vatOnPurchases: vatData.totalVATRecoverable,
        vatPayable: Math.max(0, vatData.netVAT),
        vatRefundable: Math.max(0, -vatData.netVAT),
        netVAT: vatData.netVAT,
        dueDate: this.calculateVATDueDate(year, month),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sauvegarder le rapport
      await this.saveVATReport(vatReport);

      // Générer les écritures comptables automatiques
      await this.generateVATEntries(storeId, vatReport);

      performanceMonitor.endTimer('monthly_vat_report');
      performanceMonitor.info('Rapport TVA mensuel généré', { storeId, year, month });

      return vatReport;

    } catch (error) {
      performanceMonitor.error('Erreur génération rapport TVA', { storeId, year, month, error });
      throw error;
    }
  }

  /**
   * Génère les écritures comptables automatiques pour la TVA
   */
  private async generateVATEntries(storeId: string, vatReport: VATReport): Promise<void> {
    try {
      // Écriture de TVA collectée (crédit)
      if (vatReport.vatOnSales > 0) {
        await accountingService.createEntry({
          date: vatReport.dueDate,
          journal: 'TVA',
          description: `TVA collectée - ${vatReport.periodId}`,
          reference: `TVA_${vatReport.periodId}`,
          amount: vatReport.vatOnSales,
          currency: 'MAD',
          storeId,
          createdBy: 'system',
          isPosted: false,
          isReversed: false,
          lines: [{
            accountId: await this.getAccountId(storeId, '445'),
            accountCode: '445',
            accountName: 'État - TVA facturée',
            debit: 0,
            credit: vatReport.vatOnSales,
            description: `TVA collectée ${vatReport.periodId}`,
            storeId
          }]
        });
      }

      // Écriture de TVA déductible (débit)
      if (vatReport.vatOnPurchases > 0) {
        await accountingService.createEntry({
          date: vatReport.dueDate,
          journal: 'TVA',
          description: `TVA déductible - ${vatReport.periodId}`,
          reference: `TVA_${vatReport.periodId}`,
          amount: vatReport.vatOnPurchases,
          currency: 'MAD',
          storeId,
          createdBy: 'system',
          isPosted: false,
          isReversed: false,
          lines: [{
            accountId: await this.getAccountId(storeId, '4457'),
            accountCode: '4457',
            accountName: 'État - TVA récupérable',
            debit: vatReport.vatOnPurchases,
            credit: 0,
            description: `TVA déductible ${vatReport.periodId}`,
            storeId
          }]
        });
      }

      // Écriture de règlement TVA (si montant dû)
      if (vatReport.vatPayable > 0) {
        await accountingService.createEntry({
          date: vatReport.dueDate,
          journal: 'TVA',
          description: `Règlement TVA - ${vatReport.periodId}`,
          reference: `TVA_PAY_${vatReport.periodId}`,
          amount: vatReport.vatPayable,
          currency: 'MAD',
          storeId,
          createdBy: 'system',
          isPosted: false,
          isReversed: false,
          lines: [
            {
              accountId: await this.getAccountId(storeId, '4456'),
              accountCode: '4456',
              accountName: 'État - TVA due',
              debit: vatReport.vatPayable,
              credit: 0,
              description: `TVA due ${vatReport.periodId}`,
              storeId
            },
            {
              accountId: await this.getAccountId(storeId, '571'),
              accountCode: '571',
              accountName: 'Banques',
              debit: 0,
              credit: vatReport.vatPayable,
              description: `Règlement TVA ${vatReport.periodId}`,
              storeId
            }
          ]
        });
      }

    } catch (error) {
      performanceMonitor.error('Erreur génération écritures TVA', { storeId, vatReport, error });
      throw error;
    }
  }

  /**
   * === CONFORMITÉ MAROCAINE ===
   */

  /**
   * Vérifie la conformité fiscale d'un magasin
   */
  async checkCompliance(storeId: string): Promise<MoroccoCompliance> {
    try {
      performanceMonitor.startTimer('compliance_check');

      const currentYear = new Date().getFullYear();
      const obligations = await this.getTaxObligations(storeId);
      
      // Évaluer le score de conformité
      const complianceScore = this.calculateComplianceScore(obligations);
      
      // Générer des recommandations
      const recommendations = this.generateComplianceRecommendations(obligations, complianceScore);

      const compliance: MoroccoCompliance = {
        fiscalYear: currentYear,
        regime: await this.determineTaxRegime(storeId),
        obligations,
        nextAuditDate: this.calculateNextAuditDate(),
        complianceScore,
        recommendations
      };

      performanceMonitor.endTimer('compliance_check');
      return compliance;

    } catch (error) {
      performanceMonitor.error('Erreur vérification conformité', { storeId, error });
      throw error;
    }
  }

  /**
   * Détermine le régime fiscal optimal pour un magasin
   */
  async determineTaxRegime(storeId: string): Promise<keyof typeof TAX_REGIMES> {
    try {
      // Récupérer le chiffre d'affaires annuel estimé
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'delivered');

      if (error) throw error;

      const annualRevenue = (orders || []).reduce((sum, order) => sum + order.total_amount, 0);

      // Déterminer le régime selon le chiffre d'affaires
      if (annualRevenue < TAX_REGIMES.EXEMPTION.threshold) {
        return 'EXEMPTION';
      } else if (annualRevenue < TAX_REGIMES.REAL_SIMPLIFIE.threshold) {
        return 'REAL_NORMAL';
      } else {
        return 'REAL_SIMPLIFIE';
      }

    } catch (error) {
      performanceMonitor.error('Erreur détermination régime fiscal', { storeId, error });
      return 'REAL_NORMAL'; // Régime par défaut
    }
  }

  /**
   * === OBLIGATIONS FISCALES ===
   */

  /**
   * Récupère les obligations fiscales pour un magasin
   */
  async getTaxObligations(storeId: string): Promise<TaxObligation[]> {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const obligations: TaxObligation[] = [
        {
          id: 'vat_monthly',
          type: 'vat',
          name: 'Déclaration TVA Mensuelle',
          description: 'Déclaration mensuelle de la TVA',
          frequency: 'monthly',
          dueDate: this.calculateVATDueDate(currentYear, currentMonth),
          isMandatory: true,
          nextDueDate: this.calculateVATDueDate(currentYear, currentMonth + 1),
          status: 'due'
        },
        {
          id: 'corporate_tax',
          type: 'corporate_tax',
          name: 'Impôt sur les Sociétés',
          description: 'Paiement provisionnel de l\'IS',
          frequency: 'quarterly',
          dueDate: `${currentYear}-03-31`,
          isMandatory: true,
          nextDueDate: `${currentYear + 1}-03-31`,
          status: 'pending'
        },
        {
          id: 'professional_tax',
          type: 'professional_tax',
          name: 'Taxe Professionnelle',
          description: 'Taxe professionnelle annuelle',
          frequency: 'annually',
          dueDate: `${currentYear}-01-31`,
          isMandatory: true,
          nextDueDate: `${currentYear + 1}-01-31`,
          status: 'compliant'
        },
        {
          id: 'training_tax',
          type: 'training_tax',
          name: 'Taxe de Formation',
          description: 'Taxe de formation professionnelle',
          frequency: 'annually',
          dueDate: `${currentYear}-02-28`,
          isMandatory: true,
          nextDueDate: `${currentYear + 1}-02-28`,
          status: 'compliant'
        }
      ];

      return obligations;

    } catch (error) {
      performanceMonitor.error('Erreur récupération obligations fiscales', { storeId, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private initializeTaxObligations(): void {
    performanceMonitor.info('Service de fiscalité initialisé avec conformité marocaine');
  }

  private calculateVATDueDate(year: number, month: number): string {
    // La TVA est due le 20 du mois suivant
    const dueDate = new Date(year, month, 20);
    return dueDate.toISOString().split('T')[0];
  }

  private calculateComplianceScore(obligations: TaxObligation[]): number {
    const compliantObligations = obligations.filter(o => o.status === 'compliant').length;
    return Math.round((compliantObligations / obligations.length) * 100);
  }

  private generateComplianceRecommendations(
    obligations: TaxObligation[], 
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 80) {
      recommendations.push('Mettre à jour les obligations fiscales en retard');
    }

    const overdueObligations = obligations.filter(o => o.status === 'overdue');
    if (overdueObligations.length > 0) {
      recommendations.push(`Régulariser ${overdueObligations.length} obligation(s) en retard`);
    }

    const dueObligations = obligations.filter(o => o.status === 'due');
    if (dueObligations.length > 0) {
      recommendations.push(`Préparer les déclarations pour ${dueObligations.length} obligation(s) due(s)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent niveau de conformité fiscale');
    }

    return recommendations;
  }

  private calculateNextAuditDate(): string {
    // Audit annuel recommandé
    const nextYear = new Date().getFullYear() + 1;
    return `${nextYear}-12-31`;
  }

  private async getAccountId(storeId: string, accountCode: string): Promise<string> {
    const { data, error } = await supabase
      .from('accounts')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', accountCode)
      .single();

    if (error) throw error;
    return data.id;
  }

  private async saveVATReport(vatReport: VATReport): Promise<void> {
    const { error } = await supabase
      .from('vat_reports')
      .insert({
        period_id: vatReport.periodId,
        store_id: vatReport.storeId,
        vat_rate: vatReport.vatRate,
        taxable_sales: vatReport.taxableSales,
        vat_on_sales: vatReport.vatOnSales,
        taxable_purchases: vatReport.taxablePurchases,
        vat_on_purchases: vatReport.vatOnPurchases,
        vat_payable: vatReport.vatPayable,
        vat_refundable: vatReport.vatRefundable,
        net_vat: vatReport.netVAT,
        due_date: vatReport.dueDate,
        status: vatReport.status,
        created_at: vatReport.createdAt,
        updated_at: vatReport.updatedAt
      });

    if (error) throw error;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Instance singleton
export const taxService = TaxService.getInstance();

// Export pour utilisation dans les hooks
export default taxService;