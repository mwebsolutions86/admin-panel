/**
 * Exemples d'Utilisation du Module Analytics
 * Universal Eats - Module Analytics Phase 2
 */

import { 
  AnalyticsFilters, 
  BusinessMetrics, 
  CustomerMetrics, 
  OperationalMetrics,
  ProductAnalytics,
  MarketingMetrics,
  KPIConfig,
  AnalyticsAlert,
  ReportConfig
} from '@/types/analytics';
import { analyticsService } from '@/lib/analytics-service';
import { reportsService } from '@/lib/reports-service';
import { useAnalytics, useBusinessMetrics, useKPIs, useReports } from '@/hooks/use-analytics';

// ============================================================================
// EXEMPLES 1: UTILISATION DU SERVICE ANALYTICS DIRECT
// ============================================================================

/**
 * Exemple 1.1: Récupération des métriques business
 */
export async function exampleGetBusinessMetrics() {
  try {
    // Définir les filtres
    const filters: AnalyticsFilters = {
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      },
      stores: ['store-1', 'store-2'],
      categories: ['burgers', 'pizzas']
    };

    // Récupérer les métriques
    const businessMetrics = await analyticsService.getBusinessMetrics(filters);

    console.log('CA Total:', businessMetrics.totalRevenue);
    console.log('Croissance:', businessMetrics.revenueGrowth.percentage + '%');
    console.log('Panier moyen:', businessMetrics.averageOrderValue + '€');

    return businessMetrics;
  } catch (error) {
    console.error('Erreur récupération métriques business:', error);
    throw error;
  }
}

/**
 * Exemple 1.2: Suivi d'événements analytics
 */
export async function exampleTrackEvents() {
  try {
    // Suivre une commande
    await analyticsService.trackOrderEvent('order-123', 'order_created', {
      storeId: 'store-1',
      sessionId: 'sess-456',
      amount: 45.50
    });

    // Suivre une action utilisateur
    await analyticsService.trackUserAction('user-789', 'product_view', {
      productId: 'prod-123',
      category: 'burgers',
      sessionId: 'sess-456'
    });

    console.log('Événements trackés avec succès');
  } catch (error) {
    console.error('Erreur tracking événements:', error);
    throw error;
  }
}

/**
 * Exemple 1.3: Analyse des tendances
 */
export async function exampleTrendAnalysis() {
  try {
    // Analyser la tendance du chiffre d'affaires sur 3 mois
    const revenueTrend = await analyticsService.analyzeTrends('revenue', '3months');
    
    console.log('Direction tendance:', revenueTrend.trendDirection);
    console.log('Valeur prédite:', revenueTrend.predicted);
    console.log('Confiance:', revenueTrend.confidence + '%');
    console.log('Facteurs:', revenueTrend.factors);

    return revenueTrend;
  } catch (error) {
    console.error('Erreur analyse tendances:', error);
    throw error;
  }
}

// ============================================================================
// EXEMPLES 2: UTILISATION DES HOOKS REACT
// ============================================================================

/**
 * Exemple 2.1: Hook useAnalytics - Dashboard complet
 */
