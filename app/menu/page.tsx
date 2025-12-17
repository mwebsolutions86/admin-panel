'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { 
  Plus, Edit3, Trash2, X, Save, Tag, Layers, 
  Image as ImageIcon, Loader2, UploadCloud, Search, Sparkles, AlertCircle, CheckCircle2 
} from 'lucide-react'

// --- TYPES ---
interface ProductOption { name: string; price: number; }
interface Product { id: string; name: string; description: string; price: number; image_url: string; category_id: string; ingredients: string[]; options_config: ProductOption[]; }
interface Category { id: string; name: string; image_url: string | null; products: Product[]; rank?: number; }

// --- TOAST SYSTEM ---
interface Toast { id: number; message: string; type: 'success' | 'error'; }

export default function MenuLab() {
  // Data States
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(0)

  // UI States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'product' | 'category'>('product')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([])

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null)
  const [targetCatId, setTargetCatId] = useState<string | null>(null)

  // Form States
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formIngredients, setFormIngredients] = useState<string[]>([])
  const [formOptions, setFormOptions] = useState<ProductOption[]>([])
  
  // Temp Inputs
  const [newIngredient, setNewIngredient] = useState('')
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionPrice, setNewOptionPrice] = useState('')
  const [uploading, setUploading] = useState(false)

  // --- NOTIFICATION SYSTEM ---
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // --- CHARGEMENT ---
  useEffect(() => {
    const fetchMenuData = async () => {
      const { data: store } = await supabase.from('stores').select('brand_id').limit(1).single()
      
      if(store) {
          const { data, error } = await supabase
            .from('categories')
            .select('*, products(*)')
            .eq('brand_id', store.brand_id)
            .order('rank', { ascending: true })
          
          if (!error && data) {
            const sortedData = data.map((cat: Category) => ({
              ...cat,
              products: cat.products ? cat.products.sort((a: Product, b: Product) => a.name.localeCompare(b.name)) : []
            }))
            setCategories(sortedData)
            // Sélection automatique de la première catégorie si aucune n'est sélectionnée
            setSelectedCategory(prev => prev || sortedData[0]?.id || null)
          }
      }
      setLoading(false)
    }
    fetchMenuData()
  }, [lastUpdated])

  // --- MODAL HANDLERS ---
  const openProductModal = (product?: Product, categoryId?: string) => {
    setModalMode('product')
    setEditingId(product?.id || null)
    setTargetCatId(categoryId || null)
    
    setFormName(product?.name || '')
    setFormDesc(product?.description || '')
    setFormPrice(product?.price?.toString() || '')
    setFormImage(product?.image_url || '')
    setFormIngredients(product?.ingredients || [])
    setFormOptions(product?.options_config || [])
    
    setIsModalOpen(true)
  }

  const openCategoryModal = (category?: Category) => {
    setModalMode('category')
    setEditingId(category?.id || null)
    
    setFormName(category?.name || '')
    setFormImage(category?.image_url || '')
    setFormDesc('')
    setFormPrice('')
    
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setTargetCatId(null)
  }

  // --- CRUD ACTIONS ---
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];

    try {
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(imageBitmap, 0, 0);
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
        if (!blob) throw new Error("Conversion échouée");

        const fileName = `${modalMode}-${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/webp', upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setFormImage(publicUrl);
        notify("Image traitée et uploadée !", "success");
    } catch (error) {
        console.error(error);
        notify("Erreur lors de l'upload image", "error");
    } finally {
        setUploading(false);
    }
  }

  const handleSave = async () => {
    if (!formName) return notify("Le nom est obligatoire", "error");

    if (modalMode === 'category') await saveCategory();
    else await saveProduct();
  }

  const saveCategory = async () => {
     const { data: store } = await supabase.from('stores').select('brand_id').limit(1).single()
     if (!store) return;

     const payload = { 
         name: formName, 
         image_url: formImage,
         brand_id: store.brand_id 
     }

     let error;
     if (editingId) {
         const res = await supabase.from('categories').update(payload).eq('id', editingId)
         error = res.error
     } else {
         const res = await supabase.from('categories').insert({ ...payload, rank: categories.length + 1 })
         error = res.error
     }

     if (error) notify(error.message, "error")
     else {
         notify(editingId ? "Catégorie mise à jour" : "Nouvelle catégorie créée", "success")
         setLastUpdated(Date.now())
         handleCloseModal()
     }
  }

  const saveProduct = async () => {
      if (!formPrice) return notify("Le prix est obligatoire", "error");
      
      const payload = {
        name: formName, description: formDesc, price: parseFloat(formPrice),
        image_url: formImage, ingredients: formIngredients, options_config: formOptions,
        category_id: editingId ? undefined : targetCatId 
      }

      let error;
      if (editingId) {
        const res = await supabase.from('products').update(payload).eq('id', editingId)
        error = res.error
      } else {
        const res = await supabase.from('products').insert({ ...payload, category_id: targetCatId })
        error = res.error
      }

      if (error) notify(error.message, "error")
      else {
         notify(editingId ? "Produit mis à jour" : "Produit créé", "success")
         setLastUpdated(Date.now())
         handleCloseModal()
      }
  }

  const handleDelete = async (id: string, type: 'product' | 'category') => {
      if(!confirm("Êtes-vous sûr ?")) return;
      const table = type === 'product' ? 'products' : 'categories';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) notify(error.message, "error");
      else {
          notify("Élément supprimé définitivement", "success");
          setLastUpdated(Date.now());
          if(type === 'category' && selectedCategory === id) setSelectedCategory(null);
      }
  }

  const addIngredient = () => { if(newIngredient.trim()) { setFormIngredients([...formIngredients, newIngredient.trim()]); setNewIngredient('') } }
  const removeIngredient = (i: number) => setFormIngredients(formIngredients.filter((_, idx) => idx !== i))
  const addOption = () => { if(newOptionName.trim() && newOptionPrice) { setFormOptions([...formOptions, {name: newOptionName.trim(), price: parseFloat(newOptionPrice)}]); setNewOptionName(''); setNewOptionPrice('') } }
  const removeOption = (i: number) => setFormOptions(formOptions.filter((_, idx) => idx !== i))

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative overflow-hidden font-sans text-slate-800 selection:bg-blue-100">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply"></div>

      {/* TOASTS CONTAINER */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300 bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-black/5 p-4 rounded-2xl flex items-center gap-3 min-w-[300px]">
                {toast.type === 'success' ? <CheckCircle2 className="text-green-500" size={24} /> : <AlertCircle className="text-red-500" size={24} />}
                <div>
                    <p className="font-bold text-sm">{toast.type === 'success' ? 'Succès' : 'Erreur'}</p>
                    <p className="text-xs text-gray-500">{toast.message}</p>
                </div>
            </div>
        ))}
      </div>

      <div className="relative z-10 flex h-screen max-w-[1920px] mx-auto p-4 md:p-6 gap-6">
        
        {/* SIDEBAR : CATÉGORIES */}
        <div className="w-80 flex flex-col gap-4 h-full">
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-[32px] p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 to-gray-600">
                        Labo Menu
                    </h2>
                    <button onClick={() => openCategoryModal()} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg shadow-black/20">
                        <Plus size={20}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {loading ? <div className="text-center py-10 text-gray-400">Chargement...</div> : categories.map(cat => (
                        <div 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-300 border ${selectedCategory === cat.id ? 'bg-white shadow-xl shadow-blue-900/5 border-white scale-100' : 'bg-transparent border-transparent hover:bg-white/40 hover:scale-[1.02]'}`}
                        >
                             <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative shadow-inner">
                                     {cat.image_url ? <Image src={cat.image_url} alt={cat.name} fill className="object-cover" /> : <Layers className="m-auto text-gray-400 mt-3" size={20}/>}
                                 </div>
                                 <div className="flex-1">
                                     <h3 className={`font-bold text-sm ${selectedCategory === cat.id ? 'text-black' : 'text-gray-600'}`}>{cat.name}</h3>
                                     <p className="text-xs text-gray-400">{cat.products.length} items</p>
                                 </div>
                             </div>
                             
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                 <button onClick={(e) => {e.stopPropagation(); openCategoryModal(cat)}} className="p-2 bg-white rounded-full shadow-sm text-blue-600 hover:bg-blue-50"><Edit3 size={14}/></button>
                                 <button onClick={(e) => {e.stopPropagation(); handleDelete(cat.id, 'category')}} className="p-2 bg-white rounded-full shadow-sm text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* MAIN AREA : PRODUITS */}
        <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
            
            {/* Toolbar */}
            <div className="h-20 bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-[32px] px-8 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3 text-gray-500 bg-white/50 px-4 py-2 rounded-full border border-white/20 w-96 transition-all focus-within:w-[450px] focus-within:bg-white focus-within:shadow-md">
                     <Search size={18} />
                     <input 
                        type="text" 
                        placeholder="Rechercher un plat, un ingrédient..." 
                        className="bg-transparent border-none outline-none text-sm w-full font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                 </div>
                 
                 {selectedCategory && (
                     <button 
                        onClick={() => openProductModal(undefined, selectedCategory)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all flex items-center gap-2"
                     >
                        <Sparkles size={18}/> Créer dans {categories.find(c => c.id === selectedCategory)?.name}
                     </button>
                 )}
            </div>

            {/* Grid Produits */}
            <div className="flex-1 overflow-y-auto pr-4 pb-20 custom-scrollbar">
                {selectedCategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categories.find(c => c.id === selectedCategory)?.products
                            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(product => (
                            <div 
                                key={product.id} 
                                className="group relative bg-white/70 backdrop-blur-md border border-white/50 p-4 rounded-[28px] shadow-sm hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="h-48 w-full bg-gray-100 rounded-[20px] overflow-hidden relative shadow-inner mb-4 group-hover:scale-[1.02] transition-transform duration-500">
                                    {product.image_url ? (
                                        <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"/>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={40}/></div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-black text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                                        {product.price} DH
                                    </div>
                                </div>

                                <div className="px-2 pb-2">
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 h-10">{product.description || "Aucune description"}</p>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => openProductModal(product)} 
                                            className="flex-1 bg-gray-100 hover:bg-black hover:text-white text-gray-700 font-bold py-2 rounded-xl text-sm transition-colors"
                                        >
                                            Éditer
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(product.id, 'product')} 
                                            className="w-10 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Layers size={64} className="mb-4 opacity-20"/>
                        <p className="text-lg font-medium">Sélectionnez une catégorie pour commencer</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* --- MODALE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-[4px] p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white/80 backdrop-blur-2xl border border-white/60 w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl shadow-black/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                style={{ boxShadow: '0 0 80px -20px rgba(0,0,0,0.1)' }}
            >
                {/* Header Modale */}
                <div className="p-8 border-b border-gray-200/50 flex justify-between items-center bg-white/40">
                    <div>
                        <span className="text-xs font-bold tracking-wider text-blue-600 uppercase mb-1 block">
                            {modalMode === 'category' ? 'Configuration Rayon' : 'Laboratoire Produit'}
                        </span>
                        <h2 className="text-3xl font-black text-gray-900">
                            {editingId ? `Modifier : ${formName}` : (modalMode === 'category' ? 'Nouvelle Catégorie' : 'Nouveau Plat')}
                        </h2>
                    </div>
                    <button onClick={handleCloseModal} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                        <X size={24} className="text-gray-600"/>
                    </button>
                </div>

                {/* Body Modale */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white/30">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* GAUCHE : VISUEL */}
                        <div className="w-full lg:w-1/3 flex flex-col gap-4">
                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Visuel {modalMode === 'category' ? 'Catégorie' : 'Produit'}</label>
                            <div className="aspect-square bg-gray-50 rounded-[30px] border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden relative group transition-colors hover:border-blue-400 hover:bg-blue-50">
                                {uploading ? (
                                    <Loader2 className="animate-spin text-blue-500" size={40}/>
                                ) : formImage ? (
                                    <Image src={formImage} fill className="object-cover" alt="Preview"/>
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto text-gray-300 mb-2" size={40}/>
                                        <p className="text-xs text-gray-400 font-medium">Aucune image</p>
                                    </div>
                                )}
                                
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold backdrop-blur-sm">
                                    <UploadCloud className="mr-2"/> {uploading ? 'Traitement...' : 'Changer'}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading}/>
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center">Format optimisé automatiquement en WebP.</p>
                        </div>

                        {/* DROITE : DONNÉES */}
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nom de l&apos;élément</label>
                                    <input type="text" className="w-full p-4 bg-white/60 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-lg" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Double Cheese..."/>
                                </div>
                                
                                {modalMode === 'product' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Prix (DH)</label>
                                            <input type="number" className="w-full p-4 bg-white/60 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-xl" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00"/>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                            <textarea className="w-full p-4 bg-white/60 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition h-24 resize-none" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Une description alléchante..."/>
                                        </div>

                                        {/* INGREDIENTS */}
                                        <div className="col-span-2 bg-white/50 p-6 rounded-[24px] border border-white">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Tag size={16} className="text-orange-500"/> Ingrédients (Exclusibles)</label>
                                            <div className="flex gap-2 mb-3">
                                                <input type="text" className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400" placeholder="Ajouter ingrédient..." value={newIngredient} onChange={e => setNewIngredient(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIngredient()}/>
                                                <button onClick={addIngredient} className="bg-orange-100 text-orange-700 px-4 rounded-xl font-bold hover:bg-orange-200 transition">+</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {formIngredients.map((ing, i) => (
                                                    <span key={i} className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                                                        {ing}
                                                        <button onClick={() => removeIngredient(i)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                                    </span>
                                                ))}
                                                {formIngredients.length === 0 && <span className="text-xs text-gray-400 italic">Aucun ingrédient défini.</span>}
                                            </div>
                                        </div>

                                        {/* OPTIONS */}
                                        <div className="col-span-2 bg-white/50 p-6 rounded-[24px] border border-white">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><Layers size={16} className="text-purple-500"/> Options & Suppléments</label>
                                            <div className="flex gap-2 mb-3">
                                                <input type="text" className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400" placeholder="Nom option..." value={newOptionName} onChange={e => setNewOptionName(e.target.value)}/>
                                                <input type="number" className="w-24 p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400" placeholder="Prix" value={newOptionPrice} onChange={e => setNewOptionPrice(e.target.value)}/>
                                                <button onClick={addOption} className="bg-purple-100 text-purple-700 px-4 rounded-xl font-bold hover:bg-purple-200 transition">+</button>
                                            </div>
                                            <div className="space-y-2">
                                                {formOptions.map((opt, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                        <span className="font-medium text-sm">{opt.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">+{opt.price} DH</span>
                                                            <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                 {formOptions.length === 0 && <span className="text-xs text-gray-400 italic">Aucune option définie.</span>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Modale */}
                <div className="p-6 border-t border-gray-200/50 bg-white/60 backdrop-blur-md flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Annuler</button>
                    <button onClick={handleSave} disabled={uploading} className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-900 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100">
                        {uploading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        {editingId ? 'Sauvegarder les modifications' : 'Créer maintenant'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}