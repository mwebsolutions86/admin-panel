'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Store, Shield, KeyRound, Lock, UserCog, Edit, User } from 'lucide-react';
import PinManagementModal from '@/components/PinManagementModal';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États Modales
  const [showModal, setShowModal] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id: string, name: string} | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // État Édition
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire (Création / Édition)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '', 
    role: 'STORE_MANAGER', // Valeur par défaut
    storeId: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Récupérer le rôle actuel
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      setCurrentUserRole(currentProfile?.role || null);
    }

    // 2. Récupérer profils
    const { data: profiles } = await supabase
      .from('profiles')
      .select(`*, stores ( name )`)
      .order('created_at', { ascending: false });

    // 3. Récupérer magasins
    const { data: storeList } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);

    if (profiles) setUsers(profiles);
    if (storeList) setStores(storeList);
    setLoading(false);
  };

  // --- LOGIQUE D'AUTORISATION ---
  const canEdit = (role: string | null) => {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'BRAND_OWNER';
  };

  const userCanEdit = canEdit(currentUserRole);

  // --- GESTION FORMULAIRE ---

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ fullName: '', email: '', password: '', role: 'CASHIER', storeId: '', phone: '' }); // Par défaut Caissier c'est pratique
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setIsEditing(true);
    setEditingId(user.id);
    setFormData({
      fullName: user.full_name || '',
      email: user.email || '',
      password: '', 
      role: user.role || 'CASHIER',
      storeId: user.store_id || '',
      phone: user.phone || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing ? { ...formData, id: editingId } : formData;

      const response = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      alert(isEditing ? "Utilisateur modifié !" : "Utilisateur créé !");
      setShowModal(false);
      fetchData(); 

    } catch (error: any) {
      alert("Erreur: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) {
      setUsers(users.filter(u => u.id !== id));
    } else {
      alert("Erreur suppression.");
    }
  };

  const handleOpenPinModal = (user: any) => {
    setSelectedUser({ id: user.id, name: user.full_name || user.email });
    setIsPinModalOpen(true);
  };

  // Helper pour l'affichage des badges de rôle
  const getRoleBadge = (role: string) => {
    switch (role) {
        case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'STORE_MANAGER': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'CASHIER': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'DRIVER': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
        case 'SUPER_ADMIN': return 'Super Admin';
        case 'STORE_MANAGER': return 'Manager';
        case 'CASHIER': return 'Caissier';
        case 'DRIVER': return 'Livreur';
        default: return role;
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Équipe & Accès</h1>
          <p className="text-gray-500 mt-1">Gérez les comptes Caissiers, Managers et Livreurs</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition shadow-lg"
        >
          <Plus size={20} />
          Ajouter un membre
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
                <th className="p-4 text-gray-600 font-semibold">Email / Tel</th>
                <th className="p-4 text-gray-600 font-semibold">Rôle</th>
                <th className="p-4 text-gray-600 font-semibold">Affectation</th>
                <th className="p-4 text-gray-600 font-semibold">Accès POS</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                      {user.full_name?.charAt(0) || <User size={16}/>}
                    </div>
                    {user.full_name}
                  </td>
                  <td className="p-4 text-gray-500">
                    <div className="flex flex-col">
                        <span>{user.email}</span>
                        <span className="text-xs text-gray-400">{user.phone}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadge(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {user.role === 'SUPER_ADMIN' ? (
                      <span className="flex items-center gap-1 text-purple-600"><Shield size={14}/> Global</span>
                    ) : (
                      <span className="flex items-center gap-1"><Store size={14}/> {user.stores?.name || 'Non assigné'}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {user.pos_pin ? (
                      <div className="flex items-center text-green-600 text-sm font-medium">
                        <Lock size={14} className="mr-1.5" /> Actif
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm italic">--</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Bouton PIN */}
                      <button 
                        onClick={() => handleOpenPinModal(user)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition ${user.pos_pin ? 'text-blue-600 hover:bg-blue-50' : 'text-orange-600 bg-orange-50 hover:bg-orange-100'}`}
                        title="Gérer le Code PIN"
                      >
                         <KeyRound size={14} /> PIN
                      </button>

                      {/* Bouton Modifier */}
                      {userCanEdit && (
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      )}

                      <button onClick={() => deleteUser(user.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALE FORMULAIRE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? 'Modifier Utilisateur' : 'Nouveau Membre'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet</label>
                <input type="text" required className="w-full p-2 border rounded-lg" 
                  value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" required className="w-full p-2 border rounded-lg" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone (Optionnel)</label>
                <input type="text" className="w-full p-2 border rounded-lg" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {isEditing ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe'}
                </label>
                <input type={isEditing ? "text" : "password"} 
                  required={!isEditing} 
                  className="w-full p-2 border rounded-lg" 
                  placeholder={isEditing ? "********" : "********"}
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rôle</label>
                  <select className="w-full p-2 border rounded-lg" 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="CASHIER">Caissier</option>
                    <option value="STORE_MANAGER">Manager</option>
                    <option value="DRIVER">Livreur</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                
                {formData.role !== 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Magasin</label>
                    <select className="w-full p-2 border rounded-lg" 
                      value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}>
                      <option value="">Choisir...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-bold">
                  {submitting ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Créer')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODALE PIN */}
      {selectedUser && (
        <PinManagementModal 
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          userId={selectedUser.id}
          userName={selectedUser.name}
          onSuccess={fetchData} 
        />
      )}
    </div>
  );
}