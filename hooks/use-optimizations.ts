/**
 * Hook d'Intégration des Optimisations
 * Universal Eats - Phase 1 Optimisation
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { performanceMonitor } from '@/lib/performance-monitor';
import { supabase } from '@/lib/supabase';
import { 
  productCache, 
  orderCache, 
  userCache, 
  menuCache,
  CacheUtils 
} from '@/lib/cache-service';
import { dbOptimizer, QueryUtils } from '@/lib/database-optimizer';
import { securityManager, useSecurityStore } from '@/lib/security-enhanced';
import { testRunner, TestSuites } from '@/lib/test-framework';

interface OptimizationState {
  isInitialized: boolean;
  performanceMetrics: any;
  cacheStats: any;
  securityEvents: any[];
  isLoading: boolean;
  errors: string[];
}

export function useOptimizations() {
  const [state, setState] = useState<OptimizationState>({
    isInitialized: false,
    performanceMetrics: null,
    cacheStats: null,
    securityEvents: [],
    isLoading: false,
    errors: []
  });

  const securityStore = useSecurityStore();

  // Initialisation des optimisations
  const initializeOptimizations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, errors: [] }));

    try {
      performanceMonitor.info('Initialisation des optimisations');

      // Exécuter les tests de base
      const testResults = await testRunner.runSuite(TestSuites.createDatabaseTests());
      const testSummary = testRunner.getSummary();

      if (testSummary.failed > 0) {
        performanceMonitor.warn('Certains tests ont échoué', { testSummary });
      }

      // Précharger les données critiques
      await preloadCriticalData();

      // Configurer la sécurité
      configureSecurity();

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        errors: testSummary.failed > 0 ? [`${testSummary.failed} tests échoués`] : []
      }));

      performanceMonitor.info('Optimisations initialisées avec succès');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      performanceMonitor.error('Erreur initialisation optimisations', { error });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: [...prev.errors, errorMessage]
      }));
    }
  }, []);

  // Préchargement des données critiques
  const preloadCriticalData = async () => {
    try {
      // Précharger les catégories
      await dbOptimizer.optimizedQuery(
        'categories_all',
        async () => await supabase.from('categories').select('*'),
        30 * 60 * 1000 // 30 minutes
      );

      // Précharger les produits populaires
      await dbOptimizer.optimizedQuery(
        'popular_products',
        async () => await supabase.from('products').select('*').eq('is_available', true).limit(50),
        10 * 60 * 1000 // 10 minutes
      );

      // Précharger les stores actifs
      await dbOptimizer.optimizedQuery(
        'active_stores',
        async () => await supabase.from('stores').select('*').eq('is_active', true),
        15 * 60 * 1000 // 15 minutes
      );

      performanceMonitor.info('Données critiques préchargées');

    } catch (error) {
      performanceMonitor.error('Erreur préchargement données', { error });
    }
  };

  // Configuration de la sécurité
  const configureSecurity = () => {
    securityManager.updateConfig({
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionTimeout: 60,
      requireMFA: false, // Activer plus tard
      passwordMinLength: 8,
      requireSpecialChars: true
    });

    performanceMonitor.info('Configuration sécurité appliquée');
  };

  // Méthodes de performance
  const getPerformanceMetrics = useCallback(() => {
    return {
      averageResponseTime: performanceMonitor.getAverageResponseTime(),
      averageDatabaseTime: performanceMonitor.getAverageDatabaseTime(),
      errorRate: performanceMonitor.getErrorRate(),
      recentLogs: performanceMonitor.getRecentLogs(10),
      alerts: performanceMonitor.checkPerformanceAlerts()
    };
  }, []);

  // Méthodes de cache
  const getCacheStats = useCallback(() => {
    return {
      product: productCache.getStats(),
      order: orderCache.getStats(),
      user: userCache.getStats(),
      menu: menuCache.getStats()
    };
  }, []);

  // Méthodes de sécurité
  const getSecurityInfo = useCallback(() => {
    return {
      events: securityManager.getSecurityEvents(20),
      isUserLocked: securityStore.isLocked,
      riskScore: securityStore.riskScore
    };
  }, [securityStore]);

  // Méthodes de base de données
  const optimizeQuery = useCallback(async <T>(
    cacheKey: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    ttl?: number
  ) => {
    return await dbOptimizer.optimizedQuery(cacheKey, queryFn, ttl);
  }, []);

  const getQueryRecommendations = useCallback(() => {
    return dbOptimizer.getIndexRecommendations();
  }, []);

  // Exécution des tests
  const runTests = useCallback(async (suite: 'database' | 'cache' | 'performance' | 'api') => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      let results;

      switch (suite) {
        case 'database':
          results = await testRunner.runSuite(TestSuites.createDatabaseTests());
          break;
        case 'cache':
          results = await testRunner.runSuite(TestSuites.createCacheTests());
          break;
        case 'performance':
          results = await Promise.all(
            TestSuites.createPerformanceTests().map(test => 
              testRunner.runPerformanceTest(test)
            )
          );
          break;
        case 'api':
          results = await testRunner.runAPITests(TestSuites.createAPITests());
          break;
        default:
          throw new Error('Suite de tests inconnue');
      }

      performanceMonitor.info(`Tests ${suite} exécutés`, { results });
      return results;

    } catch (error) {
      performanceMonitor.error(`Erreur tests ${suite}`, { error });
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Nettoyage du cache
  const clearCache = useCallback((type?: 'product' | 'order' | 'user' | 'menu' | 'all') => {
    switch (type) {
      case 'product':
        productCache.clear();
        break;
      case 'order':
        orderCache.clear();
        break;
      case 'user':
        userCache.clear();
        break;
      case 'menu':
        menuCache.clear();
        break;
      case 'all':
      default:
        productCache.clear();
        orderCache.clear();
        userCache.clear();
        menuCache.clear();
        break;
    }

    performanceMonitor.info(`Cache ${type || 'all'} vidé`);
  }, []);

  // Export des métriques
  const exportMetrics = useCallback(() => {
    const metrics = {
      performance: getPerformanceMetrics(),
      cache: getCacheStats(),
      security: getSecurityInfo(),
      timestamp: new Date().toISOString(),
      summary: {
        totalCacheEntries: productCache.size() + orderCache.size() + userCache.size(),
        averageResponseTime: performanceMonitor.getAverageResponseTime(),
        errorRate: performanceMonitor.getErrorRate(),
        securityEvents: securityManager.getSecurityEvents().length
      }
    };

    const blob = new Blob([JSON.stringify(metrics, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `universal-eats-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    performanceMonitor.info('Métriques exportées');
  }, [getPerformanceMetrics, getCacheStats, getSecurityInfo]);

  // Auto-initialisation
  useEffect(() => {
    initializeOptimizations();
  }, [initializeOptimizations]);

  return {
    // État
    ...state,

    // Actions d'initialisation
    initializeOptimizations,

    // Performance
    getPerformanceMetrics,
    
    // Cache
    getCacheStats,
    clearCache,

    // Sécurité
    getSecurityInfo,

    // Base de données
    optimizeQuery,
    getQueryRecommendations,

    // Tests
    runTests,

    // Utilitaires
    exportMetrics,

    // Utils pour composants
    utils: {
      CacheUtils,
      QueryUtils
    }
  };
}

// Hook simplifié pour utilisation dans les composants
export function usePerformance() {
  const optimizations = useOptimizations();
  
  return {
    // Métriques en temps réel
    metrics: optimizations.getPerformanceMetrics(),
    
    // Statistiques de cache
    cacheStats: optimizations.getCacheStats(),
    
    // Événements de sécurité
    security: optimizations.getSecurityInfo(),
    
    // Actions rapides
    clearCache: optimizations.clearCache,
    exportMetrics: optimizations.exportMetrics,
    
    // État de chargement
    isLoading: optimizations.isLoading,
    isInitialized: optimizations.isInitialized,
    errors: optimizations.errors
  };
}