'use client';

import { useEffect, useState } from 'react';

interface OrdersMapProps {
  latitude?: number | null;
  longitude?: number | null;
}

export default function OrdersMap({ latitude, longitude }: OrdersMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  const defaultLat = 30.4278; // Agadir
  const defaultLng = -9.5981;

  const targetLat = latitude || defaultLat;
  const targetLng = longitude || defaultLng;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
        Chargement de la carte...
      </div>
    );
  }

  return (
    <div className="h-full w-full relative z-0 bg-slate-200 overflow-hidden rounded-xl">
      {/* Fond de carte simulé (Remplacez par <MapContainer> de Leaflet plus tard) */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-cover bg-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
        style={{ backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Agadir_map.png')" }}
      >
        <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl text-center border border-white/50">
           <p className="font-bold text-slate-900 text-lg">📍 Position GPS</p>
           <div className="flex gap-4 mt-2 font-mono text-sm text-blue-600 font-bold">
             <span>Lat: {targetLat.toFixed(5)}</span>
             <span>Lng: {targetLng.toFixed(5)}</span>
           </div>
        </div>
      </div>
      
      {/* Marqueur animé */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-red-600 border-2 border-white shadow-lg"></span>
        </span>
      </div>
    </div>
  );
}