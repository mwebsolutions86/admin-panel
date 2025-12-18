'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Save, Truck, Power, Palette, Image as ImageIcon, 
  Loader2, UploadCloud, CheckCircle2, AlertCircle, Store, Type, FileText
} from 'lucide-react'
import Image from 'next/image'

// --- TYPES ---
interface StoreConfig {
  id: string;
  name: string;
  description: string | null;
  delivery_fees: number;
  is_open: boolean;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

interface Toast { id: number; message: string; type: 'success' | 'error'; }

export default function SettingsPage() {
  // Data
  const [store, setStore] = useState<StoreConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false) 

  // Form States
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [primaryColor, setPrimaryColor] = useState('#FFC107')
  const [secondaryColor, setSecondaryColor] = useState('#000000')
  const [logoUrl, setLogoUrl] = useState('')

  // UI States
  const [toasts, setToasts] = useState<Toast[]>([])

  // --- NOTIFICATION SYSTEM ---
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // --- CHARGEMENT ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('*').limit(1).single()
        
        if (data) {
          setStore(data)
          setName(data.name || '')
          setDescription(data.description || '')
          setDeliveryFee(data.delivery_fees?.toString() || '0')
          setIsOpen(data.is_open)
          setPrimaryColor(data.primary_color || '#FFC107')
          setSecondaryColor(data.secondary_color || '#000000')
          setLogoUrl(data.logo_url || '')
        }
      } catch (error) {
        console.log("Aucun restaurant trouvé, prêt pour la création.")
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // --- ACTIONS ---

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];

    try {
        // Optimisation de l'image (optionnel mais recommandé)
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(imageBitmap, 0, 0);
        
        const blob = await new Promise<Blob | null>(resolve => 
            canvas.toBlob(resolve, 'image/webp', 0.8)
        );

        if (!blob) throw new Error("Erreur de conversion");

        const fileName = `logo-${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, blob, { contentType: 'image/webp', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        setLogoUrl(publicUrl);
        notify("Logo mis à jour (N'oubliez pas d'enregistrer)", "success")
    } catch (error) {
        console.error(error);
        notify("Erreur lors de l'upload", "error");
    } finally {
        setUploading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Conversion sécurisée du prix (évite les erreurs NaN)
    const fees = parseFloat(deliveryFee.replace(',', '.')) || 0;

    const storeData = {
        name: name,
        description: description,
        delivery_fees: fees,
        is_open: isOpen,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl
    }

    let error = null;

    if (store?.id) {
        // SCÉNARIO 1 : MISE À JOUR (UPDATE)
        const { error: updateError } = await supabase
            .from('stores')
            .update(storeData)
            .eq('id', store.id)
        error = updateError;
    } else {
        // SCÉNARIO 2 : CRÉATION (INSERT) - Si c'est la première fois
        const { data: newStore, error: insertError } = await supabase
            .from('stores')
            .insert([storeData])
            .select()
            .single()
        
        if (newStore) setStore(newStore)
        error = insertError;
    }

    if (!error) notify("Paramètres du restaurant mis à jour ! 🚀", "success")
    else {
        console.error(error)
        notify("Erreur: " + error.message, "error")
    }
    
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-[#F2F2F7]"><Loader2 className="animate-spin text-gray-400" size={40}/></div>

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative overflow-hidden font-sans text-slate-800 p-4 md:p-8 pb-32">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

      {/* TOASTS */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl p-4 rounded-2xl flex items-center gap-3 min-w-[300px]">
                {toast.type === 'success' ? <CheckCircle2 className="text-green-500" size={24} /> : <AlertCircle className="text-red-500" size={24} />}
                <div>
                    <p className="font-bold text-sm">{toast.type === 'success' ? 'Succès' : 'Erreur'}</p>
                    <p className="text-xs text-gray-500">{toast.message}</p>
                </div>
            </div>
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Configuration</h1>
                <p className="text-gray-500 font-medium mt-1">Identité, couleurs et fonctionnement du restaurant.</p>
            </div>
            
            <button 
                onClick={handleSave} 
                disabled={saving || uploading} 
                className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center gap-3 disabled:opacity-50"
            >
                {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Enregistrer Tout
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLONNE GAUCHE : IDENTITÉ & LOGO */}
            <div className="lg:col-span-1 space-y-6">
                 
                 {/* CARTE LOGO */}
                 <div className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[32px] p-6 text-center">
                    <div className="relative w-40 h-40 mx-auto bg-gray-50 rounded-full border-4 border-white shadow-inner flex items-center justify-center overflow-hidden mb-6 group">
                        {uploading ? (
                            <Loader2 className="animate-spin text-gray-400" size={40}/>
                        ) : logoUrl ? (
                            <Image src={logoUrl} fill className="object-contain p-4" alt="Logo"/>
                        ) : (
                            <ImageIcon className="text-gray-300" size={40}/>
                        )}
                        
                        {/* Overlay Upload */}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white font-bold backdrop-blur-sm">
                            <UploadCloud size={24} className="mb-2"/>
                            Modifier
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                        </label>
                    </div>
                    
                    <h3 className="font-bold text-lg text-gray-800">Logo Officiel</h3>
                    <p className="text-xs text-gray-400 mt-1">Format carré recommandé. Auto-converti en WebP.</p>
                 </div>

                 {/* CARTE STATUT */}
                 <div className={`backdrop-blur-2xl border shadow-xl rounded-[32px] p-6 transition-all duration-500 ${isOpen ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-full ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                <Power size={20}/>
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isOpen ? 'text-green-800' : 'text-red-800'}`}>{isOpen ? 'OUVERT' : 'FERMÉ'}</h3>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            className={`w-16 h-9 rounded-full relative transition-colors duration-300 ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 ${isOpen ? 'left-8' : 'left-1'}`}/>
                        </button>
                    </div>
                    <p className={`text-sm font-medium ${isOpen ? 'text-green-700' : 'text-red-700'}`}>
                        {isOpen ? "Les clients peuvent commander." : "L'application affiche 'Fermé'."}
                    </p>
                 </div>
            </div>

            {/* COLONNE DROITE : INFO & COULEURS */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* CARTE INFORMATIONS GÉNÉRALES */}
                <div className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[32px] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><Store size={24}/></div>
                        <h2 className="text-xl font-bold text-gray-900">Informations Générales</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                                <Type size={14}/> Nom du Restaurant
                            </label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold text-lg transition"
                                placeholder="Ex: Universal Eats"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                                <FileText size={14}/> Slogan / Description
                            </label>
                            <textarea 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium h-24 resize-none transition"
                                placeholder="Ex: Les meilleurs burgers de Casablanca..."
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                                <Truck size={14}/> Frais de Livraison Fixes (DH)
                            </label>
                            <div className="relative max-w-xs">
                                <input 
                                    type="number" 
                                    value={deliveryFee}
                                    onChange={(e) => setDeliveryFee(e.target.value)}
                                    className="w-full pl-4 pr-12 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none font-bold text-xl transition"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">DH</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARTE BRANDING */}
                <div className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl rounded-[32px] p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-700 rounded-xl"><Palette size={24}/></div>
                        <h2 className="text-xl font-bold text-gray-900">Charte Graphique (App Client)</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Couleur Principale</label>
                            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                                <input 
                                    type="color" 
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-12 h-12 rounded-xl border-none cursor-pointer"
                                />
                                <div className="flex-1">
                                    <div className="text-xs text-gray-400 font-bold">HEX CODE</div>
                                    <input 
                                        type="text" 
                                        value={primaryColor} 
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="font-mono font-bold text-gray-800 bg-transparent outline-none w-full uppercase"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 ml-1">Utilisée pour les boutons et les fonds.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Couleur Secondaire</label>
                            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
                                <input 
                                    type="color" 
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="w-12 h-12 rounded-xl border-none cursor-pointer"
                                />
                                <select 
                                    value={secondaryColor} 
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="flex-1 bg-transparent font-bold text-gray-800 outline-none"
                                >
                                    <option value="#000000">Noir (#000000)</option>
                                    <option value="#FFFFFF">Blanc (#FFFFFF)</option>
                                </select>
                            </div>
                             <p className="text-xs text-gray-400 mt-2 ml-1">Utilisée pour le texte sur les zones colorées.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>

      </div>
    </div>
  )
}