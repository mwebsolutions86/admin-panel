/**
 * Hook React pour la Gestion d'Inventaire
 * Universal Eats - Module Inventory Management Phase 3
 * 
 * Hook principal pour toutes les opérations d'inventaire :
 * - Gestion de l'inventaire en temps réel
 * - Mouvements de stock
 * - Alertes et notifications
 * - Intégration fournisseurs
 * - Analytics et rapports
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  inventoryService, 
  InventoryItem, 
  StockMovement, 
  InventoryAlert,
  InventoryAnalytics,
  InventoryFilters 
} from '../lib/inventory-service';

import { 
  suppliersManager, 
  Supplier, 
  SupplierOrder,
  SupplierFilters,
  AutomaticReorderRule 
} from '../lib/suppliers-manager';

import { useNotifications } from './use-notifications';
import { useAnalytics } from './use-analytics';

// Types pour les hooks
export interface UseInventoryOptions {
  storeId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealtime?: boolean;
}

export interface UseInventoryReturn {
  // État principal
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  filters: InventoryFilters;
  
  // Actions principales
  refreshInventory: () => Promise<void>;
  updateFilters: (newFilters: Partial<InventoryFilters>) => void;
  getInventoryItem: (id: string) => InventoryItem | undefined;
  
  // Gestion des stocks
  updateStock: (itemId: string, newStock: number, type: StockMovement['type'], reason: string) => Promise<void>;
  reserveStock: (itemId: string, quantity: number, orderId: string) => Promise<void>;
  releaseReservedStock: (itemId: string, quantity: number, orderId: string) => Promise<void>;
  consumeStockFIFO: (itemId: string, quantity: number, orderId?: string) => Promise<void>;
  
  // Mouvements de stock
  getStockMovements: (itemId?: string, startDate?: Date, endDate?: Date) => Promise<StockMovement[]>;
  
  // Alertes
  alerts: InventoryAlert[];
  activeAlerts: InventoryAlert[];
  markAlertAsRead: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  
  // Analytics
  analytics: InventoryAnalytics | null;
  getAnalytics: () => Promise<void>;
  
  // Utilitaires
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
  totalInventoryValue: number;
  getItemAvailability: (itemId: string) => number;
}

export interface UseSuppliersOptions {
  storeId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSuppliersReturn {
  // État principal
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  filters: SupplierFilters;
  
  // Actions principales
  refreshSuppliers: () => Promise<void>;
  updateFilters: (newFilters: Partial<SupplierFilters>) => void;
  getSupplier: (id: string) => Supplier | undefined;
  
  // Gestion des fournisseurs
  createSupplier: (supplierData: Omit<Supplier, 'id' | 'performance' | 'createdAt' | 'updatedAt'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  
  // Commandes fournisseur
  createSupplierOrder: (orderData: Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>) => Promise<SupplierOrder>;
  getSupplierOrders: (supplierId: string, status?: SupplierOrder['status']) => Promise<SupplierOrder[]>;
  updateOrderStatus: (orderId: string, status: SupplierOrder['status'], notes?: string) => Promise<void>;
  
  // Réapprovisionnement automatique
  createReorderRule: (ruleData: Omit<AutomaticReorderRule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AutomaticReorderRule>;
  processAutomaticReorders: () => Promise<void>;
  
  // Évaluations
  getSupplierEvaluations: (supplierId: string) => Promise<any[]>;
  createSupplierEvaluation: (evaluationData: any) => Promise<any>;
}

export interface UseInventoryAlertsOptions {
  storeId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

export interface UseInventoryAlertsReturn {
  // État principal
  alerts: InventoryAlert[];
  loading: boolean;
  error: string | null;
  
  // Alertes par catégorie
  criticalAlerts: InventoryAlert[];
  warningAlerts: InventoryAlert[];
  infoAlerts: InventoryAlert[];
  unreadAlerts: InventoryAlert[];
  
  // Actions
  refreshAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  resolve: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissAll: () => Promise<void>;
  
  // Statistiques
  totalAlerts: number;
  unreadCount: number;
  criticalCount: number;
  hasNewAlerts: boolean;
}

// Hook principal pour la gestion d'inventaire
export function useInventory(options: UseInventoryOptions): UseInventoryReturn {
  const { 
    storeId, 
    autoRefresh = true, 
    refreshInterval = 30000, // 30 secondes
    enableRealtime = true 
  } = options;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);

  const { sendNotification } = useNotifications();
  const { trackEvent } = useAnalytics();

  // Récupération de l'inventaire
  const refreshInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await inventoryService.getInventory(storeId, filters);
      setInventory(data);

      // Récupérer les alertes
      const alertData = await inventoryService.getActiveAlerts(storeId);
      setAlerts(alertData);

      trackEvent('inventory_refreshed', {
        storeId,
        itemsCount: data.length,
        alertsCount: alertData.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      trackEvent('inventory_error', {
        storeId,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, filters, trackEvent]);

  // Initialisation et auto-refresh
  useEffect(() => {
    refreshInventory();

    if (autoRefresh) {
      const interval = setInterval(refreshInventory, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInventory, autoRefresh, refreshInterval]);

  // Mise à jour des filtres
  const updateFilters = useCallback((newFilters: Partial<InventoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    trackEvent('inventory_filters_updated', {
      storeId,
      newFilters
    });
  }, [storeId, trackEvent]);

  // Récupération d'un article spécifique
  const getInventoryItem = useCallback((id: string) => {
    return inventory.find(item => item.id === id);
  }, [inventory]);

  // Mise à jour du stock
  const updateStock = useCallback(async (
    itemId: string, 
    newStock: number, 
    type: StockMovement['type'], 
    reason: string
  ) => {
    try {
      const item = getInventoryItem(itemId);
      if (!item) {
        throw new Error('Article d\'inventaire non trouvé');
      }

      await inventoryService.updateStock(
        itemId, 
        newStock, 
        type, 
        reason, 
        'current_user', // TODO: Récupérer l'utilisateur actuel
        {
          storeId,
          currentStock: item.currentStock
        }
      );

      // Envoyer une notification si nécessaire
      if (type === 'out' && newStock <= item.minThreshold) {
        await sendNotification({
          title: 'Stock faible',
          body: `${item.productId} est en dessous du seuil minimum`,
          type: 'warning'
        });
      }

      trackEvent('stock_updated', {
        itemId,
        newStock,
        type,
        reason
      });

      // Rafraîchir les données
      await refreshInventory();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur mise à jour stock';
      setError(errorMessage);
      throw err;
    }
  }, [storeId, getInventoryItem, sendNotification, trackEvent, refreshInventory]);

  // Réservation de stock
  const reserveStock = useCallback(async (
    itemId: string, 
    quantity: number, 
    orderId: string
  ) => {
    try {
      await inventoryService.reserveStock(itemId, quantity, orderId, storeId);
      
      trackEvent('stock_reserved', {
        itemId,
        quantity,
        orderId
      });

      await refreshInventory();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur réservation stock';
      setError(errorMessage);
      throw err;
    }
  }, [storeId, trackEvent, refreshInventory]);

  // Libération du stock réservé
  const releaseReservedStock = useCallback(async (
    itemId: string, 
    quantity: number, 
    orderId: string
  ) => {
    try {
      await inventoryService.releaseReservedStock(itemId, quantity, orderId, storeId);
      
      trackEvent('stock_released', {
        itemId,
        quantity,
        orderId
      });

      await refreshInventory();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur libération stock';
      setError(errorMessage);
      throw err;
    }
  }, [storeId, trackEvent, refreshInventory]);

  // Consommation FIFO
  const consumeStockFIFO = useCallback(async (
    itemId: string, 
    quantity: number, 
    orderId?: string
  ) => {
    try {
      await inventoryService.consumeStockFIFO(itemId, quantity, storeId, orderId);
      
      trackEvent('stock_consumed_fifo', {
        itemId,
        quantity,
        orderId
      });

      await refreshInventory();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur consommation stock';
      setError(errorMessage);
      throw err;
    }
  }, [storeId, trackEvent, refreshInventory]);

  // Récupération des mouvements de stock
  const getStockMovements = useCallback(async (
    itemId?: string, 
    startDate?: Date, 
    endDate?: Date
  ) => {
    try {
      const movements = await inventoryService.getStockMovements(storeId, itemId, startDate, endDate);
      return movements;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération mouvements';
      setError(errorMessage);
      throw err;
    }
  }, [storeId]);

  // Actions sur les alertes
  const markAlertAsRead = useCallback(async (alertId: string) => {
    try {
      await inventoryService.markAlertAsRead(alertId);
      await refreshInventory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur marquage alerte';
      setError(errorMessage);
      throw err;
    }
  }, [refreshInventory]);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      await inventoryService.resolveAlert(alertId);
      await refreshInventory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur résolution alerte';
      setError(errorMessage);
      throw err;
    }
  }, [refreshInventory]);

  // Récupération des analytics
  const getAnalytics = useCallback(async () => {
    try {
      const analyticsData = await inventoryService.getInventoryAnalytics(storeId);
      setAnalytics(analyticsData);
      
      trackEvent('inventory_analytics_retrieved', {
        storeId,
        totalValue: analyticsData.totalValue,
        totalItems: analyticsData.totalItems
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération analytics';
      setError(errorMessage);
    }
  }, [storeId, trackEvent]);

  // Données calculées
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.currentStock <= item.minThreshold);
  }, [inventory]);

  const outOfStockItems = useMemo(() => {
    return inventory.filter(item => item.currentStock <= 0);
  }, [inventory]);

  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((total, item) => total + item.value, 0);
  }, [inventory]);

  const activeAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.isResolved);
  }, [alerts]);

  const getItemAvailability = useCallback((itemId: string) => {
    const item = getInventoryItem(itemId);
    return item ? item.availableStock : 0;
  }, [getInventoryItem]);

  return {
    // État principal
    inventory,
    loading,
    error,
    filters,
    
    // Actions principales
    refreshInventory,
    updateFilters,
    getInventoryItem,
    
    // Gestion des stocks
    updateStock,
    reserveStock,
    releaseReservedStock,
    consumeStockFIFO,
    
    // Mouvements de stock
    getStockMovements,
    
    // Alertes
    alerts,
    activeAlerts,
    markAlertAsRead,
    resolveAlert,
    
    // Analytics
    analytics,
    getAnalytics,
    
    // Utilitaires
    lowStockItems,
    outOfStockItems,
    totalInventoryValue,
    getItemAvailability
  };
}

// Hook pour la gestion des fournisseurs
export function useSuppliers(options?: UseSuppliersOptions): UseSuppliersReturn {
  const { 
    storeId,
    autoRefresh = true, 
    refreshInterval = 60000 // 1 minute
  } = options || {};

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SupplierFilters>({});

  const { trackEvent } = useAnalytics();

  // Récupération des fournisseurs
  const refreshSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await suppliersManager.getSuppliers(filters);
      setSuppliers(data);

      trackEvent('suppliers_refreshed', {
        suppliersCount: data.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      trackEvent('suppliers_error', {
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [filters, trackEvent]);

  // Initialisation et auto-refresh
  useEffect(() => {
    refreshSuppliers();

    if (autoRefresh) {
      const interval = setInterval(refreshSuppliers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshSuppliers, autoRefresh, refreshInterval]);

  // Mise à jour des filtres
  const updateFilters = useCallback((newFilters: Partial<SupplierFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    trackEvent('suppliers_filters_updated', { newFilters });
  }, [trackEvent]);

  // Récupération d'un fournisseur
  const getSupplier = useCallback((id: string) => {
    return suppliers.find(supplier => supplier.id === id);
  }, [suppliers]);

  // Création d'un fournisseur
  const createSupplier = useCallback(async (
    supplierData: Omit<Supplier, 'id' | 'performance' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const newSupplier = await suppliersManager.createSupplier(supplierData);
      await refreshSuppliers();
      
      trackEvent('supplier_created', {
        supplierId: newSupplier.id,
        supplierName: newSupplier.name
      });

      return newSupplier;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création fournisseur';
      setError(errorMessage);
      throw err;
    }
  }, [refreshSuppliers, trackEvent]);

  // Mise à jour d'un fournisseur
  const updateSupplier = useCallback(async (
    id: string, 
    updates: Partial<Supplier>
  ) => {
    try {
      const updatedSupplier = await suppliersManager.updateSupplier(id, updates);
      await refreshSuppliers();
      
      trackEvent('supplier_updated', {
        supplierId: id,
        updates: Object.keys(updates)
      });

      return updatedSupplier;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur mise à jour fournisseur';
      setError(errorMessage);
      throw err;
    }
  }, [refreshSuppliers, trackEvent]);

  // Création d'une commande fournisseur
  const createSupplierOrder = useCallback(async (
    orderData: Omit<SupplierOrder, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>
  ) => {
    try {
      const newOrder = await suppliersManager.createSupplierOrder(orderData);
      
      trackEvent('supplier_order_created', {
        orderId: newOrder.id,
        supplierId: newOrder.supplierId,
        totalAmount: newOrder.totalAmount
      });

      return newOrder;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création commande';
      setError(errorMessage);
      throw err;
    }
  }, [trackEvent]);

  // Récupération des commandes d'un fournisseur
  const getSupplierOrders = useCallback(async (
    supplierId: string, 
    status?: SupplierOrder['status']
  ) => {
    try {
      const orders = await suppliersManager.getSupplierOrders(supplierId, storeId, status);
      return orders;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération commandes';
      setError(errorMessage);
      throw err;
    }
  }, [storeId]);

  // Mise à jour du statut d'une commande
  const updateOrderStatus = useCallback(async (
    orderId: string, 
    status: SupplierOrder['status'], 
    notes?: string
  ) => {
    try {
      await suppliersManager.updateOrderStatus(orderId, status, notes);
      
      trackEvent('supplier_order_status_updated', {
        orderId,
        status
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur mise à jour statut';
      setError(errorMessage);
      throw err;
    }
  }, [trackEvent]);

  // Création d'une règle de réapprovisionnement
  const createReorderRule = useCallback(async (
    ruleData: Omit<AutomaticReorderRule, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const newRule = await suppliersManager.createAutomaticReorderRule(ruleData);
      
      trackEvent('reorder_rule_created', {
        ruleId: newRule.id,
        triggerType: newRule.trigger.type
      });

      return newRule;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création règle';
      setError(errorMessage);
      throw err;
    }
  }, [trackEvent]);

  // Traitement des réapprovisionnements automatiques
  const processAutomaticReorders = useCallback(async () => {
    try {
      await suppliersManager.processAutomaticReorders();
      
      trackEvent('automatic_reorders_processed', {
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur traitement réapprovisionnement';
      setError(errorMessage);
      throw err;
    }
  }, [trackEvent]);

  // Récupération des évaluations
  const getSupplierEvaluations = useCallback(async (supplierId: string) => {
    try {
      const evaluations = await suppliersManager.getSupplierEvaluations(supplierId);
      return evaluations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération évaluations';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Création d'une évaluation
  const createSupplierEvaluation = useCallback(async (evaluationData: any) => {
    try {
      const evaluation = await suppliersManager.createSupplierEvaluation(evaluationData);
      
      trackEvent('supplier_evaluation_created', {
        supplierId: evaluation.supplierId,
        grade: evaluation.grade
      });

      return evaluation;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur création évaluation';
      setError(errorMessage);
      throw err;
    }
  }, [trackEvent]);

  return {
    // État principal
    suppliers,
    loading,
    error,
    filters,
    
    // Actions principales
    refreshSuppliers,
    updateFilters,
    getSupplier,
    
    // Gestion des fournisseurs
    createSupplier,
    updateSupplier,
    
    // Commandes fournisseur
    createSupplierOrder,
    getSupplierOrders,
    updateOrderStatus,
    
    // Réapprovisionnement automatique
    createReorderRule,
    processAutomaticReorders,
    
    // Évaluations
    getSupplierEvaluations,
    createSupplierEvaluation
  };
}

// Hook spécialisé pour les alertes d'inventaire
export function useInventoryAlerts(options: UseInventoryAlertsOptions): UseInventoryAlertsReturn {
  const { 
    storeId,
    autoRefresh = true, 
    refreshInterval = 10000, // 10 secondes pour les alertes
    enableNotifications = true
  } = options;

  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sendNotification } = useNotifications();
  const { trackEvent } = useAnalytics();

  // Récupération des alertes
  const refreshAlerts = useCallback(async () => {
    try {
      setError(null);
      const alertData = await inventoryService.getActiveAlerts(storeId);
      setAlerts(alertData);

      // Notifications pour les nouvelles alertes critiques
      if (enableNotifications) {
        const criticalAlerts = alertData.filter(alert => 
          alert.severity === 'critical' && !alert.isRead
        );

        for (const alert of criticalAlerts) {
          await sendNotification({
            title: `🚨 ${alert.title}`,
            body: alert.message,
            type: 'error',
            persistent: true
          });
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur récupération alertes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeId, enableNotifications, sendNotification]);

  // Initialisation et auto-refresh
  useEffect(() => {
    refreshAlerts();

    if (autoRefresh) {
      const interval = setInterval(refreshAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshAlerts, autoRefresh, refreshInterval]);

  // Actions sur les alertes
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await inventoryService.markAlertAsRead(alertId);
      await refreshAlerts();
      
      trackEvent('inventory_alert_marked_read', { alertId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur marquage alerte';
      setError(errorMessage);
      throw err;
    }
  }, [refreshAlerts, trackEvent]);

  const resolve = useCallback(async (alertId: string) => {
    try {
      await inventoryService.resolveAlert(alertId);
      await refreshAlerts();
      
      trackEvent('inventory_alert_resolved', { alertId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur résolution alerte';
      setError(errorMessage);
      throw err;
    }
  }, [refreshAlerts, trackEvent]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadAlerts = alerts.filter(alert => !alert.isRead);
      
      await Promise.all(
        unreadAlerts.map(alert => inventoryService.markAlertAsRead(alert.id))
      );
      
      await refreshAlerts();
      
      trackEvent('inventory_alerts_all_marked_read', { 
        count: unreadAlerts.length 
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur marquage toutes alertes';
      setError(errorMessage);
      throw err;
    }
  }, [alerts, refreshAlerts, trackEvent]);

  const dismissAll = useCallback(async () => {
    try {
      const activeAlerts = alerts.filter(alert => !alert.isResolved);
      
      await Promise.all(
        activeAlerts.map(alert => inventoryService.resolveAlert(alert.id))
      );
      
      await refreshAlerts();
      
      trackEvent('inventory_alerts_all_dismissed', { 
        count: activeAlerts.length 
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur dismissal alertes';
      setError(errorMessage);
      throw err;
    }
  }, [alerts, refreshAlerts, trackEvent]);

  // Données calculées
  const criticalAlerts = useMemo(() => {
    return alerts.filter(alert => alert.severity === 'critical');
  }, [alerts]);

  const warningAlerts = useMemo(() => {
    return alerts.filter(alert => alert.severity === 'warning');
  }, [alerts]);

  const infoAlerts = useMemo(() => {
    return alerts.filter(alert => alert.severity === 'info');
  }, [alerts]);

  const unreadAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.isRead);
  }, [alerts]);

  const totalAlerts = alerts.length;
  const unreadCount = unreadAlerts.length;
  const criticalCount = criticalAlerts.length;
  const hasNewAlerts = unreadCount > 0;

  return {
    // État principal
    alerts,
    loading,
    error,
    
    // Alertes par catégorie
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    unreadAlerts,
    
    // Actions
    refreshAlerts,
    markAsRead,
    resolve,
    markAllAsRead,
    dismissAll,
    
    // Statistiques
    totalAlerts,
    unreadCount,
    criticalCount,
    hasNewAlerts
  };
}

// Hook composite pour l'inventory management complet
export function useInventoryManagement(storeId: string) {
  const inventory = useInventory({ storeId });
  const suppliers = useSuppliers({ storeId });
  const alerts = useInventoryAlerts({ storeId });

  return {
    inventory,
    suppliers,
    alerts,
    
    // Actions combinées
    refreshAll: async () => {
      await Promise.all([
        inventory.refreshInventory(),
        suppliers.refreshSuppliers(),
        alerts.refreshAlerts()
      ]);
    }
  };
}