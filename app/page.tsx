'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, ChefHat, Receipt, AlertCircle, CheckCircle2, Volume2, VolumeX } from 'lucide-react'
import { Order } from '@/types'

// Composants
import OrderDetailsModal from '@/components/dashboard/OrderDetailsModal'
import LocationModal from '@/components/dashboard/LocationModal'
import ViewSwitcher, { ViewMode } from '@/components/dashboard/ViewSwitcher'

// Vues
import OrdersGrid from '@/components/dashboard/views/OrdersGrid'
import OrdersKanban from '@/components/dashboard/views/OrdersKanban' // À venir
import OrdersList from '@/components/dashboard/views/OrdersList'     // À venir

interface Toast { id: number; message: string; type: 'success' | 'warning' | 'error'; }

export default function LiveDashboard() {
  // --- 1. ÉTATS GLOBAUX ---
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pending: 0, cooking: 0, revenue: 0 })
  const [now, setNow] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
  // --- 2. ÉTATS UI & PRÉFÉRENCES ---
  const [viewMode, setViewMode] = useState<ViewMode>('grid') // 'grid' par défaut
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'STORE_MANAGER' | null>(null)
  const [userStoreId, setUserStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState<string>('Live Feed • Chargement...')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)

  // --- 3. INIT & EFFETS ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('ue_admin_sound')
      if (savedSound === 'true') setSoundEnabled(true)
      
      const savedView = localStorage.getItem('ue_admin_view_mode') as ViewMode
      if (savedView) setViewMode(savedView)
    }
  }, [])

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('ue_admin_view_mode', mode)
  }

  const toggleSound = () => {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    localStorage.setItem('ue_admin_sound', String(newState))
    if (newState) new Audio('').play().catch(() => {})
  }

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return
    const audio = new Audio('/notification.mp3') // Assurez-vous que le fichier est dans public/
    audio.volume = 0.8
    audio.play().catch((e) => console.log("Audio bloqué:", e))
  }, [soundEnabled])

  const notify = useCallback((message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    playNotificationSound()
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [playNotificationSound])

  const getElapsedMinutes = (createdAt: string | null | undefined) => {
    if (!createdAt || now === 0) return 0
    const start = new Date(createdAt).getTime()
    return Math.floor((now - start) / 60000)
  }

  const calculateStats = (currentOrders: Order[]) => {
    const pending = currentOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length
    const cooking = currentOrders.filter(o => o.status === 'preparing').length
    const revenue = currentOrders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
    setStats({ pending, cooking, revenue }) 
  }

  // --- 4. DATA FETCHING ---
  const fetchFullOrder = async (orderId: string): Promise<Order | null> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()
    
    if (error) return null
    return data as unknown as Order
  }

  useEffect(() => {
    const updateTimer = () => setNow(Date.now())
    const timerInterval = setInterval(updateTimer, 60000)
    requestAnimationFrame(updateTimer)

    const initDashboard = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        let role = 'SUPER_ADMIN'
        let storeId: string | null = null

        if (user) {
            const { data: rawProfile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single()
            const profile = rawProfile as any

            if (profile) {
                role = profile.role
                storeId = profile.store_id
                setUserRole(profile.role as any)
                setUserStoreId(profile.store_id)

                if (role === 'STORE_MANAGER' && storeId) {
                    const { data: rawStore } = await supabase.from('stores').select('name').eq('id', storeId).single()
                    const storeInfo = rawStore as any
                    if (storeInfo) setStoreName(`KDS • ${storeInfo.name}`)
                } else {
                    setStoreName('KDS • Vue Globale')
                }
            }
        }

        let query = supabase
          .from('orders')
          .select('*, order_items(*)')
          .neq('status', 'cancelled')
          .neq('status', 'delivered')
          .order('created_at', { ascending: true })

        if (role === 'STORE_MANAGER' && storeId) {
            query = query.eq('store_id', storeId)
        }

        const { data, error } = await query

        if (!error && data) {
            const typedData = data as unknown as Order[]
            setOrders(typedData)
            calculateStats(typedData)
        }
        setLoading(false)
    }

    initDashboard()

    // --- 5. REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('live-dashboard')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
          const newOrderPartial = payload.new as Order
          setTimeout(async () => {
             const fullOrder = await fetchFullOrder(newOrderPartial.id)
             if (fullOrder) {
                setOrders(prev => {
                    const updated = [...prev, fullOrder].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
                    calculateStats(updated)
                    return updated
                })
                 notify(`Nouvelle commande #${newOrderPartial.order_number} !`, 'success')
             }
          }, 1000) 
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
            const updatedOrderPartial = payload.new as Order
            
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
                const fullOrder = await fetchFullOrder(updatedOrderPartial.id)
                if (fullOrder) {
                    setOrders(prev => {
                        const updated = prev.map(o => o.id === fullOrder.id ? fullOrder : o)
                        calculateStats(updated)
                        return updated
                    })
                }
            }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); clearInterval(timerInterval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder, notify]) 

  // --- 6. ACTIONS ---
  const handleCardClick = (order: Order) => {
    setSelectedOrder(order)
    setShowLocationModal(false) 
  }

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    const previousOrders = [...orders]
    const previousSelectedOrder = selectedOrder

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

    try {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
        if (error) throw error
    } catch (error) {
        console.error("Erreur mise à jour:", error)
        notify("Erreur lors de la mise à jour !", 'error')
        setOrders(previousOrders)
        setSelectedOrder(previousSelectedOrder)
        calculateStats(previousOrders)
    }
  }

  const displayedOrders = userRole === 'STORE_MANAGER' && userStoreId
      ? orders.filter(o => (o as any).store_id === userStoreId)
      : orders

  // --- 7. RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-800">
        
        {/* Toasts */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none w-full max-w-md">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300 bg-slate-900 text-white shadow-2xl px-6 py-3 rounded-full flex items-center gap-3 min-w-[300px] justify-center border border-slate-700">
                    {t.type === 'success' ? <CheckCircle2 size={20} className="text-green-400 shrink-0"/> : 
                     t.type === 'warning' ? <Bell size={20} className="text-yellow-400 shrink-0"/> : 
                     <AlertCircle size={20} className="text-red-400 shrink-0"/>}
                    <span className="font-bold text-sm tracking-wide">{t.message}</span>
                </div>
            ))}
        </div>

        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-[1920px] mx-auto p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <Receipt size={28} className="text-slate-900" />
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">KITCHEN DISPLAY</h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{storeName}</p>
                    </div>
                </div>

                {/* View Switcher & Actions */}
                <div className="flex items-center gap-4">
                    
                    <ViewSwitcher currentView={viewMode} onChange={handleViewChange} />

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    <button 
                      onClick={toggleSound}
                      className={`p-2 rounded-full border transition-all ${soundEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                      title={soundEnabled ? "Son Activé" : "Son Désactivé"}
                    >
                      {soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
                    </button>

                    {/* KPIs */}
                    <div className="hidden lg:flex gap-4">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3">
                            <div className="bg-yellow-100 p-2 rounded-lg text-yellow-700"><Bell size={18}/></div>
                            <div><div className="text-xs text-slate-400 font-bold uppercase">Attente</div><div className="text-xl font-black">{stats.pending}</div></div>
                        </div>
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-700"><ChefHat size={18}/></div>
                            <div><div className="text-xs text-slate-400 font-bold uppercase">Cuisine</div><div className="text-xl font-black">{stats.cooking}</div></div>
                        </div>
                        <div className="bg-slate-900 text-white shadow-lg rounded-xl px-5 py-2 flex items-center gap-3">
                             <div className="text-right w-full">
                                <div className="text-xs text-slate-400 font-bold uppercase">Revenu</div>
                                <div className="text-xl font-black">{stats.revenue} <span className="text-xs font-normal">DH</span></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="max-w-[1920px] mx-auto p-4 md:p-6 min-h-[calc(100vh-100px)]">
            
            {viewMode === 'grid' && (
                <OrdersGrid 
                    orders={displayedOrders} 
                    loading={loading} 
                    onOrderClick={handleCardClick}
                    getElapsedMinutes={getElapsedMinutes}
                />
            )}

            {viewMode === 'kanban' && (
    <OrdersKanban 
        orders={displayedOrders} 
        loading={loading} 
        onOrderClick={handleCardClick}
        getElapsedMinutes={getElapsedMinutes}
    />
)}

            {viewMode === 'list' && (
    <OrdersList 
        orders={displayedOrders} 
        loading={loading} 
        onOrderClick={handleCardClick}
        getElapsedMinutes={getElapsedMinutes}
    />
)}

        </div>

        {/* Modals */}
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