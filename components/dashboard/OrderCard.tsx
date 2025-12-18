'use client';

import React from 'react';
// CORRECTION : Ajout de Loader2
import { Clock, User, Truck, ShoppingBag, Utensils, MapPin, Loader2 } from 'lucide-react';
import { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  elapsedMinutes: number;
  onClick: () => void;
}

export default function OrderCard({ order, elapsedMinutes, onClick }: OrderCardProps) {
  
  const getTimeColorClass = () => {
    if (elapsedMinutes < 15) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (elapsedMinutes < 30) return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-rose-700 bg-rose-100 border-rose-200 animate-pulse';
  };

  const getBorderColor = () => {
    switch(order.status) {
        // CORRECTION : minuscule
        case 'pending': 
        case 'confirmed': return 'border-l-yellow-400 ring-yellow-50';
        case 'preparing': return 'border-l-orange-500 ring-orange-50';
        case 'ready': return 'border-l-emerald-500 ring-emerald-50';
        case 'out_for_delivery': return 'border-l-blue-500 ring-blue-50';
        default: return 'border-l-gray-300';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        flex flex-col h-[400px] w-full 
        bg-white border-y border-r border-l-[6px] rounded-xl shadow-md 
        transition-all duration-200 cursor-pointer 
        hover:shadow-xl hover:scale-[1.02] active:scale-95
        ${getBorderColor()}
      `}
    >
      {/* HEADER */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/80">
        <div className="flex justify-between items-start mb-2">
           <div className="flex items-center gap-2">
             <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">#{order.order_number}</span>
             <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-500">
                {order.order_type === 'delivery' ? <Truck size={10}/> : order.order_type === 'takeaway' ? <ShoppingBag size={10}/> : <Utensils size={10}/>}
                {order.order_type === 'delivery' ? 'Livraison' : order.order_type === 'takeaway' ? 'Emporter' : 'Sur Place'}
             </div>
           </div>
           <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${getTimeColorClass()}`}>
              <Clock size={12}/> {elapsedMinutes}m
           </div>
        </div>
        
        <div className="flex items-center gap-2 text-slate-600 text-xs font-bold truncate">
           <User size={12}/> {order.customer_name || 'Client'}
           {order.order_type === 'delivery' && (
             <>
               <span className="text-slate-300">|</span>
               <MapPin size={12}/> <span className="truncate max-w-[100px]">{order.delivery_address}</span>
             </>
           )}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-white">
        <ul className="space-y-3">
          {order.order_items && order.order_items.length > 0 ? (
            order.order_items.map((item, idx) => (
              <li key={idx} className="flex gap-3 items-start pb-2 border-b border-dashed border-slate-100 last:border-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-lg shrink-0 shadow-sm">
                  {item.quantity}
                </div>
                <div className="flex-1 leading-tight">
                  <div className="font-bold text-slate-800 text-base">
                    {item.product_name}
                  </div>
                  {item.options && item.options.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.options.map((opt, i) => (
                        <span key={i} className="text-[11px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <Loader2 size={24} className="animate-spin mb-2"/>
               <span className="text-xs">Chargement articles...</span>
            </div>
          )}
        </ul>
      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
         <div className="text-xs font-bold text-slate-400 uppercase">Total</div>
         <div className="text-xl font-black text-slate-900 font-mono">{order.total_amount} DH</div>
      </div>
    </div>
  );
}