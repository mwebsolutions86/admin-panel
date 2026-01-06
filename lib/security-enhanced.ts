/**
 * Système de Sécurité Avancée
 * Universal Eats - Phase 1 Optimisation
 */

import { create } from 'zustand';
import { supabase } from './supabase';
import { performanceMonitor } from './performance-monitor';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // en minutes
  sessionTimeout: number; // en minutes
  requireMFA: boolean;
  allowedIPRanges: string[];
  passwordMinLength: number;
  requireSpecialChars: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'login_success' | 'login_failure' | 'session_expired' | 'mfa_required' | 'suspicious_activity';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface UserSecurityProfile {
  userId: string;
  lastLogin: string;
  failedAttempts: number;
  isLocked: boolean;
  lockExpiresAt?: string;
  mfaEnabled: boolean;
  trustedDevices: string[];
  riskScore: number;
}

class SecurityManager {
  private config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    sessionTimeout: 60,
    requireMFA: false,
    allowedIPRanges: [],
    passwordMinLength: 8,
    requireSpecialChars: true
  };

  private securityEvents: SecurityEvent[] = [];
  private userProfiles: Map<string, UserSecurityProfile> = new Map();

  // Configuration de la sécurité
  updateConfig(newConfig: Partial<SecurityConfig>) {
    this.config = { ...this.config, ...newConfig };
    performanceMonitor.info('Configuration sécurité mise à jour', { 
      previousConfig: this.config,
      newConfig 
    });
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Gestion de l'authentification
  async authenticateUser(
    email: string, 
    password: string, 
    ipAddress: string,
    userAgent: string
  ): Promise<{ 
    success: boolean; 
    requiresMFA?: boolean; 
    lockExpiresAt?: string; 
    error?: string;
    sessionToken?: string;
  }> {
    const timer = performanceMonitor.startTimer('user_authentication');

    try {
      // Vérifier le profil de sécurité de l'utilisateur
      const profile = await this.getUserSecurityProfile(email);
      
      if (profile.isLocked) {
        if (profile.lockExpiresAt && new Date(profile.lockExpiresAt) > new Date()) {
          timer();
          return { 
            success: false, 
            error: 'Compte verrouillé', 
            lockExpiresAt: profile.lockExpiresAt 
          };
        } else {
          // Déverrouiller automatiquement
          await this.unlockUser(email);
        }
      }

      // Tentative de connexion
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Échec de connexion - incrémenter les tentatives
        await this.recordFailedLogin(email, ipAddress, userAgent);
        
        timer();
        return { success: false, error: 'Identifiants incorrects' };
      }

      // Connexion réussie
      await this.recordSuccessfulLogin(data.user?.id || email, ipAddress, userAgent);
      
      // Vérifier si MFA est requis
      if (this.config.requireMFA && !profile.mfaEnabled) {
        timer();
        return { 
          success: true, 
          requiresMFA: true,
          sessionToken: data.session?.access_token 
        };
      }

      // Créer une session sécurisée
      const sessionToken = await this.createSecureSession(data.user?.id || email);
      
      timer();
      return { 
        success: true, 
        sessionToken,
        requiresMFA: false
      };

    } catch (error) {
      timer();
      performanceMonitor.error('Erreur authentification', { email, error });
      return { success: false, error: 'Erreur interne' };
    }
  }

  // Vérification de session sécurisée
  async verifySession(sessionToken: string): Promise<{
    valid: boolean;
    userId?: string;
    requiresRefresh?: boolean;
    riskScore?: number;
  }> {
    try {
      const session = await supabase.auth.getSession();
      
      if (!session.data.session) {
        await this.recordSecurityEvent('session_expired', undefined);
        return { valid: false };
      }

      // Vérifier la durée de la session
      const createdAtStr = (session.data.session as any).created_at || (session.data.session as any).createdAt || new Date().toISOString();
      const sessionAge = Date.now() - new Date(createdAtStr).getTime();
      const maxAge = this.config.sessionTimeout * 60 * 1000;

      if (sessionAge > maxAge) {
        await supabase.auth.signOut();
        await this.recordSecurityEvent('session_expired', session.data.session.user?.id);
        return { valid: false, requiresRefresh: true };
      }

      // Calculer le score de risque
      const riskScore = await this.calculateRiskScore(session.data.session.user?.id || '');

      return {
        valid: true,
        userId: session.data.session.user?.id,
        riskScore
      };

    } catch (error) {
      performanceMonitor.error('Erreur vérification session', { error });
      return { valid: false };
    }
  }

  // Activation de l'authentification multi-facteurs
  async enableMFA(userId: string): Promise<{ 
    secret: string; 
    qrCode: string; 
    backupCodes: string[]; 
  }> {
    // Générer un secret TOTP
    const secret = this.generateTOTPSecret();
    const qrCode = this.generateQRCode(secret);
    const backupCodes = this.generateBackupCodes();

    // Sauvegarder en base (à implémenter selon votre schéma)
    await this.saveMFASecret(userId, secret, backupCodes);

    performanceMonitor.info('MFA activé pour utilisateur', { userId });
    
    return { secret, qrCode, backupCodes };
  }

  // Vérification du code MFA
  async verifyMFA(userId: string, code: string): Promise<boolean> {
    try {
      const secret = await this.getMFASecret(userId);
      if (!secret) return false;

      const isValid = this.verifyTOTP(code, secret);
      
      if (isValid) {
        performanceMonitor.info('Code MFA vérifié', { userId });
      } else {
        performanceMonitor.warn('Code MFA invalide', { userId });
      }

      return isValid;
    } catch (error) {
      performanceMonitor.error('Erreur vérification MFA', { userId, error });
      return false;
    }
  }

  // Détection d'activités suspectes
  async detectSuspiciousActivity(
    userId: string,
    currentIP: string,
    userAgent: string,
    action: string
  ): Promise<{
    suspicious: boolean;
    riskScore: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Vérifier l'adresse IP
    const profile = this.userProfiles.get(userId);
    if (profile) {
      const trustedIPs = await this.getTrustedIPs(userId);
      
      if (!trustedIPs.includes(currentIP)) {
        reasons.push('IP non autorisée');
        riskScore += 30;
      }

      // Vérifier la localisation géographique
      if (await this.isUnusualLocation(userId, currentIP)) {
        reasons.push('Localisation inhabituelle');
        riskScore += 40;
      }

      // Vérifier le user agent
      const recentUserAgents = await this.getRecentUserAgents(userId);
      if (!recentUserAgents.includes(userAgent)) {
        reasons.push('Nouvel agent utilisateur');
        riskScore += 20;
      }
    }

    // Seuil de suspicion
    const suspicious = riskScore >= 50;

    if (suspicious) {
      await this.recordSecurityEvent('suspicious_activity', userId, {
        currentIP,
        userAgent,
        action,
        riskScore,
        reasons
      });

      performanceMonitor.warn('Activité suspecte détectée', {
        userId,
        riskScore,
        reasons
      });
    }

    return { suspicious, riskScore, reasons };
  }

  // Gestion des profils de sécurité
  private async getUserSecurityProfile(identifier: string): Promise<UserSecurityProfile> {
    const cacheKey = `security_profile:${identifier}`;
    
    // Vérifier le cache d'abord
    const cached = this.userProfiles.get(identifier);
    if (cached) {
      return cached;
    }

    // Récupérer depuis la base de données
    try {
      const { data, error } = await supabase
        .from('security_profiles')
        .select('*')
        .eq('user_id', identifier)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      const profile: UserSecurityProfile = data || {
        userId: identifier,
        lastLogin: new Date().toISOString(),
        failedAttempts: 0,
        isLocked: false,
        mfaEnabled: false,
        trustedDevices: [],
        riskScore: 0
      };

      this.userProfiles.set(identifier, profile);
      return profile;

    } catch (error) {
      performanceMonitor.error('Erreur récupération profil sécurité', { identifier, error });
      
      // Profil par défaut en cas d'erreur
      const defaultProfile: UserSecurityProfile = {
        userId: identifier,
        lastLogin: new Date().toISOString(),
        failedAttempts: 0,
        isLocked: false,
        mfaEnabled: false,
        trustedDevices: [],
        riskScore: 0
      };

      return defaultProfile;
    }
  }

  private async recordFailedLogin(
    email: string, 
    ipAddress: string, 
    userAgent: string
  ) {
    const profile = await this.getUserSecurityProfile(email);
    profile.failedAttempts++;
    
    if (profile.failedAttempts >= this.config.maxLoginAttempts) {
      profile.isLocked = true;
      profile.lockExpiresAt = new Date(Date.now() + this.config.lockoutDuration * 60000).toISOString();
      
      await this.recordSecurityEvent('login_failure', email, {
        attempts: profile.failedAttempts,
        locked: true,
        ipAddress,
        userAgent
      });
    }

    this.userProfiles.set(email, profile);
  }

  private async recordSuccessfulLogin(
    userId: string,
    ipAddress: string,
    userAgent: string
  ) {
    const profile = await this.getUserSecurityProfile(userId);
    profile.lastLogin = new Date().toISOString();
    profile.failedAttempts = 0;
    profile.isLocked = false;
    profile.lockExpiresAt = undefined;

    // Ajouter le device aux appareils de confiance
    const deviceId = this.generateDeviceId(userAgent, ipAddress);
    if (!profile.trustedDevices.includes(deviceId)) {
      profile.trustedDevices.push(deviceId);
    }

    this.userProfiles.set(userId, profile);

    await this.recordSecurityEvent('login_success', userId, {
      ipAddress,
      userAgent,
      deviceId
    });
  }

  private async unlockUser(email: string) {
    const profile = await this.getUserSecurityProfile(email);
    profile.isLocked = false;
    profile.lockExpiresAt = undefined;
    profile.failedAttempts = 0;
    
    this.userProfiles.set(email, profile);
  }

  private async createSecureSession(userId: string): Promise<string> {
    // Générer un token de session sécurisé
    const sessionData = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.sessionTimeout * 60000),
      fingerprint: this.generateDeviceFingerprint()
    };

    // Token simplifié (en production, utiliser JWT)
    return btoa(JSON.stringify(sessionData));
  }

  private async calculateRiskScore(userId: string): Promise<number> {
    const profile = await this.getUserSecurityProfile(userId);
    let riskScore = 0;

    // Facteurs de risque
    if (profile.failedAttempts > 0) riskScore += profile.failedAttempts * 10;
    if (profile.isLocked) riskScore += 50;
    if (profile.riskScore > 70) riskScore += 30;

    return Math.min(riskScore, 100);
  }

  // Utilitaires de sécurité
  private generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }

  private generateQRCode(secret: string): string {
    // Génération d'un QR code pour l'app d'authentification
    return `otpauth://totp/UniversalEats:user?secret=${secret}&issuer=UniversalEats`;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }
    return codes;
  }

  private verifyTOTP(code: string, secret: string): boolean {
    // Implémentation simplifiée du TOTP (en production, utiliser une bibliothèque)
    // Cette fonction devrait vérifier le code contre le secret avec une tolérance de temps
    return code.length === 6 && /^\d{6}$/.test(code);
  }

  private generateDeviceId(userAgent: string, ip: string): string {
    return btoa(userAgent + ip).substring(0, 16);
  }

  private generateDeviceFingerprint(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private async recordSecurityEvent(
    type: SecurityEvent['type'],
    userId?: string,
    details?: Record<string, any>
  ) {
    const event: SecurityEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      ipAddress: 'unknown', // Récupérer depuis les headers
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      details
    };

    this.securityEvents.push(event);

    // Limiter le nombre d'événements stockés
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    // Sauvegarder en base de données
    try {
      await supabase.from('security_events').insert(event);
    } catch (error) {
      performanceMonitor.error('Erreur sauvegarde événement sécurité', { event, error });
    }
  }

  // Méthodes placeholder (à implémenter selon vos besoins)
  private async saveMFASecret(userId: string, secret: string, backupCodes: string[]) {
    // Implémentation à ajouter selon votre schéma de base
  }

  private async getMFASecret(userId: string): Promise<string | null> {
    // Implémentation à ajouter selon votre schéma de base
    return null;
  }

  private async getTrustedIPs(userId: string): Promise<string[]> {
    // Implémentation à ajouter
    return [];
  }

  private async isUnusualLocation(userId: string, ip: string): Promise<boolean> {
    // Implémentation avec géolocalisation
    return false;
  }

  private async getRecentUserAgents(userId: string): Promise<string[]> {
    // Récupérer les user agents récents
    return [];
  }

  // API publique
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  getUserProfile(userId: string): UserSecurityProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  isUserLocked(userId: string): boolean {
    const profile = this.userProfiles.get(userId);
    if (!profile || !profile.isLocked) return false;
    
    if (profile.lockExpiresAt && new Date(profile.lockExpiresAt) < new Date()) {
      this.unlockUser(userId);
      return false;
    }
    
    return true;
  }
}

