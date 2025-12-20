'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Printer, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // Tu devras peut-être installer ça : npm install qrcode.react

export default function QrCodesPage() {
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('STORE_MANAGER');

  useEffect(() => {
    fetchStoreInfo();
  }, []);

  const fetchStoreInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single();
    
    if (profile) {
        setRole(profile.role);
        if (profile.store_id) {
            const { data: st } = await supabase.from('stores').select('*').eq('id', profile.store_id).single();
            setStore(st);
        }
    }
    setLoading(false);
  };

  // URL DE TON APP CLIENT (À changer plus tard par la vraie URL de prod)
  // Pour l'instant, ça simule un lien qui ouvre l'app avec le bon store
  const generateDeepLink = (storeId: string) => {
    return `universaleats://store/${storeId}`; 
    // Ou si c'est une Web App : `https://ton-app.com/store/${storeId}`
  };

  if (loading) return <div className="p-10">Chargement...</div>;

  if (role === 'SUPER_ADMIN') {
      return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Générateur QR Codes</h1>
            <p className="text-gray-500">En tant que Super Admin, allez dans la section "Points de Vente" pour voir les QR codes spécifiques de chaque restaurant.</p>
        </div>
      );
  }

  if (!store) return <div className="p-10">Aucun point de vente assigné à ce compte.</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-lg w-full border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Scannez pour commander</h1>
        <p className="text-gray-500 mb-8">Table / Comptoir • {store.name}</p>

        <div className="bg-white p-4 rounded-xl border-4 border-black inline-block mb-8">
            {/* Génération du QR Code */}
            <QRCodeSVG 
                value={generateDeepLink(store.id)} 
                size={250}
                level={"H"}
                includeMargin={true}
            />
        </div>

        <div className="flex gap-4 justify-center">
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition"
            >
                <Printer size={20} /> Imprimer
            </button>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-100 text-xs text-gray-400">
            ID Point de Vente : {store.id}
        </div>
      </div>

    </div>
  );
}