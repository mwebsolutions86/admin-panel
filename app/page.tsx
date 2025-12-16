'use client'

import { useEffect, useState, useRef } from 'react' 
import { supabase } from '../lib/supabase' // Chemin relatif corrigé
import { STORE_ID } from '../lib/constants' // Chemin relatif corrigé
import { ShoppingBag, Clock, ChefHat, Truck, CheckCircle, Loader2 } from 'lucide-react'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// --- TYPES STRICTS ---
type OrderStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'

interface Order {
  id: number
  uid: string
  status: OrderStatus
  total_amount: number
  created_at: string
  guest_info: { name: string; phone: string }
  delivery_address: string
  items?: Record<string, unknown>[] 
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // STATISTIQUES
  const stats = {
    new: orders.filter(o => o.status === 'NEW').length,
    cooking: orders.filter(o => o.status === 'PREPARING' || o.status === 'ACCEPTED').length,
    ready: orders.filter(o => o.status === 'READY_FOR_PICKUP').length,
    revenue: orders.filter(o => o.status === 'DELIVERED').reduce((acc, curr) => acc + curr.total_amount, 0)
  }

  useEffect(() => {
    // Initialisation Audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
    
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('store_id', STORE_ID)
          .neq('status', 'DELIVERED')
          .neq('status', 'CANCELLED')
          .order('created_at', { ascending: false })
  
        if (error) throw error
        // TypeScript est maintenant content, plus besoin de directive
        setOrders(data as Order[])
      } catch (err) {
        // L'objet erreur de Supabase est souvent caché, ceci force l'affichage
          console.error("Erreur détaillée:", JSON.stringify(err, null, 2))
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()

    // Configuration Realtime
    const channel = supabase.channel('admin-dashboard')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${STORE_ID}` }, 
        (payload: RealtimePostgresChangesPayload<Order>) => { 
        
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as Order
          setOrders(prev => [newOrder, ...prev])
          playAlert()
        } 
        else if (payload.eventType === 'UPDATE') {
          const updatedOrder = payload.new as Order
          
          if (['DELIVERED', 'CANCELLED'].includes(updatedOrder.status)) {
            setOrders(prev => prev.filter(o => o.id !== updatedOrder.id))
          } else {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
          }
        }
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [])

  const playAlert = () => {
    audioRef.current?.play().catch(e => console.log("Audio bloqué:", e))
  }

  const updateStatus = async (orderId: number, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))

    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    } catch (err) {
      console.error("Erreur update:", err)
    }
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'NEW': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">NOUVEAU 🔥</span>
      case 'ACCEPTED': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">REÇU</span>
      case 'PREPARING': return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">CUISSON 🍳</span>
      case 'READY_FOR_PICKUP': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">PRÊT 🥡</span>
      case 'ASSIGNED': return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">LIVREUR EN ROUTE 🛵</span>
      case 'PICKED_UP': return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">EN TRANSIT 💨</span>
      default: return <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs">{status}</span>
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ChefHat /> Dashboard Cuisine <span className="text-sm font-normal text-gray-400 ml-2">Casablanca HQ</span>
        </h1>
        
        <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                <div className="text-gray-500 text-xs font-bold uppercase">À Valider</div>
                <div className="text-3xl font-bold text-gray-900">{stats.new}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
                <div className="text-gray-500 text-xs font-bold uppercase">En Cuisine</div>
                <div className="text-3xl font-bold text-gray-900">{stats.cooking}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                <div className="text-gray-500 text-xs font-bold uppercase">Prêts</div>
                <div className="text-3xl font-bold text-gray-900">{stats.ready}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                <div className="text-gray-500 text-xs font-bold uppercase">CA Livré (Séance)</div>
                <div className="text-3xl font-bold text-gray-900">{stats.revenue} <span className="text-sm">DH</span></div>
            </div>
        </div>
      </header>

      <main className="space-y-4">
        {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune commande active</h3>
                <p className="mt-1 text-sm text-gray-500">Le calme avant la tempête ?</p>
            </div>
        ) : (
            orders.map((order) => (
                <div key={order.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${order.status === 'NEW' ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-gray-500 text-sm">#{order.id}</span>
                            {getStatusBadge(order.status)}
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12}/> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900">{order.guest_info?.name || 'Client'}</h3>
                        <div className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                            <ShoppingBag size={14}/> {order.total_amount} DH • Cash on Delivery
                        </div>
                        <div className="text-gray-400 text-xs mt-2 italic">
                            {order.delivery_address}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {order.status === 'NEW' && (
                            <button onClick={() => updateStatus(order.id, 'ACCEPTED')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition">
                                <CheckCircle size={18}/> Accepter
                            </button>
                        )}
                        {order.status === 'ACCEPTED' && (
                            <button onClick={() => updateStatus(order.id, 'PREPARING')} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition">
                                <ChefHat size={18}/> Lancer Cuisson
                            </button>
                        )}
                        {order.status === 'PREPARING' && (
                            <button onClick={() => updateStatus(order.id, 'READY_FOR_PICKUP')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition">
                                <ShoppingBag size={18}/> Emballé & Prêt
                            </button>
                        )}
                        {order.status === 'READY_FOR_PICKUP' && (
                            <div className="text-gray-500 text-sm font-medium flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg animate-pulse">
                                <Truck size={18}/> Recherche livreur...
                            </div>
                        )}
                        {(order.status === 'ASSIGNED' || order.status === 'PICKED_UP') && (
                             <div className="text-purple-600 text-sm font-medium flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-lg">
                                <Truck size={18}/> En cours de livraison
                            </div>
                        )}
                    </div>
                </div>
            ))
        )}
      </main>
    </div>
  )
}