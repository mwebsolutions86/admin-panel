'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bike, Plus, Search, Battery, Signal, MapPin, 
  Phone, User, MoreVertical, ShieldAlert, Store
} from 'lucide-react';
import FleetMap, { DriverMarker } from '@/components/fleet-map';
import AddDriverModal from '@/components/dashboard/AddDriverModal';

// On enrichit le type pour inclure le Store
interface DriverProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string; 
  role: string;
  store_id: string | null;
  // Relation Supabase (jointure)
  stores?: { name: string } | null;
  
  battery_level?: number; 
  current_lat?: number;   
  current_lng?: number;   
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchDrivers();

    const channel = supabase
      .channel('fleet-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          const newProfile = payload.new as DriverProfile;
          const isDriver = newProfile.role?.toLowerCase() === 'driver';

          if (isDriver) {
              // Note: le realtime renvoie la ligne brute, on n'a pas le nom du store via la jointure ici
              // Pour simplifier, on recharge tout si ajout, ou on patch intelligemment
              if (payload.eventType === 'INSERT') {
                 fetchDrivers(); // Recharger pour avoir le nom du store propre
              } else if (payload.eventType === 'UPDATE') {
                  setDrivers(prev => prev.map(d => d.id === newProfile.id ? { ...d, ...newProfile } : d));
              }
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    // ✅ ON RÉCUPÈRE LE NOM DU STORE
    const { data } = await supabase
        .from('profiles')
        .select('*, stores(name)') 
        .ilike('role', 'driver');

    if (data) {
        const enrichedDrivers = data.map((d: any) => ({
            ...d,
            status: d.status || 'offline',
            battery_level: Math.floor(Math.random() * (100 - 20) + 20),
            current_lat: 30.42 + (Math.random() * 0.04 - 0.02),
            current_lng: -9.60 + (Math.random() * 0.04 - 0.02),
        }));
        setDrivers(enrichedDrivers);
        
        if(enrichedDrivers.length > 0 && !selectedDriverId) {
            setSelectedDriverId(enrichedDrivers[0].id);
        }
    }
    setLoading(false);
  };

  const filteredDrivers = drivers.filter(d => 
    (d.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (d.phone || '').includes(searchQuery)
  );

  const getNormalizedStatus = (status: string) => {
      const s = status?.toLowerCase();
      if (s === 'online') return 'online';
      if (s === 'busy') return 'busy';
      return 'offline';
  };

  const mapMarkers: DriverMarker[] = drivers.map(d => ({
    id: d.id,
    name: d.full_name || 'Livreur',
    lat: d.current_lat || 30.4278,
    lng: d.current_lng || -9.5981,
    status: getNormalizedStatus(d.status) as 'online' | 'offline' | 'busy'
  }));

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const mapCenter: [number, number] = selectedDriver 
    ? [selectedDriver.current_lat || 30.4278, selectedDriver.current_lng || -9.5981] 
    : [30.4278, -9.5981];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      <AddDriverModal 
         isOpen={isAddModalOpen} 
         onClose={() => setIsAddModalOpen(false)}
         onSuccess={() => { fetchDrivers(); }} 
      />

      <div className="w-96 flex flex-col border-r border-slate-200 bg-white z-10 shadow-xl">
        <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Bike className="text-blue-600"/> FLOTTE ({drivers.length})
                </h1>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95"
                >
                    <Plus size={18}/>
                </button>
            </div>
            
            <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
                <input 
                    type="text" 
                    placeholder="Rechercher un livreur..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {loading ? (
                <div className="p-10 text-center text-slate-400 text-sm font-medium animate-pulse">Chargement de la flotte...</div>
            ) : filteredDrivers.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">Aucun livreur trouvé.</div>
            ) : (
                filteredDrivers.map(driver => {
                    const status = getNormalizedStatus(driver.status);
                    return (
                        <div 
                            key={driver.id}
                            onClick={() => setSelectedDriverId(driver.id)}
                            className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 group ${
                                selectedDriverId === driver.id 
                                ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden border-2 border-white shadow-sm">
                                        <User size={20}/>
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm ${selectedDriverId === driver.id ? 'text-blue-900' : 'text-slate-800'}`}>{driver.full_name || 'Livreur Inconnu'}</h3>
                                        
                                        {/* BADGE D'AFFECTATION (NOUVEAU) */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {driver.store_id && driver.stores ? (
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                    <Store size={8}/> {driver.stores.name}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                    Siège / Global
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-slate-500 pl-1 mt-2">
                                <span className="flex items-center gap-1 font-medium"><Phone size={10}/> {driver.phone || '--'}</span>
                                <span className={`flex items-center gap-1 font-medium ${
                                    (driver.battery_level || 0) < 20 ? 'text-red-500' : 'text-slate-500'
                                }`}>
                                    <Battery size={10}/> {driver.battery_level}%
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-medium flex justify-between">
            <span>En ligne: <b className="text-emerald-600">{drivers.filter(d => getNormalizedStatus(d.status) === 'online').length}</b></span>
            <span>En course: <b className="text-amber-600">{drivers.filter(d => getNormalizedStatus(d.status) === 'busy').length}</b></span>
            <span>Total: <b>{drivers.length}</b></span>
        </div>
      </div>

      <div className="flex-1 relative bg-slate-100">
         <FleetMap 
            drivers={mapMarkers} 
            center={mapCenter}
            zoom={14}
         />
         
         {/* Overlay Détail Livreur */}
         {selectedDriver && (
             <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 w-72 animate-in slide-in-from-right-10 fade-in duration-300">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                        {selectedDriver.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="font-black text-slate-900 text-lg leading-tight">{selectedDriver.full_name}</h2>
                        
                        <div className="flex gap-2 mt-1">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                getNormalizedStatus(selectedDriver.status) === 'online' ? 'bg-emerald-100 text-emerald-700' : getNormalizedStatus(selectedDriver.status) === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {getNormalizedStatus(selectedDriver.status) === 'online' ? 'Disponible' : getNormalizedStatus(selectedDriver.status) === 'busy' ? 'En livraison' : 'Hors ligne'}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Info Store Affecté (Overlay) */}
                {selectedDriver.store_id && selectedDriver.stores && (
                    <div className="mb-4 bg-purple-50 p-2 rounded-lg border border-purple-100 text-center">
                        <div className="text-[9px] font-bold text-purple-400 uppercase flex items-center justify-center gap-1"><Store size={10}/> Affecté à</div>
                        <div className="text-sm font-black text-purple-900">{selectedDriver.stores.name}</div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Courses Jour</div>
                        <div className="text-xl font-black text-slate-800">12</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                         <div className="text-[10px] font-bold text-slate-400 uppercase">Gains</div>
                         <div className="text-xl font-black text-slate-800">450 <span className="text-xs">DH</span></div>
                    </div>
                </div>

                <div className="space-y-2">
                    <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                        <Phone size={16}/> Appeler
                    </button>
                    <button className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                        <MapPin size={16}/> Voir Historique Trajet
                    </button>
                    <button className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                        <ShieldAlert size={16}/> Désactiver Compte
                    </button>
                </div>
             </div>
         )}
      </div>

    </div>
  );
}