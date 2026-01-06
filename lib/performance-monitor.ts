/**
 * Service de Monitoring et Performance
 * Universal Eats - Phase 1 Optimisation
 */

export interface PerformanceMetrics {
  apiResponseTime: number;
  databaseQueryTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  errorRate: number;
  timestamp: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private readonly MAX_METRICS = 100;

  // Méthodes de logging
  info(message: string, context?: Record<string, any>) {
    this.addLog('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.addLog('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.addLog('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.addLog('debug', message, context);
  }

  // Méthodes de performance
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric('apiResponseTime', duration);
      this.debug(`Opération "${operation}" terminée`, { 
        duration: `${duration.toFixed(2)}ms`,
        operation 
      });
    };
  }

  async measureDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      this.recordMetric('databaseQueryTime', duration);
      this.debug(`Requête DB "${queryName}" exécutée`, { 
        duration: `${duration.toFixed(2)}ms` 
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric('errorRate', 1);
      this.error(`Erreur requête DB "${queryName}"`, { 
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Enregistrement des métriques
  private recordMetric(metric: keyof Omit<PerformanceMetrics, 'timestamp'>, value: number) {
    const metricEntry: PerformanceMetrics = {
      apiResponseTime: 0,
      databaseQueryTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      errorRate: 0,
      timestamp: new Date().toISOString(),
      ...this.metrics[this.metrics.length - 1] || {}
    };

    metricEntry[metric] = value;
    metricEntry.timestamp = new Date().toISOString();

    this.metrics.push(metricEntry);

    // Limiter le nombre de métriques stockées
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private addLog(
    level: LogEntry['level'], 
    message: string, 
    context?: Record<string, any>
  ) {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Limiter le nombre de logs stockés
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Afficher dans la console en mode développement
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 
                           level === 'debug' ? 'debug' : 'log';
      
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '');
    }
  }

  // Méthodes d'analyse
  getAverageResponseTime(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    const total = recentMetrics.reduce((sum, metric) => 
      sum + metric.apiResponseTime, 0);
    return total / recentMetrics.length;
  }

  getAverageDatabaseTime(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    const total = recentMetrics.reduce((sum, metric) => 
      sum + metric.databaseQueryTime, 0);
    return total / recentMetrics.length;
  }

  getErrorRate(): number {
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length === 0) return 0;
    
    const totalErrors = recentMetrics.reduce((sum, metric) => 
      sum + metric.errorRate, 0);
    return totalErrors / recentMetrics.length;
  }

  getRecentLogs(limit: number = 50): LogEntry[] {
    return this.logs.slice(-limit);
  }

  getRecentMetrics(limit: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  // Export des données pour analyse
  exportMetrics(): string {
    return JSON.stringify({
      logs: this.logs,
      metrics: this.metrics,
      summary: {
        averageResponseTime: this.getAverageResponseTime(),
        averageDatabaseTime: this.getAverageDatabaseTime(),
        errorRate: this.getErrorRate(),
        totalLogs: this.logs.length,
        totalMetrics: this.metrics.length
      }
    }, null, 2);
  }

  // Alertes de performance
  checkPerformanceAlerts(): string[] {
    const alerts: string[] = [];
    
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > 1000) {
      alerts.push(`Temps de réponse élevé détecté: ${avgResponseTime.toFixed(2)}ms`);
    }

    const avgDbTime = this.getAverageDatabaseTime();
    if (avgDbTime > 500) {
      alerts.push(`Temps de requête DB élevé détecté: ${avgDbTime.toFixed(2)}ms`);
    }

    const errorRate = this.getErrorRate();
    if (errorRate > 0.1) {
      alerts.push(`Taux d'erreur élevé détecté: ${(errorRate * 100).toFixed(2)}%`);
    }

    return alerts;
  }

  // Nettoyage périodique
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) > oneHourAgo
    );
    
    this.metrics = this.metrics.filter(metric => 
      new Date(metric.timestamp) > oneHourAgo
    );
  }
}

// Instance globale du monitor
export const performanceMonitor = new PerformanceMonitor();

// Nettoyage automatique toutes les heures
setInterval(() => {
  performanceMonitor.cleanup();
}, 60 * 60 * 1000);

// Hook React pour utilisation dans les composants
export function usePerformanceMonitor() {
  return {
    info: performanceMonitor.info.bind(performanceMonitor),
    warn: performanceMonitor.warn.bind(performanceMonitor),
    error: performanceMonitor.error.bind(performanceMonitor),
    debug: performanceMonitor.debug.bind(performanceMonitor),
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    measureDatabaseQuery: performanceMonitor.measureDatabaseQuery.bind(performanceMonitor),
    getAverageResponseTime: performanceMonitor.getAverageResponseTime.bind(performanceMonitor),
    getAverageDatabaseTime: performanceMonitor.getAverageDatabaseTime.bind(performanceMonitor),
    getErrorRate: performanceMonitor.getErrorRate.bind(performanceMonitor),
    getRecentLogs: performanceMonitor.getRecentLogs.bind(performanceMonitor),
    getRecentMetrics: performanceMonitor.getRecentMetrics.bind(performanceMonitor),
    checkPerformanceAlerts: performanceMonitor.checkPerformanceAlerts.bind(performanceMonitor),
    exportMetrics: performanceMonitor.exportMetrics.bind(performanceMonitor)
  };
}