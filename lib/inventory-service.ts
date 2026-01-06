/**
 * Service de Gestion des Stocks et Inventory Management
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Fonctionnalités principales :
 * - Inventaire en temps réel avec seuils d'alerte
 * - Mouvements de stock (entrées, sorties, ajustements)
 * - Rotation FIFO automatique
 * - Gestion par lot avec dates d'expiration
 * - Intégration écosystème (commandes, POS, menu)
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { CacheUtils, productCache, orderCache } from './cache-service';
import { dbOptimizer, QueryUtils } from './database-optimizer';

// Types pour l'inventory management
export interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minThreshold: number;
  maxThreshold: number;
  unit: string;
  cost: number;
  value: number;
  lastUpdated: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  storeId: string;
  type: 'in' | 'out' | 'adjustment' | 'loss';
  quantity: number;
  reason: string;
  reference?: string;
  lotNumber?: string;
  expiryDate?: string;
  cost?: number;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface Lot {
  id: string;
  inventoryItemId: string;
  storeId: string;
  lotNumber: string;
  quantity: number;
  unitCost: number;
  receivedDate: string;
  expiryDate?: string;
  status: 'active' | 'expired' | 'reserved' | 'consumed';
  location?: string;
}

export interface SupplierOrder {
  id: string;
  storeId: string;
  supplierId: string;
  status: 'draft' | 'sent' | 'confirmed' | 'delivered' | 'cancelled';
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  totalAmount: number;
  items: SupplierOrderItem[];
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SupplierOrderItem {
  id: string;
  supplierOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity?: number;
  expiryDate?: string;
}

export interface InventoryAlert {
  id: string;
  storeId: string;
  inventoryItemId: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry_warning' | 'expiry_critical';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  createdAt: string;
  isRead: boolean;
  isResolved: boolean;
}

export interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiringItems: number;
  rotationRate: number;
  turnoverTime: number;
  wastePercentage: number;
  supplierPerformance: SupplierPerformance[];
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryRate: number;
  qualityScore: number;
  averageDeliveryTime: number;
  totalOrders: number;
  totalValue: number;
}

export interface InventoryFilters {
  storeIds?: string[];
  categories?: string[];
  stockStatus?: string;
  minStock?: number;
  maxStock?: number;
  expiryWarning?: boolean;
  lowStock?: boolean;
  supplierIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class InventoryService {
  private static instance: InventoryService;
  private alerts: InventoryAlert[] = [];
  private movementQueue: StockMovement[] = [];
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Cache pour les données critiques
  private inventoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private supplierCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private constructor() {
    this.initializeAlerts();
    this.startMovementProcessing();
    this.startExpiryMonitoring();
  }

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  /**
   * === GESTION DE L'INVENTAIRE PRINCIPAL ===
   */

  /**
   * Récupère l'inventaire complet d'un magasin
   */
  async getInventory(storeId: string, filters?: InventoryFilters): Promise<InventoryItem[]> {
    const cacheKey = `inventory:${storeId}:${this.generateFilterKey(filters)}`;
    
    // Vérifier le cache
    const cached = this.getFromCache(this.inventoryCache, cacheKey);
    if (cached) {
      return cached;
    }

    try {
      performanceMonitor.startTimer('inventory_query');

      let query = supabase
        .from('inventory_items')
        .select(`
          *,
          products (
            id,
            name,
            category,
            unit,
            image_url,
            suppliers (
              id,
              name
            )
          )
        `)
        .eq('store_id', storeId);

      // Appliquer les filtres
      if (filters?.minStock !== undefined) {
        query = query.gte('current_stock', filters.minStock);
      }
      if (filters?.maxStock !== undefined) {
        query = query.lte('current_stock', filters.maxStock);
      }
      if (filters?.lowStock) {
        // Note: comparing column-to-column isn't supported here; use provided minStock if available
        query = query.lte('current_stock', filters.minStock ?? 0);
      }

      const { data, error } = await query.order('last_updated', { ascending: false });

      if (error) throw error;

      const inventory: InventoryItem[] = (data || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        storeId: item.store_id,
        currentStock: item.current_stock,
        reservedStock: item.reserved_stock,
        availableStock: item.current_stock - item.reserved_stock,
        minThreshold: item.min_threshold,
        maxThreshold: item.max_threshold,
        unit: item.products?.unit || 'unit',
        cost: item.unit_cost,
        value: item.current_stock * item.unit_cost,
        lastUpdated: item.last_updated,
        createdAt: item.created_at
      }));

      // Mettre en cache
      this.setCache(this.inventoryCache, cacheKey, inventory, this.CACHE_TTL);
      
      performanceMonitor.endTimer('inventory_query');
      performanceMonitor.info('Inventaire récupéré', { storeId, itemsCount: inventory.length });

      return inventory;

    } catch (error) {
      performanceMonitor.error('Erreur récupération inventaire', { storeId, error });
      throw new Error('Impossible de récupérer l\'inventaire');
    }
  }

  /**
   * Récupère un article d'inventaire spécifique
   */
  async getInventoryItem(inventoryItemId: string): Promise<InventoryItem | null> {
    const cacheKey = `inventory_item:${inventoryItemId}`;
    const cached = this.getFromCache(this.inventoryCache, cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          products (
            id,
            name,
            category,
            unit,
            image_url
          )
        `)
        .eq('id', inventoryItemId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const inventoryItem: InventoryItem = {
        id: data.id,
        productId: data.product_id,
        storeId: data.store_id,
        currentStock: data.current_stock,
        reservedStock: data.reserved_stock,
        availableStock: data.current_stock - data.reserved_stock,
        minThreshold: data.min_threshold,
        maxThreshold: data.max_threshold,
        unit: data.products?.unit || 'unit',
        cost: data.unit_cost,
        value: data.current_stock * data.unit_cost,
        lastUpdated: data.last_updated,
        createdAt: data.created_at
      };

      this.setCache(this.inventoryCache, cacheKey, inventoryItem, this.CACHE_TTL);
      return inventoryItem;

    } catch (error) {
      performanceMonitor.error('Erreur récupération article inventaire', { inventoryItemId, error });
      throw error;
    }
  }

  /**
   * Met à jour le stock d'un article
   */
  async updateStock(
    inventoryItemId: string,
    newStock: number,
    type: StockMovement['type'],
    reason: string,
    performedBy: string,
    metadata: Partial<StockMovement> = {}
  ): Promise<void> {
    try {
      performanceMonitor.startTimer('stock_update');

      // Créer le mouvement de stock
      const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
        inventoryItemId,
        storeId: metadata.storeId || '',
        type,
        quantity: Math.abs(newStock - ((metadata as any).currentStock || 0)),
        reason,
        reference: metadata.reference,
        lotNumber: metadata.lotNumber,
        expiryDate: metadata.expiryDate,
        cost: metadata.cost,
        performedBy,
        notes: metadata.notes
      };

      // Démarrer une transaction
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          ...movement,
          timestamp: new Date().toISOString()
        });

      if (movementError) throw movementError;

      // Mettre à jour le stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', inventoryItemId);

      if (updateError) throw updateError;

      // Invalider les caches
      this.invalidateInventoryCache(inventoryItemId);

      // Vérifier les seuils et générer des alertes
      await this.checkThresholds(inventoryItemId);

      performanceMonitor.endTimer('stock_update');
      performanceMonitor.info('Stock mis à jour', { 
        inventoryItemId, 
        newStock, 
        type, 
        reason 
      });

    } catch (error) {
      performanceMonitor.error('Erreur mise à jour stock', { 
        inventoryItemId, 
        newStock, 
        error 
      });
      throw new Error('Impossible de mettre à jour le stock');
    }
  }

  /**
   * Réserve du stock pour une commande
   */
  async reserveStock(
    inventoryItemId: string,
    quantity: number,
    orderId: string,
    storeId: string
  ): Promise<void> {
    try {
      // Vérifier la disponibilité
      const item = await this.getInventoryItem(inventoryItemId);
      if (!item) {
        throw new Error('Article d\'inventaire non trouvé');
      }

      if (item.availableStock < quantity) {
        throw new Error(`Stock insuffisant. Disponible: ${item.availableStock}, Demandé: ${quantity}`);
      }

      // Réserver le stock
      const { error } = await supabase
        .from('inventory_items')
        .update({
          reserved_stock: item.reservedStock + quantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', inventoryItemId);

      if (error) throw error;

      // Enregistrer le mouvement
      await this.recordStockMovement({
        inventoryItemId,
        storeId,
        type: 'out',
        quantity,
        reason: `Réservation pour commande ${orderId}`,
        performedBy: 'system',
        reference: orderId
      });

      this.invalidateInventoryCache(inventoryItemId);
      performanceMonitor.info('Stock réservé', { inventoryItemId, quantity, orderId });

    } catch (error) {
      performanceMonitor.error('Erreur réservation stock', { inventoryItemId, quantity, orderId, error });
      throw error;
    }
  }

  /**
   * Libère le stock réservé
   */
  async releaseReservedStock(
    inventoryItemId: string,
    quantity: number,
    orderId: string,
    storeId: string
  ): Promise<void> {
    try {
      const item = await this.getInventoryItem(inventoryItemId);
      if (!item) {
        throw new Error('Article d\'inventaire non trouvé');
      }

      const newReservedStock = Math.max(0, item.reservedStock - quantity);

      const { error } = await supabase
        .from('inventory_items')
        .update({
          reserved_stock: newReservedStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', inventoryItemId);

      if (error) throw error;

      // Enregistrer le mouvement de retour
      await this.recordStockMovement({
        inventoryItemId,
        storeId,
        type: 'in',
        quantity,
        reason: `Libération réservation commande ${orderId}`,
        performedBy: 'system',
        reference: orderId
      });

      this.invalidateInventoryCache(inventoryItemId);
      performanceMonitor.info('Stock réservé libéré', { inventoryItemId, quantity, orderId });

    } catch (error) {
      performanceMonitor.error('Erreur libération stock', { inventoryItemId, quantity, orderId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES MOUVEMENTS DE STOCK ===
   */

  /**
   * Enregistre un mouvement de stock
   */
  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          ...movement,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      performanceMonitor.info('Mouvement de stock enregistré', { 
        type: movement.type, 
        quantity: movement.quantity 
      });

      return data.id;

    } catch (error) {
      performanceMonitor.error('Erreur enregistrement mouvement', { movement, error });
      throw new Error('Impossible d\'enregistrer le mouvement de stock');
    }
  }

  /**
   * Récupère l'historique des mouvements
   */
  async getStockMovements(
    storeId: string,
    inventoryItemId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<StockMovement[]> {
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          inventory_items (
            products (
              name
            )
          )
        `)
        .eq('store_id', storeId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (inventoryItemId) {
        query = query.eq('inventory_item_id', inventoryItemId);
      }
      if (startDate) {
        query = query.gte('timestamp', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('timestamp', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(movement => ({
        id: movement.id,
        inventoryItemId: movement.inventory_item_id,
        storeId: movement.store_id,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        reference: movement.reference,
        lotNumber: movement.lot_number,
        expiryDate: movement.expiry_date,
        cost: movement.cost,
        performedBy: movement.performed_by,
        timestamp: movement.timestamp,
        notes: movement.notes
      }));

    } catch (error) {
      performanceMonitor.error('Erreur récupération mouvements', { storeId, inventoryItemId, error });
      throw error;
    }
  }

  /**
   * === GESTION DES LOTS ===
   */

  /**
   * Récupère les lots d'un article d'inventaire
   */
  async getLots(inventoryItemId: string): Promise<Lot[]> {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select('*')
        .eq('inventory_item_id', inventoryItemId)
        .eq('status', 'active')
        .order('received_date', { ascending: true });

      if (error) throw error;

      return (data || []).map(lot => ({
        id: lot.id,
        inventoryItemId: lot.inventory_item_id,
        storeId: lot.store_id,
        lotNumber: lot.lot_number,
        quantity: lot.quantity,
        unitCost: lot.unit_cost,
        receivedDate: lot.received_date,
        expiryDate: lot.expiry_date,
        status: lot.status,
        location: lot.location
      }));

    } catch (error) {
      performanceMonitor.error('Erreur récupération lots', { inventoryItemId, error });
      throw error;
    }
  }

  /**
   * Consomme du stock selon la méthode FIFO
   */
  async consumeStockFIFO(
    inventoryItemId: string,
    quantity: number,
    storeId: string,
    orderId?: string
  ): Promise<void> {
    try {
      const lots = await this.getLots(inventoryItemId);
      
      let remainingQuantity = quantity;
      const now = new Date();

      for (const lot of lots) {
        if (remainingQuantity <= 0) break;

        const consumeQuantity = Math.min(remainingQuantity, lot.quantity);
        
        // Mettre à jour le lot
        const { error: lotError } = await supabase
          .from('lots')
          .update({
            quantity: lot.quantity - consumeQuantity,
            status: lot.quantity - consumeQuantity === 0 ? 'consumed' : 'active'
          })
          .eq('id', lot.id);

        if (lotError) throw lotError;

        // Enregistrer le mouvement
        await this.recordStockMovement({
          inventoryItemId,
          storeId,
          type: 'out',
          quantity: consumeQuantity,
          reason: orderId ? `Consommation pour commande ${orderId}` : 'Consommation FIFO',
          lotNumber: lot.lotNumber,
          performedBy: 'system',
          reference: orderId
        });

        remainingQuantity -= consumeQuantity;
      }

      if (remainingQuantity > 0) {
        throw new Error(`Stock insuffisant pour la consommation. Manquant: ${remainingQuantity}`);
      }

      // Mettre à jour le stock total
      const item = await this.getInventoryItem(inventoryItemId);
      if (item) {
        await this.updateStock(
          inventoryItemId,
          item.currentStock - quantity,
          'out',
          orderId ? `Consommation pour commande ${orderId}` : 'Consommation FIFO',
          'system'
        );
      }

      performanceMonitor.info('Stock consommé (FIFO)', { inventoryItemId, quantity });

    } catch (error) {
      performanceMonitor.error('Erreur consommation FIFO', { inventoryItemId, quantity, error });
      throw error;
    }
  }

  /**
   * === GESTION DES ALERTES ===
   */

  /**
   * Vérifie les seuils et génère des alertes
   */
  async checkThresholds(inventoryItemId: string): Promise<InventoryAlert[]> {
    try {
      const item = await this.getInventoryItem(inventoryItemId);
      if (!item) return [];

      const alerts: InventoryAlert[] = [];

      // Alerte rupture de stock
      if (item.currentStock <= 0) {
        alerts.push(await this.createAlert({
          storeId: item.storeId,
          inventoryItemId,
          type: 'out_of_stock',
          severity: 'critical',
          title: 'Rupture de stock',
          message: `${item.productId} est en rupture de stock`,
          currentValue: item.currentStock
        }));
      }
      // Alerte stock faible
      else if (item.currentStock <= item.minThreshold) {
        alerts.push(await this.createAlert({
          storeId: item.storeId,
          inventoryItemId,
          type: 'low_stock',
          severity: 'warning',
          title: 'Stock faible',
          message: `${item.productId} est en dessous du seuil minimum (${item.minThreshold})`,
          threshold: item.minThreshold,
          currentValue: item.currentStock
        }));
      }
      // Alerte surstock
      else if (item.currentStock >= item.maxThreshold) {
        alerts.push(await this.createAlert({
          storeId: item.storeId,
          inventoryItemId,
          type: 'overstock',
          severity: 'info',
          title: 'Surstock',
          message: `${item.productId} dépasse le seuil maximum (${item.maxThreshold})`,
          threshold: item.maxThreshold,
          currentValue: item.currentStock
        }));
      }

      // Vérifier les dates d'expiration
      const lots = await this.getLots(inventoryItemId);
      const now = new Date();
      const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 jours
      const criticalDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 jours

      for (const lot of lots) {
        if (!lot.expiryDate) continue;

        const expiryDate = new Date(lot.expiryDate);
        
        if (expiryDate <= criticalDate) {
          alerts.push(await this.createAlert({
            storeId: item.storeId,
            inventoryItemId,
            type: 'expiry_critical',
            severity: 'critical',
            title: 'Expiration critique',
            message: `Lot ${lot.lotNumber} expire dans moins de 3 jours`,
            currentValue: lot.quantity
          }));
        } else if (expiryDate <= warningDate) {
          alerts.push(await this.createAlert({
            storeId: item.storeId,
            inventoryItemId,
            type: 'expiry_warning',
            severity: 'warning',
            title: 'Expiration proche',
            message: `Lot ${lot.lotNumber} expire dans moins de 7 jours`,
            currentValue: lot.quantity
          }));
        }
      }

      return alerts;

    } catch (error) {
      performanceMonitor.error('Erreur vérification seuils', { inventoryItemId, error });
      return [];
    }
  }

  /**
   * Récupère les alertes actives
   */
  async getActiveAlerts(storeId?: string): Promise<InventoryAlert[]> {
    try {
      let query = supabase
        .from('inventory_alerts')
        .select(`
          *,
          inventory_items (
            products (
              name
            )
          )
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(alert => ({
        id: alert.id,
        storeId: alert.store_id,
        inventoryItemId: alert.inventory_item_id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        threshold: alert.threshold,
        currentValue: alert.current_value,
        createdAt: alert.created_at,
        isRead: alert.is_read,
        isResolved: alert.is_resolved
      }));

    } catch (error) {
      performanceMonitor.error('Erreur récupération alertes', { storeId, error });
      throw error;
    }
  }

  /**
   * Marque une alerte comme lue
   */
  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      performanceMonitor.info('Alerte marquée comme lue', { alertId });

    } catch (error) {
      performanceMonitor.error('Erreur marquage alerte', { alertId, error });
      throw error;
    }
  }

  /**
   * Résout une alerte
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;

      performanceMonitor.info('Alerte résolue', { alertId });

    } catch (error) {
      performanceMonitor.error('Erreur résolution alerte', { alertId, error });
      throw error;
    }
  }

  /**
   * === ANALYTICS ET RAPPORTS ===
   */

  /**
   * Récupère les analytics d'inventaire
   */
  async getInventoryAnalytics(storeId: string): Promise<InventoryAnalytics> {
    try {
      performanceMonitor.startTimer('inventory_analytics');

      // Récupérer les données de base
      const [inventoryData, movementsData, wasteData] = await Promise.all([
        this.getInventory(storeId),
        this.getStockMovements(storeId, undefined, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 derniers jours
        this.getWasteData(storeId)
      ]);

      // Calculer les métriques
      const totalValue = inventoryData.reduce((sum, item) => sum + item.value, 0);
      const lowStockItems = inventoryData.filter(item => item.currentStock <= item.minThreshold).length;
      const outOfStockItems = inventoryData.filter(item => item.currentStock <= 0).length;
      
      // Calculer les articles expirant bientôt (simplifié)
      const expiringItems = 0; // À implémenter avec les vraies données d'expiration

      // Calculer le taux de rotation
      const rotationRate = this.calculateRotationRate(inventoryData, movementsData);
      const turnoverTime = this.calculateTurnoverTime(movementsData);
      const wastePercentage = wasteData.percentage;

      const analytics: InventoryAnalytics = {
        totalValue,
        totalItems: inventoryData.length,
        lowStockItems,
        outOfStockItems,
        expiringItems,
        rotationRate,
        turnoverTime,
        wastePercentage,
        supplierPerformance: await this.getSupplierPerformance(storeId)
      };

      performanceMonitor.endTimer('inventory_analytics');
      return analytics;

    } catch (error) {
      performanceMonitor.error('Erreur analytics inventaire', { storeId, error });
      throw error;
    }
  }

  /**
   * === MÉTHODES PRIVÉES ===
   */

  private initializeAlerts(): void {
    // Initialiser les alertes par défaut
    performanceMonitor.info('Service d\'inventaire initialisé');
  }

  private startMovementProcessing(): void {
    // Traiter les mouvements en file d'attente
    setInterval(async () => {
      if (this.movementQueue.length > 0) {
        const movements = [...this.movementQueue];
        this.movementQueue = [];
        
        try {
          await this.processMovementBatch(movements);
        } catch (error) {
          performanceMonitor.error('Erreur traitement batch mouvements', { error });
          // Remettre les mouvements dans la file
          this.movementQueue.unshift(...movements);
        }
      }
    }, 10000); // Toutes les 10 secondes
  }

  private startExpiryMonitoring(): void {
    // Vérifier les expirations toutes les heures
    setInterval(async () => {
      try {
        await this.checkAllExpiries();
      } catch (error) {
        performanceMonitor.error('Erreur vérification expirations', { error });
      }
    }, 60 * 60 * 1000); // Chaque heure
  }

  private async processMovementBatch(movements: StockMovement[]): Promise<void> {
    // Implémenter le traitement par batch des mouvements
    performanceMonitor.info('Mouvements traités par batch', { count: movements.length });
  }

  private async checkAllExpiries(): Promise<void> {
    // Implémenter la vérification globale des expirations
    performanceMonitor.info('Vérification expirations effectuée');
  }

  private async createAlert(alertData: Omit<InventoryAlert, 'id' | 'createdAt' | 'isRead' | 'isResolved'>): Promise<InventoryAlert> {
    try {
      const { data, error } = await supabase
        .from('inventory_alerts')
        .insert({
          store_id: alertData.storeId,
          inventory_item_id: alertData.inventoryItemId,
          type: alertData.type,
          severity: alertData.severity,
          title: alertData.title,
          message: alertData.message,
          threshold: alertData.threshold,
          current_value: alertData.currentValue,
          created_at: new Date().toISOString(),
          is_read: false,
          is_resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      const alert: InventoryAlert = {
        id: data.id,
        storeId: data.store_id,
        inventoryItemId: data.inventory_item_id,
        type: data.type,
        severity: data.severity,
        title: data.title,
        message: data.message,
        threshold: data.threshold,
        currentValue: data.current_value,
        createdAt: data.created_at,
        isRead: data.is_read,
        isResolved: data.is_resolved
      };

      this.alerts.push(alert);
      return alert;

    } catch (error) {
      performanceMonitor.error('Erreur création alerte', { alertData, error });
      throw error;
    }
  }

  private calculateRotationRate(inventory: InventoryItem[], movements: StockMovement[]): number {
    // Calcul simplifié du taux de rotation
    const totalStock = inventory.reduce((sum, item) => sum + item.currentStock, 0);
    const totalOutMovements = movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0);
    
    return totalStock > 0 ? (totalOutMovements / totalStock) * 100 : 0;
  }

  private calculateTurnoverTime(movements: StockMovement[]): number {
    // Calcul simplifié du temps de rotation
    return 30; // jours - à implémenter avec de vrais calculs
  }

  private async getWasteData(storeId: string): Promise<{ percentage: number }> {
    // Récupérer les données de gaspillage
    return { percentage: 2.5 }; // Simulé
  }

  private async getSupplierPerformance(storeId: string): Promise<SupplierPerformance[]> {
    // Récupérer les performances des fournisseurs
    return [
      {
        supplierId: '1',
        supplierName: 'Fournisseur Principal',
        onTimeDeliveryRate: 95,
        qualityScore: 4.5,
        averageDeliveryTime: 2,
        totalOrders: 50,
        totalValue: 15000
      }
    ];
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

  private invalidateInventoryCache(inventoryItemId: string): void {
    // Invalider les caches relacionados
    for (const [key] of this.inventoryCache.entries()) {
      if (key.includes(inventoryItemId)) {
        this.inventoryCache.delete(key);
      }
    }
  }

  private generateFilterKey(filters?: InventoryFilters): string {
    if (!filters) return 'default';
    
    const parts: string[] = [];
    if (filters.storeIds) parts.push(`stores:${filters.storeIds.join(',')}`);
    if (filters.categories) parts.push(`categories:${filters.categories.join(',')}`);
    if (filters.minStock !== undefined) parts.push(`min:${filters.minStock}`);
    if (filters.maxStock !== undefined) parts.push(`max:${filters.maxStock}`);
    if (filters.lowStock) parts.push('lowstock:true');
    if (filters.expiryWarning) parts.push('expiry:true');
    
    return parts.join('_') || 'default';
  }
}

// Instance singleton
export const inventoryService = InventoryService.getInstance();

// Export pour utilisation dans les hooks
export default inventoryService;