'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { 
  Bell, ChefHat, Receipt, Loader2, Utensils, AlertCircle, CheckCircle2, Volume2, VolumeX 
} from 'lucide-react'
import { Order } from '@/types' // CORRECTION : suppression de OrderItem

import OrderCard from '@/components/dashboard/OrderCard'
import OrderDetailsModal from '@/components/dashboard/OrderDetailsModal'
import LocationModal from '@/components/dashboard/LocationModal'

interface Toast { id: number; message: string; type: 'success' | 'warning' | 'error'; }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default function LiveDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, cooking: 0, revenue: 0 })
  const [now, setNow] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
  const [toasts, setToasts] = useState<Toast[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('ue_admin_sound');
      if (savedSound === 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSoundEnabled(true);
      }
    }
  }, []);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('ue_admin_sound', String(newState));
    if (newState) new Audio('').play().catch(() => {});
  };

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.8;
    audio.play().catch((e) => console.log("Audio bloqué:", e));
  }, [soundEnabled]);

  const notify = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    playNotificationSound();
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [playNotificationSound]);

  const getElapsedMinutes = (createdAt: string) => {
    if (now === 0) return 0
    const start = new Date(createdAt).getTime()
    return Math.floor((now - start) / 60000)
  }

  const calculateStats = (currentOrders: Order[]) => {
    const pending = currentOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length
    const cooking = currentOrders.filter(o => o.status === 'preparing').length
    const revenue = currentOrders.reduce((acc, curr) => acc + curr.total_amount, 0)
    setStats({ pending, cooking, revenue }) 
  }

  const fetchFullOrder = async (orderId: string): Promise<Order | null> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Erreur fetchFullOrder', error);
      return null;
    }
    return data as unknown as Order;
  };

  useEffect(() => {
    const updateTimer = () => setNow(Date.now())
    const timerInterval = setInterval(updateTimer, 60000)
    requestAnimationFrame(updateTimer)

    const fetchInitialData = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .neq('status', 'cancelled')
          .neq('status', 'delivered')
          .order('created_at', { ascending: true })

        if (!error && data) {
            // CORRECTION : suppression du @ts-expect-error car le cast est maintenant valide
            const typedData = data as unknown as Order[];
            setOrders(typedData)
            calculateStats(typedData)
        }
        setLoading(false)
    }

    fetchInitialData()

    const channel = supabase
      .channel('live-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
          const newOrderPartial = payload.new as Order;
          notify(`Nouvelle commande #${newOrderPartial.order_number} !`, 'success');
          
          setTimeout(async () => {
             const fullOrder = await fetchFullOrder(newOrderPartial.id);
             if (fullOrder) {
                setOrders(prev => {
                    const updated = [...prev, fullOrder].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    calculateStats(updated);
                    return updated;
                });
             }
          }, 1000); 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
            const updatedOrderPartial = payload.new as Order;
            
            if (updatedOrderPartial.status === 'delivered' || updatedOrderPartial.status === 'cancelled') {
                setOrders(prev => {
                    const updated = prev.filter(o => o.id !== updatedOrderPartial.id)
                    calculateStats(updated)
                    return updated
                })
                if (selectedOrder?.id === updatedOrderPartial.id) {
                    setSelectedOrder(null)
                    setShowLocationModal(false)
                }
            } else {
                const fullOrder = await fetchFullOrder(updatedOrderPartial.id);
                if (fullOrder) {
                    setOrders(prev => {
                        const updated = prev.map(o => o.id === fullOrder.id ? fullOrder : o);
                        calculateStats(updated);
                        return updated;
                    });
                }
            }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); clearInterval(timerInterval) }
  }, [selectedOrder, notify]) 

  const handleCardClick = (order: Order) => {
    setSelectedOrder(order)
    setShowLocationModal(false) 
  }

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    if (newStatus === 'delivered' || newStatus === 'cancelled') {
        const remainingOrders = orders.filter(o => o.id !== orderId)
        setOrders(remainingOrders)
        calculateStats(remainingOrders)
        setSelectedOrder(null)
        setShowLocationModal(false)
        
        if(newStatus === 'delivered') notify("Commande Livrée -> Historique 📂", 'success')
        if(newStatus === 'cancelled') notify("Commande Annulée -> Historique 📂", 'warning')
    } else {
        const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        setOrders(updatedOrders)
        calculateStats(updatedOrders)
        if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus } as Order)
        
        if(newStatus === 'preparing') notify("Envoyé en cuisine 🔥", 'success')
        if(newStatus === 'ready') notify("Commande prête ✅", 'success')
        if(newStatus === 'out_for_delivery') notify("Départ Livreur 🛵", 'success')
    }

    // CORRECTION : Ajout de la description pour l'erreur attendue
    // @ts-expect-error: Supabase type definition mismatch for update object
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-800">
        
        {/* Toasts - Position changée : CENTRE HAUT */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none w-full max-w-md">
            {toasts.map(t => (
                <div 
                    key={t.id} 
                    className="pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300 bg-slate-900 text-white shadow-2xl px-6 py-3 rounded-full flex items-center gap-3 min-w-[300px] justify-center border border-slate-700" 
                >
                    {/* Icônes simplifiées et colorées pour ressortir sur fond noir */}
                    {t.type === 'success' ? <CheckCircle2 size={20} className="text-green-400 shrink-0"/> : 
                     t.type === 'warning' ? <Bell size={20} className="text-yellow-400 shrink-0"/> : 
                     <AlertCircle size={20} className="text-red-400 shrink-0"/>}
                    
                    <span className="font-bold text-sm tracking-wide">{t.message}</span>
                </div>
            ))}
        </div>

        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-[1920px] mx-auto p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <Receipt size={28} className="text-slate-900" />
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">KITCHEN DISPLAY</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">Live Feed • Agadir</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                      onClick={toggleSound}
                      className={`p-2 rounded-full border transition-all ${soundEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                      title={soundEnabled ? "Son Activé" : "Son Désactivé (Cliquez pour activer)"}
                    >
                      {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                    </button>

                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3 min-w-[140px]">
                        <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700"><Bell size={18}/></div>
                        <div><div className="text-xs text-slate-400 font-bold uppercase">Attente</div><div className="text-xl font-black">{stats.pending}</div></div>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3 min-w-[140px]">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-700"><ChefHat size={18}/></div>
                        <div><div className="text-xs text-slate-400 font-bold uppercase">Cuisine</div><div className="text-xl font-black">{stats.cooking}</div></div>
                    </div>
                    <div className="bg-slate-900 text-white shadow-lg rounded-xl px-5 py-2 flex items-center gap-3 min-w-[160px]">
                         <div className="text-right w-full">
                            <div className="text-xs text-slate-400 font-bold uppercase">Revenu</div>
                            <div className="text-xl font-black">{stats.revenue} <span className="text-xs font-normal">DH</span></div>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-[1920px] mx-auto p-4 md:p-6 min-h-[calc(100vh-100px)]">
            {loading ? (
                <div className="flex justify-center pt-20"><Loader2 size={48} className="animate-spin text-blue-500" /></div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-32 text-slate-300">
                    <Utensils size={80} className="mb-4 opacity-50"/>
                    <p className="text-xl font-bold">Aucune commande active</p>
                    <p className="text-sm mt-2">En attente de commandes...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                    {orders.map(order => (
                        <OrderCard 
                            key={order.id}
                            order={order}
                            elapsedMinutes={getElapsedMinutes(order.created_at)}
                            onClick={() => handleCardClick(order)}
                        />
                    ))}
                </div>
            )}
        </div>

        {selectedOrder && !showLocationModal && (
            <OrderDetailsModal 
                order={selectedOrder}
                items={selectedOrder.order_items || []} 
                loadingItems={false} 
                elapsedMinutes={getElapsedMinutes(selectedOrder.created_at)}
                onClose={() => setSelectedOrder(null)}
                onUpdateStatus={updateStatus}
                onOpenMap={() => setShowLocationModal(true)}
            />
        )}

        {selectedOrder && showLocationModal && (
            <LocationModal 
                order={selectedOrder}
                onClose={() => setShowLocationModal(false)}
            />
        )}

    </div>
  )
}