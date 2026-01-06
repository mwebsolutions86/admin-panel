/**
 * GESTIONNAIRE DES TRADUCTIONS - Universal Eats
 * Gestionnaire avancé des traductions avec validation et import/export
 * Support des pluriels, contextes, et validation qualité
 */

import { supabase } from './supabase';
import { LocalizationService, TranslationValue, SupportedLanguage, Market } from './localization-service';

export interface TranslationValidation {
  key: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface TranslationFile {
  language: string;
  market: string;
  version: string;
  format: 'json' | 'po' | 'xlf' | 'csv';
  translations: Record<string, TranslationValue>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    description?: string;
    encoding: string;
  };
}

export interface TranslationProgress {
  language: string;
  market: string;
  totalKeys: number;
  translatedKeys: number;
  percentage: number;
  lastUpdated: Date;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'incomplete';
  missingKeys: string[];
  invalidKeys: string[];
}

export interface TranslationQualityMetrics {
  completeness: number;
  consistency: number;
  accuracy: number;
  formatting: number;
  overall: number;
}

export class TranslationManager {
  private static instance: TranslationManager;
  private supabase = supabase;
  private localizationService = LocalizationService.getInstance();
  private validationRules: Map<string, ValidationRule> = new Map();
  private translationCache: Map<string, TranslationFile> = new Map();

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  /**
   * Initialise les règles de validation
   */
  private initializeValidationRules(): void {
    // Règles de validation par défaut
    this.validationRules.set('required_fields', {
      name: 'required_fields',
      description: 'Vérifie que tous les champs requis sont présents',
      validator: (value: TranslationValue) => {
        const errors: string[] = [];
        if (!value.value || value.value.trim() === '') {
          errors.push('La valeur de traduction est requise');
        }
        if (value.value && value.value.length > 500) {
          errors.push('La valeur ne doit pas dépasser 500 caractères');
        }
        return { isValid: errors.length === 0, errors };
      }
    });

    this.validationRules.set('html_safety', {
      name: 'html_safety',
      description: 'Vérifie la sécurité HTML dans les traductions',
      validator: (value: TranslationValue) => {
        const errors: string[] = [];
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link'];
        const dangerousAttributes = ['onclick', 'onload', 'onerror', 'javascript:'];
        
        if (value.value) {
          // Vérifier les balises dangereuses
          dangerousTags.forEach(tag => {
            const regex = new RegExp(`<${tag}[^>]*>`, 'gi');
            if (regex.test(value.value)) {
              errors.push(`Balise dangereuse détectée: ${tag}`);
            }
          });

          // Vérifier les attributs dangereux
          dangerousAttributes.forEach(attr => {
            const regex = new RegExp(`${attr}`, 'gi');
            if (regex.test(value.value)) {
              errors.push(`Attribut dangereux détecté: ${attr}`);
            }
          });
        }

        return { isValid: errors.length === 0, errors };
      }
    });

    this.validationRules.set('placeholders', {
      name: 'placeholders',
      description: 'Vérifie la cohérence des placeholders',
      validator: (value: TranslationValue, context?: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Extraire les placeholders {variable}
        const placeholders = value.value?.match(/\{(\w+)\}/g) || [];
        const placeholderKeys = placeholders.map(p => p.slice(1, -1));

        // Vérifier la cohérence avec les variables déclarées
        if (value.variables) {
          const declaredVars = Object.keys(value.variables);
          placeholderKeys.forEach(key => {
            if (!declaredVars.includes(key)) {
              errors.push(`Placeholder {${key}} non déclaré dans variables`);
            }
          });
        }

        // Suggestions d'amélioration
        if (placeholders.length > 5) {
          warnings.push('Trop de placeholders dans cette traduction');
          suggestions.push('Considérez diviser en plusieurs clés');
        }

        return { isValid: errors.length === 0, errors, warnings, suggestions };
      }
    });

    this.validationRules.set('length_limits', {
      name: 'length_limits',
      description: 'Vérifie les limites de longueur par contexte',
      validator: (value: TranslationValue, context?: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const contextLimits: Record<string, { max: number; recommended: number }> = {
          'button': { max: 30, recommended: 20 },
          'title': { max: 100, recommended: 60 },
          'description': { max: 300, recommended: 200 },
          'placeholder': { max: 50, recommended: 30 },
          'tooltip': { max: 80, recommended: 50 }
        };

        if (value.context && value.value) {
          const limit = contextLimits[value.context];
          if (limit) {
            if (value.value.length > limit.max) {
              errors.push(`Texte trop long pour le contexte ${value.context} (max: ${limit.max})`);
            } else if (value.value.length > limit.recommended) {
              warnings.push(`Texte long pour le contexte ${value.context} (recommandé: ${limit.recommended})`);
            }
          }
        }

        return { isValid: errors.length === 0, errors, warnings };
      }
    });
  }

