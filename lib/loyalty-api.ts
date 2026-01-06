/**
 * API Endpoints pour le Système de Fidélité
 * Universal Eats - Opérations REST
 * 
 * API complète pour toutes les opérations de fidélité :
 * - Gestion des utilisateurs et points
 * - Récompenses et rachats
 * - Défis et achievements
 * - Analytics et rapports
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { loyaltyService, LoyaltyUser, LoyaltyTransaction, LoyaltyLevel } from '../lib/loyalty-service';
import { loyaltyRewardsManager } from '../lib/loyalty-rewards-manager';
import { analyticsService } from '../lib/analytics-service';
import { notificationsService } from '../lib/notifications-service';
import { performanceMonitor } from '../lib/performance-monitor';
import { securityManager as security } from '../lib/security-enhanced';

// Types pour les requêtes API
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface LoyaltyFilters extends PaginationParams {
  userId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  rarity?: string;
}

/**
 * Middleware de validation des headers
 */
function validateHeaders(req: NextApiRequest): { isValid: boolean; error?: string; userId?: string } {
  // Vérifier la méthode pour les endpoints sensibles
  const sensitiveMethods = ['POST', 'PUT', 'DELETE'];
  if (sensitiveMethods.includes(req.method || '')) {
    if (!req.headers.authorization) {
      return { isValid: false, error: 'Token d\'autorisation requis' };
    }
  }

  // Extraire l'ID utilisateur (simulation)
  const userId = req.headers['x-user-id'] as string || req.query.userId as string;
  
  return { isValid: true, userId };
}

/**
 * Middleware de gestion des erreurs
 */
function handleApiError(error: any, res: NextApiResponse, operation: string): void {
  performanceMonitor.error(`Erreur API fidélité: ${operation}`, { error });
  
  const statusCode = error.message?.includes('non trouvé') ? 404 :
                    error.message?.includes('autorisation') ? 401 :
                    error.message?.includes('validation') ? 400 : 500;
  
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Erreur interne du serveur',
    timestamp: new Date().toISOString()
  } as ApiResponse);
}

/**
 * Middleware de réponse standardisée
 */
function sendResponse<T>(
  res: NextApiResponse, 
  data: T, 
  statusCode: number = 200, 
  message?: string
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  } as ApiResponse<T>);
}

// ============================================================================
// ENDPOINTS UTILISATEURS
// ============================================================================

/**
 * POST /api/loyalty/register
 * Inscription au programme de fidélité
 */
export async function handleRegister(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { isValid, error, userId } = validateHeaders(req);
    if (!isValid || !userId) {
      return sendResponse(res, null, 401, error || 'Utilisateur non identifié');
    }

    const { preferences } = req.body;

    const user = await loyaltyService.registerUser(userId, preferences);

    // Envoyer notification de bienvenue
    await notificationsService.sendNotificationFromTemplate(
      'loyalty-welcome',
      {
        welcomeBonus: '50',
        levelName: 'Bronze',
        levelBenefits: 'Réduction 5% sur toutes vos commandes'
      },
      userId
    );

    performanceMonitor.info('Utilisateur inscrit au programme de fidélité', { userId });
    sendResponse(res, user, 201, 'Inscription réussie');

  } catch (error) {
    handleApiError(error, res, 'inscription fidélité');
  }
}

/**
 * GET /api/loyalty/user/[userId]
 * Récupération des données utilisateur de fidélité
 */
export async function handleGetUser(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const user = await loyaltyService.getUser(userId);
    
    if (!user) {
      return sendResponse(res, null, 404, 'Utilisateur non trouvé dans le programme de fidélité');
    }

    sendResponse(res, user);

  } catch (error) {
    handleApiError(error, res, 'récupération utilisateur');
  }
}

/**
 * PUT /api/loyalty/user/[userId]
 * Mise à jour des données utilisateur
 */
export async function handleUpdateUser(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'PUT') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const { preferences, birthday } = req.body;
    const updates: Partial<LoyaltyUser> = {};

    if (preferences) updates.preferences = preferences;
    if (birthday) updates.birthday = birthday;

    const user = await loyaltyService.updateUser(userId, updates);

    performanceMonitor.info('Données utilisateur fidélité mises à jour', { userId, updates });
    sendResponse(res, user, 200, 'Mise à jour réussie');

  } catch (error) {
    handleApiError(error, res, 'mise à jour utilisateur');
  }
}

