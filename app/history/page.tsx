'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, Calendar, CheckCircle2, User, MapPin, Phone, 
  Loader2, Ban, XCircle // <--- AJOUT DE XCircle ICI
} from 'lucide-react'

// --- TYPES ---
interface OrderItem { product_name: string; quantity: number; options: string[]; }
interface Order {
  id: string; order_number: number; customer_name: string | null; customer_phone: string | null;
  delivery_address: string | null; order_type: 'dine_in' | 'takeaway' | 'delivery';
  total_amount: number; status: 'completed' | 'cancelled'; created_at: string;
  order_items?: OrderItem[];
}

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) setOrders(data as Order[])
      setLoading(false)
    }

    fetchHistory()
  }, [])

  const fetchOrderDetails = async (order: Order) => {
    setSelectedOrder(order)
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    if (data) setSelectedOrder({ ...order, order_items: data })
  }

  const filteredOrders = orders.filter(o => 
    o.order_number.toString().includes(searchQuery) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative overflow-hidden font-sans text-slate-800 p-4 md:p-8 pb-20">
      
      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col h-[90vh]">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Historique</h1>
                <p className="text-gray-500 font-medium">Archives des commandes terminées et annulées.</p>
            </div>
            
            {/* Barre de recherche */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl px-4 py-3 flex items-center gap-3 w-80 focus-within:w-96 transition-all focus-within:shadow-md focus-within:bg-white">
                <Search size={18} className="text-gray-400"/>
                <input 
                    type="text" 
                    placeholder="Rechercher N° ou Client..." 
                    className="bg-transparent outline-none w-full text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        {/* TABLEAU */}
        <div className="flex-1 bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[32px] overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-4 p-6 border-b border-gray-200/50 bg-white/40 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">N°</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Client</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-2 text-center">Statut</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin text-gray-400"/></div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center p-20 text-gray-400 font-medium">Aucune archive trouvée.</div>
                ) : (
                    filteredOrders.map(order => (
                        <div 
                            key={order.id} 
                            onClick={() => fetchOrderDetails(order)}
                            className="grid grid-cols-12 gap-4 p-5 border-b border-gray-100/50 hover:bg-white/60 cursor-pointer transition-colors items-center group"
                        >
                            <div className="col-span-1 font-black text-gray-900">#{order.order_number}</div>
                            <div className="col-span-2 text-sm text-gray-600 flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400"/>
                                {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                            </div>
                            <div className="col-span-3 font-medium text-gray-800">{order.customer_name || 'Anonyme'}</div>
                            <div className="col-span-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase border ${
                                    order.order_type === 'delivery' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                    'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                    {order.order_type === 'takeaway' ? 'Emporter' : order.order_type === 'delivery' ? 'Livraison' : 'Sur Place'}
                                </span>
                            </div>
                            <div className="col-span-2 font-black text-gray-900">{order.total_amount} DH</div>
                            <div className="col-span-2 flex justify-center">
                                {order.status === 'completed' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                        <CheckCircle2 size={12}/> Livrée
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
                                        <Ban size={12}/> Annulée
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* MODALE DÉTAIL READ-ONLY */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/20 backdrop-blur-[2px]">
            <div className="bg-white/90 backdrop-blur-2xl w-full max-w-md h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300 border-l border-white/50">
                
                <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
                    <h2 className="text-2xl font-black text-gray-900">Commande #{selectedOrder.order_number}</h2>
                    {/* C'est ICI qu'il manquait XCircle */}
                    <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={24} className="text-gray-400"/></button>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-3 border border-gray-100">
                    <div className="flex items-center gap-3"><User size={16} className="text-gray-400"/><span className="font-bold">{selectedOrder.customer_name}</span></div>
                    <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400"/><span>{selectedOrder.customer_phone}</span></div>
                    {selectedOrder.delivery_address && (
                        <div className="flex items-start gap-3"><MapPin size={16} className="text-gray-400 mt-1"/><span className="text-sm">{selectedOrder.delivery_address}</span></div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Articles commandés</h3>
                    <div className="space-y-4">
                        {selectedOrder.order_items?.map((item, i) => (
                            <div key={i} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0">
                                <div className="bg-gray-900 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">{item.quantity}</div>
                                <div>
                                    <div className="font-bold text-gray-800">{item.product_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{item.options.join(', ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-4">
                    <div className="flex justify-between items-center text-xl font-black">
                        <span>Total Payé</span>
                        <span>{selectedOrder.total_amount} DH</span>
                    </div>
                    <div className={`mt-4 text-center p-3 rounded-xl font-bold border ${selectedOrder.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {selectedOrder.status === 'completed' ? 'Commande Livrée le ' + new Date(selectedOrder.created_at).toLocaleDateString() : 'Commande Annulée'}
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  )
}