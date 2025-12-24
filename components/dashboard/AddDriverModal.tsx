'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Nécessaire pour charger la liste des stores
import { X, Loader2, Bike, Mail, Phone, User, CheckCircle2, AlertCircle, Store } from 'lucide-react';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDriverModal({ isOpen, onClose, onSuccess }: AddDriverModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<{id: string, name: string}[]>([]); // Liste des stores
  
  const [formData, setFormData] = useState({
    email: '',
    password: '', 
    fullName: '',
    phone: '',
    storeId: '' // Par défaut vide = Siège / Global
  });

  // Charger la liste des points de vente à l'ouverture
  useEffect(() => {
      const fetchStores = async () => {
          const { data } = await supabase.from('stores').select('id, name').order('name');
          if (data) setStores(data);
      };
      if (isOpen) fetchStores();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                phone: formData.phone,
                role: 'driver',
                // Si vide, on envoie null (Siège), sinon l'ID du store
                storeId: formData.storeId || null 
            })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Erreur création');

        onSuccess();
        onClose();
        // Reset
        setFormData({ email: '', password: '', fullName: '', phone: '', storeId: '' });

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Bike className="text-blue-600" size={20}/> Nouveau Livreur
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20}/>
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 font-bold">
                    <AlertCircle size={16}/> {error}
                </div>
            )}

            {/* SÉLECTEUR D'AFFECTATION (Nouveau) */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Affectation Flotte</label>
                <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <select
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                        value={formData.storeId}
                        onChange={e => setFormData({...formData, storeId: e.target.value})}
                    >
                        <option value="">🏢 Siège / Flotte Globale (Uber-like)</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>🏪 {store.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nom Complet</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: Samir Driver"
                        value={formData.fullName}
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="tel" 
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="06..."
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="email@..."
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Mot de passe</label>
                <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="Min 6 caractères"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={18}/>}
                {loading ? 'Création...' : 'Ajouter à la Flotte'}
            </button>
        </form>
      </div>
    </div>
  );
}