export function exampleUseAnalyticsHook() {
  // Dans un composant React
  const {
    businessMetrics,
    customerMetrics,
    operationalMetrics,
    productAnalytics,
    marketingMetrics,
    performanceMetrics,
    kpiConfigs,
    alerts,
    filters,
    isLoading,
    error,
    lastUpdated,
    refresh,
    updateFilters
  } = useAnalytics({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enableRealtime: true
  });

  // Utilisation des données
  if (isLoading) {
    return <div>Chargement des analytics...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="kpis-section">
        <h2>KPIs Principaux</h2>
        <div className="kpi-grid">
          <div className="kpi-card">
            <h3>Chiffre d'affaires</h3>
            <p>{businessMetrics?.totalRevenue?.toFixed(2)}€</p>
            <span className={businessMetrics?.revenueGrowth?.trend === 'up' ? 'positive' : 'negative'}>
              {(businessMetrics?.revenueGrowth?.percentage ?? 0) > 0 ? '+' : ''}
              {(businessMetrics?.revenueGrowth?.percentage ?? 0).toFixed(1)}%
            </span>
          </div>
          
          <div className="kpi-card">
            <h3>Commandes</h3>
            <p>{businessMetrics?.ordersCount}</p>
          </div>
          
          <div className="kpi-card">
            <h3>Satisfaction</h3>
            <p>{operationalMetrics?.customerSatisfaction?.toFixed(1)}/5</p>
          </div>
        </div>
      </div>

      <div className="controls">
        <button onClick={refresh}>Actualiser</button>
        <select 
          value={filters.dateRange ? `${filters.dateRange.start},${filters.dateRange.end}` : ''}
          onChange={(e) => {
            const [start, end] = e.target.value.split(',');
            updateFilters({
              dateRange: {
                start: new Date(start),
                end: new Date(end)
              }
            });
          }}
        >
          <option value="">Toute la période</option>
          <option value="2024-01-01,2024-01-07">Cette semaine</option>
          <option value="2024-01-01,2024-01-31">Ce mois</option>
        </select>
      </div>

      <div className="alerts-section">
        <h3>Alertes Actives ({alerts.length})</h3>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Exemple 2.2: Hook spécialisé useBusinessMetrics
 */
export function exampleUseBusinessMetricsHook() {
  const { metrics, isLoading, error, refresh } = useBusinessMetrics(
    {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
        end: new Date()
      }
    },
    {
      autoRefresh: true,
      refreshInterval: 60000 // 1 minute
    }
  );

  return (
    <div className="business-metrics">
      <h2>Métriques Business - 7 derniers jours</h2>
      {isLoading && <p>Chargement...</p>}
      {error && <p>Erreur: {error}</p>}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric">
            <label>CA Total</label>
            <div className="value">{metrics.totalRevenue.toFixed(2)}€</div>
          </div>
          <div className="metric">
            <label>Nombre de commandes</label>
            <div className="value">{metrics.ordersCount}</div>
          </div>
          <div className="metric">
            <label>Panier moyen</label>
            <div className="value">{metrics.averageOrderValue.toFixed(2)}€</div>
          </div>
          <div className="metric">
            <label>Croissance CA</label>
            <div className={metrics?.revenueGrowth?.trend === 'up' ? 'positive' : 'negative'}>
              {(metrics?.revenueGrowth?.percentage ?? 0) > 0 ? '+' : ''}
              {(metrics?.revenueGrowth?.percentage ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
      <button onClick={refresh}>Actualiser</button>
    </div>
  );
}

/**
 * Exemple 2.3: Hook useKPIs pour la gestion des indicateurs
 */
export function exampleUseKPIsHook() {
  const { kpis, alerts, isLoading, updateKPI, checkThresholds } = useKPIs();

  const handleUpdateKPI = async (kpiId: string, newTarget: number) => {
    const kpi = kpis.find(k => k.id === kpiId);
    if (kpi) {
      const updatedKPI = { ...kpi, target: newTarget };
      try {
        await updateKPI(updatedKPI);
        console.log('KPI mis à jour:', updatedKPI);
      } catch (error) {
        console.error('Erreur mise à jour KPI:', error);
      }
    }
  };

  return (
    <div className="kpis-management">
      <h2>Gestion des KPIs</h2>
      
      <div className="kpis-list">
        {kpis.map(kpi => (
          <div key={kpi.id} className="kpi-item">
            <h3>{kpi.name}</h3>
            <p>Catégorie: {kpi.category}</p>
            <p>Cible: {kpi.target}</p>
            <p>Fréquence: {kpi.frequency}</p>
            <label>
              Nouvelle cible:
              <input 
                type="number" 
                defaultValue={kpi.target}
                onBlur={(e) => handleUpdateKPI(kpi.id, parseFloat(e.target.value))}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="alerts-section">
        <h3>Alertes KPIs ({alerts.length})</h3>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            <strong>{alert.title}</strong>
            <p>{alert.message}</p>
            <small>Seuil: {alert.thresholdValue}</small>
          </div>
        ))}
      </div>

      <button onClick={checkThresholds}>
        Vérifier les seuils maintenant
      </button>
    </div>
  );
}

// ============================================================================
// EXEMPLES 3: GÉNÉRATION DE RAPPORTS
// ============================================================================

/**
 * Exemple 3.1: Génération de rapport manuel
 */
export async function exampleGenerateReport() {
  try {
    const reportResult = await reportsService.generateReport(
      'daily_summary',
      {
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      },
      'pdf'
    );

    console.log('Rapport généré:', reportResult.data.title);
    console.log('Fichier:', reportResult.filename);
    console.log('Insights:', reportResult.data.insights);
    console.log('Recommandations:', reportResult.data.recommendations);

    return reportResult;
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    throw error;
  }
}

/**
 * Exemple 3.2: Programmation de rapport automatique
 */
export async function exampleScheduleReport() {
  try {
    const reportConfig: ReportConfig = {
      id: 'weekly_performance',
      name: 'Performance Hebdomadaire',
      description: 'Rapport hebdomadaire des performances',
      type: 'weekly',
      frequency: 'weekly',
      format: 'excel',
      recipients: ['manager@universaleats.com', 'ceo@universaleats.com'],
      filters: {
        stores: ['store-1', 'store-2']
      },
      isActive: true
    };

    const scheduleId = await reportsService.scheduleReport(reportConfig, {
      cronExpression: '0 9 * * 1', // Tous les lundi à 9h
      recipients: ['manager@universaleats.com']
    });

    console.log('Rapport programmé avec ID:', scheduleId);
    return scheduleId;
  } catch (error) {
    console.error('Erreur programmation rapport:', error);
    throw error;
  }
}

// ============================================================================
// EXEMPLES 4: CAS D'UTILISATION BUSINESS
// ============================================================================

/**
 * Exemple 4.1: Analyse de performance par magasin
 */
export async function exampleStorePerformanceAnalysis() {
  try {
    // Récupérer les métriques de tous les magasins
    const storeMetrics = await analyticsService.getStoreMetrics();

    // Trier par chiffre d'affaires
    const sortedStores = storeMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);

    console.log('Classement des magasins:');
    sortedStores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.storeName}`);
      console.log(`   CA: ${store.totalRevenue.toFixed(2)}€`);
      console.log(`   Commandes: ${store.ordersCount}`);
      console.log(`   Panier moyen: ${store.averageOrderValue.toFixed(2)}€`);
      console.log(`   Performance: ${store.performance}`);
    });

    return sortedStores;
  } catch (error) {
    console.error('Erreur analyse performance:', error);
    throw error;
  }
}

/**
 * Exemple 4.2: Détection de problèmes opérationnels
 */
export async function exampleOperationalIssuesDetection() {
  try {
    const operationalMetrics = await analyticsService.getOperationalMetrics();

    const issues: Array<{ type: string; severity: string; message: string; recommendation: string }> = [];

    // Vérifier les temps de livraison
    if (operationalMetrics.averageDeliveryTime > 35) {
      issues.push({
        type: 'delivery_time',
        severity: 'warning',
        message: `Temps de livraison élevé: ${operationalMetrics.averageDeliveryTime.toFixed(1)} minutes`,
        recommendation: 'Optimiser les routes et augmenter le nombre de livreurs'
      });
    }

    // Vérifier la satisfaction client
    if (operationalMetrics.customerSatisfaction < 4.0) {
      issues.push({
        type: 'satisfaction',
        severity: 'critical',
        message: `Satisfaction client faible: ${operationalMetrics.customerSatisfaction.toFixed(1)}/5`,
        recommendation: 'Analyser les retours clients et améliorer la qualité'
      });
    }

    // Vérifier le taux de précision
    if (operationalMetrics.orderAccuracy < 0.95) {
      issues.push({
        type: 'accuracy',
        severity: 'warning',
        message: `Taux de précision faible: ${(operationalMetrics.orderAccuracy * 100).toFixed(1)}%`,
        recommendation: 'Former le personnel et améliorer les processus'
      });
    }

    console.log('Problèmes détectés:', issues.length);
    issues.forEach(issue => {
      console.log(`- [${issue.severity}] ${issue.message}`);
      console.log(`  Recommandation: ${issue.recommendation}`);
    });

    return issues;
  } catch (error) {
    console.error('Erreur détection problèmes:', error);
    throw error;
  }
}

/**
 * Exemple 4.3: Analyse de segmentation client
 */
export async function exampleCustomerSegmentationAnalysis() {
  try {
    const customerMetrics = await analyticsService.getCustomerMetrics();

    const totalCustomers = customerMetrics.totalCustomers;
    const segments = customerMetrics.customerSegments;

    // Calculer les pourcentages
    const percentages = {
      vip: (segments.vip / totalCustomers * 100).toFixed(1),
      regular: (segments.regular / totalCustomers * 100).toFixed(1),
      occasional: (segments.occasional / totalCustomers * 100).toFixed(1),
      atRisk: (segments.atRisk / totalCustomers * 100).toFixed(1)
    };

    console.log('Segmentation client:');
    console.log(`VIP: ${segments.vip} clients (${percentages.vip}%)`);
    console.log(`Réguliers: ${segments.regular} clients (${percentages.regular}%)`);
    console.log(`Occasionnels: ${segments.occasional} clients (${percentages.occasional}%)`);
    console.log(`À risque: ${segments.atRisk} clients (${percentages.atRisk}%)`);

    // Recommandations basées sur la segmentation
    const recommendations: string[] = [];

    if (segments.atRisk > totalCustomers * 0.15) {
      recommendations.push('Mettre en place une campagne de rétention urgente');
    }

    if (segments.vip < totalCustomers * 0.10) {
      recommendations.push('Développer le programme VIP pour augmenter la base premium');
    }

    if (customerMetrics.customerRetentionRate < 0.60) {
      recommendations.push('Améliorer l\'expérience client pour augmenter la rétention');
    }

    console.log('Recommandations:', recommendations);

    return {
      segmentation: { ...segments, total: totalCustomers },
      percentages,
      recommendations
    };
  } catch (error) {
    console.error('Erreur analyse segmentation:', error);
    throw error;
  }
}

// ============================================================================
// EXEMPLES 5: INTÉGRATION AVEC SYSTÈMES EXISTANTS
// ============================================================================

/**
 * Exemple 5.1: Intégration avec les notifications push
 */
export async function exampleNotificationIntegration() {
  try {
    // Vérifier les alertes KPI
    const alerts = await analyticsService.checkKPIThresholds();

    // Pour chaque alerte critique, envoyer une notification
    for (const alert of alerts) {
      if (alert.type === 'critical') {
        // Intégration avec le service de notifications existant
        console.log(`Notification envoyée: ${alert.title}`);
        console.log(`Message: ${alert.message}`);
        
        // Dans une implémentation réelle:
        // await notificationsService.sendNotification({
        //   title: `🚨 ${alert.title}`,
        //   body: alert.message,
        //   type: 'urgent',
        //   data: { alertId: alert.id }
        // });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Erreur intégration notifications:', error);
    throw error;
  }
}

/**
 * Exemple 5.2: Intégration avec le cache Phase 1
 */
export async function exampleCacheIntegration() {
  try {
    // Utiliser le cache existant pour optimiser les requêtes analytics
    const { productCache, orderCache } = await import('@/lib/cache-service');

    // Vérifier si les données sont en cache
    const cachedRevenue = productCache.get('analytics:revenue:daily');
    
    if (cachedRevenue) {
      console.log('Données récupérées depuis le cache');
      return cachedRevenue;
    } else {
      console.log('Cache miss, calcul des données...');
      const metrics = await analyticsService.getBusinessMetrics();
      
      // Mettre en cache pour 5 minutes
      productCache.set('analytics:revenue:daily', metrics, 5 * 60 * 1000);
      
      return metrics;
    }
  } catch (error) {
    console.error('Erreur intégration cache:', error);
    throw error;
  }
}

// ============================================================================
// EXPORT DES EXEMPLES
// ============================================================================

export const analyticsExamples = {
  // Services
  getBusinessMetrics: exampleGetBusinessMetrics,
  trackEvents: exampleTrackEvents,
  trendAnalysis: exampleTrendAnalysis,
  
  // Hooks
  useAnalytics: exampleUseAnalyticsHook,
  useBusinessMetrics: exampleUseBusinessMetricsHook,
  useKPIs: exampleUseKPIsHook,
  
  // Rapports
  generateReport: exampleGenerateReport,
  scheduleReport: exampleScheduleReport,
  
  // Cas d'usage business
  storePerformanceAnalysis: exampleStorePerformanceAnalysis,
  operationalIssuesDetection: exampleOperationalIssuesDetection,
  customerSegmentationAnalysis: exampleCustomerSegmentationAnalysis,
  
  // Intégrations
  notificationIntegration: exampleNotificationIntegration,
  cacheIntegration: exampleCacheIntegration
};

export default analyticsExamples;