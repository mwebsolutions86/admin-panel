'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Types pour nos livreurs sur la carte
export interface DriverMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'busy';
  avatar_url?: string | null;
}

interface FleetMapProps {
  drivers: DriverMarker[];
  center?: [number, number];
  zoom?: number;
}

// Import Dynamique de la Map (Crucial pour Next.js)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer), 
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer), 
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker), 
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup), 
  { ssr: false }
);

export default function FleetMap({ drivers, center = [30.4278, -9.5981], zoom = 13 }: FleetMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Icônes personnalisées (simulation car L.icon nécessite window)
  const [Leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    (async () => {
      const L = await import('leaflet');
      setLeaflet(L);
    })();
  }, []);

  if (!isMounted || !Leaflet) {
    return (
      <div className="h-full w-full bg-slate-100 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-2">
         <Loader2 className="animate-spin text-blue-500"/>
         <span className="text-xs font-bold uppercase tracking-widest">Initialisation GPS...</span>
      </div>
    );
  }

  // Création des icônes dynamiques selon le statut
  const getIcon = (status: string) => {
    const color = status === 'online' ? '#10b981' : status === 'busy' ? '#f59e0b' : '#64748b';
    
    // SVG Marker personnalisé
    const svgIcon = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="white" stroke="${color}" stroke-width="4" />
        <circle cx="20" cy="20" r="8" fill="${color}" />
      </svg>
    `;

    return Leaflet.divIcon({
      className: 'custom-icon',
      html: svgIcon,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });
  };

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {drivers.map((driver) => (
          <Marker 
            key={driver.id} 
            position={[driver.lat, driver.lng]}
            icon={getIcon(driver.status)}
          >
            <Popup className="custom-popup">
               <div className="flex items-center gap-3 min-w-[150px]">
                  <div className={`w-2 h-2 rounded-full ${driver.status === 'online' ? 'bg-green-500' : driver.status === 'busy' ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                  <div>
                    <div className="font-bold text-slate-800">{driver.name}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{driver.status === 'online' ? 'Disponible' : driver.status === 'busy' ? 'En course' : 'Hors ligne'}</div>
                  </div>
               </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>

      {/* Légende Flottante */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-white p-3 rounded-xl shadow-xl border border-slate-200 flex flex-col gap-2">
         <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></span> Disponible</div>
         <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-sm"></span> En course</div>
         <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-sm"></span> Hors ligne</div>
      </div>
    </div>
  );
}