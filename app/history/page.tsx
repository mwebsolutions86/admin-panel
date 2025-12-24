'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, Search, Calendar, Download, Filter, 
  XCircle, CheckCircle2, ChevronRight, History
} from 'lucide-react';
import OrderDetailsModal from '@/components/dashboard/OrderDetailsModal';
import { Order } from '@/types'; 

type OrderWithStore = Order & {
  stores: { name: string } | null;
};

type TimeRange = 'today' | '7days' | '30days' | 'all';

export default function HistoryPage() {
  const [orders, setOrders] = useState<OrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('Global');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawProfile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single();
    const profile = rawProfile as any;

    let query = supabase
      .from('orders')
      .select('*, order_items(*), stores(name)')
      .in('status', ['delivered', 'cancelled']) // Uniquement les commandes terminées
      .order('created_at', { ascending: false });

    const now = new Date();
    if (timeRange === 'today') {
        query = query.gte('created_at', new Date(now.setHours(0,0,0,0)).toISOString());
    } else if (timeRange === '7days') {
        const date = new Date(); date.setDate(date.getDate() - 7);
        query = query.gte('created_at', date.toISOString());
    } else if (timeRange === '30days') {
        const date = new Date(); date.setDate(date.getDate() - 30);
        query = query.gte('created_at', date.toISOString());
    }

    if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id);
        const { data: st } = await supabase.from('stores').select('name').eq('id', profile.store_id).single();
        if (st) setStoreName(st.name);
    } else {
        setStoreName('Vue Siège • Tous les Restaurants');
    }

    const { data, error } = await query;
    if (data) setOrders(data as unknown as OrderWithStore[]);
    setLoading(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
            order.order_number.toString().includes(searchLower) ||
            (order.customer_name?.toLowerCase() || '').includes(searchLower) ||
            (order.customer_phone || '').includes(searchLower);

        const matchesStatus = statusFilter === 'all' ? true : order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const handleExport = () => {
    const headers = ["ID", "Date", "Client", "Tel", "Montant", "Statut", "Store"];
    const rows = filteredOrders.map(o => [
        o.order_number, 
        new Date(o.created_at || '').toLocaleDateString(),
        o.customer_name,
        o.customer_phone,
        o.total_amount,
        o.status,
        o.stores?.name
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER SIMPLE */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1920px] mx-auto p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <History className="text-slate-400"/> HISTORIQUE COMMANDES
                </h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{storeName}</p>
            </div>
            
            <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                {(['today', '7days', '30days', 'all'] as TimeRange[]).map((range) => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                            timeRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {range === 'today' ? "Aujourd'hui" : range === '7days' ? '7 Jours' : range === '30days' ? '30 Jours' : 'Tout'}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 md:p-8">
        
        {/* OUTILS DE RECHERCHE */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center">
            <div className="relative w-full md:max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={18}/>
                </div>
                <input 
                    type="text" 
                    placeholder="Rechercher (N° Commande, Client...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                    <button onClick={() => setStatusFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>Tous</button>
                    <button onClick={() => setStatusFilter('delivered')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}>Livrés</button>
                    <button onClick={() => setStatusFilter('cancelled')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'cancelled' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`}>Annulés</button>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all ml-auto md:ml-0">
                    <Download size={16}/> <span className="hidden sm:inline">Export CSV</span>
                </button>
            </div>
        </div>

        {/* TABLEAU */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 size={40} className="animate-spin text-blue-500"/>
                    <p className="text-slate-400 font-medium">Chargement des archives...</p>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-slate-300">
                    <Filter size={64} className="mb-4 opacity-50"/>
                    <p className="text-xl font-bold text-slate-400">Aucun résultat</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Commande</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Client</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Store</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Statut</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Total</th>
                                <th className="p-4 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-slate-700 font-bold"><Calendar size={14} className="text-slate-400"/> {new Date(order.created_at || '').toLocaleDateString('fr-FR')}</div>
                                        <div className="text-xs text-slate-400 pl-6">{new Date(order.created_at || '').toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td className="p-4"><span className="font-black text-slate-800 font-mono bg-slate-100 px-2 py-1 rounded text-sm">#{order.order_number}</span></td>
                                    <td className="p-4"><div className="font-bold text-slate-900">{order.customer_name || 'Anonyme'}</div><div className="text-xs text-slate-500">{order.customer_phone}</div></td>
                                    <td className="p-4 text-sm font-medium text-slate-600">{order.stores?.name}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                            {order.status === 'cancelled' ? <XCircle size={12}/> : <CheckCircle2 size={12}/>} {order.status === 'delivered' ? 'Livrée' : 'Annulée'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right"><span className="font-black text-slate-900 text-lg">{order.total_amount}</span> <span className="text-xs text-slate-500 font-bold">DH</span></td>
                                    <td className="p-4 text-center"><ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600"/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
            order={selectedOrder}
            items={selectedOrder.order_items || []} 
            loadingItems={false}
            elapsedMinutes={0}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={async () => {}} 
            onOpenMap={() => {}} 
            readOnly={true} 
        />
      )}
    </div>
  );
}