/**
 * API ENDPOINTS POUR GESTION DES TRADUCTIONS - Universal Eats
 * Endpoints RESTful pour l'administration et la gestion des traductions
 * Support CRUD, import/export, validation et analytics
 */

import { createClient } from './supabase';
import { translationManager, TranslationProgress } from './translation-manager';
import { localizationService, SupportedLanguage, Market } from './localization-service';
import { localeFormatter } from './locale-formatter';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TranslationFilter {
  language?: string;
  market?: string;
  key?: string;
  context?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'key' | 'language' | 'market' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface TranslationStats {
  totalTranslations: number;
  languagesBreakdown: Record<string, number>;
  marketsBreakdown: Record<string, number>;
  completionRates: Record<string, number>;
  qualityScores: Record<string, number>;
  recentUpdates: Array<{
    key: string;
    language: string;
    market: string;
    updatedAt: Date;
    author: string;
  }>;
  missingTranslations: Array<{
    key: string;
    missingIn: Array<{ language: string; market: string }>;
  }>;
}

export interface ImportExportOptions {
  format: 'json' | 'po' | 'xlf' | 'csv';
  language: string;
  market: string;
  overwrite?: boolean;
  validateBeforeImport?: boolean;
  author?: string;
}

export interface BatchTranslationUpdate {
  translations: Array<{
    key: string;
    value: string;
    context?: string;
    gender?: 'masculine' | 'feminine';
    plural?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
    variables?: Record<string, any>;
  }>;
  language: string;
  market: string;
  author: string;
}

export class LocalizationAPI {
  private supabase = createClient();

  /**
   * Obtient la liste des traductions avec filtres et pagination
   */
  async getTranslations(filters: TranslationFilter): Promise<APIResponse> {
    try {
      let query = this.supabase
        .from('localization_translations')
        .select('*', { count: 'exact' });

      // Appliquer les filtres
      if (filters.language) {
        query = query.eq('language', filters.language);
      }
      if (filters.market) {
        query = query.eq('market', filters.market);
      }
      if (filters.key) {
        query = query.ilike('key', `%${filters.key}%`);
      }
      if (filters.context) {
        query = query.eq('context', filters.context);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.search) {
        query = query.or(`key.ilike.%${filters.search}%,value.ilike.%${filters.search}%`);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      // Tri
      const sortBy = filters.sortBy || 'key';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) throw error;

      const total = count || 0;
      const pages = Math.ceil(total / limit);

      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtient une traduction par sa clé
   */
  async getTranslation(key: string, language: string, market: string): Promise<APIResponse> {
    try {
      const { data, error } = await this.supabase
        .from('localization_translations')
        .select('*')
        .eq('key', key)
        .eq('language', language)
        .eq('market', market)
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crée une nouvelle traduction
   */
  async createTranslation(
    key: string,
    value: string,
    language: string,
    market: string,
    options?: {
      context?: string;
      gender?: 'masculine' | 'feminine';
      plural?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
      variables?: Record<string, any>;
      author?: string;
    }
  ): Promise<APIResponse> {
    try {
      // Valider la traduction
      const validation = translationManager.validateTranslation(key, {
        value,
        context: options?.context,
        gender: options?.gender,
        plural: options?.plural,
        variables: options?.variables
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation échouée: ${validation.errors.join(', ')}`
        };
      }

      const translationData = {
        key,
        value,
        language,
        market,
        context: options?.context,
        gender: options?.gender,
        plural: options?.plural,
        variables: options?.variables ? JSON.stringify(options.variables) : null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: options?.author || 'API User'
      };

      const { data, error } = await this.supabase
        .from('localization_translations')
        .insert(translationData)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Traduction créée avec succès'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Met à jour une traduction existante
   */
  async updateTranslation(
    key: string,
    value: string,
    language: string,
    market: string,
    options?: {
      context?: string;
      gender?: 'masculine' | 'feminine';
      plural?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
      variables?: Record<string, any>;
      author?: string;
    }
  ): Promise<APIResponse> {
    try {
      // Valider la traduction
      const validation = translationManager.validateTranslation(key, {
        value,
        context: options?.context,
        gender: options?.gender,
        plural: options?.plural,
        variables: options?.variables
      });

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation échouée: ${validation.errors.join(', ')}`
        };
      }

      const updateData = {
        value,
        context: options?.context,
        gender: options?.gender,
        plural: options?.plural,
        variables: options?.variables ? JSON.stringify(options.variables) : null,
        updated_at: new Date().toISOString(),
        author: options?.author || 'API User'
      };

      const { data, error } = await this.supabase
        .from('localization_translations')
        .update(updateData)
        .eq('key', key)
        .eq('language', language)
        .eq('market', market)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Traduction mise à jour avec succès'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprime une traduction
   */
  async deleteTranslation(key: string, language: string, market: string): Promise<APIResponse> {
    try {
      const { error } = await this.supabase
        .from('localization_translations')
        .delete()
        .eq('key', key)
        .eq('language', language)
        .eq('market', market);

      if (error) throw error;

      return {
        success: true,
        message: 'Traduction supprimée avec succès'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Met à jour plusieurs traductions en lot
   */
  async batchUpdateTranslations(batchData: BatchTranslationUpdate): Promise<APIResponse> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const translation of batchData.translations) {
        try {
          // Valider chaque traduction
          const validation = translationManager.validateTranslation(translation.key, {
            value: translation.value,
            context: translation.context,
            gender: translation.gender,
            plural: translation.plural,
            variables: translation.variables
          });

          if (!validation.isValid) {
            results.failed++;
            results.errors.push(`Clé ${translation.key}: ${validation.errors.join(', ')}`);
            continue;
          }

          const updateData = {
            value: translation.value,
            context: translation.context,
            gender: translation.gender,
            plural: translation.plural,
            variables: translation.variables ? JSON.stringify(translation.variables) : null,
            updated_at: new Date().toISOString(),
            author: batchData.author
          };

          const { error } = await this.supabase
            .from('localization_translations')
            .upsert({
              ...updateData,
              key: translation.key,
              language: batchData.language,
              market: batchData.market,
              is_active: true,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'key,language,market'
            });

          if (error) throw error;
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Erreur pour ${translation.key}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: results,
        message: `Mise à jour en lot terminée: ${results.success} réussies, ${results.failed} échouées`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Exporte les traductions
   */
  async exportTranslations(options: ImportExportOptions): Promise<APIResponse> {
    try {
      const { format, language, market } = options;
      
      // Générer le contenu exporté
      const exportContent = await translationManager.exportTranslations(language, market, format);
      
      // Déterminer le type MIME
      const mimeTypes: Record<string, string> = {
        json: 'application/json',
        po: 'text/x-po',
        xlf: 'application/xliff+xml',
        csv: 'text/csv'
      };

      return {
        success: true,
        data: {
          content: exportContent,
          filename: `translations_${language}_${market}.${format}`,
          mimeType: mimeTypes[format],
          size: exportContent.length
        },
        message: 'Export réussi'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Importe des traductions
   */
  async importTranslations(
    content: string,
    options: ImportExportOptions
  ): Promise<APIResponse> {
    try {
      const result = await translationManager.importTranslations(
        content,
        options.format,
        options.language,
        options.market,
        {
          overwrite: options.overwrite,
          validateBeforeImport: options.validateBeforeImport,
          author: options.author
        }
      );

      return {
        success: result.success,
        data: result,
        message: result.success 
          ? `Import réussi: ${result.imported} traductions importées`
          : 'Import échoué'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtient les statistiques de localisation
   */
  async getLocalizationStats(): Promise<APIResponse> {
    try {
      const stats = await translationManager.getTranslationStatistics();
      
      // Enrichir avec des données supplémentaires
      const enrichedStats: TranslationStats = {
        ...stats,
        completionRates: await this.calculateCompletionRates(),
        qualityScores: await this.calculateQualityScores(),
        recentUpdates: await this.getRecentUpdates(),
        missingTranslations: await this.getMissingTranslations()
      };

      return {
        success: true,
        data: enrichedStats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtient le rapport de progression des traductions
   */
  async getProgressReport(): Promise<APIResponse> {
    try {
      const languages = localizationService.getSupportedLanguages().map(l => l.code);
      const markets = localizationService.getSupportedMarkets().map(m => m.code);
      
      const progressReports = await translationManager.generateProgressReport(languages, markets);

      return {
        success: true,
        data: progressReports
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valide un fichier de traduction
   */
  async validateTranslationFile(
    content: string,
    format: 'json' | 'po' | 'xlf' | 'csv'
  ): Promise<APIResponse> {
    try {
      let translations: Record<string, any> = {};
      
      // Parser le contenu selon le format
      switch (format) {
        case 'json':
          const parsed = JSON.parse(content);
          translations = parsed.translations || parsed;
          break;
        case 'csv':
          // Parser CSV basique
          const lines = content.split('\n');
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 2) {
              translations[values[0]] = { value: values[1] };
            }
          }
          break;
        default:
          throw new Error(`Format ${format} non supporté pour la validation`);
      }

      const validation = await translationManager.validateTranslationFile({
        language: 'unknown',
        market: 'unknown',
        version: '1.0.0',
        format,
        translations,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'validation',
          encoding: 'utf-8'
        }
      });

      return {
        success: true,
        data: validation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtient les langues et marchés supportés
   */
  async getSupportedLocales(): Promise<APIResponse> {
    try {
      const languages = localizationService.getSupportedLanguages();
      const markets = localizationService.getSupportedMarkets();

      return {
        success: true,
        data: {
          languages,
          markets,
          defaultLanguage: 'fr',
          defaultMarket: 'FR'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtient les formats disponibles pour un marché
   */
  async getLocaleFormats(language: string, market: string): Promise<APIResponse> {
    try {
      const formatInfo = localeFormatter.getFormatInfo(language, market);
      
      if (!formatInfo) {
        return {
          success: false,
          error: `Formats non disponibles pour ${language}_${market}`
        };
      }

      return {
        success: true,
        data: formatInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Recherche des traductions similaires
   */
  async searchSimilarTranslations(
    key: string,
    language: string,
    market: string,
    threshold = 0.8
  ): Promise<APIResponse> {
    try {
      // Recherche basique par similarité de clé
      const { data, error } = await this.supabase
        .from('localization_translations')
        .select('key, value')
        .eq('language', language)
        .eq('market', market)
        .ilike('key', `%${key}%`)
        .limit(10);

      if (error) throw error;

      // Filtrer par similarité (implémentation simplifiée)
      const similar = data?.filter(item => {
        const similarity = this.calculateSimilarity(key, item.key);
        return similarity >= threshold;
      }) || [];

      return {
        success: true,
        data: similar
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Génère un rapport de qualité
   */
  async generateQualityReport(): Promise<APIResponse> {
    try {
      const languages = localizationService.getSupportedLanguages().map(l => l.code);
      const markets = localizationService.getSupportedMarkets().map(m => m.code);
      
      const report = {
        overall: {
          totalKeys: 0,
          translatedKeys: 0,
          completionRate: 0,
          averageQuality: 0
        },
        byLanguage: {} as Record<string, any>,
        byMarket: {} as Record<string, any>,
        issues: [] as Array<{
          type: 'missing' | 'invalid' | 'inconsistent';
          key: string;
          language: string;
          market: string;
          description: string;
        }>
      };

      // Calculer les statistiques par langue
      for (const language of languages) {
        const { data, error } = await this.supabase
          .from('localization_translations')
          .select('key, value, context, market')
          .eq('language', language)
          .eq('is_active', true);

        if (error) continue;

        const translations = data || [];
        const totalKeys = new Set(translations.map(t => t.key)).size;
        const translatedKeys = translations.length;
        const completionRate = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;

        report.byLanguage[language] = {
          totalKeys,
          translatedKeys,
          completionRate,
          quality: this.calculateQualityScore(translations)
        };

        report.overall.totalKeys += totalKeys;
        report.overall.translatedKeys += translatedKeys;
      }

      // Calculer le taux de completion global
      report.overall.completionRate = report.overall.totalKeys > 0 
        ? (report.overall.translatedKeys / report.overall.totalKeys) * 100 
        : 0;

      return {
        success: true,
        data: report
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Méthodes utilitaires privées

  private async calculateCompletionRates(): Promise<Record<string, number>> {
    const languages = localizationService.getSupportedLanguages().map(l => l.code);
    const markets = localizationService.getSupportedMarkets().map(m => m.code);
    const rates: Record<string, number> = {};

    for (const language of languages) {
      for (const market of markets) {
        const key = `${language}_${market}`;
        const { count } = await this.supabase
          .from('localization_translations')
          .select('*', { count: 'exact' })
          .eq('language', language)
          .eq('market', market)
          .eq('is_active', true);

        // Estimation basée sur un nombre total de clés attendu
        const expectedKeys = 100; // Dans un vrai projet, cela viendrait d'un schéma
        const actualKeys = count || 0;
        rates[key] = expectedKeys > 0 ? (actualKeys / expectedKeys) * 100 : 0;
      }
    }

    return rates;
  }

  private async calculateQualityScores(): Promise<Record<string, number>> {
    const languages = localizationService.getSupportedLanguages().map(l => l.code);
    const scores: Record<string, number> = {};

    for (const language of languages) {
      const { data } = await this.supabase
        .from('localization_translations')
        .select('key, value')
        .eq('language', language)
        .eq('is_active', true);

      const translations = data || [];
      const qualityScore = this.calculateQualityScore(translations);
      scores[language] = qualityScore;
    }

    return scores;
  }

  private calculateQualityScore(translations: any[]): number {
    if (translations.length === 0) return 0;

    let totalScore = 0;
    let validTranslations = 0;

    translations.forEach(translation => {
      const validation = translationManager.validateTranslation(
        translation.key,
        { value: translation.value }
      );
      
      if (validation.isValid) {
        totalScore += 100 - (validation.warnings.length * 10);
        validTranslations++;
      }
    });

    return validTranslations > 0 ? totalScore / validTranslations : 0;
  }

  private async getRecentUpdates(): Promise<Array<any>> {
    const { data } = await this.supabase
      .from('localization_translations')
      .select('key, language, market, updated_at, author')
      .order('updated_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  private async getMissingTranslations(): Promise<Array<any>> {
    // Cette implémentation est simplifiée
    // Dans un vrai projet, on comparerait avec un schéma de traduction complet
    const languages = localizationService.getSupportedLanguages().map(l => l.code);
    const markets = localizationService.getSupportedMarkets().map(m => m.code);
    const missing: Array<any> = [];

    // Simuler quelques traductions manquantes
    const commonKeys = ['nav.home', 'nav.menu', 'ui.loading'];
    
    for (const key of commonKeys) {
      const missingIn: Array<{ language: string; market: string }> = [];
      
      for (const language of languages) {
        for (const market of markets) {
          if (language === 'fr' && market === 'FR') continue; // Français est complet
          
          const { data } = await this.supabase
            .from('localization_translations')
            .select('id')
            .eq('key', key)
            .eq('language', language)
            .eq('market', market)
            .single();

          if (!data) {
            missingIn.push({ language, market });
          }
        }
      }

      if (missingIn.length > 0) {
        missing.push({ key, missingIn });
      }
    }

    return missing;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Implémentation simplifiée de similarité
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export de l'instance singleton
export const localizationAPI = new LocalizationAPI();