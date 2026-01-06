/**
 * Interface de base pour les adaptateurs de paiement mobile
 */

export interface MobilePaymentAdapter {
  // Configuration
  name: string;
  code: string;
  isActive: boolean;
  
  // Création de demande de paiement
  createPaymentRequest(request: CreatePaymentRequestData): Promise<PaymentResult>;
  
  // Vérification du statut
  checkPaymentStatus(externalTransactionId: string): Promise<StatusResult>;
  
  // Annulation de transaction
  cancelTransaction(externalTransactionId: string): Promise<CancellationResult>;
  
  // Validation des données de callback
  validateCallbackData(callbackData: any): ValidationResult;
  
  // Mapping du statut de callback vers notre statut interne
  mapCallbackStatus(callbackStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  
  // Configuration de l'adaptateur
  configure(config: AdapterConfig): void;
}

export interface CreatePaymentRequestData {
  transactionId: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  customerName?: string;
  description: string;
  orderId: string;
}

export interface PaymentResult {
  success: boolean;
  externalTransactionId?: string;
  status: string;
  message: string;
  redirectUrl?: string;
  callbackData?: any;
  qrCode?: string;
  authorizationCode?: string;
}

export interface StatusResult {
  success: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  message: string;
  amount?: number;
  callbackData?: any;
  transactionDate?: string;
}

export interface CancellationResult {
  success: boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  externalTransactionId?: string;
  status?: string;
  amount?: number;
  errors?: string[];
}

export interface AdapterConfig {
  apiUrl: string;
  merchantId: string;
  apiKey: string;
  secretKey?: string;
  webhookUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  testMode?: boolean;
}

/**
 * Classe abstraite pour implémenter les fonctionnalités communes
 */
export abstract class BaseMobilePaymentAdapter implements MobilePaymentAdapter {
  abstract name: string;
  abstract code: string;
  abstract isActive: boolean;
  
  protected config: AdapterConfig = {
    apiUrl: '',
    merchantId: '',
    apiKey: '',
    timeout: 30000,
    retryAttempts: 3,
    testMode: false
  };

  abstract createPaymentRequest(request: CreatePaymentRequestData): Promise<PaymentResult>;
  abstract checkPaymentStatus(externalTransactionId: string): Promise<StatusResult>;
  abstract cancelTransaction(externalTransactionId: string): Promise<CancellationResult>;
  abstract validateCallbackData(callbackData: any): ValidationResult;
  abstract mapCallbackStatus(callbackStatus: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  configure(config: AdapterConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Méthode utilitaire pour faire des appels HTTP avec retry
   */
  protected async makeHttpRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' = 'POST',
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...headers
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (this.config.retryAttempts || 1); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body: method !== 'GET' ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur inconnue');
        
        if (attempt === (this.config.retryAttempts || 1)) {
          throw lastError;
        }

        // Attente exponentielle entre les tentatives
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError;
  }

  /**
   * Génère une signature pour sécuriser les requêtes
   */
  protected generateSignature(data: any): string {
    // Cette méthode sera implémentée selon les exigences spécifiques de chaque fournisseur
    const dataString = JSON.stringify(data);
    return btoa(dataString + this.config.secretKey);
  }

  /**
   * Valide un numéro de téléphone marocain
   */
  protected validateMoroccanPhoneNumber(phoneNumber: string): boolean {
    // Formats acceptés : +2126XXXXXXXX, 06XXXXXXXX, 2126XXXXXXXX
    const patterns = [
      /^\+2126\d{8}$/,
      /^06\d{8}$/,
      /^2126\d{8}$/
    ];
    
    return patterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * Formate un numéro de téléphone pour l'API
   */
  protected formatPhoneNumber(phoneNumber: string): string {
    // Supprime les espaces et caractères spéciaux
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Ajoute le préfixe +212 si nécessaire
    if (formatted.startsWith('06')) {
      formatted = '+212' + formatted.substring(1);
    } else if (formatted.startsWith('2126')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }
}