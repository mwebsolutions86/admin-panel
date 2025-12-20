'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, Upload, Palette, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Données de la marque
  const [brandId, setBrandId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    name: '',
    primary_color: '#000000',
    secondary_color: '#ffffff',
    logo_url: ''
  });

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const fetchBrandSettings = async () => {
    try {
      // On récupère la marque principale
      const { data: brand, error } = await supabase
        .from('brands')
        .select('*')
        .limit(1)
        .single();

      if (brand) {
        setBrandId(brand.id);
        // On remplit le formulaire. Si la config JSON existe, on l'utilise, sinon valeurs par défaut
        const theme = brand.theme_config || {};
        setSettings({
          name: brand.name,
          primary_color: theme.primaryColor || '#000000',
          secondary_color: theme.secondaryColor || '#ffffff',
          logo_url: brand.logo_url || ''
        });
      }
    } catch (err) {
      console.error("Erreur chargement settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Gestion de l'upload d'image (Logo)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `brand-logo-${Date.now()}.${fileExt}`;
    const filePath = `images/${fileName}`;

    try {
      // 1. Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('images') // Assure-toi d'avoir un bucket nommé "images" public
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Récupérer l'URL publique
      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      
      setSettings(prev => ({ ...prev, logo_url: data.publicUrl }));

    } catch (error) {
      alert("Erreur lors de l'upload de l'image. Vérifiez que le bucket 'images' existe et est public.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;
    setSaving(true);

    try {
      // ÉTAPE 1 : Mettre à jour la table BRANDS (La source de vérité)
      const themeConfig = {
        primaryColor: settings.primary_color,
        secondaryColor: settings.secondary_color,
        borderRadius: '12px' // On peut ajouter d'autres configs globales ici
      };

      const { error: brandError } = await supabase
        .from('brands')
        .update({
          name: settings.name,
          logo_url: settings.logo_url,
          theme_config: themeConfig
        })
        .eq('id', brandId);

      if (brandError) throw brandError;

      // ÉTAPE 2 : PROPAGATION (La partie magique)
      // On met à jour TOUS les magasins liés à cette marque pour qu'ils aient les mêmes couleurs/logo
      // C'est ce qui permet de tout changer d'un coup.
      const { error: storesError } = await supabase
        .from('stores')
        .update({
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          logo_url: settings.logo_url
        })
        .eq('brand_id', brandId);

      if (storesError) throw storesError;

      alert("Paramètres globaux mis à jour et appliqués à tous les points de vente !");

    } catch (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Chargement des paramètres...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Paramètres de la Marque</h1>
      <p className="text-gray-500 mb-8">Ces modifications affecteront l'ensemble de votre écosystème (Application & Stores).</p>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE : IDENTITÉ VISUELLE */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ImageIcon size={20} /> Identité
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la Marque</label>
              <input 
                type="text" 
                value={settings.name}
                onChange={e => setSettings({...settings, name: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo Global</label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative">
                  {settings.logo_url ? (
                    <Image 
                        src={settings.logo_url} 
                        alt="Logo" 
                        fill 
                        className="object-contain p-2"
                        // Autoriser les domaines externes dans next.config.js si nécessaire
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">Aucun</span>
                  )}
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>}
                </div>
                <div>
                    <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center gap-2">
                        <Upload size={16} /> Changer le logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <p className="text-xs text-gray-400 mt-2">Recommandé : PNG transparent, 512x512px</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Palette size={20} /> Thème & Couleurs
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Couleur Principale</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="color" 
                            value={settings.primary_color}
                            onChange={e => setSettings({...settings, primary_color: e.target.value})}
                            className="h-12 w-12 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">{settings.primary_color}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Boutons, icônes, en-têtes.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Couleur Secondaire</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="color" 
                            value={settings.secondary_color}
                            onChange={e => setSettings({...settings, secondary_color: e.target.value})}
                            className="h-12 w-12 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                        />
                         <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">{settings.secondary_color}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Fond des cartes, textes inversés.</p>
                </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-lg"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            Appliquer à tout l'écosystème
          </button>
        </div>

        {/* COLONNE DROITE : APERÇU MOBILE */}
        <div className="md:col-span-1">
            <div className="sticky top-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Aperçu Mobile</h3>
                {/* Simulation d'un téléphone */}
                <div className="border-[10px] border-gray-900 rounded-[3rem] overflow-hidden bg-gray-100 shadow-2xl h-[600px] relative">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                    
                    {/* Header App */}
                    <div style={{ backgroundColor: 'white' }} className="pt-12 pb-4 px-4 shadow-sm relative">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xs text-gray-400">Bienvenue chez</div>
                                <div style={{ color: settings.primary_color }} className="font-bold text-lg">{settings.name || 'Marque'}</div>
                            </div>
                            {settings.logo_url && (
                                <img src={settings.logo_url} className="w-10 h-10 rounded-lg border object-cover" style={{ borderColor: settings.primary_color }} />
                            )}
                        </div>
                    </div>

                    {/* Body App Simulation */}
                    <div className="p-4 space-y-4">
                        <div className="h-32 rounded-xl bg-white shadow-sm p-3 flex gap-3">
                            <div className="w-24 h-full bg-gray-200 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div style={{ color: settings.primary_color }} className="h-4 w-3/4 bg-current rounded opacity-20"></div>
                                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                                <div className="mt-4 flex justify-between items-end">
                                    <div className="font-bold">45.00 DH</div>
                                    <div style={{ backgroundColor: settings.primary_color }} className="w-8 h-8 rounded-full flex items-center justify-center text-white">+</div>
                                </div>
                            </div>
                        </div>
                         <div className="h-32 rounded-xl bg-white shadow-sm p-3 flex gap-3">
                             <div className="w-24 h-full bg-gray-200 rounded-lg"></div>
                         </div>
                    </div>

                     {/* Bouton Panier Flottant */}
                     <div className="absolute bottom-6 left-6 right-6">
                        <div style={{ backgroundColor: settings.primary_color, color: settings.secondary_color }} className="p-4 rounded-2xl font-bold text-center shadow-lg">
                            Voir le panier (2)
                        </div>
                     </div>
                </div>
            </div>
        </div>

      </form>
    </div>
  );
}