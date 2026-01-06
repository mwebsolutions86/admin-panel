/**
 * Gestionnaire des Fournisseurs et Commandes Automatiques
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Fonctionnalités principales :
 * - Catalogue fournisseurs avec informations complètes
 * - Commandes automatiques basées sur les seuils
 * - Historique des commandes avec prix et délais
 * - Évaluation et scoring des fournisseurs
 * - Gestion des contrats et tarifs
 * - Intégration avec le système d'inventaire
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { inventoryService } from './inventory-service';
import { dbOptimizer, QueryUtils } from './database-optimizer';

// Types pour la gestion des fournisseurs
export interface Supplier {
  id: string;
  name: string;
  code: string;
  type: 'manufacturer' | 'distributor' | 'local' | 'import';
  status: 'active' | 'inactive' | 'suspended';
  
  // Informations de contact
  contact: {
    email: string;
    phone: string;
    website?: string;
    primaryContact: string;
    secondaryContact?: string;
  };
  
  // Adresse
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Informations commerciales
  commercial: {
    taxId: string;
    siretNumber?: string;
    paymentTerms: number; // jours
    currency: string;
    creditLimit?: number;
    discountRate?: number;
  };
  
  // Performance et évaluation
  performance: {
    qualityScore: number; // 1-5
    deliveryScore: number; // 1-5
    priceScore: number; // 1-5
    serviceScore: number; // 1-5
    overallScore: number; // calculé automatiquement
    onTimeDeliveryRate: number; // pourcentage
    defectRate: number; // pourcentage
    totalOrders: number;
    totalValue: number;
    lastOrderDate?: string;
  };
  
  // Certification et compliance
  certifications: string[];
  compliance: {
    foodSafety: boolean;
    organic: boolean;
    halal: boolean;
    kosher: boolean;
    fairTrade: boolean;
  };
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SupplierContract {
  id: string;
  supplierId: string;
  storeId: string;
  contractType: 'purchase' | 'service' | 'exclusive' | 'framework';
  status: 'draft' | 'active' | 'expired' | 'terminated';
  
  // Période du contrat
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  renewalPeriod?: number; // mois
  
  // Conditions financières
  paymentTerms: number; // jours
  discountRate?: number;
  minimumOrderValue?: number;
  volumeDiscounts?: VolumeDiscount[];
  
  // Conditions de livraison
  deliveryTerms: string;
  leadTime: number; // jours
  deliveryCost?: number;
  freeDeliveryThreshold?: number;
  
  // Tarifs spécifiques
  pricingTiers?: PricingTier[];
  
  // Pénalités et SLA
  penalties: {
    lateDelivery: number; // pourcentage de pénalité
    qualityIssues: number;
    minimumServiceLevel: number;
  };
  
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
}

export interface VolumeDiscount {
  minQuantity: number;
  maxQuantity?: number;
  discountRate: number;
  fixedPrice?: number;
}

export interface PricingTier {
  productCategory: string;
  minQuantity: number;
  unitPrice: number;
  discountRate?: number;
}

export interface AutomaticReorderRule {
  id: string;
  storeId: string;
  supplierId: string;
  inventoryItemId: string;
  
  // Conditions de déclenchement
  trigger: {
    type: 'threshold' | 'schedule' | 'predictive';
    value: number;
    frequency?: 'daily' | 'weekly' | 'monthly';
    timeOfDay?: string; // HH:MM format
  };
  
  // Quantité à commander
  reorderQuantity: {
    type: 'fixed' | 'percentage' | 'target_stock';
    value: number;
    maxQuantity?: number;
    minQuantity?: number;
  };
  
  // Validation et approbation
  validation: {
    requiresApproval: boolean;
    approverRoles: string[];
    maxAmount?: number;
  };
  
  // État
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOrderItem {
  id: string;
  supplierOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity?: number;
  expectedDelivery?: string;
  actualDelivery?: string;
  quality?: 'excellent' | 'good' | 'acceptable' | 'poor';
  notes?: string;
}

export interface SupplierOrder {
  id: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  
  // Statut et suivi
  status: 'draft' | 'sent' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'returned';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  orderType: 'manual' | 'automatic' | 'emergency';
  
  // Dates importantes
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  confirmedDate?: string;
  
  // Informations financières
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  
  // Items commandés
  items: SupplierOrderItem[];
  
  // Documents
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  deliveryNote?: string;
  
  // Livraison
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    contactName: string;
    contactPhone: string;
  };
  
  // Validation et approbation
  approval: {
    required: boolean;
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
  };
  
  // Métadonnées
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SupplierEvaluation {
  id: string;
  supplierId: string;
  storeId: string;
  evaluatorId: string;
  
  // Période d'évaluation
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Scores détaillés
  scores: {
    quality: number; // 1-5
    delivery: number; // 1-5
    price: number; // 1-5
    service: number; // 1-5
    communication: number; // 1-5
    flexibility: number; // 1-5
  };
  
  // Métriques quantitatives
  metrics: {
    totalOrders: number;
    onTimeDeliveries: number;
    qualityIssues: number;
    priceCompetitiveness: number; // pourcentage vs marché
    responseTime: number; // heures
    problemResolutionTime: number; // heures
  };
  
  // Évaluation globale
  overallScore: number; // calculé automatiquement
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Commentaires et recommandations
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  createdAt: string;
}

export interface SupplierFilters {
  status?: Supplier['status'][];
  type?: Supplier['type'][];
  location?: string;
  performanceMin?: number;
  certificationRequired?: string;
  contractActive?: boolean;
  minOrders?: number;
}

export class SuppliersManager {
  private static instance: SuppliersManager;
  private reorderQueue: AutomaticReorderRule[] = [];
  private evaluationQueue: SupplierEvaluation[] = [];
  
  // Cache pour optimiser les performances
  private suppliersCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private contractsCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    this.initializeReorderProcessing();
    this.startEvaluationMonitoring();
  }

  static getInstance(): SuppliersManager {
    if (!SuppliersManager.instance) {
      SuppliersManager.instance = new SuppliersManager();
    }
    return SuppliersManager.instance;
  }

  /**
   * === GESTION DU CATALOGUE FOURNISSEURS ===
   */

  /**
   * Récupère tous les fournisseurs avec filtres
   */
  async getSuppliers(filters?: SupplierFilters): Promise<Supplier[]> {
    const cacheKey = `suppliers:${this.generateFilterKey(filters)}`;
    
    // Vérifier le cache
    const cached = this.getFromCache(this.suppliersCache, cacheKey);
    if (cached) {
      return cached;
    }

    try {
      performanceMonitor.startTimer('suppliers_query');

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      // Appliquer les filtres
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.type?.length) {
        query = query.in('type', filters.type);
      }
      if (filters?.location) {
        query = query.ilike('address->city', `%${filters.location}%`);
      }
      if (filters?.performanceMin) {
        query = query.gte('performance->overall_score', filters.performanceMin);
      }

      const { data, error } = await query;

      if (error) throw error;

      const suppliers: Supplier[] = (data || []).map(this.mapSupplierFromDB);

      // Mettre en cache
      this.setCache(this.suppliersCache, cacheKey, suppliers, this.CACHE_TTL);
      
      performanceMonitor.endTimer('suppliers_query');
      performanceMonitor.info('Fournisseurs récupérés', { count: suppliers.length });

      return suppliers;

    } catch (error) {
      performanceMonitor.error('Erreur récupération fournisseurs', { filters, error });
      throw new Error('Impossible de récupérer les fournisseurs');
    }
  }

  /**
   * Récupère un fournisseur par ID
   */
  async getSupplier(supplierId: string): Promise<Supplier | null> {
    const cacheKey = `supplier:${supplierId}`;
    const cached = this.getFromCache(this.suppliersCache, cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const supplier = this.mapSupplierFromDB(data);
      this.setCache(this.suppliersCache, cacheKey, supplier, this.CACHE_TTL);
      return supplier;

    } catch (error) {
      performanceMonitor.error('Erreur récupération fournisseur', { supplierId, error });
      throw error;
    }
  }

  /**
   * Crée un nouveau fournisseur
   */
  async createSupplier(supplierData: Omit<Supplier, 'id' | 'performance' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    try {
      performanceMonitor.startTimer('supplier_creation');

      const supplierToInsert = {
        ...supplierData,
        performance: {
          qualityScore: 3,
          deliveryScore: 3,
          priceScore: 3,
          serviceScore: 3,
          overallScore: 3,
          onTimeDeliveryRate: 0,
          defectRate: 0,
          totalOrders: 0,
          totalValue: 0
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierToInsert)
        .select()
        .single();

      if (error) throw error;

      const supplier = this.mapSupplierFromDB(data);
      
      // Invalider le cache
      this.invalidateSuppliersCache();
      
      performanceMonitor.endTimer('supplier_creation');
      performanceMonitor.info('Fournisseur créé', { supplierId: supplier.id, name: supplier.name });

      return supplier;

    } catch (error) {
      performanceMonitor.error('Erreur création fournisseur', { supplierData, error });
      throw new Error('Impossible de créer le fournisseur');
    }
  }

  /**
   * Met à jour un fournisseur
   */
  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<Supplier> {
    try {
      performanceMonitor.startTimer('supplier_update');

      const { data, error } = await supabase
        .from('suppliers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId)
        .select()
        .single();

      if (error) throw error;

      const supplier = this.mapSupplierFromDB(data);
      
      // Invalider les caches
      this.invalidateSuppliersCache();
      this.setCache(this.suppliersCache, `supplier:${supplierId}`, supplier, this.CACHE_TTL);
      
      performanceMonitor.endTimer('supplier_update');
      performanceMonitor.info('Fournisseur mis à jour', { supplierId, name: supplier.name });

      return supplier;

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour fournisseur', { supplierId, updates, error });
      throw new Error('Impossible de mettre à jour le fournisseur');
    }
  }

  /**
   * === GESTION DES CONTRATS ===
   */

  /**
   * Récupère les contrats d'un fournisseur
   */
  async getSupplierContracts(supplierId: string, storeId?: string): Promise<SupplierContract[]> {
    try {
      let query = supabase
        .from('supplier_contracts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('start_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapContractFromDB);

    } catch (error) {
      performanceMonitor.error('Erreur récupération contrats', { supplierId, storeId, error });
      throw error;
    }
  }

  /**
   * Crée un nouveau contrat
   */
  async createContract(contractData: Omit<SupplierContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupplierContract> {
    try {
      const contractToInsert = {
        ...contractData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('supplier_contracts')
        .insert(contractToInsert)
        .select()
        .single();

      if (error) throw error;

      const contract = this.mapContractFromDB(data);
      
      // Invalider le cache des contrats
      this.invalidateContractsCache();
      
      performanceMonitor.info('Contrat créé', { 
        contractId: contract.id, 
        supplierId: contract.supplierId,
        type: contract.contractType 
      });

      return contract;

    } catch (error) {
      performanceMonitor.error('Erreur création contrat', { contractData, error });
      throw new Error('Impossible de créer le contrat');
    }
  }

  /**
   * === GESTION DES COMMANDES FOURNISSEUR ===
   */

  /**
   * Crée une commande fournisseur
   */
  async createSupplierOrder(orderData: Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>): Promise<SupplierOrder> {
    try {
      performanceMonitor.startTimer('supplier_order_creation');

      // Récupérer le nom du fournisseur
      const supplier = await this.getSupplier(orderData.supplierId);
      if (!supplier) {
        throw new Error('Fournisseur non trouvé');
      }

      // Calculer les totaux
      const subtotal = orderData.items.reduce((sum, item) => sum + item.totalCost, 0);
      const discountAmount = orderData.discountAmount || 0;
      const taxAmount = orderData.taxAmount || 0;
      const shippingCost = orderData.shippingCost || 0;
      const totalAmount = subtotal - discountAmount + taxAmount + shippingCost;

      const orderToInsert = {
        ...orderData,
        supplier_name: supplier.name,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('supplier_orders')
        .insert(orderToInsert)
        .select()
        .single();

      if (error) throw error;

      const order = this.mapOrderFromDB(data);
      
      performanceMonitor.endTimer('supplier_order_creation');
      performanceMonitor.info('Commande fournisseur créée', { 
        orderId: order.id, 
        supplierId: order.supplierId,
        totalAmount: order.totalAmount 
      });

      return order;

    } catch (error) {
      performanceMonitor.error('Erreur création commande fournisseur', { orderData, error });
      throw new Error('Impossible de créer la commande fournisseur');
    }
  }

  /**
   * Récupère les commandes d'un fournisseur
   */
  async getSupplierOrders(
    supplierId: string,
    storeId?: string,
    status?: SupplierOrder['status'],
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<SupplierOrder[]> {
    try {
      let query = supabase
        .from('supplier_orders')
        .select(`
          *,
          supplier_order_items (*)
        `)
        .eq('supplier_id', supplierId)
        .order('order_date', { ascending: false })
        .limit(limit);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('order_date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('order_date', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapOrderFromDB);

    } catch (error) {
      performanceMonitor.error('Erreur récupération commandes fournisseur', { 
        supplierId, 
        storeId, 
        status, 
        error 
      });
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une commande
   */
  async updateOrderStatus(
    orderId: string, 
    status: SupplierOrder['status'], 
    notes?: string,
    actualDelivery?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updates.notes = notes;
      }

      if (status === 'delivered' && actualDelivery) {
        updates.actual_delivery = actualDelivery;
      }

      const { error } = await supabase
        .from('supplier_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Si la commande est livrée, mettre à jour la performance du fournisseur
      if (status === 'delivered') {
        await this.updateSupplierPerformance(orderId);
      }

      performanceMonitor.info('Statut commande mis à jour', { orderId, status });

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour statut commande', { orderId, status, error });
      throw error;
    }
  }

  /**
   * === COMMANDES AUTOMATIQUES ===
   */

  /**
   * Configure une règle de réapprovisionnement automatique
   */
  async createAutomaticReorderRule(
    ruleData: Omit<AutomaticReorderRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AutomaticReorderRule> {
    try {
      const ruleToInsert = {
        ...ruleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('automatic_reorder_rules')
        .insert(ruleToInsert)
        .select()
        .single();

      if (error) throw error;

      const rule = this.mapReorderRuleFromDB(data);
      
      performanceMonitor.info('Règle de réapprovisionnement créée', { 
        ruleId: rule.id,
        inventoryItemId: rule.inventoryItemId,
        triggerType: rule.trigger.type
      });

      return rule;

    } catch (error) {
      performanceMonitor.error('Erreur création règle réapprovisionnement', { ruleData, error });
      throw new Error('Impossible de créer la règle de réapprovisionnement');
    }
  }

  /**
   * Traite les règles de réapprovisionnement automatique
   */
  async processAutomaticReorders(): Promise<void> {
    try {
      performanceMonitor.startTimer('automatic_reorder_processing');

      // Récupérer les règles actives
      const { data: rules, error } = await supabase
        .from('automatic_reorder_rules')
        .select(`
          *,
          inventory_items (
            current_stock,
            min_threshold,
            products (name)
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const processedOrders: string[] = [];

      for (const rule of rules || []) {
        try {
          const shouldTrigger = await this.shouldTriggerReorder(rule);
          
          if (shouldTrigger) {
            const orderId = await this.createAutomaticOrder(rule);
            processedOrders.push(orderId);
            
            // Marquer la règle comme déclenchée
            await supabase
              .from('automatic_reorder_rules')
              .update({
                last_triggered: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', rule.id);
          }
        } catch (ruleError) {
          performanceMonitor.error('Erreur traitement règle réapprovisionnement', { 
            ruleId: rule.id, 
            error: ruleError 
          });
        }
      }

      performanceMonitor.endTimer('automatic_reorder_processing');
      performanceMonitor.info('Réapprovisionnement automatique traité', { 
        processedOrders: processedOrders.length 
      });

    } catch (error) {
      performanceMonitor.error('Erreur traitement réapprovisionnement automatique', { error });
      throw error;
    }
  }

  /**
   * === ÉVALUATION DES FOURNISSEURS ===
   */

  /**
   * Crée une évaluation de fournisseur
   */
  async createSupplierEvaluation(
    evaluationData: Omit<SupplierEvaluation, 'id' | 'overallScore' | 'grade' | 'createdAt'>
  ): Promise<SupplierEvaluation> {
    try {
      // Calculer le score global
      const scores = evaluationData.scores;
      const overallScore = (
        scores.quality * 0.3 +
        scores.delivery * 0.25 +
        scores.price * 0.2 +
        scores.service * 0.15 +
        scores.communication * 0.1
      );

      // Déterminer la note
      let grade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (overallScore >= 4.5) grade = 'A';
      else if (overallScore >= 3.5) grade = 'B';
      else if (overallScore >= 2.5) grade = 'C';
      else if (overallScore >= 1.5) grade = 'D';
      else grade = 'F';

      const evaluationToInsert = {
        ...evaluationData,
        overall_score: overallScore,
        grade,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('supplier_evaluations')
        .insert(evaluationToInsert)
        .select()
        .single();

      if (error) throw error;

      const evaluation = this.mapEvaluationFromDB(data);
      
      // Mettre à jour la performance du fournisseur
      await this.updateSupplierOverallPerformance(evaluation.supplierId);
      
      performanceMonitor.info('Évaluation fournisseur créée', { 
        evaluationId: evaluation.id,
        supplierId: evaluation.supplierId,
        grade
      });

      return evaluation;

    } catch (error) {
      performanceMonitor.error('Erreur création évaluation fournisseur', { evaluationData, error });
      throw new Error('Impossible de créer l\'évaluation');
    }
  }

  /**
   * Récupère l'historique des évaluations d'un fournisseur
   */
  async getSupplierEvaluations(supplierId: string): Promise<SupplierEvaluation[]> {
    try {
      const { data, error } = await supabase
        .from('supplier_evaluations')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('period->startDate', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapEvaluationFromDB);

    } catch (error) {
      performanceMonitor.error('Erreur récupération évaluations', { supplierId, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private mapSupplierFromDB(data: any): Supplier {
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      type: data.type,
      status: data.status,
      contact: data.contact,
      address: data.address,
      commercial: data.commercial,
      performance: data.performance,
      certifications: data.certifications || [],
      compliance: data.compliance || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      notes: data.notes
    };
  }

  private mapContractFromDB(data: any): SupplierContract {
    return {
      id: data.id,
      supplierId: data.supplier_id,
      storeId: data.store_id,
      contractType: data.contract_type,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      autoRenewal: data.auto_renewal,
      renewalPeriod: data.renewal_period,
      paymentTerms: data.payment_terms,
      discountRate: data.discount_rate,
      minimumOrderValue: data.minimum_order_value,
      volumeDiscounts: data.volume_discounts || [],
      deliveryTerms: data.delivery_terms,
      leadTime: data.lead_time,
      deliveryCost: data.delivery_cost,
      freeDeliveryThreshold: data.free_delivery_threshold,
      pricingTiers: data.pricing_tiers || [],
      penalties: data.penalties || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      signedAt: data.signed_at
    };
  }

  private mapOrderFromDB(data: any): SupplierOrder {
    return {
      id: data.id,
      storeId: data.store_id,
      supplierId: data.supplier_id,
      supplierName: data.supplier_name,
      status: data.status,
      priority: data.priority,
      orderType: data.order_type,
      orderDate: data.order_date,
      expectedDelivery: data.expected_delivery,
      actualDelivery: data.actual_delivery,
      confirmedDate: data.confirmed_date,
      subtotal: data.subtotal,
      taxAmount: data.tax_amount,
      shippingCost: data.shipping_cost,
      discountAmount: data.discount_amount,
      totalAmount: data.total_amount,
      currency: data.currency,
      items: (data.supplier_order_items || []).map(this.mapOrderItemFromDB),
      purchaseOrderNumber: data.purchase_order_number,
      invoiceNumber: data.invoice_number,
      deliveryNote: data.delivery_note,
      deliveryAddress: data.delivery_address,
      approval: data.approval,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      notes: data.notes
    };
  }

  private mapOrderItemFromDB(data: any): SupplierOrderItem {
    return {
      id: data.id,
      supplierOrderId: data.supplier_order_id,
      productId: data.product_id,
      productName: data.product_name,
      quantity: data.quantity,
      unitCost: data.unit_cost,
      totalCost: data.total_cost,
      receivedQuantity: data.received_quantity,
      expectedDelivery: data.expected_delivery,
      actualDelivery: data.actual_delivery,
      quality: data.quality,
      notes: data.notes
    };
  }

  private mapReorderRuleFromDB(data: any): AutomaticReorderRule {
    return {
      id: data.id,
      storeId: data.store_id,
      supplierId: data.supplier_id,
      inventoryItemId: data.inventory_item_id,
      trigger: data.trigger,
      reorderQuantity: data.reorder_quantity,
      validation: data.validation,
      isActive: data.is_active,
      lastTriggered: data.last_triggered,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapEvaluationFromDB(data: any): SupplierEvaluation {
    return {
      id: data.id,
      supplierId: data.supplier_id,
      storeId: data.store_id,
      evaluatorId: data.evaluator_id,
      period: data.period,
      scores: data.scores,
      metrics: data.metrics,
      overallScore: data.overall_score,
      grade: data.grade,
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      recommendations: data.recommendations || [],
      createdAt: data.created_at
    };
  }

  private initializeReorderProcessing(): void {
    // Traiter les réapprovisionnements automatiques toutes les heures
    setInterval(async () => {
      try {
        await this.processAutomaticReorders();
      } catch (error) {
        performanceMonitor.error('Erreur traitement réapprovisionnement automatique', { error });
      }
    }, 60 * 60 * 1000); // Chaque heure
  }

  private startEvaluationMonitoring(): void {
    // Vérifier les évaluations à faire chaque semaine
    setInterval(async () => {
      try {
        await this.scheduleEvaluations();
      } catch (error) {
        performanceMonitor.error('Erreur planification évaluations', { error });
      }
    }, 7 * 24 * 60 * 60 * 1000); // Chaque semaine
  }

  private async shouldTriggerReorder(rule: any): Promise<boolean> {
    try {
      const inventoryItem = await inventoryService.getInventoryItem(rule.inventory_item_id);
      if (!inventoryItem) return false;

      const currentStock = inventoryItem.currentStock;
      const minThreshold = rule.trigger.value;

      switch (rule.trigger.type) {
        case 'threshold':
          return currentStock <= minThreshold;
        case 'schedule':
          // Vérifier si c'est le bon moment
          const now = new Date();
          const timeOfDay = rule.trigger.timeOfDay || '09:00';
          const [hours, minutes] = timeOfDay.split(':').map(Number);
          const targetTime = new Date(now);
          targetTime.setHours(hours, minutes, 0, 0);
          
          // Si on est dans la fenêtre de temps et que la règle n'a pas été déclenchée aujourd'hui
          const today = new Date().toDateString();
          const lastTriggered = rule.last_triggered ? new Date(rule.last_triggered).toDateString() : null;

          return now >= targetTime && today !== lastTriggered;
        default:
          return false;
      }
    } catch (error) {
      performanceMonitor.error('Erreur vérification déclenchement règle', { ruleId: rule.id, error });
      return false;
    }
  }

  private async createAutomaticOrder(rule: any): Promise<string> {
    try {
      const inventoryItem = await inventoryService.getInventoryItem(rule.inventory_item_id);
      if (!inventoryItem) {
        throw new Error('Article d\'inventaire non trouvé');
      }

      // Calculer la quantité à commander
      let quantity = 0;
      switch (rule.reorderQuantity.type) {
        case 'fixed':
          quantity = rule.reorderQuantity.value;
          break;
        case 'percentage':
          quantity = Math.ceil(inventoryItem.currentStock * (rule.reorderQuantity.value / 100));
          break;
        case 'target_stock':
          const targetStock = rule.reorderQuantity.value;
          quantity = Math.max(0, targetStock - inventoryItem.currentStock);
          break;
      }

      // Appliquer les limites
      if (rule.reorderQuantity.minQuantity) {
        quantity = Math.max(quantity, rule.reorderQuantity.minQuantity);
      }
      if (rule.reorderQuantity.maxQuantity) {
        quantity = Math.min(quantity, rule.reorderQuantity.maxQuantity);
      }

      if (quantity <= 0) {
        throw new Error('Quantité à commander invalide');
      }

      // Créer la commande
      const order: Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'> = {
        storeId: rule.store_id,
        supplierId: rule.supplier_id,
        status: 'draft',
        priority: 'normal',
        orderType: 'automatic',
        orderDate: new Date().toISOString(),
        subtotal: 0,
        taxAmount: 0,
        shippingCost: 0,
        discountAmount: 0,
        totalAmount: 0,
        currency: 'EUR',
        items: [{
          id: '',
          supplierOrderId: '',
          productId: inventoryItem.productId,
          productName: `Article ${inventoryItem.productId}`,
          quantity,
          unitCost: inventoryItem.cost,
          totalCost: quantity * inventoryItem.cost
        }],
        deliveryAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'France',
          contactName: '',
          contactPhone: ''
        },
        approval: {
          required: rule.validation.requiresApproval,
          approvedBy: undefined,
          approvedAt: undefined,
          rejectionReason: undefined
        },
        createdBy: 'system',
        notes: `Commande automatique générée par règle ${rule.id}`
      };

      const createdOrder = await this.createSupplierOrder(order);
      return createdOrder.id;

    } catch (error) {
      performanceMonitor.error('Erreur création commande automatique', { ruleId: rule.id, error });
      throw error;
    }
  }

  private async updateSupplierPerformance(orderId: string): Promise<void> {
    try {
      // Implémenter la mise à jour de la performance du fournisseur
      // basée sur la livraison de cette commande
      performanceMonitor.info('Performance fournisseur mise à jour', { orderId });
    } catch (error) {
      performanceMonitor.error('Erreur mise à jour performance', { orderId, error });
    }
  }

  private async updateSupplierOverallPerformance(supplierId: string): Promise<void> {
    try {
      // Récupérer les dernières évaluations
      const evaluations = await this.getSupplierEvaluations(supplierId);
      
      if (evaluations.length === 0) return;

      const latestEvaluation = evaluations[0];
      
      // Mettre à jour les scores de performance
      const { error } = await supabase
        .from('suppliers')
        .update({
          performance: {
            ...latestEvaluation.scores,
            overallScore: latestEvaluation.overallScore
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (error) throw error;

      // Invalider le cache
      this.invalidateSuppliersCache();

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour performance globale', { supplierId, error });
    }
  }

  private async scheduleEvaluations(): Promise<void> {
    // Implémenter la planification automatique des évaluations
    performanceMonitor.info('Évaluations planifiées');
  }

  private getFromCache(cache: Map<string, any>, key: string): any {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  private setCache(cache: Map<string, any>, key: string, data: any, ttl: number): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateSuppliersCache(): void {
    this.suppliersCache.clear();
  }

  private invalidateContractsCache(): void {
    this.contractsCache.clear();
  }

  private generateFilterKey(filters?: SupplierFilters): string {
    if (!filters) return 'default';
    
    const parts: string[] = [];
    if (filters.status?.length) parts.push(`status:${filters.status.join(',')}`);
    if (filters.type?.length) parts.push(`type:${filters.type.join(',')}`);
    if (filters.location) parts.push(`location:${filters.location}`);
    if (filters.performanceMin) parts.push(`perf:${filters.performanceMin}`);
    if (filters.contractActive) parts.push('contract:true');
    
    return parts.join('_') || 'default';
  }
}

// Instance singleton
export const suppliersManager = SuppliersManager.getInstance();

// Export pour utilisation dans les hooks
export default suppliersManager;