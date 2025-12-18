'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { 
  CheckCircle2, 
  ChefHat, 
  Bell, 
  Navigation, 
  Activity,
  X,
  AlertCircle,
  Map as MapIcon
} from 'lucide-react'

// Interfaces strictes
interface OrderItem { 
  product_name: string; 
  quantity: number; 
  options: string[]; 
}

interface Order {
  id: string; 
  order_number: number; 
  customer_name: string | null; 
  customer_phone: string | null;
  delivery_address: string | null; 
  order_type: 'dine_in' | 'takeaway' | 'delivery';
  total_amount: number; 
  status: 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  created_at: string; 
  location?: string | null; // Format PostGIS: POINT(lng lat)
  items?: OrderItem[]; 
}

interface Toast { 
  id: number; 
  message: string; 
  type: 'success' | 'warning' | 'error'; 
}

export default function LiveDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({ pending: 0, cooking: 0, revenue: 0 })
  const [now, setNow] = useState<number>(0) 
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Gestion des notifications
  const notify = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  // Calcul du temps écoulé
  const getElapsedMinutes = (createdAt: string) => {
    if (now === 0) return 0
    const start = new Date(createdAt).getTime()
    return Math.floor((now - start) / 60000)
  }

  // Styles dynamiques selon le temps d'attente
  const getTimeStyles = (createdAt: string) => {
    const min = getElapsedMinutes(createdAt)
    if (min < 15) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
    if (min < 30) return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
    return 'text-red-500 border-red-500/50 bg-red-500/20 animate-pulse'
  }

  const calculateStats = (currentOrders: Order[]) => {
    const pending = currentOrders.filter(o => o.status === 'pending').length
    const cooking = currentOrders.filter(o => o.status === 'cooking').length
    const revenue = currentOrders.reduce((acc, curr) => acc + curr.total_amount, 0)
    setStats({ pending, cooking, revenue }) 
  }

  // Récupération des items pour une commande
  const fetchItemsForOrder = async (orderId: string) => {
    const { data } = await supabase
      .from('order_items')
      .select('product_name, quantity, options')
      .eq('order_id', orderId)
    return (data as OrderItem[]) || []
  }

  // Fonction GPS corrigée
  const handleOpenMap = (location: string) => {
    if (!location) return;
    
    // Extraction des coordonnées du format "POINT(lng lat)"
    // Exemple: POINT(-9.5981 30.4278)
    const matches = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    
    if (matches && matches.length >= 3) {
      const lng = matches[1];
      const lat = matches[2];
      // URL Google Maps universelle
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      alert("Coordonnées GPS invalides ou absentes.");
    }
  }

  useEffect(() => {
    setNow(Date.now()) // Initialisation côté client uniquement
    
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    }

    const timer = setInterval(() => setNow(Date.now()), 30000)

    const fetchInitialData = async () => {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .not('status', 'in', '("cancelled","completed")')
        .order('created_at', { ascending: true })

      if (!error && ordersData) {
        // Chargement des items pour toutes les commandes
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('order_id, product_name, quantity, options')
          .in('order_id', ordersData.map(o => o.id))

        const enrichedOrders = ordersData.map(order => ({
          ...order,
          items: itemsData?.filter(item => item.order_id === order.id) || []
        }))

        setOrders(enrichedOrders as Order[])
        calculateStats(enrichedOrders as Order[])
      }
    }

    fetchInitialData()

    // Abonnement Realtime Typé
    const channel = supabase
      .channel('live-dashboard-v3')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload: RealtimePostgresChangesPayload<Order>) => {
          const newOrder = payload.new as Order
          audioRef.current?.play().catch(() => {})
          notify(`Nouvelle Commande: #${newOrder.order_number}`, 'success')
          
          const items = await fetchItemsForOrder(newOrder.id)
          const enrichedOrder = { ...newOrder, items }
          
          setOrders(prev => {
              const updated = [...prev, enrichedOrder].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              calculateStats(updated)
              return updated
          })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: RealtimePostgresChangesPayload<Order>) => {
            const updatedOrder = payload.new as Order
            if (['completed', 'cancelled'].includes(updatedOrder.status)) {
                setOrders(prev => {
                    const updated = prev.filter(o => o.id !== updatedOrder.id)
                    calculateStats(updated)
                    return updated
                })
                if (selectedOrder?.id === updatedOrder.id) setSelectedOrder(null)
            } else {
                setOrders(prev => {
                    const updated = prev.map(o => o.id === updatedOrder.id ? { ...updatedOrder, items: o.items } : o)
                    calculateStats(updated)
                    return updated
                })
            }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [selectedOrder])

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (['completed', 'cancelled'].includes(newStatus)) {
        setOrders(prev => {
          const remaining = prev.filter(o => o.id !== orderId)
          calculateStats(remaining)
          return remaining
        })
        setSelectedOrder(null)
    } else {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } as Order : o))
    }
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-5%] left-[10%] w-[40%] h-[40%] bg-cyan-600 blur-[150px]"></div>
        <div className="absolute bottom-[-5%] right-[10%] w-[30%] h-[30%] bg-purple-600 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto p-4 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping shadow-[0_0_10px_#06b6d4]"></div>
            <h1 className="text-2xl font-black tracking-tighter text-white/90 uppercase italic">KITCHEN OPS CENTER</h1>
          </div>
          <div className="flex gap-4">
            {[
              { label: 'Attente', val: stats.pending, col: 'text-cyan-400', icon: Bell },
              { label: 'En Cuisine', val: stats.cooking, col: 'text-orange-400', icon: ChefHat },
              { label: 'Flux CA', val: `${stats.revenue} DH`, col: 'text-green-400', icon: Activity }
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-2.5 px-4 rounded-2xl flex items-center gap-4">
                <s.icon size={18} className={s.col}/>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">{s.label}</div>
                  <div className="text-lg font-black">{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {orders.map(order => (
              <div key={order.id} className={`bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col transition-all overflow-hidden shadow-2xl ${order.status === 'pending' ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : ''}`}>
                
                {/* Header Carte */}
                <div className="p-5 bg-white/[0.03] border-b border-white/10 flex justify-between items-start">
                  <div>
                    <span className="text-4xl font-black tracking-tighter text-white">#{order.order_number}</span>
                    <p className="text-xs font-black uppercase text-white/40 tracking-widest mt-1.5">{order.customer_name || 'GUEST'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-black ${getTimeStyles(order.created_at)}`}>
                      {getElapsedMinutes(order.created_at)} MIN
                    </div>
                    {/* BOUTON MAP FONCTIONNEL */}
                    {order.location && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenMap(order.location!); }} 
                        className="bg-cyan-500/20 text-cyan-400 p-2 rounded-lg border border-cyan-500/30 hover:bg-cyan-500 hover:text-black transition-all group"
                        title="Ouvrir GPS"
                      >
                        <MapIcon size={16} className="group-hover:scale-110 transition-transform"/>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenu Commande (Ingrédients lisibles) */}
                <div className="flex-1 p-5 bg-black/40 overflow-y-auto max-h-[450px] space-y-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex gap-5 items-start border-l-4 border-l-cyan-500">
                      <div className="bg-cyan-500 text-black w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">{item.quantity}</div>
                      <div className="flex-1">
                        <p className="font-black text-white text-lg uppercase tracking-tight leading-none mb-3 underline decoration-cyan-500/30">{item.product_name}</p>
                        {item.options && item.options.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.options.map((opt, i) => (
                              <span key={i} className="text-[12px] font-black uppercase bg-yellow-400 text-black px-3 py-1.5 rounded-xl shadow-lg border border-yellow-500 transform hover:scale-105 transition-transform">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="p-5 bg-white/[0.03] border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center px-2 font-black uppercase text-[10px] tracking-[0.2em] text-white/20">
                    <span className="flex items-center gap-2"><Activity size={10} className="text-cyan-500"/> {order.order_type}</span>
                    <span className="text-cyan-400 text-sm italic">{order.total_amount} DH</span>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2">
                    <button 
                      onClick={() => setSelectedOrder(order)} 
                      className="col-span-1 p-3 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center border border-white/10"
                    >
                      <Navigation size={20} className="text-cyan-400/60"/>
                    </button>

                    {order.status === 'pending' && (
                      <button onClick={() => updateStatus(order.id, 'cooking')} className="col-span-4 bg-white text-black py-4 rounded-2xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl">LANCER PRÉPA</button>
                    )}
                    {order.status === 'cooking' && (
                      <button onClick={() => updateStatus(order.id, 'ready')} className="col-span-4 bg-cyan-500 text-black py-4 rounded-2xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all">COMMANDE PRÊTE</button>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={() => updateStatus(order.id, 'completed')} className="col-span-4 bg-green-500 text-black py-4 rounded-2xl font-black text-xs hover:scale-[1.02] active:scale-95 transition-all">TERMINER</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Modal Détails (Optionnelle) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-[#0c0c0c] w-full max-w-4xl h-full border border-white/10 rounded-[3rem] flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden">
            <div className="p-8 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-10">
                <span className="text-6xl font-black tracking-tighter text-cyan-500">#{selectedOrder.order_number}</span>
                <div>
                  <span className="text-3xl font-black text-white uppercase block leading-none mb-2">{selectedOrder.customer_name || 'CLIENT'}</span>
                  <span className="text-xl font-mono text-white/30 tracking-widest">{selectedOrder.customer_phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedOrder.location && (
                  <button onClick={() => handleOpenMap(selectedOrder.location!)} className="bg-cyan-500 text-black px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-sm shadow-xl hover:scale-105 transition-all">
                    <Navigation size={22}/> NAVIGUER
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="p-5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10"><X size={32} className="text-white/20"/></button>
              </div>
            </div>
            <div className="flex-1 p-10 bg-black overflow-y-auto">
               <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 mb-10 text-center">
                  <p className="text-xs font-black text-white/20 uppercase tracking-[0.5em] mb-6">Adresse de Livraison</p>
                  <p className="text-3xl font-black text-center text-cyan-400">{selectedOrder.delivery_address || 'SUR PLACE'}</p>
               </div>
               <button onClick={() => { if(confirm('Annuler ?')) updateStatus(selectedOrder.id, 'cancelled') }} className="w-full py-6 rounded-3xl text-sm font-black text-red-500/40 hover:text-red-500 border border-red-500/20 hover:bg-red-500/5 transition-all uppercase tracking-[0.5em]">ANNULER LA COMMANDE</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-white/10 backdrop-blur-3xl border border-white/20 p-5 rounded-[2rem] shadow-2xl flex items-center gap-5 min-w-[380px] animate-in slide-in-from-right duration-500">
            <div className={`p-3 rounded-2xl ${t.type === 'success' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {t.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
            </div>
            <span className="font-black uppercase tracking-widest text-[11px] leading-tight">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}