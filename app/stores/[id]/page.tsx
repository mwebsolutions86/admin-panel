'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id; // Peut être 'new' ou un UUID
  const isNew = storeId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    delivery_fees: '10', // Valeur par défaut
    is_open: true,
    brand_id: '' // Sera rempli automatiquement
  });

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    // 1. Récupérer l'ID de la marque (on prend la première trouvée pour simplifier)
    const { data: brands } = await supabase.from('brands').select('id').limit(1);
    const brandId = brands?.[0]?.id;

    if (!brandId) {
        alert("Erreur critique: Aucune marque trouvée.");
        return;
    }

    if (isNew) {
        setFormData(prev => ({ ...prev, brand_id: brandId }));
        setLoading(false);
    } else {
        // Mode Édition : on charge les données du store
        const { data: store, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();
        
        if (store) {
            setFormData({
                name: store.name,
                address: store.address,
                delivery_fees: store.delivery_fees,
                is_open: store.is_open,
                brand_id: store.brand_id
            });
        }
        setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
        if (isNew) {
            // CRÉATION
            const { error } = await supabase.from('stores').insert([formData]);
            if (error) throw error;
        } else {
            // MISE À JOUR
            const { error } = await supabase
                .from('stores')
                .update(formData)
                .eq('id', storeId);
            if (error) throw error;
        }
        router.push('/stores'); // Retour à la liste
    } catch (error) {
        console.error(error);
        alert("Erreur lors de l'enregistrement");
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-6">
        <Link href="/stores" className="flex items-center text-gray-500 hover:text-black mb-4 gap-2">
            <ArrowLeft size={18} /> Retour
        </Link>
        <h1 className="text-3xl font-bold">{isNew ? 'Nouveau Point de Vente' : 'Modifier le Magasin'}</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        
        {/* Nom */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du magasin</label>
            <input 
                type="text" 
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="Ex: Universal Eats - Talborjt"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
        </div>

        {/* Adresse */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
            <textarea 
                required
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none h-24"
                placeholder="Ex: 12 Rue des Orangers, Agadir"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
            />
        </div>

        {/* Frais de livraison */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frais de livraison (DH)</label>
            <div className="relative">
                <input 
                    type="number" 
                    required
                    min="0"
                    step="0.5"
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                    value={formData.delivery_fees}
                    onChange={e => setFormData({...formData, delivery_fees: e.target.value})}
                />
                <div className="absolute right-4 top-3 text-gray-400 font-medium">DH</div>
            </div>
        </div>

        {/* Status Switch */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
                <div className="font-medium text-gray-900">Ouvert aux commandes</div>
                <div className="text-sm text-gray-500">Si désactivé, le magasin apparaîtra comme "Fermé" sur l'app.</div>
            </div>
            <button 
                type="button"
                onClick={() => setFormData({...formData, is_open: !formData.is_open})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_open ? 'bg-green-500' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_open ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>

        <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition flex items-center justify-center gap-2"
        >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {isNew ? 'Créer le magasin' : 'Enregistrer les modifications'}
        </button>

      </form>
    </div>
  );
}