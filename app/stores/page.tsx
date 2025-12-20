'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, Clock, Edit, Trash2, Store as StoreIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at');
    
    if (data) setStores(data);
    setLoading(false);
  };

  const toggleStoreStatus = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update (on change tout de suite pour l'effet visuel)
    setStores(stores.map(s => s.id === id ? { ...s, is_open: !currentStatus } : s));

    const { error } = await supabase
      .from('stores')
      .update({ is_open: !currentStatus })
      .eq('id', id);

    if (error) {
        alert("Erreur lors de la mise à jour");
        fetchStores(); // On remet comme c'était en cas d'erreur
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce point de vente ?")) return;
    
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (!error) {
        setStores(stores.filter(s => s.id !== id));
    } else {
        alert("Impossible de supprimer (il y a probablement des commandes liées).");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Points de Vente</h1>
            <p className="text-gray-500 mt-1">Gérez vos restaurants et leurs horaires</p>
        </div>
        <Link 
          href="/stores/new" 
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition shadow-lg"
        >
          <Plus size={20} />
          Nouveau Magasin
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <div key={store.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <StoreIcon size={24} className="text-gray-700" />
                    </div>
                    {/* Switch On/Off */}
                    <button 
                        onClick={() => toggleStoreStatus(store.id, store.is_open)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${store.is_open 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-600 border-red-100'}`}
                    >
                        {store.is_open ? 'OUVERT' : 'FERMÉ'}
                    </button>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">{store.name}</h3>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                    <MapPin size={16} />
                    <span className="truncate">{store.address}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="text-sm font-medium text-gray-900">
                        Frais: {store.delivery_fees} DH
                    </div>
                    <div className="flex gap-2">
                        <Link 
                            href={`/stores/${store.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                            <Edit size={18} />
                        </Link>
                        <button 
                            onClick={() => deleteStore(store.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}