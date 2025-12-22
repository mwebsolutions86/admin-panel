'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Users, Plus, Search, Phone, Wallet, Trash2, 
  MapPin, CircleDot, Loader2, AlertTriangle, Bike 
} from 'lucide-react'

// Types locaux pour l'affichage
type Driver = {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: 'ONLINE' | 'OFFLINE' | 'BUSY'
  wallet_balance: number
  avatar_url: string | null
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)

  // Formulaire d'ajout
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  })

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'DRIVER')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setDrivers(data as any)
    }
    setLoading(false)
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: 'DRIVER',
          storeId: null // Pour l'instant, livreurs globaux (flotte)
        })
      })

      const json = await res.json()
      
      if (!res.ok) throw new Error(json.error)

      setShowModal(false)
      setFormData({ fullName: '', email: '', phone: '', password: '' })
      fetchDrivers() // Rafraîchir la liste
      alert("Livreur créé avec succès ! 🛵")

    } catch (error: any) {
      alert("Erreur: " + error.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce livreur ? Cette action est irréversible.")) return

    // Note : Supabase Auth ne peut être supprimé que via l'API Admin, 
    // ici on supprime juste le profil pour l'affichage MVP.
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    
    if (error) alert("Erreur lors de la suppression")
    else fetchDrivers()
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Bike size={32} className="text-blue-600"/> 
            Flotte Livreurs
          </h1>
          <p className="text-slate-500 mt-1">Gérez vos coursiers, suivez leur statut et leur solde cash.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-slate-200"
        >
          <Plus size={20} /> Nouveau Livreur
        </button>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-700"><CircleDot size={24}/></div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase">En Ligne</div>
                <div className="text-2xl font-black">{drivers.filter(d => d.status === 'ONLINE').length}</div>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-xl text-orange-700"><Bike size={24}/></div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase">En Course</div>
                <div className="text-2xl font-black">{drivers.filter(d => d.status === 'BUSY').length}</div>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-700"><Wallet size={24}/></div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase">Cash Flotte</div>
                <div className="text-2xl font-black">
                    {drivers.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0).toFixed(0)} <span className="text-sm font-normal text-slate-400">DH</span>
                </div>
            </div>
         </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={40}/></div>
        ) : drivers.length === 0 ? (
           <div className="p-20 text-center text-slate-400">Aucun livreur enregistré.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-6">Livreur</th>
                  <th className="p-6">Contact</th>
                  <th className="p-6">Statut</th>
                  <th className="p-6">Wallet (Cash)</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {driver.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{driver.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{driver.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={14}/> {driver.phone || 'Non renseigné'}
                            </div>
                            <div className="text-xs text-slate-400">{driver.email}</div>
                        </div>
                    </td>
                    <td className="p-6">
                        <span className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                            ${driver.status === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-100' : 
                              driver.status === 'BUSY' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                              'bg-slate-100 text-slate-500 border-slate-200'}
                        `}>
                            <div className={`w-2 h-2 rounded-full ${driver.status === 'ONLINE' ? 'bg-green-500' : driver.status === 'BUSY' ? 'bg-orange-500' : 'bg-slate-400'}`} />
                            {driver.status === 'ONLINE' ? 'Disponible' : driver.status === 'BUSY' ? 'En course' : 'Hors ligne'}
                        </span>
                    </td>
                    <td className="p-6">
                        <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${driver.wallet_balance > 500 ? 'text-red-600' : 'text-slate-700'}`}>
                                {driver.wallet_balance} DH
                            </span>
                            {/* CORRECTION : On enveloppe l'icône dans un div pour le titre */}
                            {driver.wallet_balance > 500 && (
                                <div title="Plafond Cash dépassé !">
                                    <AlertTriangle size={16} className="text-red-500" />
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="p-6 text-right">
                        <button 
                            onClick={() => handleDelete(driver.id)}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
                            title="Supprimer"
                        >
                            <Trash2 size={18} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE D'AJOUT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Nouveau Livreur</h2>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" size={24}/></button>
                </div>
                
                <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nom complet</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                            placeholder="Ex: Karim Benali"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone</label>
                        <input 
                            required
                            type="tel" 
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                            placeholder="Ex: 06 12 34 56 78"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Email (Identifiant)</label>
                        <input 
                            required
                            type="email" 
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                            placeholder="livreur@universaleats.com"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Mot de passe provisoire</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition bg-slate-50 font-mono text-sm"
                            placeholder="Au moins 6 caractères"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={creating}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                        >
                            {creating ? <Loader2 className="animate-spin"/> : "Créer le compte"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  )
}