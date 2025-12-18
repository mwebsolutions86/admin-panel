'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { 
  Calendar, CheckCircle2, XCircle, Search, 
  ArrowUpRight, ShoppingBag, Truck, Utensils, Loader2, Eye, Filter
} from 'lucide-react';
import { Order, OrderItem } from '@/types';

import OrderDetailsModal from '@/components/dashboard/OrderDetailsModal';
import LocationModal from '@/components/dashboard/LocationModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dateFilter, setDateFilter] = useState(() => {
    return new Date().toLocaleDateString('en-CA');
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDay = `${dateFilter}T00:00:00`;
      const endOfDay = `${dateFilter}T23:59:59`;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['delivered', 'cancelled'])
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data as unknown as Order[]); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error("Erreur historique:", message);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order);
    setShowLocationModal(false);
    setLoadingItems(true);

    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (data) setOrderItems(data);
    setLoadingItems(false);
  };

  const getElapsedMinutes = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.floor((now - start) / 60000);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === 'all' ? true : order.status === filter;
    const matchesSearch = 
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toString().includes(searchTerm) ||
      (order.delivery_address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = filteredOrders
    .filter(o => o.status === 'delivered')
    .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);

  const getStatusBadge = (status: string | null) => {
    if (status === 'delivered') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12}/> Livrée</span>;
    if (status === 'cancelled') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12}/> Annulée</span>;
    return <span className="text-gray-500">{status}</span>;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'delivery') return <div title="Livraison"><Truck size={16} className="text-blue-500" /></div>;
    if (type === 'takeaway') return <div title="Emporter"><ShoppingBag size={16} className="text-orange-500" /></div>;
    return <div title="Sur place"><Utensils size={16} className="text-purple-500" /></div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Historique</h1>
          <p className="text-slate-500 text-sm">Archives journalières des commandes.</p>
        </div>
        
        <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">CA du jour (Affiché)</p>
            <p className="text-2xl font-black text-slate-900">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">DH</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4">
        
        {/* SECTION GAUCHE : SÉLECTEUR DE DATE & FILTRES */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
            
            {/* OPTIMISATION TACTILE (POS) :
               1. Icône toujours bleue (pas de hover)
               2. Input avec bordure bleue visible
               3. Zone de clic agrandie (h-12 / py-3)
               4. Texte plus grand (text-lg)
            */}
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none">
                    <Calendar size={24} /> {/* Icône plus grosse */}
                </div>
                <input 
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-14 pr-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 font-bold text-lg text-slate-800 shadow-sm w-full md:w-auto cursor-pointer"
                    style={{ colorScheme: 'light' }} // Force l'icône calendrier native à être sombre/visible
                />
            </div>

            {/* FILTRES STATUT - BOUTONS PLUS GROS POUR TACTILE */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Tout</button>
                <button onClick={() => setFilter('delivered')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${filter === 'delivered' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>Livrées</button>
                <button onClick={() => setFilter('cancelled')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${filter === 'cancelled' ? 'bg-white shadow text-red-700' : 'text-slate-500'}`}>Annulées</button>
            </div>
        </div>

        {/* SECTION DROITE : RECHERCHE */}
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher (Client, ID, Tél...)" 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white font-medium text-lg transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Commande</th>
                <th className="px-6 py-4">Heure</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-center">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={7} className="text-center py-10 text-slate-400 flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Chargement du {new Date(dateFilter).toLocaleDateString()}...</td></tr>
              ) : filteredOrders.length === 0 ? (
                 <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucune commande trouvée pour le {new Date(dateFilter).toLocaleDateString()}.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    onClick={() => handleOrderClick(order)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group active:bg-blue-100" // active: pour feedback tactile immédiat
                  >
                    <td className="px-6 py-5"> {/* Padding augmenté pour tactile */}
                      <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-lg">#{order.order_number}</span>
                    </td>
                    <td className="px-6 py-5 text-slate-600 font-medium">
                        {new Date(order.created_at).toLocaleTimeString('fr-MA', {hour:'2-digit', minute:'2-digit'})}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800 text-base">{order.customer_name || 'Anonyme'}</div>
                      <div className="text-sm text-slate-400">{order.customer_phone || '-'}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center">{getTypeIcon(order.order_type)}</div>
                    </td>
                    <td className="px-6 py-5 text-right font-mono font-bold text-slate-900 text-lg">
                      {order.total_amount} DH
                    </td>
                    <td className="px-6 py-5 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 shadow-sm">
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
           <span>{filteredOrders.length} commandes affichées</span>
           <span className="flex items-center gap-1"><Filter size={12}/> Filtré par date : {dateFilter}</span>
        </div>
      </div>

      {selectedOrder && !showLocationModal && (
        <OrderDetailsModal 
          order={selectedOrder}
          items={orderItems}
          loadingItems={loadingItems}
          elapsedMinutes={getElapsedMinutes(selectedOrder.created_at)}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={() => {}} 
          onOpenMap={() => setShowLocationModal(true)}
          readOnly={true}
        />
      )}

      {selectedOrder && showLocationModal && (
        <LocationModal 
          order={selectedOrder}
          onClose={() => setShowLocationModal(false)}
        />
      )}

    </div>
  );
}