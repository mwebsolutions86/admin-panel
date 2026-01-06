/**
 * Types pour le Module de Gestion Financière et Comptabilité
 * Universal Eats - Plan Comptable Marocain (OHADA)
 */

export interface AccountingEntry {
  id: string;
  date: string;
  journal: string;
  entryNumber: string;
  description: string;
  reference?: string;
  amount: number;
  currency: string;
  storeId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPosted: boolean;
  isReversed: boolean;
  reversalOf?: string;
  attachments?: Attachment[];
  lines: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  project?: string;
  inventoryItemId?: string;
  orderId?: string;
  storeId: string;
  date: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  nameFr: string;
  nameAr?: string;
  type: AccountType;
  category: AccountCategory;
  parentAccountId?: string;
  level: number;
  isActive: boolean;
  allowPosting: boolean;
  storeId: string;
  balance: number;
  debitBalance: number;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
  children?: Account[];
  parent?: Account;
}

export type AccountType = 
  | 'asset'           // Actif
  | 'liability'       // Passif
  | 'equity'          // Capitaux propres
  | 'revenue'         // Produits
  | 'expense';        // Charges

export type AccountCategory = 
  // Classe 1 - Comptes de ressources durables
  | 'capital'           // Capital et réserves
  | 'reserves'          // Réserves
  | 'retained_earnings'// Report à nouveau
  | 'result'           // Résultat de l'exercice
  
  // Classe 2 - Comptes d'actif immobilisé
  | 'intangible_assets'     // Immobilisations incorporelles
  | 'tangible_assets'       // Immobilisations corporelles
  | 'financial_assets'      // Immobilisations financières
  | 'current_assets'        // Actif circulant
  
  // Classe 3 - Comptes de stocks
  | 'raw_materials'         // Matières premières
  | 'consumables'          // Matières consommables
  | 'products_in_progress' // Produits en cours
  | 'finished_products'    // Produits finis
  | 'goods'               // Marchandises
  
  // Classe 4 - Comptes de tiers
  | 'suppliers'            // Fournisseurs
  | 'customers'           // Clients
  | 'state'              // État
  | 'personnel'          // Personnel
  | 'others_debtors'     // Autres débiteurs
  | 'others_creditors'   // Autres créanciers
  
  // Classe 5 - Comptes de trésorerie
  | 'cash'               // Caisse
  | 'bank'              // Banque
  | 'other_means'       // Autres moyens de paiement
  
  // Classe 6 - Comptes de charges
  | 'purchases'         // Achats
  | 'external_services' // Services extérieurs
  | 'taxes'            // Impôts et taxes
  | 'payroll'          // Rémunérations
  | 'other_expenses'   // Autres charges
  
  // Classe 7 - Comptes de produits
  | 'sales'            // Ventes
  | 'other_income'     // Autres produits
  | 'subsidies'        // Subventions

