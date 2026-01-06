/**
 * Configuration Globale des Optimisations
 * Universal Eats - Phase 1 Optimisation
 */

export interface OptimizationConfig {
  monitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    alertThresholds: {
      apiResponseTime: number;
      databaseQueryTime: number;
      errorRate: number;
    };
    retentionPeriod: number; // en heures
  };
  
  cache: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'ttl';
    preloading: {
      enabled: boolean;
      interval: number;
    };
  };
  
  database: {
    enabled: boolean;
    queryOptimization: boolean;
    batchSize: number;
    connectionPooling: boolean;
    indexRecommendations: boolean;
  };
  
  security: {
    enabled: boolean;
    mfaRequired: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    suspiciousActivityDetection: boolean;
  };
  
  testing: {
    enabled: boolean;
    autoRun: boolean;
    coverage: number;
    performanceThresholds: {
      apiResponseTime: number;
      databaseQueryTime: number;
    };
  };
}

export const DEFAULT_CONFIG: OptimizationConfig = {
  monitoring: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    alertThresholds: {
      apiResponseTime: 1000, // 1 seconde
      databaseQueryTime: 500, // 500ms
      errorRate: 0.05 // 5%
    },
    retentionPeriod: 24 // 24 heures
  },
  
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    strategy: 'ttl',
    preloading: {
      enabled: true,
      interval: 30 * 60 * 1000 // 30 minutes
    }
  },
  
  database: {
    enabled: true,
    queryOptimization: true,
    batchSize: 100,
    connectionPooling: true,
    indexRecommendations: true
  },
  
  security: {
    enabled: true,
    mfaRequired: false, // À activer plus tard
    sessionTimeout: 60 * 60 * 1000, // 1 heure
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    suspiciousActivityDetection: true
  },
  
  testing: {
    enabled: true,
    autoRun: false, // Activé seulement en développement
    coverage: 80,
    performanceThresholds: {
      apiResponseTime: 200, // 200ms
      databaseQueryTime: 150 // 150ms
    }
  }
};

// Configuration par environnement
export const ENVIRONMENTS = {
  development: {
    ...DEFAULT_CONFIG,
    monitoring: {
      ...DEFAULT_CONFIG.monitoring,
      logLevel: 'debug',
      retentionPeriod: 12 // 12 heures en dev
    },
    testing: {
      ...DEFAULT_CONFIG.testing,
      autoRun: true
    }
  },
  
  staging: {
    ...DEFAULT_CONFIG,
    monitoring: {
      ...DEFAULT_CONFIG.monitoring,
      logLevel: 'info',
      retentionPeriod: 48 // 48 heures
    }
  },
  
  production: {
    ...DEFAULT_CONFIG,
    monitoring: {
      ...DEFAULT_CONFIG.monitoring,
      logLevel: 'warn',
      retentionPeriod: 168 // 1 semaine
    },
    cache: {
      ...DEFAULT_CONFIG.cache,
      maxSize: 5000, // Cache plus grand en prod
      strategy: 'lru'
    },
    testing: {
      ...DEFAULT_CONFIG.testing,
      autoRun: false
    }
  }
};

