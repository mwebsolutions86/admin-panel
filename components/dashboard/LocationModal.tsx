'use client';

import React from 'react';
import { X, MapPin, Phone, User, Navigation } from 'lucide-react';
import { Order } from '@/types';

interface LocationModalProps {
  order: Order;
  onClose: () => void;
}

export default function LocationModal({ order, onClose }: LocationModalProps) {
  
  // LOGIQUE AUTOMATIQUE :
  // 1. Si on a les coordonnées exactes (Lat/Lng), on les utilise.
  // 2. Sinon, on utilise l'adresse écrite (Google va la trouver).
  // 3. Sinon, on centre sur Agadir par défaut.
  const getMapUrl = () => {
    const baseUrl = "https://maps.google.com/maps?output=embed&z=15&q="; // z=15 est le zoom
    
    if (order.latitude && order.longitude) {
      return `${baseUrl}${order.latitude},${order.longitude}`;
    }
    
    if (order.delivery_address) {
      // On encode l'adresse pour qu'elle passe dans l'URL (ex: les espaces deviennent %20)
      return `${baseUrl}${encodeURIComponent(order.delivery_address + ', Agadir, Maroc')}`;
    }

    return `${baseUrl}Agadir, Maroc`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/90 p-2 rounded-full shadow-lg hover:bg-red-50 hover:text-red-500 transition-all">
          <X className="w-6 h-6" />
        </button>

        {/* COLONNE GAUCHE : INFOS */}
        <div className="w-1/3 bg-white p-8 border-r border-slate-100 flex flex-col z-10 shadow-xl">
           <div className="mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-sm">
                 <MapPin size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 leading-tight">Localisation<br/>Client</h2>
              <p className="text-slate-400 font-mono mt-1">Commande #{order.order_number}</p>
           </div>
           
           <div className="space-y-6 flex-1">
              <div className="group">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><User size={12}/> Client</p>
                 <p className="text-lg font-bold text-slate-800">{order.customer_name || 'Anonyme'}</p>
              </div>

              <div className="group">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><MapPin size={12}/> Adresse de livraison</p>
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-medium leading-relaxed">
                    {order.delivery_address || 'Aucune adresse renseignée'}
                 </div>
              </div>

              <div className="group">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Phone size={12}/> Téléphone</p>
                 <a href={`tel:${order.customer_phone}`} className="text-xl font-mono font-bold text-blue-600 hover:underline">
                    {order.customer_phone || '--'}
                 </a>
              </div>
           </div>

           {/* Bouton pour ouvrir dans l'appli GPS du téléphone (Waze/Google Maps App) */}
           <a 
             href={`https://www.google.com/maps/dir/?api=1&destination=${order.latitude ? `${order.latitude},${order.longitude}` : encodeURIComponent(order.delivery_address || '')}`}
             target="_blank"
             rel="noreferrer"
             className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-blue-200 hover:-translate-y-1"
           >
             <Navigation size={20}/> Lancer GPS Externe
           </a>
        </div>

        {/* COLONNE DROITE : CARTE AUTOMATIQUE */}
        <div className="w-2/3 h-full bg-slate-100 relative">
           <iframe
             width="100%"
             height="100%"
             style={{ border: 0 }}
             loading="lazy"
             allowFullScreen
             referrerPolicy="no-referrer-when-downgrade"
             src={getMapUrl()}
             className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-700"
           ></iframe>
           
           {/* Overlay informatif si l'adresse est vide */}
           {!order.delivery_address && !order.latitude && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-xl shadow-xl text-center">
                 <p className="font-bold text-slate-800">Adresse manquante</p>
                 <p className="text-slate-500 text-sm">Impossible de localiser le client.</p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}