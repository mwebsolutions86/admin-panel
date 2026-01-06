/**
 * Framework de Tests Automatisés
 * Universal Eats - Phase 1 Optimisation
 */

import { performanceMonitor } from './performance-monitor';
import { supabase } from './supabase';
import { productCache } from './cache-service';

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  error?: string;
  assertions: number;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
  timeout?: number;
  skip?: boolean;
}

export interface PerformanceTest {
  name: string;
  fn: () => Promise<void>;
  threshold: number; // Temps maximum en millisecondes
  iterations?: number;
}

export interface APITest {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedResponse?: any;
}

class TestRunner {
  private results: TestResult[] = [];
  private currentSuite: string | null = null;
  private isRunning = false;

  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    if (this.isRunning) {
      throw new Error('Un test est déjà en cours d\'exécution');
    }

    this.isRunning = true;
    this.currentSuite = suite.name;
    performanceMonitor.info(`Démarrage suite de tests: ${suite.name}`);

    try {
      // Setup
      if (suite.setup) {
        await suite.setup();
      }

      // Exécuter les tests
      for (const test of suite.tests) {
        const result = await this.runTest(test);
        this.results.push(result);
      }

      // Teardown
      if (suite.teardown) {
        await suite.teardown();
      }

      performanceMonitor.info(`Suite terminée: ${suite.name}`, {
        total: suite.tests.length,
        passed: this.results.filter(r => r.status === 'passed').length,
        failed: this.results.filter(r => r.status === 'failed').length
      });

    } catch (error) {
      performanceMonitor.error('Erreur exécution suite', { suite: suite.name, error });
    } finally {
      this.isRunning = false;
      this.currentSuite = null;
    }

