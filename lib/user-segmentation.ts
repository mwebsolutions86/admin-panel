/**
 * Système de Segmentation des Utilisateurs
 * Universal Eats - Phase 2 Expérience Utilisateur Améliorée
 * 
 * Ce module permet de segmenter les utilisateurs pour des notifications ciblées
 * et personnalisées selon leurs comportements et préférences.
 */

import { userCache, CacheUtils } from './cache-service';
import { performanceMonitor } from './performance-monitor';

// Types pour la segmentation
export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCriteria {
  // Critères démographiques
  location?: {
    countries?: string[];
    cities?: string[];
    regions?: string[];
    radius?: number; // km autour d'un point
    coordinates?: { lat: number; lng: number };
  };
  
  // Critères comportementaux
  behavior?: {
    orderFrequency?: 'low' | 'medium' | 'high'; // commandes par mois
    averageOrderValue?: {
      min?: number;
      max?: number;
    };
    preferredCategories?: string[];
    preferredStores?: string[];
    paymentMethods?: string[];
    lastOrderDate?: {
      after?: string; // ISO date
      before?: string;
    };
    totalOrders?: {
      min?: number;
      max?: number;
    };
  };
  
  // Critères de fidélité
  loyalty?: {
    loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
    pointsRange?: {
      min?: number;
      max?: number;
    };
    membershipDuration?: {
      min?: number; // jours
      max?: number;
    };
    hasReferrals?: boolean;
  };
  
  // Critères techniques
  technical?: {
    platforms?: ('web' | 'ios' | 'android' | 'desktop')[];
    browserTypes?: string[];
    deviceTypes?: ('mobile' | 'tablet' | 'desktop')[];
    pushEnabled?: boolean;
    lastActive?: {
      after?: string;
      before?: string;
    };
  };
  
  // Critères personnalisés
  custom?: {
    tags?: string[];
    properties?: Record<string, any>;
  };
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
  };
  preferences?: {
    categories?: string[];
    stores?: string[];
    paymentMethods?: string[];
    language?: string;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
      marketing?: boolean;
    };
  };
  behavior?: {
    totalOrders: number;
    averageOrderValue: number;
    lastOrderDate?: string;
    favoriteCategories: string[];
    favoriteStores: string[];
    paymentPreferences: string[];
    orderFrequency: 'low' | 'medium' | 'high';
  };
  loyalty?: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
    membershipDate: string;
    referrals: number;
  };
  technical?: {
    platforms: string[];
    browsers: string[];
    devices: string[];
    lastActive: string;
    pushEnabled: boolean;
  };
  custom?: {
    tags: string[];
    properties: Record<string, any>;
  };
}