export interface ChartOfAccounts {
  id: string;
  name: string;
  nameFr: string;
  nameAr?: string;
  description?: string;
  currency: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  isActive: boolean;
  storeId: string;
  accounts: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface FinancialPeriod {
  id: string;
  name: string;
  nameFr: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  storeId: string;
  closingDate?: string;
  closedBy?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PeriodStatus = 'open' | 'closed' | 'locked';

export interface GeneralLedger {
  id: string;
  accountId: string;
  periodId: string;
  date: string;
  journalEntryId: string;
  journalEntryLineId: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  reference?: string;
  storeId: string;
  createdAt: string;
}

export interface TrialBalance {
  id: string;
  periodId: string;
  date: string;
  storeId: string;
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  openingDebit: number;
  openingCredit: number;
  transactionsDebit: number;
  transactionsCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface FinancialStatement {
  id: string;
  type: FinancialStatementType;
  periodId: string;
  date: string;
  storeId: string;
  data: Record<string, any>;
  currency: string;
  isDraft: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FinancialStatementType = 
  | 'balance_sheet'       // Bilan
  | 'income_statement'    // Compte de résultat
  | 'cash_flow'          // Tableau des flux de trésorerie
  | 'equity_changes'     // État des variations des capitaux propres
  | 'notes'              // Annexe

export interface TaxCalculation {
  id: string;
  type: TaxType;
  baseAmount: number;
  taxRate: number;
  taxAmount: number;
  taxDate: string;
  periodId: string;
  storeId: string;
  orderId?: string;
  invoiceId?: string;
  isPaid: boolean;
  paymentDate?: string;
  createdAt: string;
}

export type TaxType = 
  | 'vat'                // TVA
  | 'corporate_tax'      // Impôt sur les sociétés
  | 'professional_tax'   // Taxe professionnelle
  | 'training_tax'       // Taxe de formation
  | 'social_contributions'; // Charges sociales

export interface VATReport {
  id: string;
  periodId: string;
  storeId: string;
  vatRate: number;
  taxableSales: number;
  vatOnSales: number;
  taxablePurchases: number;
  vatOnPurchases: number;
  vatPayable: number;
  vatRefundable: number;
  netVAT: number;
  dueDate: string;
  status: VATReportStatus;
  submittedAt?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export type VATReportStatus = 
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'paid';

export interface Budget {
  id: string;
  name: string;
  period: string;
  fiscalYear: string;
  storeId: string;
  categories: BudgetCategory[];
  totalBudgeted: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: BudgetStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  period: string;
}

export type BudgetStatus = 'draft' | 'active' | 'locked' | 'archived';

export interface CashFlow {
  id: string;
  date: string;
  storeId: string;
  type: CashFlowType;
  category: string;
  amount: number;
  description: string;
  reference?: string;
  orderId?: string;
  paymentMethod: string;
  createdBy: string;
  createdAt: string;
}

export type CashFlowType = 
  | 'inflow'
  | 'outflow';

export interface FinancialRatio {
  id: string;
  name: string;
  nameFr: string;
  type: RatioType;
  value: number;
  benchmark: number;
  trend: RatioTrend;
  period: string;
  storeId: string;
  calculatedAt: string;
}

export type RatioType = 
  | 'liquidity'         // Ratio de liquidité
  | 'profitability'     // Ratio de rentabilité
  | 'leverage'          // Ratio d'endettement
  | 'efficiency';       // Ratio d'efficacité

export type RatioTrend = 'improving' | 'declining' | 'stable';

export interface ProfitabilityAnalysis {
  id: string;
  periodId: string;
  storeId: string;
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  operatingProfit: number;
  operatingMargin: number;
  productAnalysis: ProductProfitability[];
  categoryAnalysis: CategoryProfitability[];
  periodComparison: PeriodComparison;
  trends: ProfitabilityTrend[];
  createdAt: string;
}

export interface ProductProfitability {
  productId: string;
  productName: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  quantity: number;
  averagePrice: number;
}

export interface CategoryProfitability {
  categoryId: string;
  categoryName: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  productsCount: number;
}

export interface PeriodComparison {
  currentPeriod: string;
  previousPeriod: string;
  revenueChange: number;
  revenueChangePercentage: number;
  profitChange: number;
  profitChangePercentage: number;
  marginChange: number;
}

export interface ProfitabilityTrend {
  period: string;
  revenue: number;
  profit: number;
  margin: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Attachment {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export interface AccountingFilters {
  storeIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  accountIds?: string[];
  journalIds?: string[];
  statuses?: ('draft' | 'posted' | 'reversed')[];
  amounts?: {
    min?: number;
    max?: number;
  };
  references?: string[];
  createdBy?: string[];
}

export interface FinancialDashboard {
  id: string;
  storeId: string;
  period: string;
  kpis: FinancialKPI[];
  charts: FinancialChart[];
  alerts: FinancialAlert[];
  lastUpdated: string;
}

export interface FinancialKPI {
  id: string;
  name: string;
  nameFr: string;
  value: number;
  previousValue: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit: string;
  category: KPICategory;
}

export type KPICategory = 
  | 'revenue'
  | 'profitability'
  | 'liquidity'
  | 'efficiency'
  | 'growth';

export interface FinancialChart {
  id: string;
  type: ChartType;
  title: string;
  titleFr: string;
  data: any[];
  config: ChartConfig;
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'pie'
  | 'area'
  | 'scatter';

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number;
}

export interface FinancialAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  category: AlertCategory;
  value?: number;
  threshold?: number;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export type AlertType = 
  | 'low_cash_flow'
  | 'negative_profit'
  | 'high_expenses'
  | 'budget_overrun'
  | 'tax_due'
  | 'audit_required';

export type AlertCategory = 
  | 'cash_flow'
  | 'profitability'
  | 'budget'
  | 'compliance'
  | 'operational';

export interface ExportConfig {
  format: ExportFormat;
  dateRange: {
    start: Date;
    end: Date;
  };
  storeIds?: string[];
  accounts?: string[];
  includeSubAccounts?: boolean;
  includeZeroBalances?: boolean;
  currency?: string;
  language?: 'fr' | 'ar';
}

export type ExportFormat = 
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'xml'
  | 'json'
  | 'sage'
  | 'ebics';

export interface ComplianceReport {
  id: string;
  type: ComplianceType;
  periodId: string;
  storeId: string;
  status: ComplianceStatus;
  dueDate: string;
  submittedAt?: string;
  approvedAt?: string;
  documents: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type ComplianceType = 
  | 'tax_return'
  | 'annual_financial_statements'
  | 'audit_report'
  | 'vat_declaration';

export type ComplianceStatus = 
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'overdue';

export interface AuditTrail {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  storeId: string;
}

// Utilitaires et helpers
export interface AccountingValidationError {
  field: string;
  code: string;
  message: string;
  messageFr: string;
}

export interface AccountingPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  date: string;
  source: string;
}