/**
 * Tests de Validation - Système de Paiements Mobiles
 * Universal Eats - Phase 2 Optimisation Écosystème
 * 
 * Tests unitaires et d'intégration pour :
 * - Service de paiement mobile
 * - Adaptateurs de paiement
 * - Composants UI
 * - Sécurité et validation
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mobilePaymentsService } from '../lib/mobile-payments-service';
import { OrangeMoneyAdapter } from '../lib/payments/orange-money-adapter';
import { InwiMoneyAdapter } from '../lib/payments/inwi-money-adapter';
import { PayZoneAdapter } from '../lib/payments/payzone-adapter';
import { mobilePaymentsSecurity } from '../lib/mobile-payments-security';
import { MobilePaymentProvider } from '../lib/mobile-payments-service';

// Mock des dépendances
jest.mock('../lib/supabase');
jest.mock('../lib/analytics-service');
jest.mock('../lib/performance-monitor');

// Données de test
const TEST_DATA = {
  orderId: 'order_test_123',
  amount: 150.00,
  currency: 'MAD',
  providerCode: 'orange_money',
  phoneNumber: '+212661234567',
  customerName: 'Ahmed Benali',
  transactionId: 'tx_test_123',
  externalTransactionId: 'ext_tx_123'
};

describe('MobilePaymentsService', () => {
  let service: typeof mobilePaymentsService;

  beforeEach(() => {
    service = mobilePaymentsService;
    jest.clearAllMocks();
  });

  describe('getActiveProviders', () => {
    test('should return active providers only', () => {
      const providers = service.getActiveProviders();
      
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => p.isActive)).toBe(true);
    });

    test('should include Orange Money and Inwi Money', () => {
      const providers = service.getActiveProviders();
      const orangeMoney = providers.find(p => p.code === 'orange_money');
      const inwiMoney = providers.find(p => p.code === 'inwi_money');
      
      expect(orangeMoney).toBeDefined();
      expect(orangeMoney?.name).toBe('Orange Money');
      expect(inwiMoney).toBeDefined();
      expect(inwiMoney?.name).toBe('Inwi Money');
    });

    test('should exclude inactive providers', () => {
      const providers = service.getActiveProviders();
      const payzone = providers.find(p => p.code === 'payzone');
      
      expect(payzone).toBeUndefined();
    });
  });

  describe('getProviderByCode', () => {
    test('should return provider by valid code', () => {
      const provider = service.getProviderByCode('orange_money');
      
      expect(provider).toBeDefined();
      expect(provider?.code).toBe('orange_money');
      expect(provider?.name).toBe('Orange Money');
    });

    test('should return undefined for invalid code', () => {
      const provider = service.getProviderByCode('invalid_provider');
      
      expect(provider).toBeUndefined();
    });
  });

  describe('createPaymentRequest', () => {
    test('should create payment request successfully', async () => {
      const request = {
        orderId: TEST_DATA.orderId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        providerCode: TEST_DATA.providerCode,
        phoneNumber: TEST_DATA.phoneNumber,
        customerName: TEST_DATA.customerName
      };

      // Mock de la requête Supabase
      const mockOrder = {
        id: TEST_DATA.orderId,
        order_number: 123,
        total_amount: TEST_DATA.amount,
        payment_status: 'pending'
      };

      // Mock des méthodes Supabase
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockOrder, error: null })
            })
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: TEST_DATA.transactionId, ...request },
                error: null
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      };

      // Override du module supabase
      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.createPaymentRequest(request);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('processing');
    });

    test('should fail with invalid provider', async () => {
      const request = {
        ...TEST_DATA,
        providerCode: 'invalid_provider'
      };

      const result = await service.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non disponible');
    });

    test('should fail with missing order', async () => {
      const request = {
        ...TEST_DATA,
        orderId: 'nonexistent_order'
      };

      // Mock d'une commande inexistante
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Order not found' } 
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non trouvée');
    });
  });

  describe('checkPaymentStatus', () => {
    test('should check payment status successfully', async () => {
      const transactionId = TEST_DATA.transactionId;

      // Mock de la transaction
      const mockTransaction = {
        id: transactionId,
        orderId: TEST_DATA.orderId,
        providerCode: TEST_DATA.providerCode,
        externalTransactionId: TEST_DATA.externalTransactionId,
        status: 'pending'
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: mockTransaction, 
                error: null 
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.checkPaymentStatus(transactionId);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBe(transactionId);
    });

    test('should fail for nonexistent transaction', async () => {
      const transactionId = 'nonexistent_transaction';

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { message: 'Transaction not found' } 
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.checkPaymentStatus(transactionId);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non trouvée');
    });
  });

  describe('cancelTransaction', () => {
    test('should cancel transaction successfully', async () => {
      const transactionId = TEST_DATA.transactionId;

      // Mock de la transaction
      const mockTransaction = {
        id: transactionId,
        orderId: TEST_DATA.orderId,
        providerCode: TEST_DATA.providerCode,
        externalTransactionId: TEST_DATA.externalTransactionId,
        status: 'pending'
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: mockTransaction, 
                error: null 
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.cancelTransaction(transactionId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
    });

    test('should fail to cancel completed transaction', async () => {
      const transactionId = TEST_DATA.transactionId;

      // Mock de la transaction complétée
      const mockTransaction = {
        id: transactionId,
        orderId: TEST_DATA.orderId,
        providerCode: TEST_DATA.providerCode,
        externalTransactionId: TEST_DATA.externalTransactionId,
        status: 'completed'
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: mockTransaction, 
                error: null 
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const result = await service.cancelTransaction(transactionId);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('déjà complétée');
    });
  });

  describe('getTransactionHistory', () => {
    test('should return transaction history with filters', async () => {
      const filters = {
        providerCode: 'orange_money',
        status: 'completed',
        limit: 10
      };

      // Mock des transactions
      const mockTransactions = [
        {
          id: 'tx_1',
          providerCode: 'orange_money',
          status: 'completed',
          amount: 100,
          createdAt: '2026-01-05T10:00:00Z'
        }
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({ 
                        data: mockTransactions, 
                        error: null 
                      })
                    })
                  })
                })
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const history = await service.getTransactionHistory(filters);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(1);
      expect(history[0].providerCode).toBe('orange_money');
    });
  });

  describe('getPaymentStatistics', () => {
    test('should return payment statistics', async () => {
      const dateFrom = '2026-01-01T00:00:00Z';
      const dateTo = '2026-01-05T23:59:59Z';

      // Mock des transactions pour les statistiques
      const mockTransactions = [
        {
          provider_code: 'orange_money',
          status: 'completed',
          amount: 150,
          created_at: '2026-01-05T10:00:00Z'
        },
        {
          provider_code: 'inwi_money',
          status: 'failed',
          amount: 100,
          created_at: '2026-01-05T11:00:00Z'
        }
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                resolvedValue: { data: mockTransactions, error: null }
              })
            })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      const stats = await service.getPaymentStatistics(dateFrom, dateTo);
      
      expect(stats).toHaveProperty('totalTransactions');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('providers');
      expect(stats.totalTransactions).toBe(2);
      expect(stats.totalAmount).toBe(250);
    });
  });
});

describe('OrangeMoneyAdapter', () => {
  let adapter: OrangeMoneyAdapter;

  beforeEach(() => {
    adapter = new OrangeMoneyAdapter();
    jest.clearAllMocks();
  });

  describe('createPaymentRequest', () => {
    test('should create payment request successfully', async () => {
      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        phoneNumber: TEST_DATA.phoneNumber,
        customerName: TEST_DATA.customerName,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      // Mock de l'API Orange Money
      const mockResponse = {
        status: 'SUCCESS',
        payment_url: 'https://payment.orange.com/tx_123',
        order_id: TEST_DATA.transactionId,
        message: 'Payment request created'
      };

      // Mock de fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(true);
      expect(result.externalTransactionId).toBe(TEST_DATA.transactionId);
      expect(result.status).toBe('processing');
      expect(result.redirectUrl).toBe('https://payment.orange.com/tx_123');
    });

    test('should fail with invalid phone number', async () => {
      const request = {
        ...TEST_DATA,
        phoneNumber: 'invalid_phone'
      };

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Numéro de téléphone invalide');
    });

    test('should handle API error', async () => {
      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        phoneNumber: TEST_DATA.phoneNumber,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      // Mock d'une erreur API
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur inconnue');
    });
  });

  describe('checkPaymentStatus', () => {
    test('should check payment status successfully', async () => {
      const externalTransactionId = TEST_DATA.externalTransactionId;

      // Mock de la réponse de statut
      const mockResponse = {
        status: 'SUCCESS',
        payment_status: 'SUCCESS',
        amount: TEST_DATA.amount.toString(),
        payment_date: '2026-01-05T15:30:00Z',
        message: 'Payment completed'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.checkPaymentStatus(externalTransactionId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(TEST_DATA.amount);
    });

    test('should handle pending status', async () => {
      const externalTransactionId = TEST_DATA.externalTransactionId;

      const mockResponse = {
        status: 'SUCCESS',
        payment_status: 'PENDING',
        message: 'Payment pending'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.checkPaymentStatus(externalTransactionId);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
    });
  });

  describe('validateMoroccanPhoneNumber', () => {
    test('should validate correct phone numbers', () => {
      const validNumbers = [
        '+212661234567',
        '0661234567',
        '212661234567'
      ];

      validNumbers.forEach(number => {
        expect(adapter.validateMoroccanPhoneNumber(number)).toBe(true);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '123456789',
        '+33123456789',
        'abcdefghij',
        '+21266123456', // Trop court
        '+2126612345678' // Trop long
      ];

      invalidNumbers.forEach(number => {
        expect(adapter.validateMoroccanPhoneNumber(number)).toBe(false);
      });
    });
  });

  describe('mapCallbackStatus', () => {
    test('should map Orange Money statuses correctly', () => {
      expect(adapter.mapCallbackStatus('PENDING')).toBe('pending');
      expect(adapter.mapCallbackStatus('PROCESSING')).toBe('processing');
      expect(adapter.mapCallbackStatus('SUCCESS')).toBe('completed');
      expect(adapter.mapCallbackStatus('FAILED')).toBe('failed');
      expect(adapter.mapCallbackStatus('CANCELLED')).toBe('cancelled');
      expect(adapter.mapCallbackStatus('ERROR')).toBe('failed');
    });

    test('should handle unknown status', () => {
      expect(adapter.mapCallbackStatus('UNKNOWN_STATUS')).toBe('pending');
    });
  });
});

describe('InwiMoneyAdapter', () => {
  let adapter: InwiMoneyAdapter;

  beforeEach(() => {
    adapter = new InwiMoneyAdapter();
    jest.clearAllMocks();
  });

  describe('createPaymentRequest', () => {
    test('should create payment request successfully', async () => {
      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        phoneNumber: TEST_DATA.phoneNumber,
        customerName: TEST_DATA.customerName,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      const mockResponse = {
        status: 'SUCCESS',
        transaction_id: TEST_DATA.externalTransactionId,
        message: 'Payment request created',
        authorization_code: 'AUTH123'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(true);
      expect(result.externalTransactionId).toBe(TEST_DATA.externalTransactionId);
      expect(result.authorizationCode).toBe('AUTH123');
    });

    test('should handle cancellation', async () => {
      const externalTransactionId = TEST_DATA.externalTransactionId;

      const mockResponse = {
        status: 'SUCCESS',
        message: 'Transaction cancelled'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.cancelTransaction(externalTransactionId);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('annulée avec succès');
    });
  });

  describe('validateTransactionLimits', () => {
    test('should validate amounts within limits', () => {
      const validAmounts = [1, 50, 100, 1000, 50000];
      
      validAmounts.forEach(amount => {
        const result = adapter.validateTransactionLimits(amount);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject amounts outside limits', () => {
      const invalidAmounts = [0, -10, 0.5, 50001, 100000];
      
      invalidAmounts.forEach(amount => {
        const result = adapter.validateTransactionLimits(amount);
        expect(result.isValid).toBe(false);
        expect(result.message).toBeDefined();
      });
    });
  });

  describe('generateUSSDRequest', () => {
    test('should generate correct USSD code', () => {
      const paymentData = {
        amount: 150,
        transaction_id: 'TX123',
        merchant_id: 'MERCHANT123'
      };

      const ussdCode = adapter.generateUSSDRequest(paymentData);
      
      expect(ussdCode).toBe('*110*150*MERCHANT123*TX123#');
    });
  });
});

describe('PayZoneAdapter', () => {
  let adapter: PayZoneAdapter;

  beforeEach(() => {
    adapter = new PayZoneAdapter();
    jest.clearAllMocks();
  });

  describe('createPaymentRequest', () => {
    test('should fail when not active', async () => {
      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('n\'est pas encore disponible');
    });

    test('should activate and work when enabled', async () => {
      adapter.activate();
      
      expect(adapter.isActive).toBe(true);

      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      // Mock d'une réponse réussie
      const mockResponse = {
        success: true,
        payment_url: 'https://payzone.ma/pay/TX123',
        transaction_id: TEST_DATA.externalTransactionId,
        message: 'Payment initiated'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(true);
      expect(result.redirectUrl).toBe('https://payzone.ma/pay/TX123');
    });
  });
});

describe('MobilePaymentsSecurity', () => {
  let security: typeof mobilePaymentsSecurity;

  beforeEach(() => {
    security = mobilePaymentsSecurity;
    jest.clearAllMocks();
  });

  describe('validatePaymentRequest', () => {
    test('should validate correct payment request', async () => {
      const request = {
        orderId: TEST_DATA.orderId,
        amount: TEST_DATA.amount,
        providerCode: TEST_DATA.providerCode,
        phoneNumber: TEST_DATA.phoneNumber,
        customerName: TEST_DATA.customerName
      };

      const result = await security.validatePaymentRequest(request);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.riskScore).toBeLessThan(50);
    });

    test('should detect invalid phone number', async () => {
      const request = {
        ...TEST_DATA,
        phoneNumber: 'invalid_phone'
      };

      const result = await security.validatePaymentRequest(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Format de numéro invalide');
    });

    test('should detect high amount', async () => {
      const request = {
        ...TEST_DATA,
        amount: 50000 // Montant élevé
      };

      const result = await security.validatePaymentRequest(request);
      
      expect(result.warnings).toContain('Montant élevé - surveillance renforcée');
      expect(result.riskScore).toBeGreaterThan(20);
    });

    test('should detect suspicious phone number', async () => {
      const request = {
        ...TEST_DATA,
        phoneNumber: '0600000000' // Numéro suspect
      };

      const result = await security.validatePaymentRequest(request);
      
      expect(result.warnings).toContain('Numéro de téléphone suspect');
      expect(result.riskScore).toBeGreaterThan(10);
    });

    test('should detect transactions outside normal hours', async () => {
      // Mock de l'heure actuelle (3h du matin)
      const mockDate = new Date('2026-01-05T03:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const request = {
        ...TEST_DATA,
        amount: 100
      };

      const result = await security.validatePaymentRequest(request);
      
      expect(result.warnings).toContain('Transaction en dehors des heures normales');
      expect(result.riskScore).toBeGreaterThan(0);

      jest.restoreAllMocks();
    });
  });

  describe('validateCallback', () => {
    test('should validate correct callback', async () => {
      const callbackData = {
        transaction_id: TEST_DATA.transactionId,
        status: 'completed',
        amount: TEST_DATA.amount,
        merchant_id: 'test_merchant'
      };

      const result = await security.validateCallback(callbackData, 'orange_money');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing required fields', async () => {
      const callbackData = {
        status: 'completed'
        // transaction_id et amount manquants
      };

      const result = await security.validateCallback(callbackData, 'orange_money');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Champ obligatoire manquant: transaction_id');
      expect(result.errors).toContain('Champ obligatoire manquant: amount');
    });

    test('should detect invalid amount', async () => {
      const callbackData = {
        transaction_id: TEST_DATA.transactionId,
        status: 'completed',
        amount: 'invalid_amount',
        merchant_id: 'test_merchant'
      };

      const result = await security.validateCallback(callbackData, 'orange_money');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Montant invalide dans le callback');
    });

    test('should detect invalid status', async () => {
      const callbackData = {
        transaction_id: TEST_DATA.transactionId,
        status: 'invalid_status',
        amount: TEST_DATA.amount,
        merchant_id: 'test_merchant'
      };

      const result = await security.validateCallback(callbackData, 'orange_money');
      
      expect(result.warnings).toContain('Statut suspect: invalid_status');
      expect(result.riskScore).toBeGreaterThan(0);
    });
  });

  describe('encryptSensitiveData', () => {
    test('should encrypt sensitive data', () => {
      const sensitiveData = 'phone_number_123456789';
      
      const encrypted = security.encryptSensitiveData(sensitiveData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(sensitiveData);
      expect(typeof encrypted).toBe('string');
    });

    test('should return original data if encryption disabled', () => {
      security.updateConfig({ enableEncryption: false });
      
      const sensitiveData = 'phone_number_123456789';
      const result = security.encryptSensitiveData(sensitiveData);
      
      expect(result).toBe(sensitiveData);
    });
  });

  describe('generateSessionToken', () => {
    test('should generate secure session token', () => {
      const token1 = security.generateSessionToken();
      const token2 = security.generateSessionToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    test('should validate generated token', () => {
      const token = security.generateSessionToken();
      
      // Token devrait être invalide initialement
      expect(security.validateSessionToken(token)).toBe(false);
    });
  });
});

// Tests d'intégration
describe('Mobile Payments Integration', () => {
  describe('Complete Payment Flow', () => {
    test('should handle complete payment flow', async () => {
      // Ce test simule un flux complet de paiement
      
      // 1. Création de la demande
      const createRequest = {
        orderId: TEST_DATA.orderId,
        amount: TEST_DATA.amount,
        providerCode: 'orange_money',
        phoneNumber: TEST_DATA.phoneNumber
      };

      // Mock des réponses
      const mockOrder = {
        id: TEST_DATA.orderId,
        order_number: 123,
        total_amount: TEST_DATA.amount
      };

      const mockTransaction = {
        id: 'tx_integration_123',
        ...createRequest,
        status: 'pending'
      };

      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockOrder, error: null })
            })
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      };

      jest.doMock('../lib/supabase', () => ({
        supabase: mockSupabase
      }));

      // Mock de l'adaptateur
      const mockAdapter = {
        createPaymentRequest: jest.fn().mockResolvedValue({
          success: true,
          externalTransactionId: 'ext_tx_integration',
          status: 'processing',
          redirectUrl: 'https://payment.example.com/tx'
        })
      };

      jest.doMock('../lib/payments/orange-money-adapter', () => ({
        OrangeMoneyAdapter: jest.fn().mockImplementation(() => mockAdapter)
      }));

      // 2. Création de la demande de paiement
      const createResult = await mobilePaymentsService.createPaymentRequest(createRequest);
      expect(createResult.success).toBe(true);
      expect(createResult.transactionId).toBeDefined();

      // 3. Vérification du statut
      const statusResult = await mobilePaymentsService.checkPaymentStatus(createResult.transactionId!);
      expect(statusResult.success).toBe(true);

      // 4. Historique
      const history = await mobilePaymentsService.getTransactionHistory({
        orderId: TEST_DATA.orderId
      });
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle provider unavailability', async () => {
      const request = {
        orderId: TEST_DATA.orderId,
        amount: TEST_DATA.amount,
        providerCode: 'unavailable_provider'
      };

      const result = await mobilePaymentsService.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non disponible');
    });

    test('should handle network failures gracefully', async () => {
      // Mock d'une erreur réseau
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const adapter = new OrangeMoneyAdapter();
      const request = {
        transactionId: TEST_DATA.transactionId,
        amount: TEST_DATA.amount,
        currency: TEST_DATA.currency,
        phoneNumber: TEST_DATA.phoneNumber,
        description: 'Test payment',
        orderId: TEST_DATA.orderId
      };

      const result = await adapter.createPaymentRequest(request);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur');
    });
  });

  describe('Security Integration', () => {
    test('should validate and process secure payment', async () => {
      const request = {
        orderId: TEST_DATA.orderId,
        amount: TEST_DATA.amount,
        providerCode: 'orange_money',
        phoneNumber: TEST_DATA.phoneNumber,
        customerName: 'Test Customer'
      };

      // Validation de sécurité
      const securityValidation = await mobilePaymentsSecurity.validatePaymentRequest(request);
      expect(securityValidation.isValid).toBe(true);

      // Si la validation échoue, le paiement ne devrait pas être créé
      if (!securityValidation.isValid) {
        const result = await mobilePaymentsService.createPaymentRequest(request);
        expect(result.success).toBe(false);
      } else {
        // Mock pour éviter les appels réels
        const mockSupabase = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: { id: TEST_DATA.orderId, total_amount: TEST_DATA.amount }, 
                  error: null 
                })
              })
            })
          })
        };

        jest.doMock('../lib/supabase', () => ({
          supabase: mockSupabase
        }));

        const result = await mobilePaymentsService.createPaymentRequest(request);
        expect(result.success).toBe(true);
      }
    });
  });
});

// Configuration Jest globale
afterEach(() => {
  jest.restoreAllMocks();
});

// Configuration globale pour les tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};