// ============================================================================
// ENDPOINTS POINTS
// ============================================================================

/**
 * POST /api/loyalty/points/add
 * Ajout de points à un utilisateur
 */
export async function handleAddPoints(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId, points, description, orderId, metadata } = req.body;

    if (!userId || !points || !description) {
      return sendResponse(res, null, 400, 'Paramètres requis: userId, points, description');
    }

    const transaction = await loyaltyService.addPoints(userId, points, description, orderId, metadata);

    sendResponse(res, transaction, 201, 'Points ajoutés avec succès');

  } catch (error) {
    handleApiError(error, res, 'ajout points');
  }
}

/**
 * POST /api/loyalty/points/redeem
 * Utilisation de points pour une récompense
 */
export async function handleRedeemPoints(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId, rewardId, pointsCost } = req.body;

    if (!userId || !rewardId || !pointsCost) {
      return sendResponse(res, null, 400, 'Paramètres requis: userId, rewardId, pointsCost');
    }

    const transaction = await loyaltyService.redeemPoints(userId, rewardId, pointsCost);

    sendResponse(res, transaction, 200, 'Points utilisés avec succès');

  } catch (error) {
    handleApiError(error, res, 'utilisation points');
  }
}

/**
 * GET /api/loyalty/levels
 * Récupération des niveaux de fidélité
 */
export async function handleGetLevels(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const levels = loyaltyService.getLevels();
    sendResponse(res, levels);

  } catch (error) {
    handleApiError(error, res, 'récupération niveaux');
  }
}

// ============================================================================
// ENDPOINTS RÉCOMPENSES
// ============================================================================

/**
 * GET /api/loyalty/rewards
 * Récupération des récompenses disponibles
 */
export async function handleGetRewards(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { category } = req.query;
    
    let rewards = loyaltyRewardsManager.getRewards();
    
    if (category && typeof category === 'string') {
      rewards = loyaltyRewardsManager.getRewardsByCategory(category);
    }

    sendResponse(res, rewards);

  } catch (error) {
    handleApiError(error, res, 'récupération récompenses');
  }
}

/**
 * GET /api/loyalty/rewards/recommended/[userId]
 * Récupération des récompenses recommandées pour un utilisateur
 */
export async function handleGetRecommendedRewards(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const rewards = await loyaltyRewardsManager.getAvailableChallenges(userId).then(() => 
      loyaltyService.getRecommendedRewards(userId)
    );

    sendResponse(res, rewards);

  } catch (error) {
    handleApiError(error, res, 'récupération récompenses recommandées');
  }
}

/**
 * GET /api/loyalty/categories
 * Récupération des catégories de récompenses
 */
export async function handleGetCategories(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const categories = loyaltyRewardsManager.getCategories();
    sendResponse(res, categories);

  } catch (error) {
    handleApiError(error, res, 'récupération catégories');
  }
}

// ============================================================================
// ENDPOINTS DÉFIS
// ============================================================================

/**
 * GET /api/loyalty/challenges
 * Récupération des défis actifs
 */
export async function handleGetChallenges(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const challenges = loyaltyRewardsManager.getActiveChallenges();
    sendResponse(res, challenges);

  } catch (error) {
    handleApiError(error, res, 'récupération défis');
  }
}

/**
 * POST /api/loyalty/challenges/join
 * Inscription à un défi
 */
export async function handleJoinChallenge(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId, challengeId } = req.body;

    if (!userId || !challengeId) {
      return sendResponse(res, null, 400, 'Paramètres requis: userId, challengeId');
    }

    await loyaltyRewardsManager.joinChallenge(userId, challengeId);

    sendResponse(res, null, 201, 'Inscription au défi réussie');

  } catch (error) {
    handleApiError(error, res, 'inscription défi');
  }
}

/**
 * GET /api/loyalty/challenges/available/[userId]
 * Récupération des défis disponibles pour un utilisateur
 */
export async function handleGetAvailableChallenges(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const challenges = await loyaltyRewardsManager.getAvailableChallenges(userId);
    sendResponse(res, challenges);

  } catch (error) {
    handleApiError(error, res, 'récupération défis disponibles');
  }
}

