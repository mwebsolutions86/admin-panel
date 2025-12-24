'use client'

import { Order } from '@/types'
import { Clock, MapPin, Bike, ChefHat, AlertCircle, CheckCircle2 } from 'lucide-react'

interface OrdersListProps {
  orders: Order[]
  loading: boolean
  onOrderClick: (order: Order) => void
  getElapsedMinutes: (date: string | null | undefined) => number
}

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold border border-yellow-200">En attente</span>
        case 'confirmed': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200">Confirmée</span>
        case 'preparing': return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold border border-orange-200 flex w-fit items-center gap-1"><ChefHat size={12}/> Cuisine</span>
        case 'ready': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold border border-green-200">Prête</span>
        case 'out_for_delivery': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold border border-purple-200 flex w-fit items-center gap-1"><Bike size={12}/> Livraison</span>
        default: return <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{status}</span>
    }
}

export default function OrdersList({ orders, loading, onOrderClick, getElapsedMinutes }: OrdersListProps) {
  
  if (loading) return <div className="p-10 text-center text-slate-400">Chargement de la liste...</div>

  if (orders.length === 0) {
     return <div className="p-10 text-center text-slate-400 font-medium">Aucune commande active</div>
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                    <th className="p-4"># ID</th>
                    <th className="p-4">Heure / Timer</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Montant</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                    const elapsed = getElapsedMinutes(order.created_at);
                    const isLate = elapsed > 20; // Alerte visuelle si > 20min

                    return (
                        <tr 
                            key={order.id} 
                            onClick={() => onOrderClick(order)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        >
                            <td className="p-4 font-mono font-bold text-slate-700">
                                #{order.order_number}
                            </td>
                            <td className="p-4">
                                <div className={`flex items-center gap-2 font-bold ${isLate ? 'text-red-500' : 'text-slate-600'}`}>
                                    <Clock size={16} />
                                    {elapsed} min
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                    {order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-900">{order.customer_name || 'Inconnu'}</div>
                                <div className="text-xs text-slate-500">{order.customer_phone}</div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                    {order.order_type === 'delivery' ? <MapPin size={16} className="text-blue-500"/> : <CheckCircle2 size={16} className="text-green-500"/>}
                                    {order.order_type === 'delivery' ? 'Livraison' : 'Emporter'}
                                </div>
                            </td>
                            <td className="p-4 font-black text-slate-800">
                                {order.total_amount} DH
                            </td>
                            <td className="p-4">
                                {getStatusBadge(order.status)}
                            </td>
                            <td className="p-4 text-right">
                                <button className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    Gérer
                                </button>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
      </div>
    </div>
  )
}