'use client'

import { Order } from '@/types'
import OrderCard from '@/components/dashboard/OrderCard'
import { Utensils, Loader2 } from 'lucide-react'

interface OrdersGridProps {
  orders: Order[]
  loading: boolean
  onOrderClick: (order: Order) => void
  getElapsedMinutes: (date: string | null | undefined) => number
}

export default function OrdersGrid({ orders, loading, onOrderClick, getElapsedMinutes }: OrdersGridProps) {
  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 size={48} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 text-slate-300">
        <Utensils size={80} className="mb-4 opacity-50" />
        <p className="text-xl font-bold">Aucune commande active</p>
        <p className="text-sm mt-2">En attente de commandes...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20 animate-in fade-in duration-500">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          elapsedMinutes={getElapsedMinutes(order.created_at)}
          onClick={() => onOrderClick(order)}
        />
      ))}
    </div>
  )
}