    return this.results;
  }

  private async runTest(test: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    const result: TestResult = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: test.name,
      status: 'running',
      duration: 0,
      assertions: 0,
      timestamp: new Date().toISOString()
    };

    try {
      if (test.skip) {
        result.status = 'skipped';
        result.duration = 0;
        return result;
      }

      // Timeout handling
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), test.timeout || 5000);
      });

      // Exécuter le test
      const testPromise = test.fn();
      await Promise.race([testPromise, timeoutPromise]);

      result.status = 'passed';
      result.assertions = 1; // Par défaut

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      performanceMonitor.error(`Test échoué: ${test.name}`, { error });
    } finally {
      result.duration = performance.now() - startTime;
    }

    return result;
  }

  async runPerformanceTest(test: PerformanceTest): Promise<{
    passed: boolean;
    averageTime: number;
    minTime: number;
    maxTime: number;
    iterations: number;
  }> {
    const iterations = test.iterations || 10;
    const times: number[] = [];

    performanceMonitor.info(`Test de performance: ${test.name}`, { iterations });

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await test.fn();
        const duration = performance.now() - startTime;
        times.push(duration);
        
        if (duration > test.threshold) {
          performanceMonitor.warn(`Itération ${i + 1} dépasse le seuil`, {
            duration,
            threshold: test.threshold
          });
        }
      } catch (error) {
        performanceMonitor.error(`Erreur itération ${i + 1}`, { error });
      }
    }

    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const passed = maxTime <= test.threshold;

    performanceMonitor.info(`Test de performance terminé: ${test.name}`, {
      averageTime: `${averageTime.toFixed(2)}ms`,
      minTime: `${minTime.toFixed(2)}ms`,
      maxTime: `${maxTime.toFixed(2)}ms`,
      threshold: `${test.threshold}ms`,
      passed
    });

    return { passed, averageTime, minTime, maxTime, iterations };
  }

  async runAPITests(tests: APITest[]): Promise<Array<{
    test: APITest;
    passed: boolean;
    responseTime: number;
    status: number;
    error?: string;
  }>> {
    const results: Array<{ test: APITest; passed: boolean; responseTime: number; status: number; error?: string }> = [];

    for (const test of tests) {
      const startTime = performance.now();
      
      try {
        // Simulation d'appel API (en production, utiliser fetch ou axios)
        const response = await this.simulateAPICall(test);
        const responseTime = performance.now() - startTime;
        
        const passed = response.status === test.expectedStatus;
        
        results.push({
          test,
          passed,
          responseTime,
          status: response.status,
          error: passed ? undefined : `Status attendu: ${test.expectedStatus}, obtenu: ${response.status}`
        });

        performanceMonitor.info(`API Test: ${test.name}`, {
          responseTime: `${responseTime.toFixed(2)}ms`,
          status: response.status,
          passed
        });

      } catch (error) {
        const responseTime = performance.now() - startTime;
        
        results.push({
          test,
          passed: false,
          responseTime,
          status: 0,
          error: error instanceof Error ? error.message : String(error)
        });

        performanceMonitor.error(`API Test échoué: ${test.name}`, { error });
      }
    }

    return results;
  }

  private async simulateAPITest(test: APITest): Promise<{ status: number; data?: any }> {
    // Simulation simplifiée - en production, utiliser de vrais appels API
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    // Simuler différents scénarios de réponse
    const scenarios = [
      { status: 200, probability: 0.7 },
      { status: 404, probability: 0.1 },
      { status: 500, probability: 0.1 },
      { status: 400, probability: 0.1 }
    ];

    const random = Math.random();
    let cumulative = 0;
    
    for (const scenario of scenarios) {
      cumulative += scenario.probability;
      if (random <= cumulative) {
        return { status: scenario.status, data: {} };
      }
    }

    return { status: 200 };
  }

  // Backward-compatible alias expected by some callers
  private async simulateAPICall(test: APITest): Promise<{ status: number; data?: any }> {
    return this.simulateAPITest(test);
  }

  // Méthodes d'assertion
  static async assert(condition: boolean, message: string = 'Assertion failed'): Promise<void> {
    if (!condition) {
      throw new Error(message);
    }
  }

  static async assertEqual(actual: any, expected: any, message?: string): Promise<void> {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  static async assertNotEqual(actual: any, expected: any, message?: string): Promise<void> {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  }

  static async assertContains(container: any, item: any, message?: string): Promise<void> {
    if (!container.includes(item)) {
      throw new Error(message || `Expected container to contain ${item}`);
    }
  }

  static async assertTrue(condition: boolean, message?: string): Promise<void> {
    await this.assertEqual(condition, true, message);
  }

  static async assertFalse(condition: boolean, message?: string): Promise<void> {
    await this.assertEqual(condition, false, message);
  }

  // Méthodes utilitaires
  getResults(): TestResult[] {
    return [...this.results];
  }

  getResultsByStatus(status: TestResult['status']): TestResult[] {
    return this.results.filter(result => result.status === status);
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    
    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      averageDuration: total > 0 ? 
        this.results.reduce((sum, r) => sum + r.duration, 0) / total : 0
    };
  }

  clearResults(): void {
    this.results = [];
  }
}

// Suite de tests pré-configurées
export class TestSuites {
  static createDatabaseTests(): TestSuite {
    return {
      name: 'Database Tests',
      setup: async () => {
        performanceMonitor.info('Setup database tests');
      },
      teardown: async () => {
        performanceMonitor.info('Teardown database tests');
      },
      tests: [
        {
          name: 'Connection to Supabase',
          fn: async () => {
            const { error } = await supabase.from('stores').select('count').single();
            await TestRunner.assertEqual(error, null, 'Database connection failed');
          }
        },
        {
          name: 'Orders table accessible',
          fn: async () => {
            const { data, error } = await supabase.from('orders').select('id').limit(1);
            await TestRunner.assertEqual(error, null, 'Orders table not accessible');
            await TestRunner.assert(data !== null, 'Orders table returned null');
          }
        },
        {
          name: 'Products table structure',
          fn: async () => {
            const { data, error } = await supabase.from('products').select('*').limit(1);
            await TestRunner.assertEqual(error, null, 'Products table structure invalid');
            
            if (data && data.length > 0) {
              const product = data[0];
              await TestRunner.assert(product.id !== undefined, 'Product missing id');
              await TestRunner.assert(product.name !== undefined, 'Product missing name');
              await TestRunner.assert(product.price !== undefined, 'Product missing price');
            }
          }
        }
      ]
    };
  }