  /**
   * Valide une traduction selon les règles configurées
   */
  public validateTranslation(
    key: string, 
    value: TranslationValue, 
    context?: any
  ): TranslationValidation {
    const validation: TranslationValidation = {
      key,
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Appliquer toutes les règles de validation
    this.validationRules.forEach(rule => {
      const result = rule.validator(value, context);
      
      if (!result.isValid) {
        validation.isValid = false;
        validation.errors.push(...result.errors);
      }
      
      if (result.warnings) {
        validation.warnings.push(...result.warnings);
      }
      
      if (result.suggestions) {
        validation.suggestions.push(...result.suggestions);
      }
    });

    return validation;
  }

  /**
   * Valide un fichier de traduction complet
   */
  public async validateTranslationFile(file: TranslationFile): Promise<{
    isValid: boolean;
    validations: TranslationValidation[];
    summary: {
      totalKeys: number;
      validKeys: number;
      invalidKeys: number;
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    const validations: TranslationValidation[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    // Valider chaque traduction
    for (const [key, value] of Object.entries(file.translations)) {
      const validation = this.validateTranslation(key, value);
      validations.push(validation);
      
      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
    }

    const summary = {
      totalKeys: Object.keys(file.translations).length,
      validKeys: validations.filter(v => v.isValid).length,
      invalidKeys: validations.filter(v => !v.isValid).length,
      totalErrors,
      totalWarnings
    };

    return {
      isValid: totalErrors === 0,
      validations,
      summary
    };
  }

  /**
   * Calcule les métriques de qualité d'une traduction
   */
  public calculateQualityMetrics(
    translations: Record<string, TranslationValue>,
    referenceTranslations?: Record<string, TranslationValue>
  ): TranslationQualityMetrics {
    const totalKeys = Object.keys(translations).length;
    if (totalKeys === 0) {
      return { completeness: 0, consistency: 0, accuracy: 0, formatting: 0, overall: 0 };
    }

    // Complétude: pourcentage de clés traduites
    const translatedKeys = Object.values(translations).filter(t => t.value && t.value.trim() !== '').length;
    const completeness = (translatedKeys / totalKeys) * 100;

    // Cohérence: vérifier l'utilisation cohérente des variables
    let consistency = 100;
    if (referenceTranslations) {
      const referencePlaceholders = this.extractAllPlaceholders(referenceTranslations);
      const currentPlaceholders = this.extractAllPlaceholders(translations);
      const missingPlaceholders = referencePlaceholders.filter(p => !currentPlaceholders.includes(p));
      consistency = missingPlaceholders.length > 0 ? 70 : 100;
    }

    // Précision: validation des traductions
    let accuracy = 100;
    let errorCount = 0;
    for (const [key, value] of Object.entries(translations)) {
      const validation = this.validateTranslation(key, value);
      if (!validation.isValid) {
        errorCount++;
      }
    }
    accuracy = totalKeys > 0 ? ((totalKeys - errorCount) / totalKeys) * 100 : 100;

    // Formatage: vérification des formats standards
    let formatting = 100;
    let formattingIssues = 0;
    for (const [key, value] of Object.entries(translations)) {
      // Vérifier la ponctuation
      if (value.value) {
        if (key.startsWith('ui.') && !value.value.match(/[.!?]$/)) {
          formattingIssues++;
        }
        // Vérifier la casse
        if (key.includes('title') && value.value[0] && value.value[0] !== value.value[0].toUpperCase()) {
          formattingIssues++;
        }
      }
    }
    if (totalKeys > 0) {
      formatting = ((totalKeys - formattingIssues) / totalKeys) * 100;
    }

    // Score global pondéré
    const overall = (completeness * 0.4 + consistency * 0.2 + accuracy * 0.3 + formatting * 0.1);

    return {
      completeness,
      consistency,
      accuracy,
      formatting,
      overall
    };
  }

  /**
   * Extrait tous les placeholders d'un ensemble de traductions
   */
  private extractAllPlaceholders(translations: Record<string, TranslationValue>): string[] {
    const placeholders = new Set<string>();
    
    Object.values(translations).forEach(translation => {
      if (translation.value) {
        const matches = translation.value.match(/\{(\w+)\}/g) || [];
        matches.forEach(match => {
          placeholders.add(match.slice(1, -1)); // Enlever les { et }
        });
      }
    });

    return Array.from(placeholders);
  }

  /**
   * Génère un rapport de progression des traductions
   */
  public async generateProgressReport(
    languages: string[], 
    markets: string[]
  ): Promise<TranslationProgress[]> {
    const reports: TranslationProgress[] = [];

    // Obtenir toutes les clés de traduction attendues
    const expectedKeys = await this.getExpectedTranslationKeys();

    for (const language of languages) {
      for (const market of markets) {
        // Charger les traductions existantes
        const existingTranslations = await this.loadTranslationsFromDB(language, market);
        
        const totalKeys = expectedKeys.length;
        const translatedKeys = Object.keys(existingTranslations).length;
        const percentage = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;

        // Identifier les clés manquantes et invalides
        const missingKeys = expectedKeys.filter(key => !existingTranslations[key]);
        const invalidKeys: string[] = [];

        for (const [key, value] of Object.entries(existingTranslations)) {
          const validation = this.validateTranslation(key, value);
          if (!validation.isValid) {
            invalidKeys.push(key);
          }
        }

        // Déterminer la qualité globale
        let quality: TranslationProgress['quality'] = 'excellent';
        if (percentage < 50) quality = 'incomplete';
        else if (percentage < 70) quality = 'poor';
        else if (percentage < 85) quality = 'fair';
        else if (percentage < 95) quality = 'good';

        reports.push({
          language,
          market,
          totalKeys,
          translatedKeys,
          percentage,
          lastUpdated: new Date(),
          quality,
          missingKeys,
          invalidKeys
        });
      }
    }

    return reports;
  }

  /**
   * Obtient toutes les clés de traduction attendues
   */
  private async getExpectedTranslationKeys(): Promise<string[]> {
    // Dans une implémentation complète, cela viendrait d'un schéma de traduction
    // Pour l'instant, on utilise un ensemble standard
    return [
      // Navigation
      'nav.home', 'nav.menu', 'nav.cart', 'nav.orders', 'nav.profile', 'nav.loyalty', 'nav.promotions',
      
      // Interface utilisateur
      'ui.loading', 'ui.error', 'ui.success', 'ui.cancel', 'ui.confirm', 'ui.save', 'ui.edit',
      'ui.delete', 'ui.search', 'ui.filter', 'ui.sort',
      
      // Produits
      'product.addToCart', 'product.outOfStock', 'product.price', 'product.description',
      'product.ingredients', 'product.allergens',
      
      // Commandes
      'order.status.pending', 'order.status.confirmed', 'order.status.preparing',
      'order.status.ready', 'order.status.delivering', 'order.status.delivered', 'order.status.cancelled',
      
      // Panier
      'cart.empty', 'cart.total', 'cart.subtotal', 'cart.tax', 'cart.delivery', 'cart.checkout',
      
      // Paiement
      'payment.methods', 'payment.card', 'payment.cash', 'payment.mobile',
      'payment.processing', 'payment.success', 'payment.failed',
      
      // Livraison
      'delivery.address', 'delivery.time', 'delivery.fee', 'delivery.tracking',
      
      // Fidélité
      'loyalty.points', 'loyalty.rewards', 'loyalty.levels', 'loyalty.history',
      
      // Promotions
      'promotions.active', 'promotions.code', 'promotions.discount', 'promotions.expires',
      
      // Messages
      'msg.welcome', 'msg.thankYou', 'msg.goodbye', 'msg.languageChanged', 'msg.marketChanged'
    ];
  }

  /**
   * Charge les traductions depuis la base de données
   */
  private async loadTranslationsFromDB(
    language: string, 
    market: string
  ): Promise<Record<string, TranslationValue>> {
    try {
      const { data, error } = await this.supabase
        .from('localization_translations')
        .select('*')
        .eq('language', language)
        .eq('market', market)
        .eq('is_active', true);

      if (error) throw error;

      const translations: Record<string, TranslationValue> = {};
      data?.forEach(item => {
        translations[item.key] = {
          value: item.value,
          context: item.context,
          gender: item.gender,
          plural: item.plural,
          variables: item.variables ? JSON.parse(item.variables) : undefined
        };
      });

      return translations;
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
      return {};
    }
  }

  /**
   * Exporte les traductions dans différents formats
   */
  public async exportTranslations(
    language: string,
    market: string,
    format: 'json' | 'po' | 'xlf' | 'csv' = 'json'
  ): Promise<string> {
    const translations = await this.loadTranslationsFromDB(language, market);
    
    switch (format) {
      case 'json':
        return this.exportToJSON(translations, language, market);
      case 'po':
        return this.exportToPO(translations, language, market);
      case 'xlf':
        return this.exportToXLF(translations, language, market);
      case 'csv':
        return this.exportToCSV(translations);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Exporte au format JSON
   */
  private exportToJSON(
    translations: Record<string, TranslationValue>,
    language: string,
    market: string
  ): string {
    const file: TranslationFile = {
      language,
      market,
      version: '1.0.0',
      format: 'json',
      translations,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Universal Eats System',
        description: `Traductions ${language} pour le marché ${market}`,
        encoding: 'utf-8'
      }
    };

    return JSON.stringify(file, null, 2);
  }

  /**
   * Exporte au format PO (GNU Gettext)
   */
  private exportToPO(
    translations: Record<string, TranslationValue>,
    language: string,
    market: string
  ): string {
    let poContent = '';
    
    // En-tête PO
    poContent += `# Universal Eats Translation File\n`;
    poContent += `# Language: ${language}\n`;
    poContent += `# Market: ${market}\n`;
    poContent += `# Encoding: UTF-8\n`;
    poContent += `msgid ""\n`;
    poContent += `msgstr ""\n`;
    poContent += `"Project-Id-Version: Universal Eats\\n"\n`;
    poContent += `"Language: ${language}\\n"\n`;
    poContent += `"MIME-Version: 1.0\\n"\n`;
    poContent += `"Content-Type: text/plain; charset=UTF-8\\n"\n`;
    poContent += `"Content-Transfer-Encoding: 8bit\\n"\n\n`;

    // Traductions
    for (const [key, value] of Object.entries(translations)) {
      poContent += `# ${value.context || ''}\n`;
      poContent += `msgid "${key}"\n`;
      poContent += `msgstr "${value.value.replace(/"/g, '\\"')}"\n\n`;
    }

    return poContent;
  }

  /**
   * Exporte au format XLIFF
   */
  private exportToXLF(
    translations: Record<string, TranslationValue>,
    language: string,
    market: string
  ): string {
    let xlfContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xlfContent += `<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n`;
    xlfContent += `  <file source-language="fr" target-language="${language}" datatype="plaintext" original="Universal Eats">\n`;
    xlfContent += `    <body>\n`;

    for (const [key, value] of Object.entries(translations)) {
      xlfContent += `      <trans-unit id="${key}" resname="${key}">\n`;
      xlfContent += `        <source>${key}</source>\n`;
      xlfContent += `        <target>${value.value}</target>\n`;
      if (value.context) {
        xlfContent += `        <note>Context: ${value.context}</note>\n`;
      }
      xlfContent += `      </trans-unit>\n`;
    }

    xlfContent += `    </body>\n`;
    xlfContent += `  </file>\n`;
    xlfContent += `</xliff>`;

    return xlfContent;
  }

  /**
   * Exporte au format CSV
   */
  private exportToCSV(translations: Record<string, TranslationValue>): string {
    let csvContent = 'key,value,context,gender,plural,variables\n';
    
    for (const [key, value] of Object.entries(translations)) {
      const row = [
        key,
        `"${value.value.replace(/"/g, '""')}"`,
        value.context || '',
        value.gender || '',
        value.plural || '',
        value.variables ? `"${JSON.stringify(value.variables).replace(/"/g, '""')}"` : ''
      ];
      csvContent += row.join(',') + '\n';
    }

    return csvContent;
  }

  /**
   * Importe des traductions depuis un fichier
   */
  public async importTranslations(
    fileContent: string,
    format: 'json' | 'po' | 'xlf' | 'csv',
    language: string,
    market: string,
    options?: {
      overwrite?: boolean;
      validateBeforeImport?: boolean;
      author?: string;
    }
  ): Promise<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    warnings: string[];
  }> {
    const options_final = {
      overwrite: false,
      validateBeforeImport: true,
      author: 'System Import',
      ...options
    };

    try {
      // Parser le contenu selon le format
      let translations: Record<string, TranslationValue>;
      
      switch (format) {
        case 'json':
          translations = this.parseJSONContent(fileContent);
          break;
        case 'po':
          translations = this.parsePOContent(fileContent);
          break;
        case 'xlf':
          translations = this.parseXLFContent(fileContent);
          break;
        case 'csv':
          translations = this.parseCSVContent(fileContent);
          break;
        default:
          throw new Error(`Format non supporté: ${format}`);
      }

      const result = {
        success: true,
        imported: 0,
        skipped: 0,
        errors: [] as string[],
        warnings: [] as string[]
      };

      // Traiter chaque traduction
      for (const [key, value] of Object.entries(translations)) {
        try {
          // Validation si activée
          if (options_final.validateBeforeImport) {
            const validation = this.validateTranslation(key, value);
            if (!validation.isValid) {
              result.errors.push(`Clé ${key}: ${validation.errors.join(', ')}`);
              continue;
            }
            if (validation.warnings.length > 0) {
              result.warnings.push(`Clé ${key}: ${validation.warnings.join(', ')}`);
            }
          }

          // Vérifier si la traduction existe déjà
          const existing = await this.checkExistingTranslation(key, language, market);
          if (existing && !options_final.overwrite) {
            result.skipped++;
            continue;
          }

          // Sauvegarder la traduction
          await this.saveTranslation(key, value, language, market, options_final.author);
          result.imported++;

        } catch (error) {
          result.errors.push(`Erreur lors de l'import de ${key}: ${error}`);
        }
      }

      // Si il y a des erreurs, marquer comme échec partiel
      if (result.errors.length > 0) {
        result.success = result.imported > 0;
      }

      return result;

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [msg],
        warnings: []
      };
    }
  }

  /**
   * Parse le contenu JSON
   */
  private parseJSONContent(content: string): Record<string, TranslationValue> {
    const parsed = JSON.parse(content);
    
    if (parsed.translations) {
      return parsed.translations;
    }
    
    // Si c'est directement un objet de traductions
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }

    throw new Error('Format JSON invalide');
  }

  /**
   * Parse le contenu PO
   */
  private parsePOContent(content: string): Record<string, TranslationValue> {
    const lines = content.split('\n');
    const translations: Record<string, TranslationValue> = {};
    let currentKey = '';
    let currentValue = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('msgid "')) {
        if (currentKey && currentValue) {
          translations[currentKey] = { value: currentValue };
        }
        currentKey = line.slice(7, -1); // Enlever msgid " et "
        currentValue = '';
      } else if (line.startsWith('msgstr "')) {
        currentValue = line.slice(8, -1); // Enlever msgstr " et "
        if (currentKey && currentValue) {
          translations[currentKey] = { value: currentValue };
          currentKey = '';
          currentValue = '';
        }
      }
    }