// Gestionnaire de configuration
class OptimizationConfigManager {
  private config: OptimizationConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): OptimizationConfig {
    // Charger depuis les variables d'environnement ou utiliser la config par défaut
    const env = process.env.NODE_ENV || 'development';
    
    // Override avec les variables d'environnement si elles existent
    const envConfig = this.getEnvOverrides();
    
    return {
      ...ENVIRONMENTS[env as keyof typeof ENVIRONMENTS] || DEFAULT_CONFIG,
      ...envConfig
    };
  }
  
  private getEnvOverrides(): Partial<OptimizationConfig> {
    const overrides: Partial<OptimizationConfig> = {};
    
    if (process.env.OPTIMIZATION_ENABLED !== undefined) {
      overrides.monitoring = {
        ...overrides.monitoring,
        enabled: process.env.OPTIMIZATION_ENABLED === 'true'
      };
    }
    
    if (process.env.CACHE_TTL !== undefined) {
      overrides.cache = {
        ...overrides.cache,
        defaultTTL: parseInt(process.env.CACHE_TTL, 10)
      };
    }
    
    if (process.env.SECURITY_MFA_REQUIRED !== undefined) {
      overrides.security = {
        ...overrides.security,
        mfaRequired: process.env.SECURITY_MFA_REQUIRED === 'true'
      };
    }
    
    if (process.env.TESTING_AUTO_RUN !== undefined) {
      overrides.testing = {
        ...overrides.testing,
        autoRun: process.env.TESTING_AUTO_RUN === 'true'
      };
    }
    
    return overrides;
  }
  
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<OptimizationConfig>) {
    this.config = {
      ...this.config,
      ...updates,
      monitoring: { ...this.config.monitoring, ...updates.monitoring },
      cache: { ...this.config.cache, ...updates.cache },
      database: { ...this.config.database, ...updates.database },
      security: { ...this.config.security, ...updates.security },
      testing: { ...this.config.testing, ...updates.testing }
    };
  }
  
  // Méthodes de validation
  validateConfig(config: OptimizationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validation monitoring
    if (config.monitoring.alertThresholds.apiResponseTime <= 0) {
      errors.push('Le seuil de temps de réponse API doit être positif');
    }
    
    if (config.monitoring.alertThresholds.errorRate < 0 || config.monitoring.alertThresholds.errorRate > 1) {
      errors.push('Le taux d\'erreur doit être entre 0 et 1');
    }
    
    // Validation cache
    if (config.cache.defaultTTL <= 0) {
      errors.push('Le TTL par défaut du cache doit être positif');
    }
    
    if (config.cache.maxSize <= 0) {
      errors.push('La taille maximale du cache doit être positive');
    }
    
    // Validation sécurité
    if (config.security.maxLoginAttempts <= 0) {
      errors.push('Le nombre maximum de tentatives de connexion doit être positif');
    }
    
    if (config.security.sessionTimeout <= 0) {
      errors.push('Le timeout de session doit être positif');
    }
    
    // Validation tests
    if (config.testing.coverage < 0 || config.testing.coverage > 100) {
      errors.push('La couverture de tests doit être entre 0 et 100');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Export de la configuration pour debugging
  exportConfig(): string {
    return JSON.stringify({
      config: this.config,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }
  
  // Import de configuration (pour restauration)
  importConfig(configJson: string): boolean {
    try {
      const imported = JSON.parse(configJson);
      const config = imported.config as OptimizationConfig;
      
      const validation = this.validateConfig(config);
      if (validation.valid) {
        this.updateConfig(config);
        return true;
      } else {
        console.error('Configuration invalide:', validation.errors);
        return false;
      }
    } catch (error) {
      console.error('Erreur parsing configuration:', error);
      return false;
    }
  }
}

// Instance globale du gestionnaire
export const configManager = new OptimizationConfigManager();

// Utilitaires de configuration
export class ConfigUtils {
  static isEnabled(feature: keyof OptimizationConfig): boolean {
    const config = configManager.getConfig();
    return (config[feature] as any)?.enabled || false;
  }
  
  static getThreshold(threshold: keyof OptimizationConfig['monitoring']['alertThresholds']): number {
    const config = configManager.getConfig();
    return config.monitoring.alertThresholds[threshold];
  }
  
  static shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const config = configManager.getConfig();
    const currentLevel = config.monitoring.logLevel;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[currentLevel];
  }
  
  static getCacheConfig() {
    const config = configManager.getConfig();
    return {
      enabled: config.cache.enabled,
      ttl: config.cache.defaultTTL,
      maxSize: config.cache.maxSize,
      strategy: config.cache.strategy
    };
  }
  
  static getSecurityConfig() {
    const config = configManager.getConfig();
    return {
      enabled: config.security.enabled,
      mfaRequired: config.security.mfaRequired,
      sessionTimeout: config.security.sessionTimeout,
      maxAttempts: config.security.maxLoginAttempts
    };
  }
}

// Hook React pour la configuration
export function useOptimizationConfig() {
  return {
    getConfig: configManager.getConfig.bind(configManager),
    updateConfig: configManager.updateConfig.bind(configManager),
    validateConfig: configManager.validateConfig.bind(configManager),
    exportConfig: configManager.exportConfig.bind(configManager),
    importConfig: configManager.importConfig.bind(configManager),
    utils: ConfigUtils
  };
}