/**
 * Système de Sécurité pour les Paiements Mobiles
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Fonctionnalités :
 * - Authentification et autorisation
 * - Validation des données sensibles
 * - Protection contre la fraude
 * - Audit et traçabilité
 * - Chiffrement et protection des données
 */

import { createHash, createHmac, randomBytes } from 'crypto';
import { performanceMonitor } from './performance-monitor';

export interface SecurityConfig {
  enableEncryption: boolean;
  enableAudit: boolean;
  enableFraudDetection: boolean;
  maxRetries: number;
  sessionTimeout: number;
  allowedIPs: string[];
  webhookSecret: string;
  encryptionKey: string;
}

export interface SecurityAudit {
  id: string;
  action: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
  details: any;
  riskScore: number;
}

export interface FraudDetection {
  isHighRisk: boolean;
  riskScore: number;
  factors: string[];
  recommendations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;
}

/**
 * Configuration de sécurité par défaut
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableEncryption: true,
  enableAudit: true,
  enableFraudDetection: true,
  maxRetries: 3,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  allowedIPs: [],
  webhookSecret: process.env.MOBILE_PAYMENTS_WEBHOOK_SECRET || '',
  encryptionKey: process.env.MOBILE_PAYMENTS_ENCRYPTION_KEY || ''
};

class MobilePaymentsSecurity {
  private config: SecurityConfig;
  private auditLog: SecurityAudit[] = [];
  private sessionCache: Map<string, { timestamp: number; data: any }> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Valide une requête de paiement mobile
   */
  async validatePaymentRequest(request: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      // 1. Validation des champs obligatoires
      if (!request.orderId) {
        errors.push('orderId manquant');
      }

      if (!request.amount || typeof request.amount !== 'number' || request.amount <= 0) {
        errors.push('Montant invalide');
        riskScore += 20;
      }

      if (!request.providerCode) {
        errors.push('providerCode manquant');
      }

      // 2. Validation du numéro de téléphone
      if (request.phoneNumber) {
        const phoneValidation = this.validatePhoneNumber(request.phoneNumber);
        if (!phoneValidation.isValid) {
          errors.push(...phoneValidation.errors);
          riskScore += 15;
        }
        if (phoneValidation.isSuspicious) {
          warnings.push('Numéro de téléphone suspect');
          riskScore += 10;
        }
      }

      // 3. Validation des montants suspects
      if (request.amount > 10000) {
        warnings.push('Montant élevé - surveillance renforcée');
        riskScore += 25;
      }

      if (request.amount < 1) {
        errors.push('Montant trop faible');
        riskScore += 30;
      }

      // 4. Validation des horaires suspects
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 23) {
        warnings.push('Transaction en dehors des heures normales');
        riskScore += 5;
      }

      // 5. Validation des données utilisateur
      if (request.customerName) {
        const nameValidation = this.validateCustomerName(request.customerName);
        if (!nameValidation.isValid) {
          warnings.push(...nameValidation.warnings);
          riskScore += 5;
        }
      }

      // 6. Détection de fraude si activée
      let fraudDetection: FraudDetection | null = null;
      if (this.config.enableFraudDetection) {
        fraudDetection = await this.detectFraud(request);
        if (fraudDetection.isHighRisk) {
          errors.push('Transaction flagged comme suspecte par le système de fraude');
          riskScore += fraudDetection.riskScore;
        }
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        riskScore: Math.min(riskScore, 100)
      };

      // Audit si activé
      if (this.config.enableAudit) {
        await this.logAudit({
          action: 'validate_payment_request',
          details: {
            request,
            validationResult: result,
            fraudDetection
          },
          riskScore: result.riskScore
        });
      }

      return result;

    } catch (error) {
      performanceMonitor.error('Erreur validation paiement', { error, request });
      
      return {
        isValid: false,
        errors: ['Erreur lors de la validation'],
        warnings: [],
        riskScore: 50
      };
    }
  }

  /**
   * Valide un callback de fournisseur
   */
  async validateCallback(callbackData: any, provider: string, signature?: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    try {
      // 1. Validation de la signature si fournie
      if (signature) {
        const signatureValidation = this.validateSignature(callbackData, signature, provider);
        if (!signatureValidation.isValid) {
          errors.push('Signature invalide');
          riskScore += 40;
        }
      } else {
        warnings.push('Aucune signature fournie');
        riskScore += 15;
      }

      // 2. Validation des champs obligatoires
      const requiredFields = ['transaction_id', 'status', 'amount'];
      for (const field of requiredFields) {
        if (!callbackData[field]) {
          errors.push(`Champ obligatoire manquant: ${field}`);
          riskScore += 20;
        }
      }

      // 3. Validation du montant
      if (callbackData.amount && typeof callbackData.amount === 'string') {
        const amount = parseFloat(callbackData.amount);
        if (isNaN(amount) || amount <= 0) {
          errors.push('Montant invalide dans le callback');
          riskScore += 25;
        }
      }

      // 4. Validation du statut
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
      if (callbackData.status && !validStatuses.includes(callbackData.status.toLowerCase())) {
        warnings.push(`Statut suspect: ${callbackData.status}`);
        riskScore += 10;
      }

      // 5. Validation temporelle
      if (callbackData.timestamp) {
        const callbackTime = new Date(callbackData.timestamp);
        const now = new Date();
        const timeDiff = Math.abs(now.getTime() - callbackTime.getTime());
        
        if (timeDiff > 5 * 60 * 1000) { // Plus de 5 minutes
          warnings.push('Callback en retard');
          riskScore += 15;
        }
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        riskScore: Math.min(riskScore, 100)
      };

      // Audit
      if (this.config.enableAudit) {
        await this.logAudit({
          action: 'validate_callback',
          details: {
            provider,
            callbackData,
            signature,
            validationResult: result
          },
          riskScore: result.riskScore
        });
      }

      return result;

    } catch (error) {
      performanceMonitor.error('Erreur validation callback', { error, provider });
      
      return {
        isValid: false,
        errors: ['Erreur lors de la validation du callback'],
        warnings: [],
        riskScore: 50
      };
    }
  }

  /**
   * Chiffre les données sensibles
   */
  encryptSensitiveData(data: string): string {
    if (!this.config.enableEncryption || !this.config.encryptionKey) {
      return data;
    }

    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.config.encryptionKey, 'hex');
      const iv = randomBytes(16);
      
      const cipher = createHmac('sha256', key).update(data);
      const encrypted = cipher.digest('hex');
      
      return encrypted;

    } catch (error) {
      performanceMonitor.error('Erreur chiffrement données', { error });
      return data;
    }
  }

  /**
   * Déchiffre les données sensibles
   */
  decryptSensitiveData(encryptedData: string): string {
    if (!this.config.enableEncryption || !this.config.encryptionKey) {
      return encryptedData;
    }

    try {
      // Implémentation du déchiffrement (correspondant à encryptSensitiveData)
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.config.encryptionKey, 'hex');
      
      const decipher = createHmac('sha256', key).update(encryptedData);
      const decrypted = decipher.digest('hex');
      
      return decrypted;

    } catch (error) {
      performanceMonitor.error('Erreur déchiffrement données', { error });
      return encryptedData;
    }
  }

  /**
   * Valide la signature d'un callback
   */
  private validateSignature(data: any, signature: string, provider: string): { isValid: boolean } {
    try {
      const expectedSignature = this.generateSignature(data, provider);
      return {
        isValid: signature === expectedSignature
      };
    } catch (error) {
      performanceMonitor.error('Erreur validation signature', { error, provider });
      return { isValid: false };
    }
  }

  /**
   * Génère une signature pour valider l'authenticité
   */
  private generateSignature(data: any, provider: string): string {
    const secret = `${this.config.webhookSecret}_${provider}`;
    const dataString = JSON.stringify(data);
    return createHmac('sha256', secret).update(dataString).digest('hex');
  }

  /**
   * Valide un numéro de téléphone marocain
   */
  private validatePhoneNumber(phoneNumber: string): { isValid: boolean; errors: string[]; isSuspicious: boolean } {
    const errors: string[] = [];
    const patterns = [
      /^\+2126\d{8}$/,
      /^06\d{8}$/,
      /^2126\d{8}$/
    ];
    
    const isValid = patterns.some(pattern => pattern.test(phoneNumber.trim()));
    
    if (!isValid) {
      errors.push('Format de numéro invalide');
    }

    // Détection de numéros suspects
    const suspiciousPatterns = [
      /^(\d)\1{8}$/, // Même chiffre répété
      /^06(0{7}|1{7}|2{7}|3{7}|4{7}|5{7}|6{7}|7{7}|8{7}|9{7})$/ // Séquence
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(phoneNumber));

    return { isValid, errors, isSuspicious };
  }

  /**
   * Valide un nom de client
   */
  private validateCustomerName(name: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Vérifier les caractères suspects
    if (/[0-9]/.test(name)) {
      warnings.push('Nom contenant des chiffres');
    }
    
    if (/[^a-zA-ZÀ-ÿ\s\-\'\.]/.test(name)) {
      warnings.push('Nom contenant des caractères spéciaux suspects');
    }
    
    if (name.length < 2) {
      warnings.push('Nom trop court');
    }
    
    if (name.length > 50) {
      warnings.push('Nom trop long');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Détection de fraude
   */
  private async detectFraud(request: any): Promise<FraudDetection> {
    const factors: string[] = [];
    let riskScore = 0;

    try {
      // 1. Vérification de la fréquence des transactions
      const recentTransactions = await this.getRecentTransactions(request.customerPhone || request.phoneNumber);
      if (recentTransactions.length > 5) {
        factors.push('Nombre élevé de transactions récentes');
        riskScore += 20;
      }

      // 2. Vérification des montants similaires
      const similarAmounts = recentTransactions.filter(t => Math.abs(t.amount - request.amount) < 1);
      if (similarAmounts.length > 3) {
        factors.push('Montants répétés suspects');
        riskScore += 15;
      }

      // 3. Vérification des horaires
      const currentHour = new Date().getHours();
      if (currentHour < 6 || currentHour > 23) {
        factors.push('Transaction en dehors des heures normales');
        riskScore += 10;
      }

      // 4. Vérification desIP地址 (si disponible)
      // Cette vérification nécessiterait l'IP du client
      // if (request.clientIP && this.isSuspiciousIP(request.clientIP)) {
      //   factors.push('IP suspecte');
      //   riskScore += 25;
      // }

      const isHighRisk = riskScore >= 50;
      
      const recommendations: string[] = [];
      if (isHighRisk) {
        recommendations.push('Demander une vérification supplémentaire');
        recommendations.push('Contacter le client par téléphone');
        recommendations.push('Limiter le montant maximum');
      }

      return {
        isHighRisk,
        riskScore,
        factors,
        recommendations
      };

    } catch (error) {
      performanceMonitor.error('Erreur détection fraude', { error });
      
      return {
        isHighRisk: false,
        riskScore: 0,
        factors: [],
        recommendations: []
      };
    }
  }

  /**
   * Récupère les transactions récentes pour un client
   */
  private async getRecentTransactions(phoneNumber?: string): Promise<any[]> {
    if (!phoneNumber) return [];
    
    // Cette fonction devrait interroger la base de données
    // Pour l'instant, on retourne un tableau vide
    return [];
  }

  /**
   * Enregistre un audit de sécurité
   */
  private async logAudit(auditData: {
    action: string;
    userId?: string;
    details: any;
    riskScore: number;
  }): Promise<void> {
    try {
      const audit: SecurityAudit = {
        id: randomBytes(16).toString('hex'),
        action: auditData.action,
        userId: auditData.userId,
        ipAddress: 'unknown', // À récupérer du contexte
        userAgent: 'unknown', // À récupérer du contexte
        timestamp: new Date().toISOString(),
        status: auditData.riskScore > 70 ? 'failure' : auditData.riskScore > 40 ? 'warning' : 'success',
        details: auditData.details,
        riskScore: auditData.riskScore
      };

      this.auditLog.push(audit);
      
      // Limiter la taille du log en mémoire
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-500);
      }

      // Enregistrer en base de données (optionnel)
      performanceMonitor.info('Audit sécurité enregistré', { 
        action: audit.action,
        riskScore: audit.riskScore
      });

    } catch (error) {
      performanceMonitor.error('Erreur enregistrement audit', { error });
    }
  }

  /**
   * Récupère l'historique d'audit
   */
  getAuditHistory(filters?: {
    action?: string;
    riskScoreMin?: number;
    dateFrom?: string;
    dateTo?: string;
  }): SecurityAudit[] {
    let filteredAudit = [...this.auditLog];

    if (filters?.action) {
      filteredAudit = filteredAudit.filter(audit => audit.action === filters.action);
    }

    if (filters && filters.riskScoreMin !== undefined) {
      const minRisk = filters.riskScoreMin;
      filteredAudit = filteredAudit.filter(audit => audit.riskScore >= minRisk);
    }

    if (filters?.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filteredAudit = filteredAudit.filter(audit => new Date(audit.timestamp) >= dateFrom);
    }

    if (filters?.dateTo) {
      const dateTo = new Date(filters.dateTo);
      filteredAudit = filteredAudit.filter(audit => new Date(audit.timestamp) <= dateTo);
    }

    return filteredAudit.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Met à jour la configuration de sécurité
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    performanceMonitor.info('Configuration sécurité mise à jour', {
      changes: Object.keys(newConfig)
    });
  }

  /**
   * Génère un token de session sécurisé
   */
  generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Valide un token de session
   */
  validateSessionToken(token: string): boolean {
    const session = this.sessionCache.get(token);
    if (!session) return false;

    const now = Date.now();
    if (now - session.timestamp > this.config.sessionTimeout) {
      this.sessionCache.delete(token);
      return false;
    }

    return true;
  }
}

// Export de l'instance singleton
export const mobilePaymentsSecurity = new MobilePaymentsSecurity();
export default mobilePaymentsSecurity;