    return translations;
  }

  /**
   * Parse le contenu XLIFF
   */
  private parseXLFContent(content: string): Record<string, TranslationValue> {
    // Simple parser XML - dans un vrai projet, utiliser un parser XML approprié
    const translations: Record<string, TranslationValue> = {};
    const unitRegex = /<trans-unit[^>]*id="([^"]*)"[^>]*>[\s\S]*?<source>([^<]*)<\/source>[\s\S]*?<target>([^<]*)<\/target>/g;
    
    let match;
    while ((match = unitRegex.exec(content)) !== null) {
      const [, key, source, target] = match;
      translations[key] = { value: target };
    }

    return translations;
  }

  /**
   * Parse le contenu CSV
   */
  private parseCSVContent(content: string): Record<string, TranslationValue> {
    const lines = content.split('\n');
    const translations: Record<string, TranslationValue> = {};
    
    // Ignorer l'en-tête
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = this.parseCSVLine(line);
      if (columns.length >= 2) {
        const [key, value, context, gender, plural, variables] = columns;
        
        const translation: TranslationValue = { value };
        if (context) translation.context = context;
        if (gender) translation.gender = gender as any;
        if (plural) translation.plural = plural as any;
        if (variables) {
          try {
            translation.variables = JSON.parse(variables);
          } catch (e) {
            // Ignorer les variables mal formatées
          }
        }

        translations[key] = translation;
      }
    }

    return translations;
  }

  /**
   * Parse une ligne CSV en tenant compte des guillemets
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Ignorer le guillemet suivant
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Vérifie si une traduction existe déjà
   */
  private async checkExistingTranslation(
    key: string, 
    language: string, 
    market: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('localization_translations')
        .select('id')
        .eq('key', key)
        .eq('language', language)
        .eq('market', market)
        .single();

      return Boolean(data && !error);
    } catch (error) {
      return false;
    }
  }

  /**
   * Sauvegarde une traduction dans la base de données
   */
  private async saveTranslation(
    key: string,
    value: TranslationValue,
    language: string,
    market: string,
    author: string
  ): Promise<void> {
    const translationData = {
      key,
      value: value.value,
      language,
      market,
      context: value.context,
      gender: value.gender,
      plural: value.plural,
      variables: value.variables ? JSON.stringify(value.variables) : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author
    };

    const { error } = await this.supabase
      .from('localization_translations')
      .upsert(translationData, { 
        onConflict: 'key,language,market'
      });

    if (error) throw error;
  }

  /**
   * Obtient les statistiques de traduction
   */
  public async getTranslationStatistics(): Promise<{
    totalLanguages: number;
    totalMarkets: number;
    totalTranslations: number;
    languageBreakdown: Record<string, number>;
    marketBreakdown: Record<string, number>;
    qualityScore: number;
  }> {
    try {
      // Obtenir les statistiques de base
      const { data: languages } = await this.supabase
        .from('localization_translations')
        .select('language')
        .eq('is_active', true);

      const { data: markets } = await this.supabase
        .from('localization_translations')
        .select('market')
        .eq('is_active', true);

      const { data: totalTranslations } = await this.supabase
        .from('localization_translations')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Calculer les décompositions
      const languageBreakdown: Record<string, number> = {};
      const marketBreakdown: Record<string, number> = {};

      languages?.forEach(item => {
        languageBreakdown[item.language] = (languageBreakdown[item.language] || 0) + 1;
      });

      markets?.forEach(item => {
        marketBreakdown[item.market] = (marketBreakdown[item.market] || 0) + 1;
      });

      // Calculer un score de qualité approximatif
      const totalKeys = totalTranslations?.length || 0;
      const qualityScore = Math.min(100, totalKeys * 2); // Score simplifié

      return {
        totalLanguages: Object.keys(languageBreakdown).length,
        totalMarkets: Object.keys(marketBreakdown).length,
        totalTranslations: totalKeys,
        languageBreakdown,
        marketBreakdown,
        qualityScore
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        totalLanguages: 0,
        totalMarkets: 0,
        totalTranslations: 0,
        languageBreakdown: {},
        marketBreakdown: {},
        qualityScore: 0
      };
    }
  }
}

// Interface pour les règles de validation
interface ValidationRule {
  name: string;
  description: string;
  validator: (value: TranslationValue, context?: any) => {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    suggestions?: string[];
  };
}

// Export de l'instance singleton
export const translationManager = TranslationManager.getInstance();