  static createCacheTests(): TestSuite {
    return {
      name: 'Cache Tests',
      tests: [
        {
          name: 'Cache set and get',
          fn: async () => {
            const testKey = 'test_key';
            const testValue = { test: 'data' };
            
            productCache.set(testKey, testValue);
            const retrieved = productCache.get(testKey);
            
            await TestRunner.assertEqual(retrieved, testValue, 'Cache set/get failed');
            
            // Nettoyer
            productCache.delete(testKey);
          }
        },
        {
          name: 'Cache expiration',
          fn: async () => {
            const testKey = 'expiry_test';
            const testValue = { test: 'expiry' };
            
            // Cache avec TTL très court
            productCache.set(testKey, testValue, 100);
            
            // Attendre l'expiration
            await new Promise(resolve => setTimeout(resolve, 150));
            
            const retrieved = productCache.get(testKey);
            await TestRunner.assertEqual(retrieved, null, 'Cache did not expire');
          }
        },
        {
          name: 'Cache hit rate tracking',
          fn: async () => {
            const stats = productCache.getStats();
            await TestRunner.assert(stats.totalOperations >= 0, 'Invalid cache stats');
            await TestRunner.assert(stats.hitRate >= 0 && stats.hitRate <= 1, 'Invalid hit rate');
          }
        }
      ]
    };
  }

  static createPerformanceTests(): PerformanceTest[] {
    return [
      {
        name: 'Database query performance',
        fn: async () => {
          const { error } = await supabase.from('stores').select('*').limit(50);
          await TestRunner.assertEqual(error, null, 'Performance test query failed');
        },
        threshold: 200, // 200ms
        iterations: 5
      },
      {
        name: 'Cache operations performance',
        fn: async () => {
          for (let i = 0; i < 100; i++) {
            productCache.set(`perf_test_${i}`, { data: `test_${i}` });
            productCache.get(`perf_test_${i}`);
          }
          
          // Nettoyer
          for (let i = 0; i < 100; i++) {
            productCache.delete(`perf_test_${i}`);
          }
        },
        threshold: 100, // 100ms pour 200 opérations
        iterations: 3
      }
    ];
  }

  static createAPITests(): APITest[] {
    return [
      {
        name: 'GET stores endpoint',
        endpoint: '/stores',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'POST orders endpoint',
        endpoint: '/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
        expectedStatus: 201
      },
      {
        name: 'Non-existent endpoint',
        endpoint: '/nonexistent',
        method: 'GET',
        expectedStatus: 404
      }
    ];
  }
}

// Instance globale du test runner
export const testRunner = new TestRunner();

// Hook React pour les tests
export function useTesting() {
  return {
    runSuite: testRunner.runSuite.bind(testRunner),
    runPerformanceTest: testRunner.runPerformanceTest.bind(testRunner),
    runAPITests: testRunner.runAPITests.bind(testRunner),
    getResults: testRunner.getResults.bind(testRunner),
    getResultsByStatus: testRunner.getResultsByStatus.bind(testRunner),
    getSummary: testRunner.getSummary.bind(testRunner),
    clearResults: testRunner.clearResults.bind(testRunner),
    assert: TestRunner.assert,
    assertEqual: TestRunner.assertEqual,
    assertNotEqual: TestRunner.assertNotEqual,
    assertContains: TestRunner.assertContains,
    assertTrue: TestRunner.assertTrue,
    assertFalse: TestRunner.assertFalse,
    suites: TestSuites
  };
}