export interface SegmentationRule {
  id: string;
  name: string;
  segmentId: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  createdAt: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RuleAction {
  type: 'send_notification' | 'exclude_from_segment' | 'add_tag' | 'remove_tag' | 'update_property' | 'trigger_workflow';
  parameters: Record<string, any>;
}

export interface UserSegmentAssignment {
  userId: string;
  segmentId: string;
  assignedAt: string;
  confidence: number; // 0-1, niveau de confiance de l'assignation
  source: 'manual' | 'automatic' | 'behavioral';
}

// Segments prédéfinis
const DEFAULT_SEGMENTS: UserSegment[] = [
  {
    id: 'frequent-customers',
    name: 'Clients Fréquents',
    description: 'Utilisateurs qui commandent régulièrement (5+ commandes/mois)',
    criteria: {
      behavior: {
        orderFrequency: 'high',
        totalOrders: { min: 20 }
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'high-value-customers',
    name: 'Clients à Forte Valeur',
    description: 'Utilisateurs avec une valeur moyenne de commande élevée',
    criteria: {
      behavior: {
        averageOrderValue: { min: 100 }
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'loyalty-members',
    name: 'Membres Fidélité',
    description: 'Utilisateurs membres du programme de fidélité',
    criteria: {
      loyalty: {
        loyaltyTier: 'silver'
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'new-users',
    name: 'Nouveaux Utilisateurs',
    description: 'Utilisateurs récents (moins de 30 jours)',
    criteria: {
      loyalty: {
        membershipDuration: { max: 30 }
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dormant-users',
    name: 'Utilisateurs Inactifs',
    description: 'Utilisateurs qui n\'ont pas commandé récemment',
    criteria: {
      behavior: {
        lastOrderDate: {
          before: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 60 jours
        }
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'casablanca-users',
    name: 'Utilisateurs Casablanca',
    description: 'Utilisateurs located à Casablanca',
    criteria: {
      location: {
        cities: ['Casablanca', 'الدار البيضاء']
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mobile-users',
    name: 'Utilisateurs Mobile',
    description: 'Utilisateurs préférant les plateformes mobiles',
    criteria: {
      technical: {
        platforms: ['ios', 'android']
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'push-enabled',
    name: 'Push Activé',
    description: 'Utilisateurs ayant activé les notifications push',
    criteria: {
      technical: {
        pushEnabled: true
      }
    },
    userCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Service de segmentation des utilisateurs
 */
export class UserSegmentationService {
  private segments: Map<string, UserSegment> = new Map();
  private assignments: Map<string, Set<string>> = new Map(); // userId -> Set of segmentIds
  private userProfiles: Map<string, UserProfile> = new Map();
  private rules: Map<string, SegmentationRule> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeDefaultSegments();
    this.loadFromCache();
    
    performanceMonitor.info('UserSegmentationService initialisé', {
      segments: this.segments.size,
      rules: this.rules.size
    });
  }

  /**
   * Initialise les segments par défaut
   */
  private initializeDefaultSegments() {
    DEFAULT_SEGMENTS.forEach(segment => {
      this.segments.set(segment.id, segment);
    });
    performanceMonitor.debug('Segments par défaut initialisés', { count: this.segments.size });
  }

  /**
   * Charge les données depuis le cache Phase 1
   */
  private loadFromCache() {
    try {
      // Charger les segments
      const cachedSegments = userCache.get('user_segments');
      if (cachedSegments) {
        cachedSegments.forEach((segment: UserSegment) => {
          this.segments.set(segment.id, segment);
        });
      }

      // Charger les assignations
      const cachedAssignments = userCache.get('user_segment_assignments');
      if (cachedAssignments) {
        Object.entries(cachedAssignments).forEach(([userId, segmentIds]) => {
          this.assignments.set(userId, new Set(segmentIds as string[]));
        });
      }

      // Charger les profils utilisateurs
      const cachedProfiles = userCache.get('user_profiles');
      if (cachedProfiles) {
        Object.entries(cachedProfiles).forEach(([userId, profile]) => {
          this.userProfiles.set(userId, profile as UserProfile);
        });
      }

      // Charger les règles
      const cachedRules = userCache.get('segmentation_rules');
      if (cachedRules) {
        cachedRules.forEach((rule: SegmentationRule) => {
          this.rules.set(rule.id, rule);
        });
      }

      performanceMonitor.info('Données de segmentation chargées depuis le cache');
    } catch (error) {
      performanceMonitor.error('Erreur chargement cache segmentation', { error });
    }
  }

  /**
   * Sauvegarde dans le cache Phase 1
   */
  private saveToCache() {
    try {
      // Sauvegarder les segments
      const segments = Array.from(this.segments.values());
      userCache.set('user_segments', segments, 60 * 60 * 1000); // 1 heure

      // Sauvegarder les assignations
      const assignmentsObj = Object.fromEntries(
        Array.from(this.assignments.entries()).map(([userId, segments]) => [
          userId,
          Array.from(segments)
        ])
      );
      userCache.set('user_segment_assignments', assignmentsObj, 30 * 60 * 1000); // 30 minutes

      // Sauvegarder les profils
      const profilesObj = Object.fromEntries(this.userProfiles);
      userCache.set('user_profiles', profilesObj, 15 * 60 * 1000); // 15 minutes

      // Sauvegarder les règles
      const rules = Array.from(this.rules.values());
      userCache.set('segmentation_rules', rules, 30 * 60 * 1000); // 30 minutes

      performanceMonitor.debug('Données de segmentation sauvegardées');
    } catch (error) {
      performanceMonitor.error('Erreur sauvegarde cache segmentation', { error });
    }
  }

  /**
   * Initialise le service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      performanceMonitor.info('Initialisation du service de segmentation');

      // Recalculer tous les segments
      await this.recalculateAllSegments();

      // Appliquer les règles automatiques
      await this.applyAutomaticRules();

      this.isInitialized = true;
      performanceMonitor.info('Service de segmentation initialisé avec succès');

    } catch (error) {
      performanceMonitor.error('Erreur initialisation service segmentation', { error });
      throw error;
    }
  }

  /**
   * Ajoute ou met à jour un profil utilisateur
   */
  updateUserProfile(userId: string, profile: Partial<UserProfile>): void {
    const existingProfile = this.userProfiles.get(userId) || {
      id: userId,
      behavior: {
        totalOrders: 0,
        averageOrderValue: 0,
        favoriteCategories: [],
        favoriteStores: [],
        paymentPreferences: [],
        orderFrequency: 'low'
      },
      loyalty: {
        tier: 'bronze',
        points: 0,
        membershipDate: new Date().toISOString(),
        referrals: 0
      },
      technical: {
        platforms: [],
        browsers: [],
        devices: [],
        lastActive: new Date().toISOString(),
        pushEnabled: false
      },
      custom: {
        tags: [],
        properties: {}
      }
    };

    const updatedProfile = { ...existingProfile, ...profile };
    this.userProfiles.set(userId, updatedProfile);

    // Recalculer les segments pour cet utilisateur
    this.recalculateUserSegments(userId);

    this.saveToCache();

    performanceMonitor.debug('Profil utilisateur mis à jour', {
      userId,
      changes: Object.keys(profile)
    });
  }

  /**
   * Récupère le profil d'un utilisateur
   */
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Récupère tous les segments
   */
  getSegments(): UserSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Récupère un segment par ID
   */
  getSegment(segmentId: string): UserSegment | undefined {
    return this.segments.get(segmentId);
  }

  /**
   * Ajoute ou met à jour un segment
   */
  saveSegment(segment: UserSegment): void {
    segment.updatedAt = new Date().toISOString();
    this.segments.set(segment.id, segment);
    this.saveToCache();
    performanceMonitor.info('Segment sauvegardé', { segmentId: segment.id });
  }

  /**
   * Supprime un segment
   */
  deleteSegment(segmentId: string): void {
    this.segments.delete(segmentId);
    
    // Supprimer les assignations à ce segment
    for (const [userId, segments] of this.assignments.entries()) {
      if (segments.has(segmentId)) {
        segments.delete(segmentId);
      }
    }

    this.saveToCache();
    performanceMonitor.info('Segment supprimé', { segmentId });
  }

  /**
   * Assigne manuellement un utilisateur à un segment
   */
  assignUserToSegment(userId: string, segmentId: string, confidence = 1): void {
    let userSegments = this.assignments.get(userId);
    if (!userSegments) {
      userSegments = new Set();
      this.assignments.set(userId, userSegments);
    }
    
    userSegments.add(segmentId);

    // Mettre à jour les stats du segment
    const segment = this.segments.get(segmentId);
    if (segment) {
      segment.userCount = userSegments.size;
    }

    this.saveToCache();
    performanceMonitor.info('Utilisateur assigné à un segment', {
      userId,
      segmentId,
      confidence
    });
  }

  /**
   * Désassigne un utilisateur d'un segment
   */
  unassignUserFromSegment(userId: string, segmentId: string): void {
    const userSegments = this.assignments.get(userId);
    if (userSegments) {
      userSegments.delete(segmentId);
      
      // Mettre à jour les stats du segment
      const segment = this.segments.get(segmentId);
      if (segment) {
        segment.userCount = userSegments.size;
      }
    }

    this.saveToCache();
    performanceMonitor.info('Utilisateur désassigné d\'un segment', { userId, segmentId });
  }

  /**
   * Récupère les segments d'un utilisateur
   */
  getUserSegments(userId: string): UserSegment[] {
    const userSegmentIds = this.assignments.get(userId);
    if (!userSegmentIds) return [];

    return Array.from(userSegmentIds)
      .map(segmentId => this.segments.get(segmentId))
      .filter((segment): segment is UserSegment => segment !== undefined);
  }

  /**
   * Récupère les utilisateurs d'un segment
   */
  getSegmentUsers(segmentId: string): string[] {
    const users: string[] = [];
    
    for (const [userId, segments] of this.assignments.entries()) {
      if (segments.has(segmentId)) {
        users.push(userId);
      }
    }
    
    return users;
  }

  /**
   * Vérifie si un utilisateur correspond aux critères d'un segment
   */
  private userMatchesCriteria(user: UserProfile, criteria: SegmentCriteria): boolean {
    // Critères de localisation
    if (criteria.location) {
      if (criteria.location.countries && user.location?.country) {
        if (!criteria.location.countries.includes(user.location.country)) {
          return false;
        }
      }
      if (criteria.location.cities && user.location?.city) {
        if (!criteria.location.cities.includes(user.location.city)) {
          return false;
        }
      }
    }

    // Critères comportementaux
    if (criteria.behavior) {
      if (criteria.behavior.orderFrequency && user.behavior?.orderFrequency) {
        if (criteria.behavior.orderFrequency !== user.behavior.orderFrequency) {
          return false;
        }
      }
      if (criteria.behavior.averageOrderValue) {
        const avgValue = user.behavior?.averageOrderValue || 0;
        if (criteria.behavior.averageOrderValue.min && avgValue < criteria.behavior.averageOrderValue.min) {
          return false;
        }
        if (criteria.behavior.averageOrderValue.max && avgValue > criteria.behavior.averageOrderValue.max) {
          return false;
        }
      }
      if (criteria.behavior.totalOrders) {
        const totalOrders = user.behavior?.totalOrders || 0;
        if (criteria.behavior.totalOrders.min && totalOrders < criteria.behavior.totalOrders.min) {
          return false;
        }
        if (criteria.behavior.totalOrders.max && totalOrders > criteria.behavior.totalOrders.max) {
          return false;
        }
      }
    }

    // Critères de fidélité
    if (criteria.loyalty) {
      if (criteria.loyalty.loyaltyTier && user.loyalty?.tier) {
        if (criteria.loyalty.loyaltyTier !== user.loyalty.tier) {
          return false;
        }
      }
      if (criteria.loyalty.pointsRange) {
        const points = user.loyalty?.points || 0;
        if (criteria.loyalty.pointsRange.min && points < criteria.loyalty.pointsRange.min) {
          return false;
        }
        if (criteria.loyalty.pointsRange.max && points > criteria.loyalty.pointsRange.max) {
          return false;
        }
      }
    }

    // Critères techniques
    if (criteria.technical) {
      if (criteria.technical.platforms && user.technical?.platforms) {
        const hasCommonPlatform = criteria.technical.platforms.some(platform =>
          user.technical!.platforms.includes(platform)
        );
        if (!hasCommonPlatform) {
          return false;
        }
      }
      if (criteria.technical.pushEnabled !== undefined) {
        if (user.technical?.pushEnabled !== criteria.technical.pushEnabled) {
          return false;
        }
      }
    }

    // Critères personnalisés
    if (criteria.custom?.tags && user.custom?.tags) {
      const hasCommonTag = criteria.custom.tags.some(tag =>
        user.custom!.tags.includes(tag)
      );
      if (!hasCommonTag) {
        return false;
      }
    }

    return true;
  }

  /**
   * Recalcule les segments pour un utilisateur
   */
  private recalculateUserSegments(userId: string): void {
    const user = this.userProfiles.get(userId);
    if (!user) return;

    const userSegments = this.assignments.get(userId) || new Set();

    // Vérifier tous les segments actifs
    for (const segment of this.segments.values()) {
      if (!segment.isActive) continue;

      const matches = this.userMatchesCriteria(user, segment.criteria);
      
      if (matches && !userSegments.has(segment.id)) {
        // L'utilisateur correspond au segment mais n'y est pas assigné
        userSegments.add(segment.id);
        performanceMonitor.debug('Utilisateur assigné automatiquement à un segment', {
          userId,
          segmentId: segment.id
        });
      } else if (!matches && userSegments.has(segment.id)) {
        // L'utilisateur ne correspond plus au segment mais y est assigné
        userSegments.delete(segment.id);
        performanceMonitor.debug('Utilisateur désassigné automatiquement d\'un segment', {
          userId,
          segmentId: segment.id
        });
      }
    }

    this.assignments.set(userId, userSegments);
  }

  /**
   * Recalcule tous les segments
   */
  private async recalculateAllSegments(): Promise<void> {
    performanceMonitor.info('Recalcul de tous les segments');

    for (const userId of this.userProfiles.keys()) {
      this.recalculateUserSegments(userId);
    }

    // Mettre à jour les compteurs de segments
    for (const segment of this.segments.values()) {
      segment.userCount = this.getSegmentUsers(segment.id).length;
    }

    this.saveToCache();
    performanceMonitor.info('Recalcul des segments terminé');
  }

  /**
   * Ajoute une règle de segmentation
   */
  saveRule(rule: SegmentationRule): void {
    rule.id = rule.id || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    rule.createdAt = new Date().toISOString();
    this.rules.set(rule.id, rule);
    this.saveToCache();
    performanceMonitor.info('Règle de segmentation sauvegardée', { ruleId: rule.id });
  }

  /**
   * Applique les règles automatiques
   */
  private async applyAutomaticRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      try {
        await this.applyRule(rule);
      } catch (error) {
        performanceMonitor.error('Erreur application règle', { error, ruleId: rule.id });
      }
    }
  }

  /**
   * Applique une règle spécifique
   */
  private async applyRule(rule: SegmentationRule): Promise<void> {
    // Cette implémentation peut être étendue pour des règles plus complexes
    performanceMonitor.debug('Règle appliquée', { ruleId: rule.id, type: rule.actions[0]?.type });
  }

  /**
   * Recherche des utilisateurs par critères
   */
  searchUsers(criteria: Partial<SegmentCriteria>): UserProfile[] {
    const results: UserProfile[] = [];

    for (const user of this.userProfiles.values()) {
      if (this.userMatchesCriteria(user, criteria as SegmentCriteria)) {
        results.push(user);
      }
    }

    return results;
  }

  /**
   * Récupère les statistiques de segmentation
   */
  getSegmentationStats(): {
    totalUsers: number;
    totalSegments: number;
    segmentDistribution: Record<string, number>;
    topSegments: { segment: UserSegment; userCount: number }[];
  } {
    const totalUsers = this.userProfiles.size;
    const totalSegments = this.segments.size;

    const segmentDistribution: Record<string, number> = {};
    for (const segment of this.segments.values()) {
      segmentDistribution[segment.name] = segment.userCount;
    }

    const topSegments = Array.from(this.segments.values())
      .map(segment => ({ segment, userCount: segment.userCount }))
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10);

    return {
      totalUsers,
      totalSegments,
      segmentDistribution,
      topSegments
    };
  }

  /**
   * Exporte les données de segmentation
   */
  exportSegmentationData(): string {
    const data = {
      segments: Array.from(this.segments.values()),
      assignments: Object.fromEntries(
        Array.from(this.assignments.entries()).map(([userId, segments]) => [
          userId,
          Array.from(segments)
        ])
      ),
      profiles: Object.fromEntries(this.userProfiles),
      rules: Array.from(this.rules.values()),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Importe les données de segmentation
   */
  importSegmentationData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Valider la structure des données
      if (!data.segments || !data.assignments || !data.profiles) {
        throw new Error('Structure de données invalide');
      }

      // Importer les segments
      this.segments.clear();
      data.segments.forEach((segment: UserSegment) => {
        this.segments.set(segment.id, segment);
      });

      // Importer les assignations
      this.assignments.clear();
      Object.entries(data.assignments).forEach(([userId, segmentIds]) => {
        this.assignments.set(userId, new Set(segmentIds as string[]));
      });

      // Importer les profils
      this.userProfiles.clear();
      Object.entries(data.profiles).forEach(([userId, profile]) => {
        this.userProfiles.set(userId, profile as UserProfile);
      });

      // Importer les règles si présentes
      if (data.rules) {
        this.rules.clear();
        data.rules.forEach((rule: SegmentationRule) => {
          this.rules.set(rule.id, rule);
        });
      }

      this.saveToCache();
      performanceMonitor.info('Données de segmentation importées avec succès');
      return true;

    } catch (error) {
      performanceMonitor.error('Erreur import données segmentation', { error });
      return false;
    }
  }
}

// Instance globale du service
export const userSegmentationService = new UserSegmentationService();