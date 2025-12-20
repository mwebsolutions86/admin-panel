import { Database } from './database.types';

// Raccourci vers les définitions
type Tables = Database['public']['Tables'];

// 🟢 VOS NOUVEAUX TYPES PROPRES
// Utilisez ceux-ci dans vos composants React

// Une commande complète (telle qu'elle est en base)
export type Order = Tables['orders']['Row'];

// Une commande qu'on s'apprête à créer (sans ID, sans created_at)
export type OrderInsert = Tables['orders']['Insert'];

// Une commande qu'on modifie
export type OrderUpdate = Tables['orders']['Update'];

// Idem pour les produits
export type Product = Tables['products']['Row'];
export type Store = Tables['stores']['Row'];