// ============================================================================
// ENDPOINTS ACHIEVEMENTS
// ============================================================================

/**
 * GET /api/loyalty/achievements
 * Récupération des achievements
 */
export async function handleGetAchievements(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const achievements = loyaltyRewardsManager.getAchievements();
    sendResponse(res, achievements);

  } catch (error) {
    handleApiError(error, res, 'récupération achievements');
  }
}

/**
 * GET /api/loyalty/achievements/check/[userId]
 * Vérification et mise à jour des achievements d'un utilisateur
 */
export async function handleCheckAchievements(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const unlockedAchievements = await loyaltyRewardsManager.checkAndUpdateAchievements(userId);
    sendResponse(res, unlockedAchievements);

  } catch (error) {
    handleApiError(error, res, 'vérification achievements');
  }
}

/**
 * GET /api/loyalty/gamification/score/[userId]
 * Calcul du score de gamification d'un utilisateur
 */
export async function handleGetGamificationScore(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const score = await loyaltyRewardsManager.calculateGamificationScore(userId);
    sendResponse(res, score);

  } catch (error) {
    handleApiError(error, res, 'calcul score gamification');
  }
}

// ============================================================================
// ENDPOINTS TRANSACTIONS
// ============================================================================

/**
 * GET /api/loyalty/transactions/[userId]
 * Récupération de l'historique des transactions
 */
export async function handleGetTransactions(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return sendResponse(res, null, 400, 'ID utilisateur requis');
    }

    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string, 10) || 50;

    const transactions = await loyaltyService.getUserTransactions(userId, limitNum);
    sendResponse(res, transactions);

  } catch (error) {
    handleApiError(error, res, 'récupération transactions');
  }
}

// ============================================================================
// ENDPOINTS ANALYTICS
// ============================================================================

/**
 * GET /api/loyalty/analytics
 * Récupération des analytics du programme de fidélité
 */
export async function handleGetAnalytics(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const analytics = await loyaltyService.getAnalytics();
    sendResponse(res, analytics);

  } catch (error) {
    handleApiError(error, res, 'récupération analytics');
  }
}

/**
 * GET /api/loyalty/analytics/rewards-report
 * Génération du rapport de performance des récompenses
 */
export async function handleGetRewardsReport(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const report = await loyaltyRewardsManager.generateRewardsReport();
    sendResponse(res, report);

  } catch (error) {
    handleApiError(error, res, 'génération rapport récompenses');
  }
}

/**
 * GET /api/loyalty/analytics/statistics
 * Récupération des statistiques du gestionnaire
 */
export async function handleGetStatistics(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const statistics = loyaltyRewardsManager.getStatistics();
    sendResponse(res, statistics);

  } catch (error) {
    handleApiError(error, res, 'récupération statistiques');
  }
}

// ============================================================================
// ENDPOINTS CONFIGURATION
// ============================================================================

/**
 * GET /api/loyalty/config
 * Récupération de la configuration du programme
 */
export async function handleGetConfig(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const config = loyaltyService.getConfig();
    sendResponse(res, config);

  } catch (error) {
    handleApiError(error, res, 'récupération configuration');
  }
}

/**
 * GET /api/loyalty/gamification/settings
 * Récupération des paramètres de gamification
 */
export async function handleGetGamificationSettings(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'GET') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const settings = loyaltyRewardsManager.getGamificationSettings();
    sendResponse(res, settings);

  } catch (error) {
    handleApiError(error, res, 'récupération paramètres gamification');
  }
}

// ============================================================================
// ENDPOINTS SPÉCIAUX
// ============================================================================

/**
 * POST /api/loyalty/order/process
 * Traitement d'une commande pour l'ajout de points
 */
export async function handleProcessOrder(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { orderId, userId, orderTotal, category } = req.body;

    if (!orderId || !userId || !orderTotal) {
      return sendResponse(res, null, 400, 'Paramètres requis: orderId, userId, orderTotal');
    }

    await loyaltyService.processOrderForPoints(orderId, userId, orderTotal, category);

    sendResponse(res, null, 200, 'Points fidélité traités pour la commande');

  } catch (error) {
    handleApiError(error, res, 'traitement commande fidélité');
  }
}

/**
 * POST /api/loyalty/referral/process
 * Traitement d'un parrainage
 */
