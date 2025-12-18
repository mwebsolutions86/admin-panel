// types/index.ts

export interface OrderItem { 
  id?: string; // Optionnel selon votre DB
  product_name: string; 
  quantity: number; 
  options: string[] | null; // Peut être null
}

export interface Order {
  id: string; 
  order_number: number; 
  customer_name: string | null; 
  customer_phone: string | null;
  delivery_address: string | null; 
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  total_amount: number; 
  created_at: string; 
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  
  // NOUVEAU : La liste des articles est maintenant attachée à la commande
  order_items: OrderItem[]; 
  
  latitude?: number | null;
  longitude?: number | null;
}