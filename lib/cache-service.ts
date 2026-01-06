/**
 * Service de Cache Intelligent
 * Universal Eats - Phase 1 Optimisation
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en millisecondes
  key: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage: number;
}

export type CacheStrategy = 'lru' | 'lfu' | 'ttl' | 'manual';

export class UniversalCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = []; // Pour LRU
  private accessCount: Map<string, number> = new Map(); // Pour LFU
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalOperations: 0,
    memoryUsage: 0
  };

  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 1000; // Nombre maximum d'entrées
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor(
    private maxSize: number = this.MAX_SIZE,
    private defaultTTL: number = this.DEFAULT_TTL
  ) {
    // Nettoyage périodique des entrées expirées
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Met une valeur en cache
   */
  set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    strategy: CacheStrategy = 'ttl'
  ): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key
    };

    // Si le cache est plein, appliquer la stratégie d'éviction
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict(strategy);
    }

    this.cache.set(key, entry);
    this.updateAccessInfo(key);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    this.stats.totalOperations++;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Vérifier si l'entrée a expiré
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Mettre à jour les statistiques d'accès
    this.updateAccessInfo(key);
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }

  /**
   * Vérifie si une clé existe en cache (sans compter comme hit)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      if (entry) this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.removeFromAccessInfo(key);
    return deleted;
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.totalOperations = 0;
  }

  /**
   * Récupère toutes les clés
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Récupère la taille du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Récupère les métriques détaillées
   */
  getMetrics() {
    const entries = Array.from(this.cache.entries());
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage,
      utilization: (this.cache.size / this.maxSize) * 100,
      stats: this.stats,
      entries: entries.map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        isExpired: this.isExpired(entry)
      }))
    };
  }

  /**
   * Préchargement de données часто utilisées
   */
  async preload<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Vérifier d'abord le cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Charger depuis la source
    const data = await loader();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidation intelligente du cache
   */
  invalidate(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * Récupération par préfixe
   */
  getByPrefix<T>(prefix: string): Record<string, T> {
    const result: Record<string, T> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && !this.isExpired(entry)) {
        result[key] = entry.data;
      }
    }
    
    return result;
  }

  // Méthodes privées
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.debug(`Cache cleanup: ${cleaned} entries removed`);
    }
  }

  private evict(strategy: CacheStrategy): void {
    switch (strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'lfu':
        this.evictLFU();
        break;
      default:
        this.evictTTL();
        break;
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private evictLFU(): void {
    let minCount = Infinity;
    let lfuKey = '';
    
    for (const [key, count] of this.accessCount.entries()) {
      if (count < minCount) {
        minCount = count;
        lfuKey = key;
      }
    }
    
    if (lfuKey) {
      this.cache.delete(lfuKey);
      this.accessCount.delete(lfuKey);
    }
  }

  private evictTTL(): void {
    // Supprimer l'entrée la plus ancienne
    let oldestKey = '';
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private updateAccessInfo(key: string): void {
    // Mettre à jour LRU
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
    
    // Limiter la taille de accessOrder
    if (this.accessOrder.length > this.maxSize) {
      this.accessOrder.shift();
    }
    
    // Mettre à jour LFU
    const currentCount = this.accessCount.get(key) || 0;
    this.accessCount.set(key, currentCount + 1);
  }

  private removeFromAccessInfo(key: string): void {
    // Supprimer de LRU
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Supprimer de LFU
    this.accessCount.delete(key);
  }

  private updateHitRate(): void {
    if (this.stats.totalOperations > 0) {
      this.stats.hitRate = this.stats.hits / this.stats.totalOperations;
    }
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Taille de la clé (UTF-16)
      size += JSON.stringify(entry.data).length * 2; // Taille des données
      size += 64; // Overhead de l'entrée
    }
    return size;
  }
}

// Cache instances spécialisées
export const productCache = new UniversalCache(500, 10 * 60 * 1000); // 10 minutes TTL
export const orderCache = new UniversalCache(200, 2 * 60 * 1000); // 2 minutes TTL
export const userCache = new UniversalCache(100, 30 * 60 * 1000); // 30 minutes TTL
export const menuCache = new UniversalCache(100, 5 * 60 * 1000); // 5 minutes TTL

// Utilitaires de cache
export class CacheUtils {
  /**
   * Génère une clé de cache intelligente
   */
  static generateKey(prefix: string, ...parts: (string | number | null | undefined)[]): string {
    const filtered = parts.filter(part => part !== null && part !== undefined);
    return `${prefix}:${filtered.join(':')}`;
  }

  /**
   * Calcule le TTL optimal basé sur la fréquence de mise à jour
   */
  static calculateOptimalTTL(updateFrequency: 'high' | 'medium' | 'low'): number {
    switch (updateFrequency) {
      case 'high':
        return 30 * 1000; // 30 secondes
      case 'medium':
        return 5 * 60 * 1000; // 5 minutes
      case 'low':
        return 30 * 60 * 1000; // 30 minutes
      default:
        return 5 * 60 * 1000;
    }
  }

  /**
   * Métriques de performance du cache
   */
  static formatCacheStats(stats: CacheStats): string {
    return `Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`;
  }
}

// Hook React pour utilisation facile
export function useCache() {
  return {
    productCache,
    orderCache,
    userCache,
    menuCache,
    utils: CacheUtils
  };
}