export async function handleProcessReferral(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { referrerId, referredId } = req.body;

    if (!referrerId || !referredId) {
      return sendResponse(res, null, 400, 'Paramètres requis: referrerId, referredId');
    }

    await loyaltyService.processReferral(referrerId, referredId);

    sendResponse(res, null, 200, 'Parrainage traité avec succès');

  } catch (error) {
    handleApiError(error, res, 'traitement parrainage');
  }
}

/**
 * POST /api/loyalty/birthday/process
 * Traitement d'un anniversaire
 */
export async function handleProcessBirthday(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      return sendResponse(res, null, 405, 'Méthode non autorisée');
    }

    const { userId } = req.body;

    if (!userId) {
      return sendResponse(res, null, 400, 'Paramètre requis: userId');
    }

    await loyaltyService.processBirthday(userId);

    sendResponse(res, null, 200, 'Bonus anniversaire accordé');

  } catch (error) {
    handleApiError(error, res, 'traitement anniversaire');
  }
}

// ============================================================================
// ROUTEUR PRINCIPAL
// ============================================================================

/**
 * Routeur principal pour toutes les API de fidélité
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { url, method } = req;
  
  performanceMonitor.debug('API Fidélité - Requête reçue', { url, method });

  try {
    // Router les requêtes selon l'URL
    if (url?.startsWith('/api/loyalty/register')) {
      return handleRegister(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/user/')) {
      if (method === 'GET') return handleGetUser(req, res);
      if (method === 'PUT') return handleUpdateUser(req, res);
    }
    
    if (url === '/api/loyalty/levels' && method === 'GET') {
      return handleGetLevels(req, res);
    }
    
    if (url === '/api/loyalty/points/add' && method === 'POST') {
      return handleAddPoints(req, res);
    }
    
    if (url === '/api/loyalty/points/redeem' && method === 'POST') {
      return handleRedeemPoints(req, res);
    }
    
    if (url === '/api/loyalty/rewards' && method === 'GET') {
      return handleGetRewards(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/rewards/recommended/') && method === 'GET') {
      return handleGetRecommendedRewards(req, res);
    }
    
    if (url === '/api/loyalty/categories' && method === 'GET') {
      return handleGetCategories(req, res);
    }
    
    if (url === '/api/loyalty/challenges' && method === 'GET') {
      return handleGetChallenges(req, res);
    }
    
    if (url === '/api/loyalty/challenges/join' && method === 'POST') {
      return handleJoinChallenge(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/challenges/available/') && method === 'GET') {
      return handleGetAvailableChallenges(req, res);
    }
    
    if (url === '/api/loyalty/achievements' && method === 'GET') {
      return handleGetAchievements(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/achievements/check/') && method === 'GET') {
      return handleCheckAchievements(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/gamification/score/') && method === 'GET') {
      return handleGetGamificationScore(req, res);
    }
    
    if (url?.startsWith('/api/loyalty/transactions/') && method === 'GET') {
      return handleGetTransactions(req, res);
    }
    
    if (url === '/api/loyalty/analytics' && method === 'GET') {
      return handleGetAnalytics(req, res);
    }
    
    if (url === '/api/loyalty/analytics/rewards-report' && method === 'GET') {
      return handleGetRewardsReport(req, res);
    }
    
    if (url === '/api/loyalty/analytics/statistics' && method === 'GET') {
      return handleGetStatistics(req, res);
    }
    
    if (url === '/api/loyalty/config' && method === 'GET') {
      return handleGetConfig(req, res);
    }
    
    if (url === '/api/loyalty/gamification/settings' && method === 'GET') {
      return handleGetGamificationSettings(req, res);
    }
    
    if (url === '/api/loyalty/order/process' && method === 'POST') {
      return handleProcessOrder(req, res);
    }
    
    if (url === '/api/loyalty/referral/process' && method === 'POST') {
      return handleProcessReferral(req, res);
    }
    
    if (url === '/api/loyalty/birthday/process' && method === 'POST') {
      return handleProcessBirthday(req, res);
    }

    // Endpoint non trouvé
    return sendResponse(res, null, 404, 'Endpoint non trouvé');

  } catch (error) {
    handleApiError(error, res, 'routeur API fidélité');
  }
}

// Handlers are exported where they are defined to avoid duplicate exports.