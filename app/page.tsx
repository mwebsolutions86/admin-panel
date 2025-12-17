'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShoppingBag, CheckCircle2, Truck, XCircle, 
  MapPin, Phone, User, ChefHat, Timer, Bell, AlertCircle, Utensils, Loader2
} from 'lucide-react'

interface OrderItem { product_name: string; quantity: number; options: string[]; }
interface Order {
  id: string; order_number: number; customer_name: string | null; customer_phone: string | null;
  delivery_address: string | null; order_type: 'dine_in' | 'takeaway' | 'delivery';
  total_amount: number; status: 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  created_at: string; order_items?: OrderItem[]; 
}
interface Toast { id: number; message: string; type: 'success' | 'warning' | 'error'; }

export default function LiveDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, cooking: 0, revenue: 0 })
  const [now, setNow] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const notify = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  const getElapsedMinutes = (createdAt: string) => {
    if (now === 0) return 0
    const start = new Date(createdAt).getTime()
    return Math.floor((now - start) / 60000)
  }

  const getTimeColorClass = (createdAt: string) => {
    const minutes = getElapsedMinutes(createdAt)
    if (minutes < 15) return 'bg-green-100 text-green-700 border-green-200 animate-pulse-slow'; 
    if (minutes < 30) return 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
    return 'bg-red-100 text-red-700 border-red-200 animate-pulse'; 
  }

  const calculateStats = (currentOrders: Order[]) => {
    const pending = currentOrders.filter(o => o.status === 'pending').length
    const cooking = currentOrders.filter(o => o.status === 'cooking').length
    const revenue = currentOrders.reduce((acc, curr) => acc + curr.total_amount, 0)
    setStats({ pending, cooking, revenue }) 
  }

  useEffect(() => {
    if (typeof window !== 'undefined') audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')

    const updateTimer = () => setNow(Date.now())
    const timerInterval = setInterval(updateTimer, 60000)
    requestAnimationFrame(updateTimer)

    const fetchInitialData = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          // FILTRE STRICT : On ne veut PAS les terminés ni annulés ici
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .order('created_at', { ascending: true }) // Les plus urgents (vieux) en premier

        if (!error && data) {
            setOrders(data as Order[])
            calculateStats(data as Order[])
        }
        setLoading(false)
    }

    fetchInitialData()

    const channel = supabase
      .channel('live-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          const newOrder = payload.new as Order
          audioRef.current?.play().catch(() => {})
          notify(`Nouvelle commande #${newOrder.order_number} !`, 'success')
          setOrders(prev => {
              const updated = [...prev, newOrder].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              calculateStats(updated)
              return updated
          })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
            const updatedOrder = payload.new as Order
            // SI TERMINÉ OU ANNULÉ -> ON RETIRE DE LA LISTE
            if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
                setOrders(prev => {
                    const updated = prev.filter(o => o.id !== updatedOrder.id)
                    calculateStats(updated)
                    return updated
                })
                if (selectedOrder?.id === updatedOrder.id) setSelectedOrder(null) // Fermer modale
            } else {
                // SINON ON MET À JOUR LE STATUT (ex: pending -> cooking)
                setOrders(prev => {
                    const updated = prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
                    calculateStats(updated)
                    return updated
                })
            }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); clearInterval(timerInterval) }
  }, [selectedOrder])

  const fetchOrderDetails = async (order: Order) => {
    setSelectedOrder(order)
    setLoadingItems(true)
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    if (data) setOrderItems(data)
    setLoadingItems(false)
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    // Si c'est pour finir/annuler, on retire visuellement tout de suite (Optimistic Removal)
    if (newStatus === 'completed' || newStatus === 'cancelled') {
        const remainingOrders = orders.filter(o => o.id !== orderId)
        setOrders(remainingOrders)
        calculateStats(remainingOrders)
        setSelectedOrder(null)
        
        if(newStatus === 'completed') notify("Commande Livrée -> Archivée dans l'Historique 📂", 'success')
        if(newStatus === 'cancelled') notify("Commande Annulée -> Archivée dans l'Historique 📂", 'warning')
    } else {
        // Sinon simple mise à jour (ex: pending -> cooking)
        const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } as Order : o)
        setOrders(updatedOrders)
        calculateStats(updatedOrders)
        if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus } as Order)
        
        if(newStatus === 'cooking') notify("Envoyé en cuisine 🔥", 'success')
        if(newStatus === 'ready') notify("Commande prête ✅", 'success')
    }

    // Appel serveur
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
  }

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'pending': return <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit shadow-lg shadow-yellow-200"><Bell size={12}/> En Attente</span>
          case 'cooking': return <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit shadow-lg shadow-orange-200"><Utensils size={12}/> En Cuisine</span>
          case 'ready': return <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit shadow-lg shadow-blue-200"><CheckCircle2 size={12}/> Prête</span>
          default: return null
      }
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative overflow-hidden font-sans text-slate-800">
        <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-orange-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>

        <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl p-4 rounded-2xl flex items-center gap-3 min-w-[300px]">
                    {t.type === 'success' ? <CheckCircle2 className="text-green-500"/> : t.type === 'warning' ? <Bell className="text-yellow-500"/> : <AlertCircle className="text-red-500"/>}
                    <span className="font-bold text-sm">{t.message}</span>
                </div>
            ))}
        </div>

        <div className="relative z-10 max-w-[1920px] mx-auto p-4 md:p-6 flex flex-col h-screen">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                        Live Command
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Commandes en cours uniquement.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl p-4 min-w-[140px]">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1"><Bell size={14}/> En Attente</div>
                        <div className="text-3xl font-black text-gray-900">{stats.pending}</div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl p-4 min-w-[140px]">
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1"><ChefHat size={14}/> En Cuisine</div>
                        <div className="text-3xl font-black text-gray-900">{stats.cooking}</div>
                    </div>
                    <div className="bg-black/90 backdrop-blur-xl text-white shadow-lg rounded-2xl p-4 min-w-[160px]">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-1"><ShoppingBag size={14}/> CA Live</div>
                        <div className="text-3xl font-black text-green-400">{stats.revenue} <span className="text-sm font-normal text-gray-400">DH</span></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <Utensils size={80} className="mb-4"/><p className="text-xl font-bold">Tout est calme. En attente de commandes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {orders.map(order => (
                            <div key={order.id} onClick={() => fetchOrderDetails(order)} className={`group relative bg-white/80 backdrop-blur-md border rounded-[24px] p-5 shadow-sm hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer ${order.status === 'pending' ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-white/50'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl font-black text-gray-900">#{order.order_number}</span>
                                            {order.order_type === 'delivery' && <Truck size={16} className="text-blue-500"/>}
                                            {order.order_type === 'takeaway' && <ShoppingBag size={16} className="text-orange-500"/>}
                                        </div>
                                        <div className="text-sm font-bold text-gray-600 truncate max-w-[120px]">{order.customer_name || 'Client'}</div>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold shadow-inner ${getTimeColorClass(order.created_at)}`}>
                                        <Timer size={14}/> {getElapsedMinutes(order.created_at)} min
                                    </div>
                                </div>
                                <div className="mb-6">{getStatusBadge(order.status)}</div>
                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400">Total</span>
                                    <span className="text-xl font-black text-gray-900">{order.total_amount} DH</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {selectedOrder && (
             <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/20 backdrop-blur-[2px]">
                <div className="bg-white/90 backdrop-blur-2xl w-full max-w-lg h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300 border-l border-white/50">
                    <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200/50">
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                #{selectedOrder.order_number}
                                <span className={`text-base font-normal px-3 py-1 rounded-full border ${getTimeColorClass(selectedOrder.created_at)}`}>
                                    {getElapsedMinutes(selectedOrder.created_at)} min
                                </span>
                            </h2>
                            <p className="text-gray-500 font-medium mt-1">Reçue à {new Date(selectedOrder.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={28} className="text-gray-400"/></button>
                    </div>

                    <div className="bg-gray-50/80 p-5 rounded-2xl mb-8 space-y-3 border border-gray-100">
                        <div className="flex items-center gap-3"><User size={18} className="text-gray-400"/><span className="font-bold text-gray-800">{selectedOrder.customer_name || 'Anonyme'}</span></div>
                        <div className="flex items-center gap-3"><Phone size={18} className="text-gray-400"/><span className="font-mono text-gray-600">{selectedOrder.customer_phone || '--'}</span></div>
                        {selectedOrder.order_type === 'delivery' && (
                             <div className="flex items-start gap-3"><MapPin size={18} className="text-gray-400 mt-1"/><span className="text-gray-800 font-medium leading-tight">{selectedOrder.delivery_address}</span></div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto mb-8 pr-2 custom-scrollbar">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-4">Détail de la commande</h3>
                        {loadingItems ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400"/></div> ) : (
                            <div className="space-y-4">
                                {orderItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0">
                                        <div className="flex gap-4">
                                            <div className="bg-black text-white w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shadow-md">{item.quantity}</div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-lg">{item.product_name}</div>
                                                {item.options && item.options.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.options.map((opt, i) => (<span key={i} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded border border-yellow-100 font-medium">{opt}</span>))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-500 font-bold">Total à encaisser</span>
                            <span className="text-4xl font-black text-gray-900">{selectedOrder.total_amount} <span className="text-lg text-gray-400">DH</span></span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {selectedOrder.status === 'pending' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'cooking')} className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-gray-800 hover:scale-[1.02] transition-all flex justify-center items-center gap-2"><ChefHat/> Envoyer en Cuisine</button>
                            )}
                            {selectedOrder.status === 'cooking' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'ready')} className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 hover:bg-green-600 hover:scale-[1.02] transition-all">✅ Commande Prête</button>
                            )}
                            {selectedOrder.status === 'ready' && (
                                <button onClick={() => updateStatus(selectedOrder.id, 'completed')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all">🚀 Livrée / Terminée</button>
                            )}
                            <button onClick={() => { if(confirm('Êtes-vous sûr de vouloir ANNULER cette commande ?')) updateStatus(selectedOrder.id, 'cancelled') }} className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition border border-red-100">Annuler la commande</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}