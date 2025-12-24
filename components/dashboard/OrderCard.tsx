'use client';

import React from 'react';
import { Clock, User, Truck, ShoppingBag, Utensils, MapPin, Loader2, Ban } from 'lucide-react';
import { Order } from '@/types';

interface OrderCardProps {
  order: Order;
  elapsedMinutes: number;
  onClick: () => void;
  // ✅ CORRECTION : Ajout de la prop optionnelle
  compact?: boolean;
}

export default function OrderCard({ order, elapsedMinutes, onClick, compact = false }: OrderCardProps) {
  
  const getTimeColorClass = () => {
    if (elapsedMinutes < 15) return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (elapsedMinutes < 30) return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-rose-700 bg-rose-100 border-rose-200 animate-pulse';
  };

  const getBorderColor = () => {
    switch(order.status) {
        case 'pending': 
        case 'confirmed': return 'border-l-yellow-400 ring-yellow-50';
        case 'preparing': return 'border-l-orange-500 ring-orange-50';
        case 'ready': return 'border-l-emerald-500 ring-emerald-50';
        case 'out_for_delivery': return 'border-l-blue-500 ring-blue-50';
        default: return 'border-l-gray-300';
    }
  };

  const parseOptions = (options: any) => {
    let addons: string[] = [];
    let removed: string[] = [];

    if (!options) return { addons, removed };

    if (Array.isArray(options)) {
        options.forEach(opt => {
            if (typeof opt === 'string') {
                if (opt.startsWith('Sans ')) removed.push(opt.replace('Sans ', ''));
                else addons.push(opt);
            }
        });
    } else if (typeof options === 'object') {
        if (Array.isArray(options.selectedOptions)) {
            addons = options.selectedOptions.map((o: any) => (typeof o === 'object' && o.name) ? o.name : o);
        }
        if (Array.isArray(options.removedIngredients)) {
            removed = options.removedIngredients;
        }
    }
    return { addons, removed };
  };

  return (
    <div 
      onClick={onClick}
      className={`
        flex flex-col w-full 
        bg-white border-y border-r border-l-[6px] rounded-xl shadow-md 
        transition-all duration-200 cursor-pointer 
        hover:shadow-xl hover:scale-[1.02] active:scale-95
        ${getBorderColor()}
        ${compact ? 'h-[280px]' : 'h-[400px]'} // ✅ HAUTEUR VARIABLE
      `}
    >
      {/* HEADER */}
      <div className={`border-b border-slate-100 bg-slate-50/80 ${compact ? 'p-2' : 'p-3'}`}>
        <div className="flex justify-between items-start mb-1">
           <div className="flex items-center gap-2">
             <span className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-slate-900 font-mono tracking-tight`}>
                #{order.order_number}
             </span>
             {/* Masquer le type en mode compact si besoin, ou le réduire */}
             <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-500">
                {order.order_type === 'delivery' ? <Truck size={10}/> : order.order_type === 'takeaway' ? <ShoppingBag size={10}/> : <Utensils size={10}/>}
                {!compact && (order.order_type === 'delivery' ? 'Livraison' : order.order_type === 'takeaway' ? 'Emporter' : 'Sur Place')}
             </div>
           </div>
           <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 ${getTimeColorClass()}`}>
              <Clock size={12}/> {elapsedMinutes}m
           </div>
        </div>
        
        {/* On masque l'adresse en mode compact pour gagner de la place si nécessaire, ou on truncate plus fort */}
        <div className="flex items-center gap-2 text-slate-600 text-xs font-bold truncate">
           <User size={12}/> {compact ? (order.customer_name?.split(' ')[0] || 'Client') : (order.customer_name || 'Client')}
           {!compact && order.order_type === 'delivery' && (
             <>
               <span className="text-slate-300">|</span>
               <MapPin size={12}/> <span className="truncate max-w-[100px]">{order.delivery_address}</span>
             </>
           )}
        </div>
      </div>

      {/* BODY */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-white ${compact ? 'p-2' : 'p-3'}`}>
        <ul className={`${compact ? 'space-y-2' : 'space-y-3'}`}>
          {order.order_items && order.order_items.length > 0 ? (
            order.order_items.map((item, idx) => {
              const { addons, removed } = parseOptions(item.options);

              return (
                <li key={idx} className="flex gap-3 items-start pb-2 border-b border-dashed border-slate-100 last:border-0">
                  <div className={`flex items-center justify-center rounded-lg bg-slate-900 text-white font-black shrink-0 shadow-sm ${compact ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-lg'}`}>
                    {item.quantity}
                  </div>
                  <div className="flex-1 leading-tight">
                    <div className={`font-bold text-slate-800 ${compact ? 'text-sm' : 'text-base'}`}>
                      {item.product_name}
                    </div>
                    
                    {/* En mode compact, on n'affiche les options que s'il y en a, et plus petit */}
                    {addons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {addons.map((opt, i) => (
                          <span key={i} className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                            + {opt}
                          </span>
                        ))}
                      </div>
                    )}

                    {removed.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {removed.map((ing, i) => (
                          <span key={i} className="text-[10px] font-bold text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-100 flex items-center gap-1">
                            <Ban size={8} /> -{ing}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
               <Loader2 size={24} className="animate-spin mb-2"/>
               <span className="text-xs">Chargement...</span>
            </div>
          )}
        </ul>
      </div>

      {/* FOOTER */}
      <div className={`border-t border-slate-100 bg-slate-50 flex justify-between items-center ${compact ? 'p-2' : 'p-3'}`}>
         {!compact && <div className="text-xs font-bold text-slate-400 uppercase">Total</div>}
         <div className={`${compact ? 'text-lg' : 'text-xl'} font-black text-slate-900 font-mono ml-auto`}>{order.total_amount} DH</div>
      </div>
    </div>
  );
}