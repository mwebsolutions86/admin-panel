/**
 * INTERFACE D'ADMINISTRATION DES TRADUCTIONS - Universal Eats
 * Interface complète pour l'administration des traductions
 * Gestion CRUD, import/export, validation et analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  localizationAPI,
  TranslationFilter,
  APIResponse,
  TranslationStats
} from '../../lib/localization-api';
import { 
  useLocalization, 
  useTranslate, 
  useLocaleInfo 
} from '../../hooks/use-localization';
import { 
  LocalizedText, 
  LocalizedButton, 
  LocalizedError,
  LocalizedSuccess,
  LocalizedLabel
} from './LocalizedText';
import { LanguageSelector } from './LanguageSelector';
import { localeFormatter } from '../../lib/locale-formatter';

interface TranslationAdminProps {
  className?: string;
}

interface Translation {
  id: string;
  key: string;
  value: string;
  language: string;
  market: string;
  context?: string;
  gender?: 'masculine' | 'feminine';
  plural?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
  variables?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author: string;
}

export const TranslationAdmin: React.FC<TranslationAdminProps> = ({ className }) => {
  const { supportedLanguages, supportedMarkets } = useLocalization();
  const { translate } = useTranslate();
  const { getLanguageByCode, getMarketByCode } = useLocaleInfo();

  // États principaux
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour les filtres et pagination
  const [filters, setFilters] = useState<TranslationFilter>({
    language: 'fr',
    market: 'FR',
    page: 1,
    limit: 50,
    sortBy: 'key',
    sortOrder: 'asc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
// Remplacer la fonction loadStats par :

  const loadStats = async () => {
    try {
      const mockStats: any = { // Utilisation de 'any' ou typage partiel pour éviter les conflits stricts pendant le dev
        totalTranslations: 1250,
        languagesBreakdown: { fr: 450, en: 400, ar: 400 },
        marketsBreakdown: { FR: 600, MA: 650 },
        completionRates: { fr: 100, en: 85, ar: 85 },
        qualityScores: { fr: 98, en: 95, ar: 92 },
        recentUpdates: [],
        
        // === PROPRIÉTÉ MANQUANTE AJOUTÉE ===
        missingTranslations: [
          { key: 'welcome_message', missingIn: [{ language: 'ar', market: 'MA' }] }
        ],
        
        key: 'global_stats',
        language: 'all',
        market: 'all',
        updatedAt: new Date().toISOString(),
        author: 'system'
      };
      
      setStats(mockStats);
    } catch (err) {
      console.error("Erreur lors du chargement des stats:", err);
    }
  };

  // Chargement initial
  useEffect(() => {
    loadTranslations();
    loadStats();
  }, [filters]);
  // États pour l'édition
  const [editingTranslation, setEditingTranslation] = useState<Translation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // États pour import/export
  const [showImportExport, setShowImportExport] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'po' | 'xlf'>('json');

  // Charger les données initiales
  useEffect(() => {
    loadTranslations();
    loadStats();
  }, [filters]);

  /**
   * Charge la liste des traductions
   */
  const loadTranslations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await localizationAPI.getTranslations(filters);
      
      if (response.success) {
        setTranslations(response.data || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error || 'Erreur lors du chargement des traductions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charge les statistiques
   */
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">
                <LocalizedText translationKey="admin.localization.totalKeys" />
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {/* SAFE ACCESS */}
                {stats?.totalTranslations || 0}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">
                <LocalizedText translationKey="admin.localization.languages" />
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {/* SAFE ACCESS */}
                {stats?.languagesBreakdown ? Object.keys(stats.languagesBreakdown).length : 0}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">
                <LocalizedText translationKey="admin.localization.markets" />
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {/* SAFE ACCESS */}
                {stats?.marketsBreakdown ? Object.keys(stats.marketsBreakdown).length : 0}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">
                <LocalizedText translationKey="admin.localization.completion" />
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {/* SAFE ACCESS & CALCULATION */}
                {stats?.completionRates 
                  ? `${Math.round(Object.values(stats.completionRates).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(stats.completionRates).length))}%`
                  : '0%'}
              </p>
            </div>
          </div>
  /**
   * Gère la sauvegarde d'une traduction
   */
  const handleSaveTranslation = async (translation: Partial<Translation>) => {
    try {
      setLoading(true);
      setError(null);

      let response: APIResponse;

      if (editingTranslation) {
        // Mise à jour
        response = await localizationAPI.updateTranslation(
          editingTranslation.key,
          translation.value!,
          translation.language!,
          translation.market!,
          {
            context: translation.context,
            gender: translation.gender,
            plural: translation.plural,
            variables: translation.variables,
            author: 'Admin Panel'
          }
        );
      } else {
        // Création
        response = await localizationAPI.createTranslation(
          translation.key!,
          translation.value!,
          translation.language!,
          translation.market!,
          {
            context: translation.context,
            gender: translation.gender,
            plural: translation.plural,
            variables: translation.variables,
            author: 'Admin Panel'
          }
        );
      }

      if (response.success) {
        setSuccess(response.message || 'Traduction sauvegardée avec succès');
        setEditingTranslation(null);
        setShowAddForm(false);
        loadTranslations();
        loadStats();
      } else {
        setError(response.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère la suppression d'une traduction
   */
  const handleDeleteTranslation = async (translation: Translation) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la traduction "${translation.key}" ?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await localizationAPI.deleteTranslation(
        translation.key,
        translation.language,
        translation.market
      );

      if (response.success) {
        setSuccess('Traduction supprimée avec succès');
        loadTranslations();
        loadStats();
      } else {
        setError(response.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère l'import de traductions
   */
  const handleImport = async () => {
    if (!importContent.trim()) {
      setError('Veuillez fournir un contenu à importer');
      return;
    }

    try {
      setLoading(true);
      const response = await localizationAPI.importTranslations(importContent, {
        format: importFormat,
        language: filters.language!,
        market: filters.market!,
        overwrite: true,
        validateBeforeImport: true,
        author: 'Admin Panel'
      });

      if (response.success) {
        setSuccess(`Import réussi: ${response.data?.imported || 0} traductions importées`);
        setImportContent('');
        setShowImportExport(false);
        loadTranslations();
        loadStats();
      } else {
        setError(response.error || 'Erreur lors de l\'import');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère l'export de traductions
   */
  const handleExport = async (format: 'json' | 'csv' | 'po' | 'xlf') => {
    try {
      setLoading(true);
      const response = await localizationAPI.exportTranslations({
        format,
        language: filters.language!,
        market: filters.market!
      });

      if (response.success) {
        // Télécharger le fichier
        const blob = new Blob([response.data.content], { 
          type: response.data.mimeType 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess('Export réussi');
      } else {
        setError(response.error || 'Erreur lors de l\'export');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère le changement de filtres
   */
  const handleFilterChange = (newFilters: Partial<TranslationFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  /**
   * Gère la recherche
   */
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    handleFilterChange({ search: term, page: 1 });
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            <LocalizedText translationKey="admin.localization.title" />
          </h1>
          <p className="text-gray-600 mt-1">
            <LocalizedText translationKey="admin.localization.subtitle" />
          </p>
        </div>
        
        <div className="flex space-x-2">
          <LocalizedButton
            translationKey="admin.localization.export"
            variant="outline"
            onClick={() => setShowImportExport(true)}
          />
          <LocalizedButton
            translationKey="admin.localization.add"
            onClick={() => setShowAddForm(true)}
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <LocalizedError
          translationKey="admin.localization.error"
          params={{ error }}
          variant="alert"
        />
      )}
      
      {success && (
        <LocalizedSuccess
          translationKey="admin.localization.success"
          params={{ success }}
          variant="alert"
        />
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              <LocalizedText translationKey="admin.localization.totalTranslations" />
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalTranslations}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              <LocalizedText translationKey="admin.localization.languages" />
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.languagesBreakdown).length}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              <LocalizedText translationKey="admin.localization.markets" />
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(stats.marketsBreakdown).length}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              <LocalizedText translationKey="admin.localization.completionRate" />
            </h3>
            <p className="text-2xl font-bold text-green-600">
              {stats.completionRates[`${filters.language}_${filters.market}`] || 0}%
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Sélecteur de langue */}
          <div>
            <LocalizedLabel
              translationKey="admin.localization.language"
              htmlFor="language-filter"
            />
            <select
              id="language-filter"
              value={filters.language || ''}
              onChange={(e) => handleFilterChange({ language: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {supportedLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de marché */}
          <div>
            <LocalizedLabel
              translationKey="admin.localization.market"
              htmlFor="market-filter"
            />
            <select
              id="market-filter"
              value={filters.market || ''}
              onChange={(e) => handleFilterChange({ market: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {supportedMarkets.map(market => (
                <option key={market.code} value={market.code}>
                  {market.name} ({market.code})
                </option>
              ))}
            </select>
          </div>

          {/* Recherche */}
          <div>
            <LocalizedLabel
              translationKey="admin.localization.search"
              htmlFor="search-filter"
            />
            <input
              id="search-filter"
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={translate('admin.localization.searchPlaceholder')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Tri */}
          <div>
            <LocalizedLabel
              translationKey="admin.localization.sortBy"
              htmlFor="sort-filter"
            />
            <select
              id="sort-filter"
              value={`${filters.sortBy}_${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('_');
                handleFilterChange({ sortBy: sortBy as any, sortOrder: sortOrder as any });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="key_asc">Clé (A-Z)</option>
              <option value="key_desc">Clé (Z-A)</option>
              <option value="updated_at_desc">Plus récent</option>
              <option value="updated_at_asc">Plus ancien</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des traductions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <LocalizedText translationKey="admin.localization.key" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <LocalizedText translationKey="admin.localization.value" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <LocalizedText translationKey="admin.localization.context" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <LocalizedText translationKey="admin.localization.updated" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <LocalizedText translationKey="admin.localization.actions" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-2 text-gray-500">
                        <LocalizedText translationKey="ui.loading" />
                      </span>
                    </div>
                  </td>
                </tr>
              ) : translations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    <LocalizedText translationKey="admin.localization.noTranslations" />
                  </td>
                </tr>
              ) : (
                translations.map((translation) => (
                  <tr key={`${translation.key}_${translation.language}_${translation.market}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {translation.key}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={translation.value}>
                        {translation.value}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {translation.context || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(translation.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingTranslation(translation)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <LocalizedText translationKey="ui.edit" />
                        </button>
                        <button
                          onClick={() => handleDeleteTranslation(translation)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <LocalizedText translationKey="ui.delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                <LocalizedText 
                  translationKey="admin.localization.pagination"
                  params={{
                    start: (pagination.page - 1) * pagination.limit + 1,
                    end: Math.min(pagination.page * pagination.limit, pagination.total),
                    total: pagination.total
                  }}
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange({ page: pagination.page - 1 })}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  <LocalizedText translationKey="ui.previous" />
                </button>
                
                <span className="px-3 py-1 text-sm">
                  {pagination.page} / {pagination.pages}
                </span>
                
                <button
                  onClick={() => handleFilterChange({ page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  <LocalizedText translationKey="ui.next" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire d'ajout/édition */}
      {(showAddForm || editingTranslation) && (
        <TranslationEditForm
          translation={editingTranslation}
          onSave={handleSaveTranslation}
          onCancel={() => {
            setEditingTranslation(null);
            setShowAddForm(false);
          }}
          defaultLanguage={filters.language || 'fr'}
          defaultMarket={filters.market || 'FR'}
        />
      )}

      {/* Modal import/export */}
      {showImportExport && (
        <ImportExportModal
          onImport={handleImport}
          onExport={handleExport}
          onClose={() => setShowImportExport(false)}
          currentLanguage={filters.language || 'fr'}
          currentMarket={filters.market || 'FR'}
          loading={loading}
        />
      )}
    </div>
  );
};

/**
 * Composant formulaire d'édition de traduction
 */
interface TranslationEditFormProps {
  translation?: Translation | null;
  onSave: (translation: Partial<Translation>) => void;
  onCancel: () => void;
  defaultLanguage: string;
  defaultMarket: string;
}

const TranslationEditForm: React.FC<TranslationEditFormProps> = ({
  translation,
  onSave,
  onCancel,
  defaultLanguage,
  defaultMarket
}) => {
  const { supportedLanguages, supportedMarkets } = useLocalization();
  const { translate } = useTranslate();

  const [formData, setFormData] = useState({
    key: translation?.key || '',
    value: translation?.value || '',
    language: translation?.language || defaultLanguage,
    market: translation?.market || defaultMarket,
    context: translation?.context || '',
    gender: translation?.gender as any || '',
    plural: translation?.plural as any || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {translation ? (
              <LocalizedText translationKey="admin.localization.editTranslation" />
            ) : (
              <LocalizedText translationKey="admin.localization.addTranslation" />
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Clé */}
            <div>
              <LocalizedLabel
                translationKey="admin.localization.key"
                htmlFor="key"
                required
              />
              <input
                id="key"
                type="text"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={!!translation} // Clé non modifiable en édition
              />
            </div>

            {/* Valeur */}
            <div>
              <LocalizedLabel
                translationKey="admin.localization.value"
                htmlFor="value"
                required
              />
              <textarea
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Langue */}
            <div>
              <LocalizedLabel
                translationKey="admin.localization.language"
                htmlFor="language"
                required
              />
              <select
                id="language"
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {supportedLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Marché */}
            <div>
              <LocalizedLabel
                translationKey="admin.localization.market"
                htmlFor="market"
                required
              />
              <select
                id="market"
                value={formData.market}
                onChange={(e) => setFormData(prev => ({ ...prev, market: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {supportedMarkets.map(market => (
                  <option key={market.code} value={market.code}>
                    {market.name} ({market.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Contexte */}
            <div>
              <LocalizedLabel
                translationKey="admin.localization.context"
                htmlFor="context"
              />
              <input
                id="context"
                type="text"
                value={formData.context}
                onChange={(e) => setFormData(prev => ({ ...prev, context: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Genre et pluriel */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <LocalizedLabel
                  translationKey="admin.localization.gender"
                  htmlFor="gender"
                />
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value=""><LocalizedText translationKey="ui.none" /></option>
                  <option value="masculine"><LocalizedText translationKey="admin.localization.masculine" /></option>
                  <option value="feminine"><LocalizedText translationKey="admin.localization.feminine" /></option>
                </select>
              </div>

              <div>
                <LocalizedLabel
                  translationKey="admin.localization.plural"
                  htmlFor="plural"
                />
                <select
                  id="plural"
                  value={formData.plural}
                  onChange={(e) => setFormData(prev => ({ ...prev, plural: e.target.value as any }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value=""><LocalizedText translationKey="ui.none" /></option>
                  <option value="zero">Zero</option>
                  <option value="one">One</option>
                  <option value="two">Two</option>
                  <option value="few">Few</option>
                  <option value="many">Many</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-3 pt-4">
              <LocalizedButton
                translationKey="ui.cancel"
                variant="outline"
                onClick={onCancel}
                type="button"
              />
              <LocalizedButton
                translationKey="ui.save"
                type="submit"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal pour import/export
 */
interface ImportExportModalProps {
  onImport: () => void;
  onExport: (format: 'json' | 'csv' | 'po' | 'xlf') => void;
  onClose: () => void;
  currentLanguage: string;
  currentMarket: string;
  loading: boolean;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  onImport,
  onExport,
  onClose,
  currentLanguage,
  currentMarket,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importContent, setImportContent] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv' | 'po' | 'xlf'>('json');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              <LocalizedText translationKey="admin.localization.importExport" />
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('import')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LocalizedText translationKey="admin.localization.import" />
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'export'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <LocalizedText translationKey="admin.localization.export" />
              </button>
            </nav>
          </div>

          {activeTab === 'import' ? (
            <div className="space-y-4">
              <div>
                <LocalizedLabel
                  translationKey="admin.localization.format"
                  htmlFor="import-format"
                />
                <select
                  id="import-format"
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as any)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="po">PO (Gettext)</option>
                  <option value="xlf">XLIFF</option>
                </select>
              </div>

              <div>
                <LocalizedLabel
                  translationKey="admin.localization.content"
                  htmlFor="import-content"
                />
                <textarea
                  id="import-content"
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  rows={10}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-2">
                  <LocalizedText translationKey="admin.localization.importPlaceholder" />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <LocalizedButton
                  translationKey="ui.cancel"
                  variant="outline"
                  onClick={onClose}
                />
                <LocalizedButton
                  translationKey="admin.localization.import"
                  onClick={onImport}
                  disabled={!importContent.trim() || loading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">
                  <LocalizedText translationKey="admin.localization.exportInfo" />
                </h4>
                <p className="text-sm text-gray-600">
                  <LocalizedText 
                    translationKey="admin.localization.exportDescription"
                    params={{
                      language: currentLanguage,
                      market: currentMarket
                    }}
                  />
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => onExport('json')}
                  disabled={loading}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium">JSON</div>
                  <div className="text-sm text-gray-500">Format standard</div>
                </button>

                <button
                  onClick={() => onExport('csv')}
                  disabled={loading}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium">CSV</div>
                  <div className="text-sm text-gray-500">Tableur</div>
                </button>

                <button
                  onClick={() => onExport('po')}
                  disabled={loading}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium">PO</div>
                  <div className="text-sm text-gray-500">Gettext</div>
                </button>

                <button
                  onClick={() => onExport('xlf')}
                  disabled={loading}
                  className="p-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium">XLIFF</div>
                  <div className="text-sm text-gray-500">XML standard</div>
                </button>
              </div>

              <div className="flex justify-end">
                <LocalizedButton
                  translationKey="ui.close"
                  variant="outline"
                  onClick={onClose}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};