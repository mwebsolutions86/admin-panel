import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ComboStep } from '@/types/combo';
import { toast } from 'sonner';

export function useCombo(productId: string) {
  const [steps, setSteps] = useState<ComboStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSteps = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('combo_steps')
        .select(`
          *,
          items:combo_step_items(
            *,
            product:products(name, price, image_url) 
          )
        `)
        // ^^^ AJOUT DE image_url DANS LA REQUÊTE ^^^
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Force le typage pour correspondre à notre interface enrichie
      setSteps((data as unknown) as ComboStep[]);
    } catch (err) {
      console.error('Erreur chargement combo:', err);
      toast.error("Impossible de charger la structure du menu");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Ajouter une étape
  const addStep = async (name: string, min = 1, max = 1) => {
    try {
      // Calcul du sort_order max actuel pour placer la nouvelle étape à la fin
      const maxOrder = steps.length > 0 ? Math.max(...steps.map(s => s.sort_order || 0)) : -1;
      
      const { error } = await supabase.from('combo_steps').insert({
        product_id: productId,
        name,
        min_selection: min,
        max_selection: max,
        sort_order: maxOrder + 1
      });
      if (error) throw error;
      await fetchSteps();
      toast.success("Étape ajoutée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'ajout de l'étape");
    }
  };

  // Supprimer une étape
  const deleteStep = async (stepId: string) => {
    try {
      const { error } = await supabase.from('combo_steps').delete().eq('id', stepId);
      if (error) throw error;
      setSteps(prev => prev.filter(s => s.id !== stepId));
      toast.success("Étape supprimée");
    } catch (err) {
      toast.error("Impossible de supprimer l'étape (Videz les produits d'abord)");
    }
  };

  // Ajouter un produit à une étape
  const addItemToStep = async (stepId: string, itemProductId: string, extraPrice = 0) => {
    try {
      const { error } = await supabase.from('combo_step_items').insert({
        step_id: stepId,
        product_id: itemProductId,
        extra_price: extraPrice
      });
      if (error) throw error;
      await fetchSteps();
      toast.success("Produit ajouté");
    } catch (err) {
      toast.error("Erreur d'ajout du produit");
    }
  };

  // Supprimer un item
  const deleteItem = async (itemId: string) => {
    try {
        const { error } = await supabase.from('combo_step_items').delete().eq('id', itemId);
        if (error) throw error;
        await fetchSteps();
        toast.success("Option retirée");
    } catch (err) {
        toast.error("Erreur suppression option");
    }
  };

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  return { steps, loading, addStep, deleteStep, addItemToStep, deleteItem };
}