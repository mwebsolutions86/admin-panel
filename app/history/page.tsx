'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';
import { Loader2, AlertCircle } from 'lucide-react';

// On définit un type pour l'affichage de l'historique
type OrderWithStore = Database['public']['Tables']['orders']['Row'] & {
  stores: { name: string } | null;
};

export default function HistoryPage() {
  const [orders, setOrders] = useState<OrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('Global');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    // 1. Vérifier qui est connecté
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        setLoading(false);
        return;
    }

    // 2. Récupérer le profil pour savoir si c'est un Manager
    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .single();
    
    const profile = rawProfile as any;

    // 3. Préparer la requête
    // ❌ ERREUR AVANT : .in('status', ['delivered', 'cancelled', 'completed']) -> 'completed' faisait planter
    let query = supabase
      .from('orders')
      .select('*, stores(name)')
      .in('status', ['delivered', 'cancelled']) // ✅ CORRIGÉ : On garde seulement les statuts valides
      .order('created_at', { ascending: false })
      .limit(50); 

    // 4. Filtrer si Manager
    if (profile && profile.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id);
        
        // Récupérer le nom du store pour le titre
        const { data: st } = await supabase.from('stores').select('name').eq('id', profile.store_id).single();
        if (st) setStoreName(st.name);
    } else {
        setStoreName('Historique Global (Siège)');
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erreur chargement historique:", error.message);
    } else if (data) {
        setOrders(data as unknown as OrderWithStore[]);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 size={40} className="animate-spin text-blue-500"/>
        <p>Chargement de l'historique...</p>
    </div>
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">HISTORIQUE</h1>
            <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-wider">{storeName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Commande</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurant</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-600 text-sm">
                            <div className="font-bold">{new Date(order.created_at || '').toLocaleDateString('fr-FR')}</div>
                            <div className="text-xs text-slate-400">{new Date(order.created_at || '').toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>
                        </td>
                        <td className="p-4 font-black text-slate-800 font-mono text-base">#{order.order_number}</td>
                        <td className="p-4 text-sm text-slate-600 font-medium">
                            {order.stores?.name || 'Inconnu'}
                        </td>
                        <td className="p-4 text-sm text-slate-700">
                            <div className="font-bold">{order.customer_name || 'Anonyme'}</div>
                            <div className="text-xs text-slate-400">{order.customer_phone || ''}</div>
                        </td>
                        <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                                order.status === 'cancelled' 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                                {order.status === 'delivered' ? 'Livrée' : 'Annulée'}
                            </span>
                        </td>
                        <td className="p-4 font-black text-right text-slate-900">{order.total_amount} DH</td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {!loading && orders.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-slate-300">
                <AlertCircle size={48} className="mb-2 opacity-50"/>
                <p className="font-medium">Aucun historique disponible.</p>
            </div>
        )}
      </div>
    </div>
  );
}