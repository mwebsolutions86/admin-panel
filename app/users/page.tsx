'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, User, Store, Shield } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STORE_MANAGER',
    storeId: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Récupérer les profils et leurs magasins
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`
        *,
        stores ( name )
      `)
      .order('created_at', { ascending: false });

    // 2. Récupérer la liste des magasins pour le select
    const { data: storeList } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);

    if (profiles) setUsers(profiles);
    if (storeList) setStores(storeList);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Appel à notre API serveur
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      alert("Utilisateur créé avec succès !");
      setShowModal(false);
      setFormData({ fullName: '', email: '', password: '', role: 'STORE_MANAGER', storeId: '' });
      fetchData(); // Rafraîchir la liste

    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Attention : Supprimer cet utilisateur ? Il ne pourra plus se connecter.")) return;
    
    // Note: Pour supprimer proprement, il faudrait aussi une API route pour supprimer de Auth
    // Pour l'instant on supprime du profil, ce qui bloquera l'accès à l'appli Admin
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
        setUsers(users.filter(u => u.id !== id));
    } else {
        alert("Erreur suppression.");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Équipe & Accès</h1>
            <p className="text-gray-500 mt-1">Gérez les comptes Managers et Administrateurs</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition shadow-lg"
        >
          <Plus size={20} />
          Ajouter un utilisateur
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 text-gray-600 font-semibold">Nom</th>
                        <th className="p-4 text-gray-600 font-semibold">Email</th>
                        <th className="p-4 text-gray-600 font-semibold">Rôle</th>
                        <th className="p-4 text-gray-600 font-semibold">Affectation</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                    {user.full_name?.charAt(0) || '?'}
                                </div>
                                {user.full_name}
                            </td>
                            <td className="p-4 text-gray-500">{user.email}</td>
                            <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="p-4 text-gray-600">
                                {user.role === 'SUPER_ADMIN' ? (
                                    <span className="flex items-center gap-1 text-purple-600"><Shield size={14}/> Accès Global</span>
                                ) : (
                                    <span className="flex items-center gap-1"><Store size={14}/> {user.stores?.name || 'Non assigné'}</span>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                <button onClick={() => deleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-2">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* MODALE D'AJOUT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Nouvel Utilisateur</h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Nom complet</label>
                        <input type="text" required className="w-full p-2 border rounded-lg" 
                            value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email (Identifiant)</label>
                        <input type="email" required className="w-full p-2 border rounded-lg" 
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Mot de passe provisoire</label>
                        <input type="text" required className="w-full p-2 border rounded-lg" placeholder="ex: Agadir2025" 
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Rôle</label>
                            <select className="w-full p-2 border rounded-lg" 
                                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="STORE_MANAGER">Manager</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>
                        
                        {formData.role === 'STORE_MANAGER' && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Magasin</label>
                                <select required className="w-full p-2 border rounded-lg" 
                                    value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}>
                                    <option value="">Choisir...</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                        <button type="submit" disabled={creating} className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-bold">
                            {creating ? 'Création...' : 'Créer le compte'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
      )}
    </div>
  );
}