// Instance globale du gestionnaire de sécurité
export const securityManager = new SecurityManager();

// Store Zustand pour l'état de sécurité côté client
interface SecurityState {
  isAuthenticated: boolean;
  userId: string | null;
  sessionToken: string | null;
  requiresMFA: boolean;
  riskScore: number;
  isLocked: boolean;
  
  // Actions
  setAuthenticated: (userId: string, sessionToken: string) => void;
  setRequiresMFA: (requires: boolean) => void;
  updateRiskScore: (score: number) => void;
  logout: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isAuthenticated: false,
  userId: null,
  sessionToken: null,
  requiresMFA: false,
  riskScore: 0,
  isLocked: false,

  setAuthenticated: (userId, sessionToken) => set({ 
    isAuthenticated: true, 
    userId, 
    sessionToken,
    isLocked: false 
  }),
  
  setRequiresMFA: (requires) => set({ requiresMFA: requires }),
  
  updateRiskScore: (score) => set({ riskScore: score }),
  
  logout: () => set({
    isAuthenticated: false,
    userId: null,
    sessionToken: null,
    requiresMFA: false,
    riskScore: 0,
    isLocked: false
  })
}));

// Hook React pour utilisation facile
export function useSecurity() {
  const store = useSecurityStore();
  
  return {
    ...store,
    config: securityManager.getConfig(),
    authenticate: securityManager.authenticateUser.bind(securityManager),
    verifySession: securityManager.verifySession.bind(securityManager),
    enableMFA: securityManager.enableMFA.bind(securityManager),
    verifyMFA: securityManager.verifyMFA.bind(securityManager),
    detectSuspiciousActivity: securityManager.detectSuspiciousActivity.bind(securityManager),
    getSecurityEvents: securityManager.getSecurityEvents.bind(securityManager),
    getUserProfile: securityManager.getUserProfile.bind(securityManager),
    isUserLocked: securityManager.isUserLocked.bind(securityManager)
  };
}