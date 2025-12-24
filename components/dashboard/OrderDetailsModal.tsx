'use client';

import React from 'react';
import { XCircle, Clock, User, Phone, MapPin, Receipt, Loader2, ChefHat, Utensils, CheckCircle2, Map, Truck, AlertCircle, PackageCheck } from 'lucide-react';
import { Order, OrderItem } from '@/types';

interface OrderDetailsModalProps {
  order: Order;
  items: OrderItem[];
  loadingItems: boolean;
  elapsedMinutes: number;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onOpenMap: () => void;
  readOnly?: boolean; 
}

export default function OrderDetailsModal({ 
  order, items, loadingItems, elapsedMinutes, onClose, onUpdateStatus, onOpenMap, readOnly = false 
}: OrderDetailsModalProps) {

  const orderDate = new Date(order.created_at ?? new Date().toISOString());
  const isDelivery = order.order_type === 'delivery';

  // --- PARSEUR INTELLIGENT AVEC REGROUPEMENT ---
  const renderOptions = (options: any) => {
    if (!options) return null;

    // Cas Nouveau Format JSONB ({ selectedOptions: [...], removedIngredients: [...] })
    if (typeof options === 'object' && !Array.isArray(options)) {
        const { selectedOptions = [], removedIngredients = [] } = options;
        if ((!selectedOptions || selectedOptions.length === 0) && (!removedIngredients || removedIngredients.length === 0)) return null;

        // Regroupement des options identiques (compteur)
        const groupedOptions = selectedOptions.reduce((acc: any, opt: any) => {
            const key = opt.id || opt.name || opt;
            if (!acc[key]) acc[key] = { ...opt, count: 0, name: opt.name || opt };
            acc[key].count += 1;
            return acc;
        }, {});

        return (
            <div className="mt-2 flex flex-wrap gap-2">
                {/* Sans Ingrédients (Rouge) */}
                {Array.isArray(removedIngredients) && removedIngredients.map((ing: string, i: number) => (
                    <span key={`rem-${i}`} className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-bold uppercase flex items-center gap-1">
                        <XCircle size={10}/> Sans {ing}
                    </span>
                ))}

                {/* Options Groupées (Bleu) */}
                {Object.values(groupedOptions).map((opt: any, i: number) => (
                    <span key={`opt-${i}`} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold uppercase flex items-center gap-1">
                        {/* Affiche "3x" si quantité > 1 */}
                        {opt.count > 1 && <span className="bg-blue-200 text-blue-800 px-1 rounded-sm text-[9px]">{opt.count}x</span>}
                        {opt.name} 
                        {opt.price > 0 && <span className="bg-white px-1 rounded ml-1 text-blue-800 border border-blue-100">+{opt.price}</span>}
                    </span>
                ))}
            </div>
        );
    }

    // Cas Ancien Format (Tableau simple) - Legacy
    if (Array.isArray(options) && options.length > 0) {
        return (
            <div className="mt-2 flex flex-wrap gap-1">
                {options.map((opt: any, i: number) => {
                    const label = typeof opt === 'string' ? opt : (opt.name || JSON.stringify(opt));
                    return (
                        <span key={i} className="text-[10px] bg-yellow-50 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-100 font-bold uppercase">
                            {label}
                        </span>
                    )
                })}
            </div>
        );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black text-slate-800 font-mono">#{order.order_number}</h2>
              {!readOnly && (
                <span className={`text-sm font-bold px-3 py-1 rounded-full border ${elapsedMinutes > 30 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {elapsedMinutes} min
                </span>
              )}
            </div>
            <div className="flex flex-col mt-2 gap-1">
                <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                    <Clock size={14}/> Reçue à {orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
                <div className="flex gap-2">
                    {order.order_type === 'delivery' && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase">Livraison</span>}
                    {order.order_type === 'takeaway' && <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">A emporter</span>}
                    {order.order_type === 'dine_in' && <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded uppercase">Sur Place</span>}
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <XCircle size={28} className="text-slate-400 hover:text-slate-600"/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
             <div className="flex justify-between items-start">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 font-bold text-slate-800"><User size={16}/> {order.customer_name || 'Anonyme'}</div>
                   <div className="flex items-center gap-2 text-slate-600"><Phone size={16}/> {order.customer_phone || '--'}</div>
                </div>
                {isDelivery && (
                  <button 
                    onClick={onOpenMap}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Map size={16} /> Voir Carte
                  </button>
                )}
             </div>
             {isDelivery && (
               <div className="flex items-start gap-2 pt-2 border-t border-slate-200/50 text-slate-700 text-sm">
                 <MapPin size={16} className="mt-0.5 shrink-0"/> {order.delivery_address}
               </div>
             )}
             
             {order.notes && (
                 <div className="mt-2 bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-sm text-yellow-800">
                     <span className="font-bold">Note client :</span> {order.notes}
                 </div>
             )}
             
             {order.payment_method === 'cash' && order.payment_status === 'pending' && (
                 <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit mt-2">
                     <AlertCircle size={12}/> Paiement à la réception (Non payé)
                 </div>
             )}
          </div>

          <h3 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-4 flex items-center gap-2"><Receipt size={14}/> Détail Commande</h3>
          
          {loadingItems ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300"/></div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                  <div className="flex gap-4 w-full">
                    <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shrink-0">
                        {item.quantity}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800 text-lg leading-tight flex justify-between w-full">
                          <span>{item.product_name}</span>
                          <span className="text-sm font-medium text-slate-500">{(item.price * item.quantity).toFixed(2)} DH</span>
                      </div>
                      {renderOptions(item.options)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!readOnly && (
          <div className="p-6 border-t border-slate-200 bg-white">
            <div className="flex justify-between items-end mb-4">
              <span className="text-slate-400 font-bold text-xs uppercase">Total à encaisser</span>
              <span className="text-3xl font-black text-slate-900">{order.total_amount} DH</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {(order.status === 'pending' || order.status === 'confirmed') && (
                <button onClick={() => onUpdateStatus(order.id, 'preparing')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 flex justify-center gap-2 transition-transform active:scale-95">
                    <ChefHat/> Lancer Cuisine
                </button>
              )}

              {order.status === 'preparing' && (
                <button onClick={() => onUpdateStatus(order.id, 'ready')} className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 flex justify-center gap-2 transition-transform active:scale-95">
                    <Utensils/> {isDelivery ? "Prête pour Livreur" : "Commande Prête"}
                </button>
              )}

              {order.status === 'ready' && (
                <>
                    {isDelivery ? (
                         <button onClick={() => onUpdateStatus(order.id, 'out_for_delivery')} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 flex justify-center gap-2 transition-transform active:scale-95">
                            <Truck/> Départ Livraison
                         </button>
                    ) : (
                         <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 flex justify-center gap-2 transition-transform active:scale-95">
                            <PackageCheck/> {order.order_type === 'takeaway' ? 'Remis au client (Terminer)' : 'Servi à table (Terminer)'}
                         </button>
                    )}
                </>
              )}

              {order.status === 'out_for_delivery' && (
                <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 flex justify-center gap-2 transition-transform active:scale-95">
                    <CheckCircle2/> Confirmer Livraison
                </button>
              )}

              <button onClick={() => { if(confirm('Annuler cette commande ?')) onUpdateStatus(order.id, 'cancelled') }} className="w-full py-2 text-red-500 font-bold text-sm hover:underline">
                  Annuler commande
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}