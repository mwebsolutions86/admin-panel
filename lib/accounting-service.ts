/**
 * Service de Comptabilité et Gestion Financière
 * Universal Eats - Module de Gestion Comptable selon les Normes Marocaines (OHADA)
 * 
 * Fonctionnalités principales :
 * - Plan comptable marocain adapté aux restaurants
 * - Écritures comptables automatiques
 * - Journal et grand livre
 * - États financiers (Bilan, Compte de résultat)
 * - Calcul et gestion de la TVA
 * - Intégration avec les commandes et paiements
 * - Rapports comptables conformes
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { 
  AccountingEntry, 
  JournalEntryLine, 
  Account, 
  ChartOfAccounts,
  GeneralLedger,
  TrialBalance,
  FinancialStatement,
  TaxCalculation,
  VATReport,
  Budget,
  ProfitabilityAnalysis,
  FinancialRatio,
  CashFlow,
  AccountingFilters,
  FinancialDashboard,
  AccountingPeriod,
  ComplianceReport,
  AuditTrail,
  AccountType,
  AccountCategory,
  PeriodStatus,
  FinancialStatementType,
  TaxType,
  VATReportStatus,
  BudgetStatus,
  RatioType,
  RatioTrend,
  CashFlowType,
  KPICategory,
  AlertType,
  AlertCategory,
  ComplianceType,
  ComplianceStatus
} from '@/types/accounting';

export class AccountingService {
  private static instance: AccountingService;
  private chartOfAccountsCache = new Map<string, ChartOfAccounts>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  // Plan comptable marocain par défaut pour restaurants
  private readonly DEFAULT_MOROCCAN_CHART = {
    // Classe 1 - Comptes de ressources durables
    '101': { name: 'Capital social', category: 'capital', allowPosting: true },
    '106': { name: 'Réserves', category: 'reserves', allowPosting: true },
    '110': { name: 'Report à nouveau créditeur', category: 'retained_earnings', allowPosting: true },
    '119': { name: 'Report à nouveau débiteur', category: 'retained_earnings', allowPosting: true },
    '120': { name: 'Résultat de l\'exercice', category: 'result', allowPosting: true },

    // Classe 2 - Comptes d'actif immobilisé
    '211': { name: 'Terrains', category: 'tangible_assets', allowPosting: true },
    '213': { name: 'Bâtiments', category: 'tangible_assets', allowPosting: true },
    '218': { name: 'Matériel et mobilier', category: 'tangible_assets', allowPosting: true },
    '223': { name: 'Matériel de transport', category: 'tangible_assets', allowPosting: true },
    '245': { name: 'Matériel de bureau et informatique', category: 'tangible_assets', allowPosting: true },

    // Classe 3 - Comptes de stocks
    '311': { name: 'Marchandises', category: 'goods', allowPosting: true },
    '321': { name: 'Matières premières', category: 'raw_materials', allowPosting: true },
    '322': { name: 'Matières consommables', category: 'consumables', allowPosting: true },

    // Classe 4 - Comptes de tiers
    '411': { name: 'Clients', category: 'customers', allowPosting: true },
    '413': { name: 'Clients - Effets à recevoir', category: 'customers', allowPosting: true },
    '421': { name: 'Personnel - Avances', category: 'personnel', allowPosting: true },
    '431': { name: 'Sécurité sociale', category: 'state', allowPosting: true },
    '441': { name: 'État - Subventions à recevoir', category: 'state', allowPosting: true },
    '445': { name: 'État - TVA facturée', category: 'state', allowPosting: true },
    '4456': { name: 'État - TVA due', category: 'state', allowPosting: true },
    '4457': { name: 'État - TVA récupérable', category: 'state', allowPosting: true },
    '446': { name: 'État - Taxes sur le chiffre d\'affaires', category: 'state', allowPosting: true },
    '448': { name: 'État - Autres impôts et taxes', category: 'state', allowPosting: true },
    '401': { name: 'Fournisseurs', category: 'suppliers', allowPosting: true },
    '403': { name: 'Fournisseurs - Effets à payer', category: 'suppliers', allowPosting: true },
    '421': { name: 'Personnel - Avances', category: 'personnel', allowPosting: true },
    '431': { name: 'Organismes sociaux', category: 'state', allowPosting: true },
    '445': { name: 'État - Taxes sur le chiffre d\'affaires', category: 'state', allowPosting: true },
    '455': { name: 'Associés - Comptes courants', category: 'others_creditors', allowPosting: true },
    '461': { name: 'Débiteurs divers', category: 'others_debtors', allowPosting: true },
    '465': { name: 'Créances sur cessions d\'immobilisations', category: 'others_debtors', allowPosting: true },
    '475': { name: 'Créditeurs divers', category: 'others_creditors', allowPosting: true },
    '491': { name: 'Provisions pour dépréciation des comptes de tiers', category: 'others_creditors', allowPosting: true },

    // Classe 5 - Comptes de trésorerie
    '531': { name: 'Caisse', category: 'cash', allowPosting: true },
    '5311': { name: 'Caisse restaurant', category: 'cash', allowPosting: true },
    '5312': { name: 'Caisse livraison', category: 'cash', allowPosting: true },
    '532': { name: 'Régies d\'avances et accréditifs', category: 'cash', allowPosting: true },
    '541': { name: 'Régies d\'avances', category: 'cash', allowPosting: true },
    '552': { name: 'Titres de placement', category: 'financial_assets', allowPosting: true },
    '571': { name: 'Banques', category: 'bank', allowPosting: true },
    '5711': { name: 'Compte courants', category: 'bank', allowPosting: true },
    '5712': { name: 'Comptes d\'épargne', category: 'bank', allowPosting: true },
    '572': { name: 'Etablissements financiers', category: 'bank', allowPosting: true },

    // Classe 6 - Comptes de charges
    '601': { name: 'Achats de marchandises', category: 'purchases', allowPosting: true },
    '602': { name: 'Achats de matières premières', category: 'purchases', allowPosting: true },
    '603': { name: 'Variation de stocks', category: 'purchases', allowPosting: true },
    '604': { name: 'Achats stockés d\'équipements', category: 'purchases', allowPosting: true },
    '605': { name: 'Autres achats', category: 'purchases', allowPosting: true },
    '611': { name: 'Sous-traitance générale', category: 'external_services', allowPosting: true },
    '612': { name: 'Redevances de crédit-bail', category: 'external_services', allowPosting: true },
    '613': { name: 'Transports', category: 'external_services', allowPosting: true },
    '614': { name: 'Communications', category: 'external_services', allowPosting: true },
    '615': { name: 'Déplacements, missions et réceptions', category: 'external_services', allowPosting: true },
    '616': { name: 'Frais bancaires', category: 'external_services', allowPosting: true },
    '621': { name: 'Personnel extérieur à l\'entreprise', category: 'external_services', allowPosting: true },
    '622': { name: 'Rémunérations d\'intermédiaires', category: 'external_services', allowPosting: true },
    '623': { name: 'Publicité, publications, relations publiques', category: 'external_services', allowPosting: true },
    '624': { name: 'Transports de biens et transports collectifs du personnel', category: 'external_services', allowPosting: true },
    '625': { name: 'Déplacements, missions et réceptions', category: 'external_services', allowPosting: true },
    '626': { name: 'Frais postaux et de télécommunications', category: 'external_services', allowPosting: true },
    '627': { name: 'Services bancaires et assimilés', category: 'external_services', allowPosting: true },
    '628': { name: 'Autres services extérieurs', category: 'external_services', allowPosting: true },
    '631': { name: 'Impôts, taxes et versements assimilés sur rémunérations', category: 'taxes', allowPosting: true },
    '633': { name: 'Impôts, taxes et versements assimilés sur autres charges', category: 'taxes', allowPosting: true },
    '641': { name: 'Salaires appointements', category: 'payroll', allowPosting: true },
    '645': { name: 'Charges sociales', category: 'payroll', allowPosting: true },
    '661': { name: 'Charges d\'intérêts', category: 'other_expenses', allowPosting: true },
    '681': { name: 'Dotations aux amortissements d\'exploitation', category: 'other_expenses', allowPosting: true },
    '686': { name: 'Dotations aux provisions financières', category: 'other_expenses', allowPosting: true },

    // Classe 7 - Comptes de produits
    '701': { name: 'Ventes de marchandises', category: 'sales', allowPosting: true },
    '702': { name: 'Ventes de produits finis', category: 'sales', allowPosting: true },
    '703': { name: 'Ventes de produits intermédiaires', category: 'sales', allowPosting: true },
    '704': { name: 'Ventes de produits résiduels', category: 'sales', allowPosting: true },
    '705': { name: 'Travaux', category: 'sales', allowPosting: true },
    '706': { name: 'Services vendus', category: 'sales', allowPosting: true },
    '707': { name: 'Produits accessoires', category: 'other_income', allowPosting: true },
    '708': { name: 'Produits des activités annexes', category: 'other_income', allowPosting: true },
    '721': { name: 'Production immobilisée - Immobilisations corporelles', category: 'other_income', allowPosting: true },
    '722': { name: 'Production immobilisée - Immobilisations incorporelles', category: 'other_income', allowPosting: true },
    '731': { name: 'Variation de stocks - Produits en cours', category: 'other_income', allowPosting: true },
    '732': { name: 'Variation de stocks - Produits intermédiaires', category: 'other_income', allowPosting: true },
    '733': { name: 'Variation de stocks - Produits finis', category: 'other_income', allowPosting: true },
    '734': { name: 'Variation de stocks - Produits résiduels', category: 'other_income', allowPosting: true },
    '741': { name: 'Subventions d\'exploitation', category: 'subsidies', allowPosting: true },
    '744': { name: 'Subventions d\'équilibre', category: 'subsidies', allowPosting: true },
    '747': { name: 'Autres subventions d\'équilibre', category: 'subsidies', allowPosting: true },
    '751': { name: 'Revenus des participations', category: 'other_income', allowPosting: true },
    '752': { name: 'Revenus des autres immobilisations financières', category: 'other_income', allowPosting: true },
    '753': { name: 'Revenus des titres de placement', category: 'other_income', allowPosting: true },
    '754': { name: 'Produits sur cessions de titres de placement', category: 'other_income', allowPosting: true },
    '755': { name: 'Subventions d\'investissement', category: 'subsidies', allowPosting: true },
    '758': { name: 'Autres produits financiers', category: 'other_income', allowPosting: true },
    '761': { name: 'Produits d\'intérêts', category: 'other_income', allowPosting: true },
    '762': { name: 'Produits de participations', category: 'other_income', allowPosting: true },
    '763': { name: 'Autres revenus financiers', category: 'other_income', allowPosting: true },
    '764': { name: 'Gains de change', category: 'other_income', allowPosting: true },
    '765': { name: 'Escomptes obtenus', category: 'other_income', allowPosting: true },
    '766': { name: 'Gains sur cession d\'immobilisations', category: 'other_income', allowPosting: true },
    '768': { name: 'Autres gains financiers', category: 'other_income', allowPosting: true }
  };

  private constructor() {
    this.initializeDefaultChart();
  }

  static getInstance(): AccountingService {
    if (!AccountingService.instance) {
      AccountingService.instance = new AccountingService();
    }
    return AccountingService.instance;
  }

  /**
   * === GESTION DU PLAN COMPTABLE ===
   */

  /**
   * Initialise le plan comptable par défaut pour les restaurants
   */
  private async initializeDefaultChart(): Promise<void> {
    performanceMonitor.info('Initialisation du plan comptable marocain pour restaurants');
  }

  /**
   * Récupère le plan comptable d'un magasin
   */
  async getChartOfAccounts(storeId: string): Promise<ChartOfAccounts> {
    const cacheKey = `chart:${storeId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select(`
          *,
          accounts (*)
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      const chart: ChartOfAccounts = {
        id: data.id,
        name: data.name,
        nameFr: data.name_fr,
        nameAr: data.name_ar,
        description: data.description,
        currency: data.currency,
        fiscalYearStart: data.fiscal_year_start,
        fiscalYearEnd: data.fiscal_year_end,
        isActive: data.is_active,
        storeId: data.store_id,
        accounts: (data.accounts || []).map(this.mapAccountFromDB),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      this.setCache(cacheKey, chart, this.CACHE_TTL);
      return chart;

    } catch (error) {
      performanceMonitor.error('Erreur récupération plan comptable', { storeId, error });
      throw new Error('Impossible de récupérer le plan comptable');
    }
  }

  /**
   * Crée un plan comptable pour un nouveau magasin
   */
  async createChartOfAccounts(
    storeId: string, 
    name: string = 'Plan Comptable Restaurant Universal Eats'
  ): Promise<ChartOfAccounts> {
    try {
      const chartData = {
        name,
        name_fr: name,
        currency: 'MAD',
        fiscal_year_start: `${new Date().getFullYear()}-01-01`,
        fiscal_year_end: `${new Date().getFullYear()}-12-31`,
        is_active: true,
        store_id: storeId
      };

      const { data: chart, error: chartError } = await supabase
        .from('chart_of_accounts')
        .insert(chartData)
        .select()
        .single();

      if (chartError) throw chartError;

      // Créer les comptes par défaut
      const accounts = Object.entries(this.DEFAULT_MOROCCAN_CHART).map(([code, account]) => ({
        code,
        name: account.name,
        name_fr: account.name,
        type: this.mapCategoryToType(account.category),
        category: account.category,
        parent_account_id: null,
        level: code.length,
        is_active: true,
        allow_posting: account.allowPosting,
        store_id: storeId,
        chart_of_accounts_id: chart.id
      }));

      const { error: accountsError } = await supabase
        .from('accounts')
        .insert(accounts);

      if (accountsError) throw accountsError;

      // Récupérer le plan complet avec les comptes
      const fullChart = await this.getChartOfAccounts(storeId);

      performanceMonitor.info('Plan comptable créé', { storeId, accountCount: accounts.length });
      return fullChart;

    } catch (error) {
      performanceMonitor.error('Erreur création plan comptable', { storeId, error });
      throw new Error('Impossible de créer le plan comptable');
    }
  }

  /**
   * === ÉCRITURES COMPTABLES ===
   */

  /**
   * Crée une écriture comptable
   */
  async createEntry(entry: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountingEntry> {
    try {
      performanceMonitor.startTimer('accounting_entry_create');

      // Validation de l'écriture
      this.validateEntry(entry);

      // Générer le numéro d'écriture
      const entryNumber = await this.generateEntryNumber(entry.storeId, entry.date);

      // Créer l'écriture
      const { data, error } = await supabase
        .from('accounting_entries')
        .insert({
          ...entry,
          entry_number: entryNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const createdEntry: AccountingEntry = {
        id: data.id,
        date: data.date,
        journal: data.journal,
        entryNumber: data.entry_number,
        description: data.description,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency,
        storeId: data.store_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isPosted: data.is_posted,
        isReversed: data.is_reversed,
        reversalOf: data.reversal_of,
        attachments: data.attachments || [],
        lines: [] // Sera rempli par getEntryLines
      };

      performanceMonitor.endTimer('accounting_entry_create');
      performanceMonitor.info('Écriture comptable créée', { 
        entryId: createdEntry.id, 
        entryNumber, 
        storeId: entry.storeId 
      });

      return createdEntry;

    } catch (error) {
      performanceMonitor.error('Erreur création écriture comptable', { entry, error });
      throw new Error('Impossible de créer l\'écriture comptable');
    }
  }

  /**
   * Ajoute des lignes à une écriture comptable
   */
  async addEntryLines(
    entryId: string, 
    lines: Omit<JournalEntryLine, 'id' | 'date' | 'storeId'>[]
  ): Promise<JournalEntryLine[]> {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Écriture non trouvée');

      const linesData = lines.map(line => ({
        ...line,
        journal_entry_id: entryId,
        date: entry.date,
        store_id: entry.storeId
      }));

      const { data, error } = await supabase
        .from('journal_entry_lines')
        .insert(linesData)
        .select()
        .order('created_at');

      if (error) throw error;

      const createdLines = data.map(this.mapJournalLineFromDB);

      // Vérifier l'équilibre de l'écriture
      await this.validateEntryBalance(entryId);

      performanceMonitor.info('Lignes ajoutées à l\'écriture', { entryId, lineCount: createdLines.length });
      return createdLines;

    } catch (error) {
      performanceMonitor.error('Erreur ajout lignes écriture', { entryId, error });
      throw error;
    }
  }

  /**
   * Récupère une écriture comptable
   */
  async getEntry(entryId: string): Promise<AccountingEntry | null> {
    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select(`
          *,
          journal_entry_lines (*)
        `)
        .eq('id', entryId)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        date: data.date,
        journal: data.journal,
        entryNumber: data.entry_number,
        description: data.description,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency,
        storeId: data.store_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isPosted: data.is_posted,
        isReversed: data.is_reversed,
        reversalOf: data.reversal_of,
        attachments: data.attachments || [],
        lines: (data.journal_entry_lines || []).map(this.mapJournalLineFromDB)
      };

    } catch (error) {
      performanceMonitor.error('Erreur récupération écriture', { entryId, error });
      throw error;
    }
  }

  /**
   * Valide une écriture comptable
   */
  private validateEntry(entry: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'>): void {
    const errors: string[] = [];

    if (!entry.date) errors.push('Date requise');
    if (!entry.journal) errors.push('Journal requis');
    if (!entry.description) errors.push('Description requise');
    if (!entry.storeId) errors.push('Store ID requis');
    if (!entry.createdBy) errors.push('Créateur requis');

    if (errors.length > 0) {
      throw new Error(`Validation échouée: ${errors.join(', ')}`);
    }
  }

  /**
   * Valide l'équilibre d'une écriture
   */
  private async validateEntryBalance(entryId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit')
        .eq('journal_entry_id', entryId);

      if (error) throw error;

      const totalDebit = data.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = data.reduce((sum, line) => sum + line.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Écriture non équilibrée: Débit ${totalDebit} ≠ Crédit ${totalCredit}`);
      }

    } catch (error) {
      performanceMonitor.error('Erreur validation équilibre', { entryId, error });
      throw error;
    }
  }

  /**
   * === ÉCRITURES AUTOMATIQUES ===
   */

  /**
   * Génère les écritures automatiques pour une commande
   */
  async generateOrderEntries(orderId: string): Promise<void> {
    try {
      // Récupérer les données de la commande
      const orderData = await this.getOrderData(orderId);
      if (!orderData) return;

      // Créer l'écriture de vente
      const salesEntry = await this.createEntry({
        date: orderData.created_at,
        journal: 'VT',
        description: `Vente commande ${orderData.order_number}`,
        reference: `ORDER_${orderId}`,
        amount: orderData.total_amount,
        currency: 'MAD',
        storeId: orderData.store_id,
        createdBy: 'system',
        isPosted: false,
        isReversed: false,
        lines: []
      });

      // Ligne produits (crédit)
      await this.addEntryLines(salesEntry.id, [{
        accountId: await this.getAccountId(orderData.store_id, '701'), // Ventes
        accountCode: '701',
        accountName: 'Ventes de marchandises',
        debit: 0,
        credit: orderData.total_amount - orderData.tax_amount,
        description: `Vente commande ${orderData.order_number}`,
        storeId: orderData.store_id
      }]);

      // Ligne TVA (crédit)
      if (orderData.tax_amount > 0) {
        await this.addEntryLines(salesEntry.id, [{
          accountId: await this.getAccountId(orderData.store_id, '445'),
          accountCode: '445',
          accountName: 'État - TVA facturée',
          debit: 0,
          credit: orderData.tax_amount,
          description: `TVA commande ${orderData.order_number}`,
          storeId: orderData.store_id
        }]);
      }

      // Ligne client (débit)
      await this.addEntryLines(salesEntry.id, [{
        accountId: await this.getAccountId(orderData.store_id, '411'),
        accountCode: '411',
        accountName: 'Clients',
        debit: orderData.total_amount,
        credit: 0,
        description: `Client commande ${orderData.order_number}`,
        storeId: orderData.store_id
      }]);

      performanceMonitor.info('Écritures de vente générées', { orderId, entryId: salesEntry.id });

      // Si la commande est payée, générer l'écriture de encaissement
      if (orderData.payment_status === 'paid') {
        await this.generatePaymentEntries(orderData);
      }

    } catch (error) {
      performanceMonitor.error('Erreur génération écritures commande', { orderId, error });
      throw error;
    }
  }

  /**
   * Génère les écritures automatiques pour un paiement
   */
  async generatePaymentEntries(orderData: any): Promise<void> {
    try {
      const paymentEntry = await this.createEntry({
        date: orderData.paid_at || orderData.created_at,
        journal: 'BK',
        description: `Encaissement commande ${orderData.order_number}`,
        reference: `PAYMENT_${orderData.order_number}`,
        amount: orderData.total_amount,
        currency: 'MAD',
        storeId: orderData.store_id,
        createdBy: 'system',
        isPosted: false,
        isReversed: false,
        lines: []
      });

      // Ligne compte selon mode de paiement
      let cashAccount = '5311'; // Caisse restaurant par défaut
      if (orderData.payment_method === 'card') {
        cashAccount = '571'; // Banque
      } else if (orderData.payment_method === 'mobile') {
        cashAccount = '571'; // Compte mobile money
      }

      // Ligne encaissement (débit)
      await this.addEntryLines(paymentEntry.id, [{
        accountId: await this.getAccountId(orderData.store_id, cashAccount),
        accountCode: cashAccount,
        accountName: this.getAccountName(cashAccount),
        debit: orderData.total_amount,
        credit: 0,
        description: `Encaissement ${orderData.payment_method}`,
        storeId: orderData.store_id
      }]);

      // Ligne client (crédit)
      await this.addEntryLines(paymentEntry.id, [{
        accountId: await this.getAccountId(orderData.store_id, '411'),
        accountCode: '411',
        accountName: 'Clients',
        debit: 0,
        credit: orderData.total_amount,
        description: `Règlement client commande ${orderData.order_number}`,
        storeId: orderData.store_id
      }]);

      performanceMonitor.info('Écritures de paiement générées', { orderId: orderData.id, entryId: paymentEntry.id });

    } catch (error) {
      performanceMonitor.error('Erreur génération écritures paiement', { orderData: orderData.id, error });
      throw error;
    }
  }

  /**
   * === GRAND LIVRE ET BALANCE ===
   */

  /**
   * Génère le grand livre d'un compte
   */
  async getGeneralLedger(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GeneralLedger[]> {
    try {
      const { data, error } = await supabase
        .from('general_ledger')
        .select(`
          *,
          journal_entries (entry_number, description)
        `)
        .eq('account_id', accountId)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())
        .order('date');

      if (error) throw error;

      return (data || []).map(this.mapGeneralLedgerFromDB);

    } catch (error) {
      performanceMonitor.error('Erreur génération grand livre', { accountId, error });
      throw error;
    }
  }

  /**
   * Génère la balance générale
   */
  async getTrialBalance(
    periodId: string,
    storeId: string
  ): Promise<TrialBalance> {
    try {
      const { data, error } = await supabase
        .from('trial_balance')
        .select('*')
        .eq('period_id', periodId)
        .eq('store_id', storeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return {
          id: data.id,
          periodId: data.period_id,
          date: data.date,
          storeId: data.store_id,
          accounts: JSON.parse(data.accounts_json),
          totalDebit: data.total_debit,
          totalCredit: data.total_credit,
          isBalanced: data.is_balanced,
          createdAt: data.created_at
        };
      }

      // Générer la balance si elle n'existe pas
      return await this.generateTrialBalance(periodId, storeId);

    } catch (error) {
      performanceMonitor.error('Erreur récupération balance', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * Génère la balance générale
   */
  private async generateTrialBalance(periodId: string, storeId: string): Promise<TrialBalance> {
    try {
      // Récupérer tous les comptes du plan comptable
      const chart = await this.getChartOfAccounts(storeId);
      
      const accounts: TrialBalanceAccount[] = [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const account of chart.accounts) {
        if (!account.allowPosting) continue;

        // Calculer les soldes
        const balances = await this.getAccountBalances(account.id, periodId);
        
        const openingDebit = Math.max(0, balances.openingBalance);
        const openingCredit = Math.max(0, -balances.openingBalance);
        const transactionsDebit = Math.max(0, balances.periodBalance);
        const transactionsCredit = Math.max(0, -balances.periodBalance);
        const closingDebit = Math.max(0, balances.closingBalance);
        const closingCredit = Math.max(0, -balances.closingBalance);

        accounts.push({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingDebit,
          openingCredit,
          transactionsDebit,
          transactionsCredit,
          closingDebit,
          closingCredit
        });

        totalDebit += openingDebit + transactionsDebit + closingDebit;
        totalCredit += openingCredit + transactionsCredit + closingCredit;
      }

      const trialBalance = {
        id: this.generateId(),
        periodId,
        date: new Date().toISOString(),
        storeId,
        accounts,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder la balance
      await supabase
        .from('trial_balance')
        .insert({
          period_id: periodId,
          date: trialBalance.date,
          store_id: storeId,
          accounts_json: JSON.stringify(accounts),
          total_debit: totalDebit,
          totalCredit: totalCredit,
          is_balanced: trialBalance.isBalanced,
          created_at: trialBalance.createdAt
        });

      performanceMonitor.info('Balance générale générée', { periodId, storeId, isBalanced: trialBalance.isBalanced });
      return trialBalance;

    } catch (error) {
      performanceMonitor.error('Erreur génération balance', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * === ÉTATS FINANCIERS ===
   */

  /**
   * Génère un état financier
   */
  async generateFinancialStatement(
    type: FinancialStatementType,
    periodId: string,
    storeId: string
  ): Promise<FinancialStatement> {
    try {
      performanceMonitor.startTimer('financial_statement_generate');

      let statementData: Record<string, any> = {};

      switch (type) {
        case 'balance_sheet':
          statementData = await this.generateBalanceSheet(storeId, periodId);
          break;
        case 'income_statement':
          statementData = await this.generateIncomeStatement(storeId, periodId);
          break;
        case 'cash_flow':
          statementData = await this.generateCashFlowStatement(storeId, periodId);
          break;
        default:
          throw new Error(`Type d'état financier non supporté: ${type}`);
      }

      const statement: FinancialStatement = {
        id: this.generateId(),
        type,
        periodId,
        date: new Date().toISOString(),
        storeId,
        data: statementData,
        currency: 'MAD',
        isDraft: true,
        isApproved: false,
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sauvegarder l'état
      const { error } = await supabase
        .from('financial_statements')
        .insert({
          type,
          period_id: periodId,
          date: statement.date,
          store_id: storeId,
          data_json: JSON.stringify(statementData),
          currency: statement.currency,
          is_draft: statement.isDraft,
          is_approved: statement.isApproved,
          created_by: statement.createdBy,
          created_at: statement.createdAt,
          updated_at: statement.updatedAt
        });

      if (error) throw error;

      performanceMonitor.endTimer('financial_statement_generate');
      performanceMonitor.info('État financier généré', { type, periodId, storeId });

      return statement;

    } catch (error) {
      performanceMonitor.error('Erreur génération état financier', { type, periodId, storeId, error });
      throw error;
    }
  }

  /**
   * Génère le bilan
   */
  private async generateBalanceSheet(storeId: string, periodId: string): Promise<Record<string, any>> {
    const chart = await this.getChartOfAccounts(storeId);
    
    const assets: Record<string, number> = {};
    const liabilities: Record<string, number> = {};
    const equity: Record<string, number> = {};

    // Grouper les comptes par type
    for (const account of chart.accounts) {
      const balances = await this.getAccountBalances(account.id, periodId);
      const balance = balances.closingBalance;

      if (account.type === 'asset') {
        assets[account.code] = balance;
      } else if (account.type === 'liability') {
        liabilities[account.code] = balance;
      } else if (account.type === 'equity') {
        equity[account.code] = balance;
      }
    }

    return {
      assets,
      liabilities,
      equity,
      totalAssets: Object.values(assets).reduce((sum, val) => sum + val, 0),
      totalLiabilities: Object.values(liabilities).reduce((sum, val) => sum + val, 0),
      totalEquity: Object.values(equity).reduce((sum, val) => sum + val, 0)
    };
  }

  /**
   * Génère le compte de résultat
   */
  private async generateIncomeStatement(storeId: string, periodId: string): Promise<Record<string, any>> {
    const chart = await this.getChartOfAccounts(storeId);
    
    const revenues: Record<string, number> = {};
    const expenses: Record<string, number> = {};

    // Grouper les comptes par type
    for (const account of chart.accounts) {
      const balances = await this.getAccountBalances(account.id, periodId);
      const balance = balances.periodBalance;

      if (account.type === 'revenue') {
        revenues[account.code] = balance;
      } else if (account.type === 'expense') {
        expenses[account.code] = balance;
      }
    }

    const totalRevenue = Object.values(revenues).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const netResult = totalRevenue - totalExpenses;

    return {
      revenues,
      expenses,
      totalRevenue,
      totalExpenses,
      netResult,
      grossMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    };
  }

  /**
   * === TVA ET FISCALITÉ ===
   */

  /**
   * Calcule la TVA pour une période
   */
  async calculateVAT(
    periodId: string,
    storeId: string,
    vatRate: number = 0.20
  ): Promise<VATReport> {
    try {
      const period = await this.getPeriod(periodId);
      if (!period) throw new Error('Période non trouvée');

      // Récupérer les écritures de TVA de la période
      const vatEntries = await this.getVATEntries(storeId, period.startDate, period.endDate);

      let taxableSales = 0;
      let vatOnSales = 0;
      let taxablePurchases = 0;
      let vatOnPurchases = 0;

      for (const entry of vatEntries) {
        if (entry.accountCode.startsWith('445') && entry.debit > 0) {
          // TVA récupérable
          vatOnPurchases += entry.debit;
          taxablePurchases += entry.debit / vatRate;
        } else if (entry.accountCode.startsWith('445') && entry.credit > 0) {
          // TVA facturée
          vatOnSales += entry.credit;
          taxableSales += entry.credit / vatRate;
        }
      }

      const vatPayable = Math.max(0, vatOnSales - vatOnPurchases);
      const vatRefundable = Math.max(0, vatOnPurchases - vatOnSales);
      const netVAT = vatPayable - vatRefundable;

      const vatReport: VATReport = {
        id: this.generateId(),
        periodId,
        storeId,
        vatRate,
        taxableSales,
        vatOnSales,
        taxablePurchases,
        vatOnPurchases,
        vatPayable,
        vatRefundable,
        netVAT,
        dueDate: this.calculateVATDueDate(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Sauvegarder le rapport TVA
      const { error } = await supabase
        .from('vat_reports')
        .insert({
          period_id: periodId,
          store_id: storeId,
          vat_rate: vatRate,
          taxable_sales: taxableSales,
          vat_on_sales: vatOnSales,
          taxable_purchases: taxablePurchases,
          vat_on_purchases: vatOnPurchases,
          vat_payable: vatPayable,
          vat_refundable: vatRefundable,
          net_vat: netVAT,
          due_date: vatReport.dueDate,
          status: vatReport.status,
          created_at: vatReport.createdAt,
          updated_at: vatReport.updatedAt
        });

      if (error) throw error;

      performanceMonitor.info('Rapport TVA généré', { periodId, storeId, netVAT });
      return vatReport;

    } catch (error) {
      performanceMonitor.error('Erreur calcul TVA', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * === ANALYSES FINANCIÈRES ===
   */

  /**
   * Analyse la rentabilité
   */
  async analyzeProfitability(
    periodId: string,
    storeId: string
  ): Promise<ProfitabilityAnalysis> {
    try {
      performanceMonitor.startTimer('profitability_analysis');

      const incomeStatement = await this.generateIncomeStatement(storeId, periodId);
      
      const analysis: ProfitabilityAnalysis = {
        id: this.generateId(),
        periodId,
        storeId,
        totalRevenue: incomeStatement.totalRevenue,
        totalCosts: incomeStatement.totalExpenses,
        grossProfit: incomeStatement.netResult,
        grossMargin: incomeStatement.grossMargin,
        netProfit: incomeStatement.netResult,
        netMargin: incomeStatement.totalRevenue > 0 ? 
          (incomeStatement.netResult / incomeStatement.totalRevenue) * 100 : 0,
        operatingProfit: incomeStatement.netResult,
        operatingMargin: incomeStatement.grossMargin,
        productAnalysis: await this.getProductProfitability(storeId, periodId),
        categoryAnalysis: await this.getCategoryProfitability(storeId, periodId),
        periodComparison: await this.getPeriodComparison(storeId, periodId),
        trends: await this.getProfitabilityTrends(storeId, periodId),
        createdAt: new Date().toISOString()
      };

      performanceMonitor.endTimer('profitability_analysis');
      performanceMonitor.info('Analyse rentabilité générée', { periodId, storeId });

      return analysis;

    } catch (error) {
      performanceMonitor.error('Erreur analyse rentabilité', { periodId, storeId, error });
      throw error;
    }
  }

  /**
   * === TABLEAU DE BORD FINANCIER ===
   */

  /**
   * Génère le tableau de bord financier
   */
  async getFinancialDashboard(
    storeId: string,
    period: string
  ): Promise<FinancialDashboard> {
    try {
      const currentPeriod = await this.getCurrentPeriod(storeId);
      const previousPeriod = await this.getPreviousPeriod(storeId, currentPeriod);

      const [kpis, charts, alerts] = await Promise.all([
        this.generateKPIs(storeId, currentPeriod, previousPeriod),
        this.generateDashboardCharts(storeId, currentPeriod),
        this.getFinancialAlerts(storeId)
      ]);

      const dashboard: FinancialDashboard = {
        id: this.generateId(),
        storeId,
        period,
        kpis,
        charts,
        alerts,
        lastUpdated: new Date().toISOString()
      };

      return dashboard;

    } catch (error) {
      performanceMonitor.error('Erreur génération tableau de bord', { storeId, period, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private mapAccountFromDB(dbAccount: any): Account {
    return {
      id: dbAccount.id,
      code: dbAccount.code,
      name: dbAccount.name,
      nameFr: dbAccount.name_fr || dbAccount.name,
      nameAr: dbAccount.name_ar,
      type: dbAccount.type,
      category: dbAccount.category,
      parentAccountId: dbAccount.parent_account_id,
      level: dbAccount.level,
      isActive: dbAccount.is_active,
      allowPosting: dbAccount.allow_posting,
      storeId: dbAccount.store_id,
      balance: 0, // Sera calculé
      debitBalance: 0,
      creditBalance: 0,
      createdAt: dbAccount.created_at,
      updatedAt: dbAccount.updated_at
    };
  }

  private mapJournalLineFromDB(dbLine: any): JournalEntryLine {
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

  private mapGeneralLedgerFromDB(dbLedger: any): GeneralLedger {
    return {
      id: dbLedger.id,
      accountId: dbLedger.account_id,
      periodId: dbLedger.period_id,
      date: dbLedger.date,
      journalEntryId: dbLedger.journal_entry_id,
      journalEntryLineId: dbLedger.journal_entry_line_id,
      debit: dbLedger.debit,
      credit: dbLedger.credit,
      balance: dbLedger.balance,
      description: dbLedger.description,
      reference: dbLedger.reference,
      storeId: dbLedger.store_id,
      createdAt: dbLedger.created_at
    };
  }

  private mapCategoryToType(category: AccountCategory): AccountType {
    const typeMap: Record<AccountCategory, AccountType> = {
      // Capitaux propres
      capital: 'equity',
      reserves: 'equity',
      retained_earnings: 'equity',
      result: 'equity',
      
      // Actif
      intangible_assets: 'asset',
      tangible_assets: 'asset',
      financial_assets: 'asset',
      current_assets: 'asset',
      raw_materials: 'asset',
      consumables: 'asset',
      products_in_progress: 'asset',
      finished_products: 'asset',
      goods: 'asset',
      customers: 'asset',
      personnel: 'asset',
      others_debtors: 'asset',
      
      // Passif
      suppliers: 'liability',
      state: 'liability',
      others_creditors: 'liability',
      
      // Trésorerie
      cash: 'asset',
      bank: 'asset',
      other_means: 'asset',
      
      // Charges
      purchases: 'expense',
      external_services: 'expense',
      taxes: 'expense',
      payroll: 'expense',
      other_expenses: 'expense',
      
      // Produits
      sales: 'revenue',
      other_income: 'revenue',
      subsidies: 'revenue'
    };

    return typeMap[category] || 'asset';
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

  private getAccountName(accountCode: string): string {
    return this.DEFAULT_MOROCCAN_CHART[accountCode as keyof typeof this.DEFAULT_MOROCCAN_CHART]?.name || accountCode;
  }

  private async getOrderData(orderId: string): Promise<any> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  private async generateEntryNumber(storeId: string, date: string): Promise<string> {
    const year = new Date(date).getFullYear();
    const month = String(new Date(date).getMonth() + 1).padStart(2, '0');
    
    const { count, error } = await supabase
      .from('accounting_entries')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('date', `${year}-01-01`)
      .lt('date', `${year + 1}-01-01`);

    if (error) throw error;
    
    const sequence = String((count || 0) + 1).padStart(6, '0');
    return `${year}${month}${sequence}`;
  }

  private async getAccountBalances(accountId: string, periodId: string): Promise<{
    openingBalance: number;
    periodBalance: number;
    closingBalance: number;
  }> {
    // Simplifié - à implémenter avec de vraies requêtes
    return {
      openingBalance: 0,
      periodBalance: 0,
      closingBalance: 0
    };
  }

  private async getVATEntries(storeId: string, startDate: Date, endDate: Date): Promise<JournalEntryLine[]> {
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .like('account_code', '445%');

    if (error) throw error;
    return (data || []).map(this.mapJournalLineFromDB);
  }

  private calculateVATDueDate(): string {
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 20); // 20 du mois suivant
    return dueDate.toISOString();
  }

  private async getPeriod(periodId: string): Promise<any> {
    const { data, error } = await supabase
      .from('financial_periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (error) throw error;
    return data;
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

    if (error) throw error;
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

    if (error) throw error;
    return data;
  }

  // Méthodes simplifiées pour les autres fonctionnalités
  private async generateKPIs(storeId: string, currentPeriod: any, previousPeriod: any): Promise<any[]> {
    return []; // À implémenter
  }

  private async generateDashboardCharts(storeId: string, currentPeriod: any): Promise<any[]> {
    return []; // À implémenter
  }

  private async getFinancialAlerts(storeId: string): Promise<any[]> {
    return []; // À implémenter
  }

  private async getProductProfitability(storeId: string, periodId: string): Promise<any[]> {
    return []; // À implémenter
  }

  private async getCategoryProfitability(storeId: string, periodId: string): Promise<any[]> {
    return []; // À implémenter
  }

  private async getPeriodComparison(storeId: string, periodId: string): Promise<any> {
    return {}; // À implémenter
  }

  private async getProfitabilityTrends(storeId: string, periodId: string): Promise<any[]> {
    return []; // À implémenter
  }

  private async generateCashFlowStatement(storeId: string, periodId: string): Promise<Record<string, any>> {
    return {}; // À implémenter
  }

  // Utilitaires
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getFromCache(key: string): any {
    const cached = this.chartOfAccountsCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.chartOfAccountsCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.chartOfAccountsCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}

// Instance singleton
export const accountingService = AccountingService.getInstance();

// Export pour utilisation dans les hooks
export default accountingService;