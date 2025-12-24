'use client'

import { Order } from '@/types'
import OrderCard from '@/components/dashboard/OrderCard'
import { Utensils } from 'lucide-react'

interface OrdersKanbanProps {
  orders: Order[]
  loading: boolean
  onOrderClick: (order: Order) => void
  getElapsedMinutes: (date: string | null | undefined) => number
}

// Configuration des colonnes
const COLUMNS = [
  {
    id: 'todo',
    title: 'À TRAITER',
    statuses: ['pending', 'confirmed'],
    color: 'bg-slate-100 border-slate-200',
    iconColor: 'text-slate-500'
  },
  {
    id: 'cooking',
    title: 'EN CUISINE',
    statuses: ['preparing'],
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-500'
  },
  {
    id: 'ready',
    title: 'PRÊT / EN ATTENTE',
    statuses: ['ready'],
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-500'
  },
  {
    id: 'delivery',
    title: 'EN LIVRAISON',
    statuses: ['out_for_delivery'],
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500'
  }
]

export default function OrdersKanban({ orders, loading, onOrderClick, getElapsedMinutes }: OrdersKanbanProps) {
  
  if (loading) return <div className="p-10 text-center text-slate-400">Chargement du tableau...</div>

  // Si aucune commande du tout
  if (orders.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-slate-300">
           <Utensils size={64} className="mb-4 opacity-50" />
           <p className="font-medium">Tableau vide</p>
        </div>
     )
  }

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 overflow-x-auto pb-4 snap-x">
      {COLUMNS.map((col) => {
        // Filtrer les commandes pour cette colonne
        const colOrders = orders.filter(o => col.statuses.includes(o.status))

        return (
          <div 
            key={col.id} 
            className={`flex-none w-[320px] md:w-[380px] flex flex-col rounded-xl border ${col.color} snap-start`}
          >
            {/* Header Colonne */}
            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-xl">
               <h3 className={`font-black text-sm tracking-wide ${col.iconColor}`}>{col.title}</h3>
               <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                 {colOrders.length}
               </span>
            </div>

            {/* Liste scrollable verticale */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
               {colOrders.length === 0 ? (
                 <div className="h-full flex items-center justify-center opacity-30 text-sm font-medium italic">
                    Aucune commande
                 </div>
               ) : (
                 colOrders.map(order => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        elapsedMinutes={getElapsedMinutes(order.created_at)}
                        onClick={() => onOrderClick(order)}
                        compact={true} // Optionnel: pour rendre la carte un peu moins haute si besoin
                    />
                 ))
               )}
            </div>
          </div>
        )
      })}
    </div>
  )
}