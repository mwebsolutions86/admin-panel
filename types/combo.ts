import { Database } from './database.types';

// Mappage direct avec la table 'combo_steps'
export type ComboStep = Database['public']['Tables']['combo_steps']['Row'] & {
  items?: ComboStepItem[]; // Relation virtuelle pour le frontend
};

// Mappage direct avec la table 'combo_step_items'
export type ComboStepItem = Database['public']['Tables']['combo_step_items']['Row'] & {
  product?: { name: string; price: number ; image_url: string | null;}; // Pour l'affichage
};

export type CreateComboStepInput = Database['public']['Tables']['combo_steps']['Insert'];
export type CreateComboItemInput = Database['public']['Tables']['combo_step_items']['Insert'];