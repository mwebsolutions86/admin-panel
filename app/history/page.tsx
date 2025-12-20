'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Search, Filter } from 'lucide-react';

export default function HistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('Global');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    // 1. Vérifier qui est connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single();
    
    // 2. Préparer la requête
    let query = supabase
      .from('orders')
      .select('*, stores(name)')
      .in('status', ['delivered', 'cancelled', 'completed']) // Seulement les commandes finies
      .order('created_at', { ascending: false })
      .limit(50); // On limite aux 50 dernières pour l'instant

    // 3. Filtrer si Manager
    if (profile && profile.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id);
        
        // Récupérer le nom du store pour le titre
        const { data: st } = await supabase.from('stores').select('name').eq('id', profile.store_id).single();
        if (st) setStoreName(st.name);
    } else {
        setStoreName('Historique Global (Siège)');
    }

    const { data, error } = await query;
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center">Chargement de l'historique...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Historique des Commandes</h1>
            <p className="text-gray-500 mt-1">{storeName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th className="p-4 font-semibold text-gray-600">Date</th>
                    <th className="p-4 font-semibold text-gray-600">N° Commande</th>
                    <th className="p-4 font-semibold text-gray-600">Client</th>
                    <th className="p-4 font-semibold text-gray-600">Statut</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                        <td className="p-4 text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('fr-FR')} <br/>
                            <span className="text-xs">{new Date(order.created_at).toLocaleTimeString('fr-FR')}</span>
                        </td>
                        <td className="p-4 font-bold">#{order.order_number}</td>
                        <td className="p-4">{order.customer_name || 'Anonyme'}</td>
                        <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                                {order.status === 'delivered' ? 'Livrée' : order.status}
                            </span>
                        </td>
                        <td className="p-4 font-bold text-right">{order.total_amount} DH</td>
                    </tr>
                ))}
            </tbody>
        </table>
        {orders.length === 0 && <div className="p-8 text-center text-gray-400">Aucune historique disponible.</div>}
      </div>
    </div>
  );
}