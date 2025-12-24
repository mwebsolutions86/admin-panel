'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { 
  Plus, Edit3, Trash2, X, Save, Tag, Layers, 
  Image as ImageIcon, Loader2, UploadCloud, Search, Sparkles, 
  AlertCircle, CheckCircle2, Wand2, Settings2, Library, Utensils, Leaf,
  Printer, DollarSign, Split, ChefHat // ✅ CORRECTION 1 : ChefHat (Majuscule)
} from 'lucide-react'

// --- TYPES FRONTEND ÉTENDUS (POS READY) ---
interface OptionChoice { id: string; name: string; price: number; is_available: boolean; }
interface OptionGroup { 
  id: string; name: string; min: number; max: number; items: OptionChoice[]; 
}
interface Ingredient { id: string; name: string; is_available: boolean; }

// Variation (Taille/Déclinaison)
interface ProductVariation {
    id?: string;
    name: string;
    price: number;
    sku?: string;
}

interface Product { 
  id: string; 
  name: string; 
  description: string; 
  price: number; 
  image_url: string; 
  category_id: string; 
  is_available: boolean;
  
  // Nouveaux champs POS
  type: 'simple' | 'variable' | 'combo';
  tax_rate: number;
  preparation_time: number;
  plu_code?: string;
  kitchen_station_id?: string;

  // Relations
  linked_ingredients: string[]; 
  linked_groups: string[];
  variations: ProductVariation[];
}

interface Category { id: string; name: string; image_url: string | null; products: Product[]; rank?: number; }
interface Toast { id: number; message: string; type: 'success' | 'error'; }

