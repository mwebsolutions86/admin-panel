'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Clock, BarChart3, PieChart as PieChartIcon, Activity, Zap, Calendar, Filter
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Order } from '@/types';

// Interface pour le Tooltip Recharts (souple)
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

type DatePreset = 'today' | '7days' | '30days' | 'custom';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États Filtres
  // Par défaut, on initialise avec les dates d'il y a 7 jours
  const [preset, setPreset] = useState<DatePreset>('7days');
  const [startDate, setStartDate] = useState<string>(''); 
  const [endDate, setEndDate] = useState<string>(''); 
  const [storeName, setStoreName] = useState('Global');

  // Refs pour ouvrir le calendrier nativement au clic sur l'icône
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  // Initialisation des dates au montage (pour éviter le décalage SSR)
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // --- GESTION DES PRESETS ---
  const applyPreset = (newPreset: DatePreset) => {
      setPreset(newPreset);
      const today = new Date();
      const s = new Date();

      if (newPreset === 'today') {
         // s reste today
      } else if (newPreset === '7days') {
         s.setDate(today.getDate() - 7);
      } else if (newPreset === '30days') {
         s.setDate(today.getDate() - 30);
      }
      
      setStartDate(s.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
      setPreset('custom');
      if (type === 'start') setStartDate(value);
      else setEndDate(value);
  };

  // --- FETCHING ---
  useEffect(() => {
    if(startDate && endDate) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // --- REALTIME ---
  useEffect(() => {
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          const newOrder = payload.new as Order;
          // Logique de mise à jour optimiste...
          if (!newOrder) return;
          const isRelevant = ['delivered', 'cancelled'].includes(newOrder.status);

          setOrders(prev => {
              const exists = prev.find(o => o.id === newOrder.id);
              if (exists) {
                  return isRelevant 
                    ? prev.map(o => o.id === newOrder.id ? newOrder : o)
                    : prev.filter(o => o.id !== newOrder.id);
              } else {
                  return isRelevant ? [...prev, newOrder] : prev;
              }
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawProfile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single();
    const profile = rawProfile as any;

    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['delivered', 'cancelled']); 

    // Filtre Date précis (00:00:00 à 23:59:59)
    const startISO = new Date(startDate).toISOString();
    const endObj = new Date(endDate);
    endObj.setHours(23, 59, 59, 999);
    const endISO = endObj.toISOString();

    query = query.gte('created_at', startISO).lte('created_at', endISO);

    if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id);
        const { data: st } = await supabase.from('stores').select('name').eq('id', profile.store_id).single();
        if (st) setStoreName(st.name);
    } else {
        setStoreName('Vue Globale • Performance Réseau');
    }

    const { data } = await query;
    if (data) setOrders(data as unknown as Order[]);
    setLoading(false);
  };

  // --- CALCULS STATS (Memoized) ---
  const todayStats = useMemo(() => {
      const now = new Date();
      const todayStr = now.toLocaleDateString('fr-FR'); 
      const todaysOrders = orders.filter(o => o.created_at && new Date(o.created_at).toLocaleDateString('fr-FR') === todayStr && o.status === 'delivered');
      const revenue = todaysOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
      const count = todaysOrders.length;
      const basket = count > 0 ? (revenue / count).toFixed(0) : '0';
      return { revenue, count, basket };
  }, [orders]);

  const periodStats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'delivered');
    const totalRevenue = delivered.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
    const avgBasket = delivered.length > 0 ? (totalRevenue / delivered.length).toFixed(0) : '0';
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const cancelRate = orders.length > 0 ? ((cancelled / orders.length) * 100).toFixed(1) : '0';
    return { totalRevenue, count: delivered.length, avgBasket, cancelRate };
  }, [orders]);

  const revenueData = useMemo(() => {
    const days: Record<string, number> = {};
    orders.filter(o => o.status === 'delivered').forEach(order => {
        if (!order.created_at) return;
        const date = new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        days[date] = (days[date] || 0) + (order.total_amount || 0);
    });
    return Object.keys(days)
        .sort((a, b) => { // Tri chronologique JJ/MM
            const [da, ma] = a.split('/'); const [db, mb] = b.split('/');
            return new Date(2024, parseInt(ma)-1, parseInt(da)).getTime() - new Date(2024, parseInt(mb)-1, parseInt(db)).getTime();
        })
        .map(key => ({ name: key, value: days[key] }));
  }, [orders]);

  const peakHoursData = useMemo(() => {
    const hours = Array(24).fill(0);
    orders.forEach(order => {
        if (!order.created_at) return;
        hours[new Date(order.created_at).getHours()]++;
    });
    return hours.map((count, hour) => ({ name: `${hour}h`, value: count })).slice(10, 24); 
  }, [orders]);

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.filter(o => o.status === 'delivered').forEach(o => {
        o.order_items?.forEach(i => { counts[i.product_name] = (counts[i.product_name] || 0) + i.quantity; });
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [orders]);

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
          <p className="font-bold mb-1">{label}</p>
          <p>{payload[0].value} {payload[0].name === 'value' ? 'DH' : 'Commandes'}</p>
        </div>
      );
    }
    return null;
  };

  // --- ACTIONS UI ---
  // Fonction pour forcer l'ouverture du calendrier natif
  const openStartDate = () => { try { startDateRef.current?.showPicker(); } catch {} };
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* LIVE TODAY BANNER */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
          <div className="max-w-[1920px] mx-auto px-4 py-3 md:px-8 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="font-black tracking-widest text-xs uppercase text-slate-400 hidden sm:inline">En direct aujourd'hui</span>
                <span className="font-black tracking-widest text-xs uppercase text-slate-400 sm:hidden">Live</span>
             </div>
             
             <div className="flex gap-4 md:gap-6 text-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                    <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase">CA Jour</span>
                    <span className="font-black text-green-400 text-base md:text-xl">{todayStats.revenue.toLocaleString()} DH</span>
                </div>
                <div className="w-px bg-slate-700 h-8 hidden md:block"></div>
                <div className="flex flex-col md:flex-row md:items-center gap-0 md:gap-2">
                    <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase">Commandes</span>
                    <span className="font-black text-white text-base md:text-xl">{todayStats.count}</span>
                </div>
             </div>
          </div>
      </div>

      {/* HEADER & FILTERS */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-[1920px] mx-auto px-4 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="text-blue-600"/> ANALYTICS & PERFORMANCES
                </h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{storeName}</p>
            </div>

            {/* BARRE D'OUTILS DE FILTRAGE */}
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                
                {/* 1. Presets */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                    {(['today', '7days', '30days'] as DatePreset[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => applyPreset(p)}
                            className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${
                                preset === p 
                                ? 'bg-slate-900 text-white shadow-md' 
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            {p === 'today' ? "Auj." : p === '7days' ? "7 Jours" : "30 Jours"}
                        </button>
                    ))}
                </div>

                {/* 2. Custom Range Inputs (CORRIGÉ & ROBUSTE) */}
                <div 
                   onClick={openStartDate} // Clic n'importe où sur la zone déclenche l'ouverture
                   className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex-1 md:flex-none cursor-pointer hover:border-blue-300 transition-colors group"
                >
                    {/* L'icône force aussi l'ouverture via le onClick du parent */}
                    <Calendar size={18} className="text-blue-600 shrink-0 group-hover:scale-110 transition-transform"/>
                    
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex flex-col relative">
                             <label className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Du</label>
                             <input 
                                ref={startDateRef}
                                type="date" 
                                value={startDate} 
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                // style pour forcer l'apparence clickable
                                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 w-[110px] cursor-pointer"
                             />
                        </div>
                        
                        <span className="text-slate-300 font-light">|</span>
                        
                        <div className="flex flex-col">
                             <label className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Au</label>
                             <input 
                                ref={endDateRef}
                                type="date" 
                                value={endDate} 
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-2 focus:ring-blue-500 w-[110px] cursor-pointer"
                             />
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 md:p-8 space-y-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                <div className="absolute right-0 top-0 opacity-5 p-4 group-hover:opacity-10 transition-opacity"><DollarSign size={80}/></div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">CA Période</p>
                <h3 className="text-4xl font-black text-slate-900">{periodStats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">DH</span></h3>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Du {new Date(startDate || new Date()).toLocaleDateString()} au {new Date(endDate || new Date()).toLocaleDateString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition-colors">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Commandes</p>
                <h3 className="text-4xl font-black text-slate-900">{periodStats.count}</h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition-colors">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Panier Moyen Global</p>
                <h3 className="text-4xl font-black text-slate-900">{periodStats.avgBasket} <span className="text-sm font-normal text-slate-400">DH</span></h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-blue-300 transition-colors">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Taux d'Annulation</p>
                <h3 className={`text-4xl font-black ${parseFloat(periodStats.cancelRate) > 5 ? 'text-red-500' : 'text-emerald-500'}`}>{periodStats.cancelRate}%</h3>
            </div>
        </div>

        {/* GRAPHIQUES ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity size={20}/></div>
                    <h3 className="font-bold text-slate-800">Évolution du Chiffre d'Affaires</h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10}/>
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                            <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600"><PieChartIcon size={20}/></div>
                    <h3 className="font-bold text-slate-800">Top 5 Produits</h3>
                </div>
                <div className="space-y-4">
                    {topProducts.map((prod, idx) => (
                        <div key={idx} className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
                                <span className="font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{prod.name}</span>
                            </div>
                            <span className="font-black text-slate-900 bg-slate-50 px-2 py-1 rounded text-xs">{prod.count}</span>
                        </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-slate-400 text-sm text-center py-10">Données insuffisantes</p>}
                </div>
            </div>
        </div>

        {/* GRAPHIQUES ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Clock size={20}/></div>
                    <h3 className="font-bold text-slate-800">Affluence Horaire (10h - 23h)</h3>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={peakHoursData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10}/>
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}/>
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-blue-500/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <Zap size={40} className="text-blue-400"/>
                    </div>
                    <h3 className="text-2xl font-black mb-2">Performance Livreurs</h3>
                    <p className="text-slate-400 max-w-xs mx-auto mb-6">L'analyse détaillée des temps de trajet et de la performance individuelle des livreurs arrive bientôt.</p>
                    <button className="px-5 py-2.5 bg-blue-600 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                        Explorer la Flotte
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}