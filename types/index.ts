import { Database } from './database.types';

// On récupère les types de base générés (si disponibles) ou on définit manuellement
// Pour faire simple et robuste ici :

export interface OrderItem { 
  id?: string; 
  product_name: string; 
  quantity: number; 
  price: number; // Important pour le total
  // LE FIX EST ICI : On accepte 'any' pour gérer l'ancien (Tableau) et le nouveau format (Objet)
  options: any; 
}

export interface Order {
  id: string; 
  order_number: number; 
  customer_name: string | null; 
  customer_phone: string | null;
  delivery_address: string | null; 
  order_type: string; // 'dine_in' | 'takeaway' | 'delivery'
  total_amount: number; 
  created_at: string; 
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  
  // ✅ CORRECTION : Ajout du champ notes
  notes: string | null;

  // Relations
  order_items: OrderItem[]; 
  
  // Champs calculés ou optionnels
  latitude?: number | null;
  longitude?: number | null;
  payment_method?: string;
  payment_status?: string;
}