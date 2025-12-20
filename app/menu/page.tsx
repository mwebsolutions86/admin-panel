'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { 
  Plus, Edit3, Trash2, X, Save, Tag, Layers, 
  Image as ImageIcon, Loader2, UploadCloud, Search, Sparkles, 
  AlertCircle, CheckCircle2, Wand2, Settings2, Library, Utensils, Leaf
} from 'lucide-react'

// --- TYPES FRONTEND (Interface Utilisateur) ---
interface OptionChoice { id: string; name: string; price: number; is_available: boolean; }
interface OptionGroup { 
  id: string; 
  name: string; 
  min: number; 
  max: number; 
  items: OptionChoice[]; 
}
interface Ingredient { id: string; name: string; is_available: boolean; }
interface Product { 
  id: string; name: string; description: string; price: number; image_url: string; 
  category_id: string; 
  linked_ingredients: string[]; 
  linked_groups: string[]; 
  is_available: boolean; 
}
interface Category { id: string; name: string; image_url: string | null; products: Product[]; rank?: number; }
interface Toast { id: number; message: string; type: 'success' | 'error'; }

export default function MenuLab() {
  // --- STATE NAVIGATION ---
  const [viewMode, setViewMode] = useState<'menu' | 'library'>('menu')
  const [libraryTab, setLibraryTab] = useState<'options' | 'ingredients'>('options')

  // --- STATE DATA ---
  const [categories, setCategories] = useState<Category[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [ingredientsLibrary, setIngredientsLibrary] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(0)

  // --- STATE UI ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'product' | 'category' | 'option_group' | 'ingredient'>('product')
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // --- STATE EDITING ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [targetCatId, setTargetCatId] = useState<string | null>(null)

  // --- STATE FORMS ---
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formIsAvailable, setFormIsAvailable] = useState(true)

  // Relations Produit
  const [formLinkedIngredients, setFormLinkedIngredients] = useState<string[]>([])
  const [formLinkedGroups, setFormLinkedGroups] = useState<string[]>([])

  // Option Group
  const [formGroupMin, setFormGroupMin] = useState(0)
  const [formGroupMax, setFormGroupMax] = useState(1)
  const [formOptionItems, setFormOptionItems] = useState<OptionChoice[]>([])

  // Utils
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // --- NOTIFS ---
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: store } = await supabase.from('stores').select('brand_id').limit(1).single()
      
      if(store) {
          // 1. Catégories & Produits
          const { data: cats } = await supabase
            .from('categories')
            .select('*, products(*)')
            .eq('brand_id', store.brand_id)
            .order('rank', { ascending: true })

          if (cats) {
            const enrichedCats = await Promise.all(cats.map(async (cat: any) => {
                 const productsWithLinks = await Promise.all(cat.products.map(async (p: any) => {
                     const { data: optLinks } = await supabase.from('product_option_links').select('group_id').eq('product_id', p.id);
                     const { data: ingLinks } = await supabase.from('product_ingredients').select('ingredient_id').eq('product_id', p.id);
                     
                     return { 
                         ...p, 
                         linked_groups: optLinks?.map((l:any) => l.group_id) || [],
                         linked_ingredients: ingLinks?.map((l:any) => l.ingredient_id) || []
                     }
                 }));
                 return { ...cat, products: productsWithLinks.sort((a: any, b: any) => a.name.localeCompare(b.name)) }
            }));
            
            setCategories(enrichedCats as Category[])
            if (!selectedCategory && enrichedCats.length > 0) setSelectedCategory(enrichedCats[0].id)
          }

          // 2. Bibliothèque Options (CORRECTION ICI : MAPPING DB -> FRONT)
          const { data: groups } = await supabase.from('option_groups').select('*, items:option_items(*)').eq('brand_id', store.brand_id)
          if (groups) {
              setOptionGroups(groups.map((g: any) => ({
                  id: g.id, 
                  name: g.name, 
                  min: g.min_selection, // On lit min_selection de la DB
                  max: g.max_selection, // On lit max_selection de la DB
                  items: g.items.sort((a: any, b: any) => a.price - b.price)
              })))
          }

          // 3. Bibliothèque Ingrédients
          const { data: ingredients } = await supabase.from('ingredients').select('*').eq('brand_id', store.brand_id).order('name')
          if (ingredients) setIngredientsLibrary(ingredients)
      }
      setLoading(false)
    }
    fetchData()
  }, [lastUpdated])

  // --- OUVERTURE MODALES ---
  const openProductModal = (product?: Product, categoryId?: string) => {
    setModalMode('product')
    setEditingId(product?.id || null)
    setTargetCatId(categoryId || null)
    
    setFormName(product?.name || '')
    setFormDesc(product?.description || '')
    setFormPrice(product?.price?.toString() || '')
    setFormImage(product?.image_url || '')
    setFormIsAvailable(product?.is_available ?? true)
    
    setFormLinkedGroups(product?.linked_groups || [])
    setFormLinkedIngredients(product?.linked_ingredients || [])
    
    setIsModalOpen(true)
  }

  const openCategoryModal = (category?: Category) => {
    setModalMode('category')
    setEditingId(category?.id || null)
    setFormName(category?.name || '')
    setFormImage(category?.image_url || '')
    setIsModalOpen(true)
  }

  const openGroupModal = (group?: OptionGroup) => {
      setModalMode('option_group')
      setEditingId(group?.id || null)
      setFormName(group?.name || '')
      setFormGroupMin(group?.min ?? 0)
      setFormGroupMax(group?.max ?? 1)
      setFormOptionItems(group?.items || [])
      setIsModalOpen(true)
  }

  const openIngredientModal = (ing?: Ingredient) => {
      setModalMode('ingredient')
      setEditingId(ing?.id || null)
      setFormName(ing?.name || '')
      setFormIsAvailable(ing?.is_available ?? true)
      setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setTargetCatId(null)
    setGenerating(false)
  }

  // --- HELPERS INTERNES ---
  const addChoiceToGroup = () => setFormOptionItems([...formOptionItems, { id: crypto.randomUUID(), name: '', price: 0, is_available: true }])
  const removeChoice = (idx: number) => setFormOptionItems(formOptionItems.filter((_, i) => i !== idx))
  const updateChoice = (idx: number, field: keyof OptionChoice, value: any) => {
      const newItems = [...formOptionItems]
      newItems[idx] = { ...newItems[idx], [field]: value }
      setFormOptionItems(newItems)
  }

  const toggleGroupLink = (id: string) => {
      if (formLinkedGroups.includes(id)) setFormLinkedGroups(prev => prev.filter(gid => gid !== id))
      else setFormLinkedGroups(prev => [...prev, id])
  }
  const toggleIngredientLink = (id: string) => {
      if (formLinkedIngredients.includes(id)) setFormLinkedIngredients(prev => prev.filter(iid => iid !== id))
      else setFormLinkedIngredients(prev => [...prev, id])
  }

  // --- SAUVEGARDE (LE COEUR DU FIX) ---
  const handleSave = async () => {
      if (!formName) return notify("Le nom est obligatoire", "error");
      setUploading(true);

      try {
          const { data: store } = await supabase.from('stores').select('brand_id').limit(1).single()
          if (!store) throw new Error("Store not found");

          // 1. CATEGORY
          if (modalMode === 'category') {
              const payload = { name: formName, image_url: formImage, brand_id: store.brand_id }
              const { error } = editingId 
                  ? await supabase.from('categories').update(payload).eq('id', editingId)
                  : await supabase.from('categories').insert({ ...payload, rank: categories.length + 1 });
              if (error) throw error;
          }

          // 2. INGREDIENT
          if (modalMode === 'ingredient') {
              const payload = { name: formName, is_available: formIsAvailable, brand_id: store.brand_id }
              const { error } = editingId 
                  ? await supabase.from('ingredients').update(payload).eq('id', editingId)
                  : await supabase.from('ingredients').insert(payload);
              if (error) throw error;
          }

          // 3. OPTION GROUP (CORRECTION ICI : MAPPING FRONT -> DB)
          if (modalMode === 'option_group') {
              let groupId = editingId;
              const groupPayload = { 
                  name: formName, 
                  min_selection: formGroupMin, // On envoie min_selection
                  max_selection: formGroupMax, // On envoie max_selection
                  brand_id: store.brand_id 
              }

              if (editingId) {
                  const { error } = await supabase.from('option_groups').update(groupPayload).eq('id', editingId);
                  if (error) throw error;
              } else {
                  const { data, error } = await supabase.from('option_groups').insert(groupPayload).select().single();
                  if (error) throw error;
                  groupId = data.id;
              }

              if (groupId) {
                  if (editingId) await supabase.from('option_items').delete().eq('group_id', groupId);
                  if (formOptionItems.length > 0) {
                      const itemsToInsert = formOptionItems.map(item => ({
                          group_id: groupId, name: item.name, price: item.price || 0, is_available: item.is_available ?? true
                      }));
                      const { error } = await supabase.from('option_items').insert(itemsToInsert);
                      if (error) throw error;
                  }
              }
          }

          // 4. PRODUCT
          if (modalMode === 'product') {
            const payload = {
                name: formName, description: formDesc, price: parseFloat(formPrice),
                image_url: formImage, is_available: formIsAvailable,
                category_id: editingId ? undefined : targetCatId 
            }
            
            let productId = editingId;
            if (editingId) {
                const { error } = await supabase.from('products').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert({ ...payload, category_id: targetCatId }).select().single();
                if (error) throw error;
                productId = data.id;
            }

            if (productId) {
                await supabase.from('product_option_links').delete().eq('product_id', productId);
                if (formLinkedGroups.length > 0) {
                    await supabase.from('product_option_links').insert(formLinkedGroups.map(gid => ({ product_id: productId, group_id: gid })));
                }
                await supabase.from('product_ingredients').delete().eq('product_id', productId);
                if (formLinkedIngredients.length > 0) {
                    await supabase.from('product_ingredients').insert(formLinkedIngredients.map(iid => ({ product_id: productId, ingredient_id: iid })));
                }
            }
          }

          notify("Enregistré avec succès !", "success")
          setLastUpdated(Date.now())
          handleCloseModal()

      } catch (error: any) {
          console.error("ERREUR SAVE:", error);
          notify(error.message || "Erreur sauvegarde", "error")
      } finally {
          setUploading(false);
      }
  }

  // --- DELETE ---
  const handleDelete = async (id: string, type: string) => {
      if(!confirm("Êtes-vous sûr ?")) return;
      const tableMap: any = { 'product': 'products', 'category': 'categories', 'option_group': 'option_groups', 'ingredient': 'ingredients' }
      const { error } = await supabase.from(tableMap[type]).delete().eq('id', id);
      if (error) notify(error.message, "error");
      else { notify("Supprimé", "success"); setLastUpdated(Date.now()); }
  }

  // --- IA & IMAGE ---
  const generateAIImage = async () => {
    if (!formName) return notify("Nom requis pour l'IA", "error");
    setGenerating(true);
    try {
        const prompt = modalMode === 'category' 
            ? `artistic food photography of ${formName}, menu style, 4k` 
            : `delicious ${formName}, ${formDesc}, food photography, 4k, studio light`;
        const res = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&model=flux&nologo=true`);
        const blob = await res.blob();
        
        const fileName = `ai-${Date.now()}.webp`;
        await supabase.storage.from('images').upload(fileName, blob, { contentType: 'image/webp' });
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        setFormImage(`${data.publicUrl}?t=${Date.now()}`); 
        notify("Image IA générée !", "success");
    } catch(e) { notify("Erreur IA", "error"); }
    finally { setGenerating(false); }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const file = e.target.files[0];
      try {
          const fileName = `img-${Date.now()}.webp`;
          const { error } = await supabase.storage.from('images').upload(fileName, file, { contentType: 'image/webp', upsert: true });
          if (error) throw error;
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          setFormImage(data.publicUrl);
          notify("Image uploadée", "success");
      } catch (e) { notify("Erreur upload", "error"); }
      finally { setUploading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] relative font-sans text-slate-800 flex flex-col h-screen overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>

      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto bg-white/90 backdrop-blur border border-white/50 shadow-xl p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right fade-in">
                {t.type === 'success' ? <CheckCircle2 className="text-green-500"/> : <AlertCircle className="text-red-500"/>}
                <span className="font-medium text-sm">{t.message}</span>
            </div>
        ))}
      </div>

      <div className="relative z-10 px-6 pt-6 pb-2 shrink-0">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl p-2 flex justify-between items-center max-w-[1920px] mx-auto">
             <div className="flex gap-2 bg-gray-100/50 p-1 rounded-xl">
                 <button onClick={() => setViewMode('menu')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'menu' ? 'bg-white text-black shadow-sm scale-100' : 'text-gray-500 hover:text-gray-900'}`}>
                    <Utensils size={16}/> Carte & Menu
                 </button>
                 <button onClick={() => setViewMode('library')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'library' ? 'bg-white text-black shadow-sm scale-100' : 'text-gray-500 hover:text-gray-900'}`}>
                    <Library size={16}/> Bibliothèques
                 </button>
             </div>
             
             {viewMode === 'library' && (
                 <div className="flex gap-2">
                     <button onClick={() => openGroupModal()} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-purple-700 flex items-center gap-2"><Layers size={16}/> Créer Groupe</button>
                     <button onClick={() => openIngredientModal()} className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 flex items-center gap-2"><Leaf size={16}/> Nouvel Ingrédient</button>
                 </div>
             )}
          </div>
      </div>

      <div className="relative z-10 flex-1 p-6 overflow-hidden max-w-[1920px] mx-auto w-full">
        {viewMode === 'menu' && (
            <div className="flex gap-6 h-full">
                <div className="w-80 flex flex-col gap-4 h-full shrink-0">
                    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-[32px] p-6 flex-1 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Rayons</h2>
                            <button onClick={() => openCategoryModal()} className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition"><Plus size={16}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {categories.map(cat => (
                                <div key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center gap-3 group ${selectedCategory === cat.id ? 'bg-white shadow-md border-white' : 'border-transparent hover:bg-white/30'}`}>
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 relative overflow-hidden">
                                        {cat.image_url && <Image src={cat.image_url} fill className="object-cover" alt={cat.name}/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{cat.name}</div>
                                        <div className="text-xs text-gray-400">{cat.products.length} plats</div>
                                    </div>
                                    <button onClick={(e) => {e.stopPropagation(); openCategoryModal(cat)}} className="opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-full shadow-sm hover:text-blue-600"><Edit3 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col h-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-[32px] overflow-hidden">
                    <div className="p-6 border-b border-white/20 flex justify-between items-center bg-white/30">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input type="text" placeholder="Rechercher..." className="w-full bg-white/50 border-none rounded-full py-3 pl-10 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 transition outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
                        </div>
                        {selectedCategory && (
                            <button onClick={() => openProductModal(undefined, selectedCategory)} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition flex items-center gap-2">
                                <Sparkles size={18}/> Ajouter un plat
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {selectedCategory ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {categories.find(c => c.id === selectedCategory)?.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                                    <div key={product.id} className={`group bg-white p-3 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative ${!product.is_available ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="aspect-[4/3] w-full bg-gray-100 rounded-[20px] overflow-hidden relative mb-3">
                                            {product.image_url ? <Image src={product.image_url} fill className="object-cover" alt={product.name}/> : <ImageIcon className="m-auto text-gray-300" size={32}/>}
                                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-full">{product.price} DH</div>
                                        </div>
                                        <div className="px-2 pb-2">
                                            <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                                            <div className="flex gap-2 mt-2">
                                                {product.linked_ingredients && product.linked_ingredients.length > 0 && (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Leaf size={10}/> {product.linked_ingredients.length} ingr.</span>
                                                )}
                                                {product.linked_groups && product.linked_groups.length > 0 && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Layers size={10}/> {product.linked_groups.length} opt.</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <button onClick={() => openProductModal(product)} className="flex-1 bg-gray-50 hover:bg-black hover:text-white py-2 rounded-xl text-xs font-bold transition-colors">Modifier</button>
                                                <button onClick={() => handleDelete(product.id, 'product')} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Utensils size={64} className="mb-4 opacity-20"/>
                                <p>Sélectionnez un rayon pour voir les plats</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'library' && (
            <div className="flex flex-col h-full gap-6">
                <div className="flex gap-4 border-b border-gray-200/50 pb-2">
                    <button onClick={() => setLibraryTab('options')} className={`pb-2 text-sm font-bold transition ${libraryTab === 'options' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>Options & Suppléments</button>
                    <button onClick={() => setLibraryTab('ingredients')} className={`pb-2 text-sm font-bold transition ${libraryTab === 'ingredients' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'}`}>Ingrédients de base</button>
                </div>
                <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
                    {libraryTab === 'options' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {optionGroups.map(group => (
                                <div key={group.id} className="bg-white/60 backdrop-blur-xl border border-white/50 p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-black text-lg text-gray-900">{group.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-gray-100 text-gray-600">Min: {group.min}</span>
                                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-gray-100 text-gray-600">Max: {group.max}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openGroupModal(group)} className="p-2 bg-white hover:bg-gray-100 rounded-full text-gray-600"><Edit3 size={16}/></button>
                                            <button onClick={() => handleDelete(group.id, 'option_group')} className="p-2 bg-white hover:bg-red-50 rounded-full text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-white/50 rounded-xl p-3 border border-white/40 space-y-1 mb-4">
                                        {group.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                                <span className={!item.is_available ? "line-through text-gray-400" : "text-gray-700"}>{item.name}</span>
                                                <span className="font-bold text-gray-900">+{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {libraryTab === 'ingredients' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {ingredientsLibrary.map(ing => (
                                <div key={ing.id} className={`bg-white p-4 rounded-2xl border flex flex-col items-center text-center gap-2 shadow-sm transition-all ${!ing.is_available ? 'opacity-60 bg-gray-50 border-gray-200' : 'border-green-100 hover:border-green-300'}`}>
                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-1">
                                        <Leaf size={20}/>
                                    </div>
                                    <h4 className="font-bold text-gray-800 leading-tight">{ing.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                         <button onClick={() => openIngredientModal(ing)} className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-bold hover:bg-gray-200">Éditer</button>
                                         <button onClick={() => handleDelete(ing.id, 'ingredient')} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* --- MODALE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
             <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                 <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                     <h2 className="text-2xl font-black text-gray-900">
                         {modalMode === 'product' && (editingId ? `Édition : ${formName}` : 'Nouveau Plat')}
                         {modalMode === 'category' && 'Gestion Rayon'}
                         {modalMode === 'option_group' && 'Groupe d\'Options'}
                         {modalMode === 'ingredient' && 'Ingrédient'}
                     </h2>
                     <button onClick={handleCloseModal} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"><X size={20}/></button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                     {modalMode === 'ingredient' && (
                         <div className="max-w-md mx-auto space-y-6">
                             <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom de l'ingrédient</label>
                                 <input className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-green-500" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Tomates"/>
                             </div>
                             <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
                                 <input type="checkbox" className="w-6 h-6 rounded text-green-600" checked={formIsAvailable} onChange={e => setFormIsAvailable(e.target.checked)}/>
                                 <div>
                                     <div className="font-bold text-gray-900">Disponible en stock</div>
                                     <div className="text-xs text-gray-500">Décocher pour retirer de tous les plats instantanément.</div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {modalMode === 'option_group' && (
                         <div className="space-y-6">
                             <div className="grid grid-cols-3 gap-6">
                                 <div className="col-span-1">
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom du Groupe</label>
                                     <input className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-lg" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Sauces"/>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min (Obligatoire)</label>
                                     <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold" value={formGroupMin} onChange={e => setFormGroupMin(parseInt(e.target.value))} min={0}/>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max (Limite)</label>
                                     <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold" value={formGroupMax} onChange={e => setFormGroupMax(parseInt(e.target.value))} min={1}/>
                                 </div>
                             </div>
                             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                 <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Layers size={18}/> Choix possibles</h3>
                                 <div className="space-y-2">
                                     {formOptionItems.map((item, idx) => (
                                         <div key={idx} className="flex gap-3 items-center">
                                             <input type="text" className="flex-1 p-3 bg-gray-50 rounded-xl font-medium text-sm outline-none" placeholder="Nom" value={item.name} onChange={e => updateChoice(idx, 'name', e.target.value)}/>
                                             <input type="number" className="w-24 p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="0" value={item.price} onChange={e => updateChoice(idx, 'price', parseFloat(e.target.value))}/>
                                             <button onClick={() => removeChoice(idx)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>
                                         </div>
                                     ))}
                                 </div>
                                 <button onClick={addChoiceToGroup} className="mt-4 w-full py-3 bg-gray-50 rounded-xl text-gray-500 font-bold hover:bg-gray-100 flex items-center justify-center gap-2"><Plus size={18}/> Ajouter choix</button>
                             </div>
                         </div>
                     )}

                     {(modalMode === 'product' || modalMode === 'category') && (
                         <div className="flex flex-col lg:flex-row gap-8">
                             <div className="w-full lg:w-1/3 space-y-4">
                                 <div className="aspect-square bg-gray-100 rounded-[24px] border-2 border-dashed border-gray-300 relative overflow-hidden group hover:border-blue-400 transition cursor-pointer">
                                     {formImage ? <Image src={formImage} fill className="object-cover" alt="preview"/> : <div className="absolute inset-0 flex items-center justify-center text-gray-400 flex-col gap-2"><ImageIcon size={32}/></div>}
                                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={uploading}/>
                                     {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500"/></div>}
                                 </div>
                                 <button onClick={generateAIImage} disabled={generating} className="w-full py-3 bg-purple-100 text-purple-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-200 transition">
                                     {generating ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>} Générer via IA
                                 </button>
                             </div>
                             <div className="flex-1 space-y-5">
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="col-span-2">
                                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom</label>
                                         <input className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Burger Maison"/>
                                     </div>
                                     {modalMode === 'product' && (
                                         <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prix (DH)</label>
                                                <input type="number" className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-500" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00"/>
                                            </div>
                                            <div className="flex items-center gap-2 mt-6">
                                                <input type="checkbox" id="avail" className="w-5 h-5 rounded text-blue-600" checked={formIsAvailable} onChange={e => setFormIsAvailable(e.target.checked)}/>
                                                <label htmlFor="avail" className="font-bold text-gray-700">Disponible (Stock)</label>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                                <textarea className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" value={formDesc} onChange={e => setFormDesc(e.target.value)}/>
                                            </div>
                                            <div className="col-span-2 bg-white p-5 rounded-2xl border border-green-100 shadow-sm mt-2">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Leaf className="text-green-600" size={18}/>
                                                    <h3 className="font-bold text-gray-900">Ingrédients de base</h3>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {ingredientsLibrary.map(ing => (
                                                        <button key={ing.id} onClick={() => toggleIngredientLink(ing.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 ${formLinkedIngredients.includes(ing.id) ? 'bg-green-600 border-green-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                                            {ing.name}
                                                            {formLinkedIngredients.includes(ing.id) && <CheckCircle2 size={14}/>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-span-2 bg-white p-5 rounded-2xl border border-purple-100 shadow-sm mt-2">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Layers className="text-purple-600" size={18}/>
                                                    <h3 className="font-bold text-gray-900">Groupes d'Options</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                    {optionGroups.map(group => (
                                                        <div key={group.id} onClick={() => toggleGroupLink(group.id)} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${formLinkedGroups.includes(group.id) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                                                            <div>
                                                                <span className="font-medium text-sm block">{group.name}</span>
                                                                <span className="text-[10px] opacity-70">Min: {group.min} / Max: {group.max}</span>
                                                            </div>
                                                            {formLinkedGroups.includes(group.id) && <CheckCircle2 size={16}/>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                         </>
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                     <button onClick={handleCloseModal} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Annuler</button>
                     <button onClick={handleSave} disabled={uploading} className="px-8 py-3 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 hover:scale-105 transition flex items-center gap-2">
                         {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Enregistrer
                     </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  )
}