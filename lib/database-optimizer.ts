/**
 * Optimiseur de Requêtes Base de Données
 * Universal Eats - Phase 1 Optimisation
 */

import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';
import { productCache, orderCache, CacheUtils } from './cache-service';

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: string;
  indexRecommendations: string[];
}

export interface DatabaseMetrics {
  queryTime: number;
  rowsScanned: number;
  rowsReturned: number;
  cacheHit: boolean;
  timestamp: string;
}

export class DatabaseOptimizer {
  private metrics: DatabaseMetrics[] = [];
  private readonly MAX_METRICS = 100;

  /**
   * Optimisation intelligente des requêtes avec cache
   */
  async optimizedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    ttl: number = 5 * 60 * 1000
  ): Promise<{ data: T | null; fromCache: boolean; error: any }> {
    const timer = performanceMonitor.startTimer('database_query');

    try {
      // Vérifier le cache d'abord
      const cachedData = productCache.get<T>(cacheKey);
      if (cachedData !== null) {
        timer();
        return { data: cachedData, fromCache: true, error: null };
      }

      // Exécuter la requête avec monitoring
      const result = await performanceMonitor.measureDatabaseQuery(
        cacheKey,
        queryFn
      );

      if (result.data) {
        // Mettre en cache les résultats
        productCache.set(cacheKey, result.data, ttl);
      }

      timer();
      return { data: result.data, fromCache: false, error: result.error };
    } catch (error) {
      timer();
      performanceMonitor.error('Erreur requête optimisée', { cacheKey, error });
      return { data: null, fromCache: false, error };
    }
  }

  /**
   * Requête paginée optimisée
   */
  async optimizedPagedQuery<T>(
    table: string,
    options: {
      select?: string;
      filter?: Record<string, any>;
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
      offset?: number;
      cacheKey?: string;
    }
  ): Promise<{ data: T[]; total: number; fromCache: boolean }> {
    const cacheKey = options.cacheKey || CacheUtils.generateKey(
      'paged_query',
      table,
      options.select || '*',
      JSON.stringify(options.filter || {}),
      options.orderBy,
      options.ascending,
      options.limit,
      options.offset
    );

    const ttl = CacheUtils.calculateOptimalTTL('medium');

    return await this.optimizedQuery(
      cacheKey,
      async () => {
        let query = supabase
          .from(table)
          .select(options.select || '*', { count: 'exact' });

        // Appliquer les filtres
        if (options.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        // Appliquer le tri
        if (options.orderBy) {
          query = query.order(options.orderBy, { 
            ascending: options.ascending ?? true 
          });
        }

        // Appliquer la pagination
        if (options.limit) {
          query = query.limit(options.limit);
        }
        
        if (options.offset) {
          query = query.range(options.offset, 
            (options.offset + (options.limit || 10)) - 1);
        }

        return await query;
      },
      ttl
    );
  }

  /**
   * Jointure optimisée avec préchargement
   */
  async optimizedJoinQuery<T>(
    mainTable: string,
    joins: Array<{
      table: string;
      on: string;
      select?: string;
    }>,
    options: {
      filter?: Record<string, any>;
      cacheKey?: string;
    }
  ): Promise<{ data: T[]; fromCache: boolean }> {
    const cacheKey = options.cacheKey || CacheUtils.generateKey(
      'join_query',
      mainTable,
      joins.map(j => `${j.table}:${j.on}`).join('|'),
      JSON.stringify(options.filter || {})
    );

    const ttl = CacheUtils.calculateOptimalTTL('low');

    const result = await this.optimizedQuery(
      cacheKey,
      async () => {
        let query = supabase.from(mainTable).select(
          joins.map(join => `${join.table}(${join.select || '*'})`).join(', ')
        );

        // Appliquer les filtres
        if (options.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        return await query;
      },
      ttl
    );

    return { data: result.data as T[] || [], fromCache: result.fromCache };
  }

  /**
   * Recherche full-text optimisée
   */
  async optimizedFullTextSearch<T>(
    table: string,
    searchColumns: string[],
    searchTerm: string,
    options: {
      limit?: number;
      cacheKey?: string;
    } = {}
  ): Promise<{ data: T[]; fromCache: boolean }> {
    const cacheKey = options.cacheKey || CacheUtils.generateKey(
      'search_query',
      table,
      searchColumns.join('|'),
      searchTerm,
      options.limit
    );

    const ttl = CacheUtils.calculateOptimalTTL('high');

    return await this.optimizedQuery(
      cacheKey,
      async () => {
        // Construire la requête de recherche full-text
        const searchQuery = searchColumns
          .map(col => `${col}.ilike.%${searchTerm}%`)
          .join(',');

        return await supabase
          .from(table)
          .select('*')
          .or(searchQuery)
          .limit(options.limit || 20);
      },
      ttl
    );
  }

  /**
   * Agrégation optimisée avec grouping
   */
  async optimizedAggregation<T>(
    table: string,
    groupBy: string[],
    aggregates: Array<{
      column: string;
      function: 'count' | 'sum' | 'avg' | 'max' | 'min';
      alias?: string;
    }>,
    options: {
      filter?: Record<string, any>;
      having?: string;
      cacheKey?: string;
    }
  ): Promise<{ data: T[]; fromCache: boolean }> {
    const cacheKey = options.cacheKey || CacheUtils.generateKey(
      'aggregation',
      table,
      groupBy.join('|'),
      aggregates.map(a => `${a.function}(${a.column})`).join('|'),
      JSON.stringify(options.filter || {}),
      options.having
    );

    const ttl = CacheUtils.calculateOptimalTTL('medium');

    return await this.optimizedQuery(
      cacheKey,
      async () => {
        let select = groupBy.join(', ');
        
        // Ajouter les agrégations
        aggregates.forEach(agg => {
          const alias = agg.alias || `${agg.function}_${agg.column}`;
          select += `, ${agg.function}(${agg.column}) as ${alias}`;
        });

        let query = supabase
          .from(table)
          .select(select)
          .group(groupBy.join(', '));

        // Appliquer les filtres
        if (options.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        // Appliquer la clause HAVING
        if (options.having) {
          query = query.having(options.having);
        }

        return await query;
      },
      ttl
    );
  }

  /**
   * Batch operations optimisées
   */
  async optimizedBatchInsert<T>(
    table: string,
    records: T[],
    options: {
      cacheInvalidation?: string[];
      chunkSize?: number;
    } = {}
  ): Promise<{ success: boolean; insertedCount: number; error?: any }> {
    const timer = performanceMonitor.startTimer('batch_insert');

    try {
      const chunkSize = options.chunkSize || 100;
      let insertedCount = 0;
      let hasError = false;
      let lastError: any = null;

      // Traiter par chunks pour éviter les timeouts
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        
        const { error } = await supabase
          .from(table)
          .insert(chunk);

        if (error) {
          hasError = true;
          lastError = error;
          break;
        }

        insertedCount += chunk.length;
      }

      // Invalider les caches pertinents
      if (options.cacheInvalidation) {
        options.cacheInvalidation.forEach(pattern => {
          productCache.invalidate(pattern);
          orderCache.invalidate(pattern);
        });
      }

      timer();
      
      if (hasError) {
        performanceMonitor.error('Erreur batch insert', { 
          table, 
          totalRecords: records.length,
          insertedCount,
          error: lastError 
        });
        return { success: false, insertedCount: 0, error: lastError };
      }

      performanceMonitor.info('Batch insert réussi', { 
        table, 
        totalRecords: records.length,
        insertedCount 
      });

      return { success: true, insertedCount };
    } catch (error) {
      timer();
      performanceMonitor.error('Exception batch insert', { 
        table, 
        recordsCount: records.length,
        error 
      });
      return { success: false, insertedCount: 0, error };
    }
  }

  /**
   * Analyse des performances des requêtes
   */
  analyzeQueryPerformance(query: string): QueryOptimization {
    const optimizations: QueryOptimization = {
      originalQuery: query,
      optimizedQuery: query,
      estimatedImprovement: '0%',
      indexRecommendations: []
    };

    // Détecter les patterns non optimisés
    const patterns = [
      {
        regex: /SELECT\s+\*/gi,
        replacement: 'SELECT [specific_columns]',
        description: 'Éviter SELECT * pour réduire la charge'
      },
      {
        regex: /WHERE\s+.*LIKE\s+'%.*%'/gi,
        replacement: 'Considérer la recherche full-text ou les index partiels',
        description: 'LIKE avec % au début ne peut pas utiliser les index'
      },
      {
        regex: /ORDER\s+BY\s+.*\s+ASC/gi,
        replacement: 'ORDER BY [column] DESC',
        description: 'Trier par DESC peut être plus performant'
      },
      {
        regex: /LIMIT\s+\d+/gi,
        replacement: 'LIMIT [reasonable_number]',
        description: 'Limiter le nombre de résultats'
      }
    ];

    let hasOptimizations = false;

    patterns.forEach(pattern => {
      if (pattern.regex.test(query)) {
        optimizations.indexRecommendations.push(pattern.description);
        hasOptimizations = true;
      }
    });

    if (hasOptimizations) {
      optimizations.estimatedImprovement = '15-30%';
    }

    return optimizations;
  }

  /**
   * Récupération des métriques de performance
   */
  getPerformanceMetrics(): DatabaseMetrics[] {
    return [...this.metrics];
  }

  /**
   * Recommandations d'index
   */
  getIndexRecommendations(): Array<{
    table: string;
    columns: string[];
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    return [
      {
        table: 'orders',
        columns: ['store_id', 'status', 'created_at'],
        reason: 'Requêtes fréquentes par statut et magasin',
        priority: 'high'
      },
      {
        table: 'products',
        columns: ['brand_id', 'category_id', 'is_available'],
        reason: 'Filtrage par marque et catégorie',
        priority: 'high'
      },
      {
        table: 'order_items',
        columns: ['order_id', 'product_id'],
        reason: 'Jointures fréquentes',
        priority: 'medium'
      },
      {
        table: 'profiles',
        columns: ['store_id', 'role'],
        reason: 'Recherche par rôle et magasin',
        priority: 'medium'
      }
    ];
  }
}

// Instance globale de l'optimiseur
export const dbOptimizer = new DatabaseOptimizer();

// Utilitaires pour les opérations courantes
export class QueryUtils {
  /**
   * Construction intelligente de filtres
   */
  static buildFilter(filters: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  }

  /**
   * Optimisation des paramètres de pagination
   */
  static optimizePagination(page: number, limit: number) {
    const maxLimit = 100; // Limite raisonnable
    const optimizedLimit = Math.min(limit, maxLimit);
    const offset = (page - 1) * optimizedLimit;
    
    return { limit: optimizedLimit, offset };
  }

  /**
   * Génération de clés de cache pour requêtes complexes
   */
  static generateComplexCacheKey(
    operation: string,
    params: Record<string, any>
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    return CacheUtils.generateKey(operation, JSON.stringify(sortedParams));
  }
}

// Hook React pour utilisation facile
export function useDatabaseOptimizer() {
  return {
    optimizedQuery: dbOptimizer.optimizedQuery.bind(dbOptimizer),
    optimizedPagedQuery: dbOptimizer.optimizedPagedQuery.bind(dbOptimizer),
    optimizedJoinQuery: dbOptimizer.optimizedJoinQuery.bind(dbOptimizer),
    optimizedFullTextSearch: dbOptimizer.optimizedFullTextSearch.bind(dbOptimizer),
    optimizedAggregation: dbOptimizer.optimizedAggregation.bind(dbOptimizer),
    optimizedBatchInsert: dbOptimizer.optimizedBatchInsert.bind(dbOptimizer),
    analyzeQueryPerformance: dbOptimizer.analyzeQueryPerformance.bind(dbOptimizer),
    getIndexRecommendations: dbOptimizer.getIndexRecommendations.bind(dbOptimizer),
    utils: QueryUtils
  };
}