export default function MenuLab() {
  // --- NAVIGATION ---
  const [viewMode, setViewMode] = useState<'menu' | 'library'>('menu')
  const [libraryTab, setLibraryTab] = useState<'options' | 'ingredients'>('options')
  
  // --- DATA ---
  const [categories, setCategories] = useState<Category[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [ingredientsLibrary, setIngredientsLibrary] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(0)

  // --- UI STATES ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'product' | 'category' | 'option_group' | 'ingredient'>('product')
  const [productTab, setProductTab] = useState<'general' | 'pricing' | 'composition' | 'pos'>('general')
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // --- FORM STATES (Product) ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [targetCatId, setTargetCatId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formIsAvailable, setFormIsAvailable] = useState(true)
  
  // Pricing & POS
  // ✅ CORRECTION 2 : Ajout de 'combo' dans le type du state
  const [formType, setFormType] = useState<'simple' | 'variable' | 'combo'>('simple')
  
  const [formPrice, setFormPrice] = useState('')
  const [formTaxRate, setFormTaxRate] = useState(20)
  const [formPrepTime, setFormPrepTime] = useState(15)
  const [formPlu, setFormPlu] = useState('')
  
  // Variantes
  const [formVariations, setFormVariations] = useState<ProductVariation[]>([])

  // Relations
  const [formLinkedIngredients, setFormLinkedIngredients] = useState<string[]>([])
  const [formLinkedGroups, setFormLinkedGroups] = useState<string[]>([])

  // Option Group Form
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

  // --- FETCH DATA ---
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
                 const productsWithDetails = await Promise.all(cat.products.map(async (p: any) => {
                     const { data: optLinks } = await supabase.from('product_option_links').select('group_id').eq('product_id', p.id);
                     const { data: ingLinks } = await supabase.from('product_ingredients').select('ingredient_id').eq('product_id', p.id);
                     const { data: variations } = await supabase.from('product_variations').select('*').eq('product_id', p.id).order('price');

                     return { 
                         ...p, 
                         linked_groups: optLinks?.map((l:any) => l.group_id) || [],
                         linked_ingredients: ingLinks?.map((l:any) => l.ingredient_id) || [],
                         variations: variations || []
                     }
                 }));
                 return { ...cat, products: productsWithDetails.sort((a: any, b: any) => a.name.localeCompare(b.name)) }
            }));
            
            setCategories(enrichedCats as Category[])
            if (!selectedCategory && enrichedCats.length > 0) setSelectedCategory(enrichedCats[0].id)
          }

          // 2. Bibliothèque Options
          const { data: groups } = await supabase.from('option_groups').select('*, items:option_items(*)').eq('brand_id', store.brand_id)
          if (groups) {
              setOptionGroups(groups.map((g: any) => ({
                  id: g.id, name: g.name, min: g.min_selection, max: g.max_selection, 
                  items: g.items.sort((a: any, b: any) => a.price - b.price)
              })))
          }

          // 3. Ingrédients
          const { data: ingredients } = await supabase.from('ingredients').select('*').eq('brand_id', store.brand_id).order('name')
          if (ingredients) setIngredientsLibrary(ingredients)
      }
      setLoading(false)
    }
    fetchData()
  }, [lastUpdated])

  // --- MODAL HANDLERS ---
  const openProductModal = (product?: Product, categoryId?: string) => {
    setModalMode('product')
    setProductTab('general')
    setEditingId(product?.id || null)
    setTargetCatId(categoryId || null)
    
    setFormName(product?.name || '')
    setFormDesc(product?.description || '')
    setFormImage(product?.image_url || '')
    setFormIsAvailable(product?.is_available ?? true)
    
    // Champs POS & Prix
    // La correction du useState permet maintenant d'accepter 'combo' ici sans erreur
    setFormType(product?.type || 'simple')
    setFormPrice(product?.price?.toString() || '')
    setFormTaxRate(product?.tax_rate ?? 20)
    setFormPrepTime(product?.preparation_time ?? 15)
    setFormPlu(product?.plu_code || '')
    
    setFormVariations(product?.variations || [])
    setFormLinkedGroups(product?.linked_groups || [])
    setFormLinkedIngredients(product?.linked_ingredients || [])
    
    setIsModalOpen(true)
  }

  const openCategoryModal = (c?: Category) => {
      setModalMode('category'); setEditingId(c?.id || null); setFormName(c?.name || ''); setFormImage(c?.image_url || ''); setIsModalOpen(true);
  }
  const openGroupModal = (g?: OptionGroup) => {
      setModalMode('option_group'); setEditingId(g?.id || null); setFormName(g?.name || ''); setFormGroupMin(g?.min ?? 0); setFormGroupMax(g?.max ?? 1); setFormOptionItems(g?.items || []); setIsModalOpen(true);
  }
  const openIngredientModal = (i?: Ingredient) => {
      setModalMode('ingredient'); setEditingId(i?.id || null); setFormName(i?.name || ''); setFormIsAvailable(i?.is_available ?? true); setIsModalOpen(true);
  }

  const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setGenerating(false); }

  // --- LOGIQUE VARIANTES ---
  const addVariation = () => {
      setFormVariations([...formVariations, { name: '', price: 0, sku: '' }]);
  }
  const updateVariation = (idx: number, field: keyof ProductVariation, value: any) => {
      const newVars = [...formVariations];
      newVars[idx] = { ...newVars[idx], [field]: value };
      setFormVariations(newVars);
  }
  const removeVariation = (idx: number) => setFormVariations(formVariations.filter((_, i) => i !== idx))

  // --- SAVE ---
  const handleSave = async () => {
      if (!formName) return notify("Nom obligatoire", "error");
      setUploading(true);

      try {
          const { data: store } = await supabase.from('stores').select('brand_id').limit(1).single()
          if (!store) throw new Error("Store error");

          if (modalMode === 'category') {
              const payload = { name: formName, image_url: formImage, brand_id: store.brand_id }
              editingId ? await supabase.from('categories').update(payload).eq('id', editingId) : await supabase.from('categories').insert({ ...payload, rank: categories.length + 1 });
          }
          else if (modalMode === 'ingredient') {
              const payload = { name: formName, is_available: formIsAvailable, brand_id: store.brand_id }
              editingId ? await supabase.from('ingredients').update(payload).eq('id', editingId) : await supabase.from('ingredients').insert(payload);
          }
          else if (modalMode === 'option_group') {
              let groupId = editingId;
              const gPayload = { name: formName, min_selection: formGroupMin, max_selection: formGroupMax, brand_id: store.brand_id };
              if(editingId) await supabase.from('option_groups').update(gPayload).eq('id', editingId);
              else { const { data } = await supabase.from('option_groups').insert(gPayload).select().single(); groupId = data.id; }
              
              if(groupId) {
                  await supabase.from('option_items').delete().eq('group_id', groupId);
                  if(formOptionItems.length > 0) await supabase.from('option_items').insert(formOptionItems.map(i => ({ group_id: groupId, name: i.name, price: i.price||0, is_available: i.is_available??true })));
              }
          }
          else if (modalMode === 'product') {
            const productPayload = {
                name: formName, description: formDesc, 
                price: formType === 'simple' ? parseFloat(formPrice || '0') : 0, 
                image_url: formImage, is_available: formIsAvailable,
                category_id: editingId ? undefined : targetCatId,
                type: formType,
                tax_rate: formTaxRate,
                preparation_time: formPrepTime,
                plu_code: formPlu
            }
            
            let productId = editingId;
            
            if (editingId) {
                const { error } = await supabase.from('products').update(productPayload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert({ ...productPayload, category_id: targetCatId }).select().single();
                if (error) throw error;
                productId = data.id;
            }

            if (productId) {
                await supabase.from('product_option_links').delete().eq('product_id', productId);
                if (formLinkedGroups.length > 0) await supabase.from('product_option_links').insert(formLinkedGroups.map(gid => ({ product_id: productId, group_id: gid })));
                
                await supabase.from('product_ingredients').delete().eq('product_id', productId);
                if (formLinkedIngredients.length > 0) await supabase.from('product_ingredients').insert(formLinkedIngredients.map(iid => ({ product_id: productId, ingredient_id: iid })));

                if (formType === 'variable') {
                    await supabase.from('product_variations').delete().eq('product_id', productId);
                    if (formVariations.length > 0) {
                        const varsToInsert = formVariations.map(v => ({
                            product_id: productId,
                            name: v.name,
                            price: v.price,
                            sku: v.sku || null
                        }));
                        const { error: varError } = await supabase.from('product_variations').insert(varsToInsert);
                        if (varError) throw varError;
                    }
                }
            }
          }

          notify("Enregistré !", "success")
          setLastUpdated(Date.now())
          handleCloseModal()

      } catch (error: any) {
          console.error(error); notify(error.message || "Erreur", "error");
      } finally { setUploading(false); }
  }

  // --- HELPERS ---
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

  const handleDelete = async (id: string, type: string) => {
      if(!confirm("Êtes-vous sûr ?")) return;
      const tableMap: any = { 'product': 'products', 'category': 'categories', 'option_group': 'option_groups', 'ingredient': 'ingredients' }
      const { error } = await supabase.from(tableMap[type]).delete().eq('id', id);
      if (error) notify(error.message, "error");
      else { notify("Supprimé", "success"); setLastUpdated(Date.now()); }
  }

  const toggleGroupLink = (id: string) => { if (formLinkedGroups.includes(id)) setFormLinkedGroups(prev => prev.filter(gid => gid !== id)); else setFormLinkedGroups(prev => [...prev, id]); }
  const toggleIngredientLink = (id: string) => { if (formLinkedIngredients.includes(id)) setFormLinkedIngredients(prev => prev.filter(iid => iid !== id)); else setFormLinkedIngredients(prev => [...prev, id]); }
  const addChoiceToGroup = () => setFormOptionItems([...formOptionItems, { id: crypto.randomUUID(), name: '', price: 0, is_available: true }])
  const removeChoice = (idx: number) => setFormOptionItems(formOptionItems.filter((_, i) => i !== idx))
  const updateChoice = (idx: number, field: keyof OptionChoice, value: any) => { const newItems = [...formOptionItems]; newItems[idx] = { ...newItems[idx], [field]: value }; setFormOptionItems(newItems); }


  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#F2F2F7] relative font-sans text-slate-800 flex flex-col h-screen overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] mix-blend-multiply"></div>
      </div>

      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right"><span className="font-bold">{t.message}</span></div>
        ))}
      </div>

      <div className="relative z-10 px-6 pt-6 pb-2 shrink-0">
          <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl p-2 flex justify-between items-center max-w-[1920px] mx-auto">
             <div className="flex gap-2 bg-gray-100/50 p-1 rounded-xl">
                 <button onClick={() => setViewMode('menu')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'menu' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><Utensils size={16}/> Carte</button>
                 <button onClick={() => setViewMode('library')} className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'library' ? 'bg-white shadow-sm' : 'text-gray-500'}`}><Library size={16}/> Biblio</button>
             </div>
             {viewMode === 'library' && (
                 <div className="flex gap-2">
                     <button onClick={() => openGroupModal()} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-purple-700">Créer Groupe</button>
                     <button onClick={() => openIngredientModal()} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-green-700">Nouvel Ingrédient</button>
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
                                    <button onClick={(e) => {e.stopPropagation(); openCategoryModal(cat)}} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded-full"><Edit3 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col h-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-[32px] overflow-hidden">
                    <div className="p-6 border-b border-white/20 flex justify-between items-center bg-white/30">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            <input type="text" placeholder="Rechercher..." className="w-full bg-white/50 border-none rounded-full py-3 pl-10 pr-4 text-sm font-medium outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
                        </div>
                        {selectedCategory && (
                            <button onClick={() => openProductModal(undefined, selectedCategory)} className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2">
                                <Sparkles size={18}/> Nouveau Plat
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {selectedCategory ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                {categories.find(c => c.id === selectedCategory)?.products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
                                    <div key={product.id} onClick={() => openProductModal(product)} className={`group bg-white p-3 rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative cursor-pointer ${!product.is_available ? 'opacity-60 grayscale' : ''}`}>
                                        <div className="aspect-[4/3] w-full bg-gray-100 rounded-[20px] overflow-hidden relative mb-3">
                                            {product.image_url ? <Image src={product.image_url} fill className="object-cover" alt={product.name}/> : <ImageIcon className="m-auto text-gray-300" size={32}/>}
                                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                {product.type === 'variable' && product.variations.length > 0 
                                                    ? `Dès ${Math.min(...product.variations.map(v => v.price))} DH` 
                                                    : `${product.price} DH`}
                                            </div>
                                        </div>
                                        <div className="px-2 pb-2">
                                            <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {product.type === 'variable' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 uppercase font-bold">Multi-taille</span>}
                                                {product.plu_code && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">PLU:{product.plu_code}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Utensils size={64} className="mb-4 opacity-20"/>
                                <p>Sélectionnez un rayon</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'library' && (
            <div className="flex flex-col h-full gap-6">
                <div className="flex gap-4 border-b border-gray-200/50 pb-2">
                    <button onClick={() => setLibraryTab('options')} className={`pb-2 text-sm font-bold transition ${libraryTab === 'options' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>Options</button>
                    <button onClick={() => setLibraryTab('ingredients')} className={`pb-2 text-sm font-bold transition ${libraryTab === 'ingredients' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'}`}>Ingrédients</button>
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

      {/* --- MODALE UNIVERSELLE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
             <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                 
                 {/* Header Modale */}
                 <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                     <div>
                        <h2 className="text-2xl font-black text-gray-900">
                            {modalMode === 'product' ? (editingId ? formName : 'Nouveau Produit') : 'Édition Rapide'}
                        </h2>
                        {modalMode === 'product' && <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Product Builder v2.0</p>}
                     </div>
                     <button onClick={handleCloseModal} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"><X size={20}/></button>
                 </div>

                 {/* CONTENU MODALE */}
                 <div className="flex-1 overflow-y-auto bg-slate-50/50 flex">
                     
                     {/* MENU LATÉRAL (Onglets Produit) */}
                     {modalMode === 'product' && (
                         <div className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-2 shrink-0">
                             <button onClick={() => setProductTab('general')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition flex items-center gap-3 ${productTab === 'general' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                                 <Tag size={18}/> Général
                             </button>
                             <button onClick={() => setProductTab('pricing')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition flex items-center gap-3 ${productTab === 'pricing' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                                 <DollarSign size={18}/> Prix & Variantes
                             </button>
                             <button onClick={() => setProductTab('composition')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition flex items-center gap-3 ${productTab === 'composition' ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                                 <Layers size={18}/> Composition
                             </button>
                             <button onClick={() => setProductTab('pos')} className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition flex items-center gap-3 ${productTab === 'pos' ? 'bg-slate-100 text-slate-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                                 <Settings2 size={18}/> POS & Fiscalité
                             </button>
                         </div>
                     )}

                     {/* ZONE DE CONTENU */}
                     <div className="flex-1 p-8 custom-scrollbar">
                         
                         {/* ONGLET 1: GÉNÉRAL */}
                         {modalMode === 'product' && productTab === 'general' && (
                             <div className="max-w-2xl space-y-6">
                                 <div className="grid grid-cols-2 gap-6">
                                     <div className="col-span-2">
                                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nom du produit</label>
                                         <input className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-xl outline-none focus:border-blue-500" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Pizza 4 Fromages"/>
                                     </div>
                                     <div className="col-span-2">
                                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description (Carte)</label>
                                         <textarea className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 h-24 resize-none" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Ingrédients, allergènes..."/>
                                     </div>
                                     <div className="col-span-2 bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-4">
                                         <div className="w-20 h-20 bg-gray-100 rounded-xl relative overflow-hidden shrink-0">
                                             {formImage ? <Image src={formImage} fill className="object-cover" alt="preview"/> : <ImageIcon className="m-auto mt-6 text-gray-300"/>}
                                         </div>
                                         <div className="flex-1">
                                             <div className="font-bold text-gray-800">Visuel Produit</div>
                                             <div className="text-xs text-gray-400 mb-2">JPG, PNG ou WEBP. Max 2MB.</div>
                                             <div className="flex gap-2">
                                                 <label className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-200">
                                                     Uploader <input type="file" className="hidden" onChange={handleImageUpload}/>
                                                 </label>
                                                 <button onClick={() => {}} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 flex items-center gap-1">
                                                     <Wand2 size={12}/> Générer IA
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* ONGLET 2: PRIX & VARIANTES (LE CŒUR DU POS) */}
                         {modalMode === 'product' && productTab === 'pricing' && (
                             <div className="max-w-3xl space-y-8">
                                 {/* SÉLECTEUR TYPE */}
                                 <div className="flex gap-4">
                                     <button onClick={() => setFormType('simple')} className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${formType === 'simple' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                         <div className="font-black text-lg mb-1 flex items-center gap-2"><Tag size={20}/> Produit Simple</div>
                                         <div className="text-sm text-gray-500">Un seul prix (ex: Coca, Burger standard).</div>
                                     </button>
                                     <button onClick={() => setFormType('variable')} className={`flex-1 p-4 rounded-2xl border-2 text-left transition-all ${formType === 'variable' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                         <div className="font-black text-lg mb-1 flex items-center gap-2"><Split size={20}/> Produit Variable</div>
                                         <div className="text-sm text-gray-500">Plusieurs tailles ou déclinaisons (ex: Pizzas, Vêtements).</div>
                                     </button>
                                 </div>

                                 {/* LOGIQUE SIMPLE */}
                                 {formType === 'simple' && (
                                     <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in">
                                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prix de vente (DH)</label>
                                         <div className="relative">
                                             <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">DH</span>
                                             <input type="number" className="w-full pl-12 p-4 bg-gray-50 border-none rounded-xl font-black text-3xl outline-none focus:ring-2 focus:ring-blue-500" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00"/>
                                         </div>
                                     </div>
                                 )}

                                 {/* LOGIQUE VARIABLE (TABLEAU) */}
                                 {formType === 'variable' && (
                                     <div className="bg-white p-6 rounded-2xl border border-orange-200 shadow-sm animate-in fade-in space-y-4">
                                         <div className="flex justify-between items-center">
                                             <h3 className="font-bold text-orange-900">Déclinaisons (Tailles)</h3>
                                             <button onClick={addVariation} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200">+ Ajouter taille</button>
                                         </div>
                                         
                                         {formVariations.length === 0 ? (
                                             <div className="text-center p-8 bg-orange-50/50 rounded-xl border border-dashed border-orange-200 text-orange-400 text-sm">Aucune variante. Ajoutez "Junior", "Sénior", etc.</div>
                                         ) : (
                                             <div className="space-y-2">
                                                 {formVariations.map((v, idx) => (
                                                     <div key={idx} className="flex gap-3 items-center">
                                                         <input type="text" placeholder="Nom (ex: XL)" className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:bg-white focus:ring-2 focus:ring-orange-200" value={v.name} onChange={e => updateVariation(idx, 'name', e.target.value)}/>
                                                         <input type="number" placeholder="Prix" className="w-32 p-3 bg-gray-50 rounded-xl font-bold text-sm border-none outline-none focus:bg-white focus:ring-2 focus:ring-orange-200" value={v.price} onChange={e => updateVariation(idx, 'price', parseFloat(e.target.value))}/>
                                                         <input type="text" placeholder="SKU/Code" className="w-24 p-3 bg-gray-50 rounded-xl font-mono text-xs border-none outline-none focus:bg-white focus:ring-2 focus:ring-orange-200" value={v.sku || ''} onChange={e => updateVariation(idx, 'sku', e.target.value)}/>
                                                         <button onClick={() => removeVariation(idx)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                                                     </div>
                                                 ))}
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                         )}

                         {/* ONGLET 3: COMPOSITION */}
                         {modalMode === 'product' && productTab === 'composition' && (
                             <div className="max-w-3xl space-y-6">
                                 <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
                                     <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Layers className="text-purple-500"/> Groupes d'Options (Suppléments)</h3>
                                     <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                         {optionGroups.map(group => (
                                             <div key={group.id} onClick={() => toggleGroupLink(group.id)} className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${formLinkedGroups.includes(group.id) ? 'bg-purple-600 border-purple-600 text-white shadow-md transform scale-[1.02]' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-300'}`}>
                                                 <div>
                                                     <div className="font-bold text-sm">{group.name}</div>
                                                     <div className="text-[10px] opacity-80 mt-0.5">Min: {group.min} / Max: {group.max}</div>
                                                 </div>
                                                 {formLinkedGroups.includes(group.id) && <CheckCircle2 size={18}/>}
                                             </div>
                                         ))}
                                     </div>
                                 </div>

                                 <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                                     <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Leaf className="text-green-500"/> Ingrédients retirables</h3>
                                     <div className="flex flex-wrap gap-2">
                                         {ingredientsLibrary.map(ing => (
                                             <button key={ing.id} onClick={() => toggleIngredientLink(ing.id)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 ${formLinkedIngredients.includes(ing.id) ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                                 {ing.name}
                                                 {formLinkedIngredients.includes(ing.id) && <CheckCircle2 size={14}/>}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* ONGLET 4: POS & FISCALITÉ */}
                         {modalMode === 'product' && productTab === 'pos' && (
                             <div className="max-w-2xl space-y-6">
                                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                     <div className="grid grid-cols-2 gap-6">
                                         <div>
                                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">TVA / Taxe (%)</label>
                                             <div className="relative">
                                                 <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" value={formTaxRate} onChange={e => setFormTaxRate(parseFloat(e.target.value))}/>
                                                 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                             </div>
                                         </div>
                                         <div>
                                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Code PLU (Caisse)</label>
                                             <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono text-sm" value={formPlu} onChange={e => setFormPlu(e.target.value)} placeholder="Ex: 101"/>
                                         </div>
                                     </div>
                                     
                                     <div>
                                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Temps de préparation moyen</label>
                                         <div className="flex items-center gap-4">
                                             <input type="range" min="0" max="60" step="5" className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={formPrepTime} onChange={e => setFormPrepTime(parseInt(e.target.value))}/>
                                             <span className="font-bold text-slate-800 w-16 text-right">{formPrepTime} min</span>
                                         </div>
                                     </div>

                                     <div className="pt-4 border-t border-slate-200">
                                         <label className="flex items-center gap-3 cursor-pointer">
                                             <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-0" checked={formIsAvailable} onChange={e => setFormIsAvailable(e.target.checked)}/>
                                             <div>
                                                 <div className="font-bold text-slate-800">Actif sur le POS</div>
                                                 <div className="text-xs text-slate-500">Si décoché, le produit est masqué sur les caisses.</div>
                                             </div>
                                         </label>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {/* CONTENU POUR LES AUTRES MODES (Category, Ingredient...) */}
                         {modalMode !== 'product' && (
                             <div className="p-8 w-full">
                                 {modalMode === 'ingredient' && (
                                     <div className="max-w-md mx-auto space-y-4">
                                         <input className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-lg" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nom ingrédient"/>
                                         <label className="flex items-center gap-2"><input type="checkbox" checked={formIsAvailable} onChange={e => setFormIsAvailable(e.target.checked)}/> Disponible</label>
                                     </div>
                                 )}
                                 {modalMode === 'category' && (
                                     <div className="max-w-md mx-auto space-y-4">
                                         <input className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-lg" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nom catégorie"/>
                                     </div>
                                 )}
                                 {modalMode === 'option_group' && (
                                     <div className="space-y-6">
                                         <div className="grid grid-cols-3 gap-4">
                                             <input className="col-span-1 p-3 border rounded-xl" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nom"/>
                                             <input type="number" className="p-3 border rounded-xl" value={formGroupMin} onChange={e => setFormGroupMin(parseInt(e.target.value))}/>
                                             <input type="number" className="p-3 border rounded-xl" value={formGroupMax} onChange={e => setFormGroupMax(parseInt(e.target.value))}/>
                                         </div>
                                         <div className="space-y-2">
                                             {formOptionItems.map((item, idx) => (
                                                 <div key={idx} className="flex gap-2"><input value={item.name} onChange={e => updateChoice(idx, 'name', e.target.value)} className="border p-2 rounded flex-1"/><input type="number" value={item.price} onChange={e => updateChoice(idx, 'price', parseFloat(e.target.value))} className="border p-2 rounded w-20"/><button onClick={() => removeChoice(idx)}><Trash2 size={16}/></button></div>
                                             ))}
                                             <button onClick={addChoiceToGroup} className="w-full py-2 bg-gray-100 rounded-lg font-bold text-sm">+ Choix</button>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         )}
                     </div>
                 </div>

                 {/* FOOTER ACTIONS */}
                 <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center z-10">
                     {editingId && modalMode === 'product' ? (
                         <button onClick={() => handleDelete(editingId, 'product')} className="text-red-500 font-bold text-sm hover:underline">Supprimer produit</button>
                     ) : <div></div>}
                     <div className="flex gap-3">
                         <button onClick={handleCloseModal} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Annuler</button>
                         <button onClick={handleSave} disabled={uploading} className="px-8 py-3 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-900 hover:scale-105 transition flex items-center gap-2">
                             {uploading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Enregistrer
                         </button>
                     </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  )
}