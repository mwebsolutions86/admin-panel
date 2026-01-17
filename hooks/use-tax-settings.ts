import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TaxConfig {
  standardRate: number;
  reducedRate: number;
  superReducedRate: number;
  vatId?: string; // Identifiant fiscal
  professionalTaxId?: string; // Taxe pro
}

const DEFAULT_TAX_CONFIG: TaxConfig = {
  standardRate: 20,
  reducedRate: 10,
  superReducedRate: 7
};

export function useTaxSettings(storeId: string) {
  const [config, setConfig] = useState<TaxConfig>(DEFAULT_TAX_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [storeId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      if (data?.settings && data.settings['tax_config']) {
        setConfig({ ...DEFAULT_TAX_CONFIG, ...data.settings['tax_config'] });
      }
    } catch (error) {
      console.error('Erreur chargement config fiscale:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newConfig: TaxConfig) => {
    setIsSaving(true);
    try {
      // 1. Récupérer les settings actuels
      const { data: currentStore } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', storeId)
        .single();

      const currentSettings = currentStore?.settings || {};

      // 2. Merger avec la nouvelle config fiscale
      const updatedSettings = {
        ...currentSettings,
        tax_config: newConfig
      };

      // 3. Sauvegarder
      const { error } = await supabase
        .from('stores')
        .update({ settings: updatedSettings })
        .eq('id', storeId);

      if (error) throw error;

      setConfig(newConfig);
      toast.success('Configuration fiscale mise à jour');
    } catch (error) {
      console.error('Erreur sauvegarde config fiscale:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config,
    isLoading,
    isSaving,
    updateSettings
  };
}