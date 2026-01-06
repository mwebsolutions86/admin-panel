'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, ArrowRight, Loader2, Store, Palette, CheckCircle, MapPin, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

interface OnboardingWizardProps {
  userId: string
  onComplete: () => void
}

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [debugError, setDebugError] = useState<string | null>(null)
  
  const [brandName, setBrandName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#eab308')
  const [address, setAddress] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setLogoFile(file)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setDebugError(null)
    console.log("🚀 DÉMARRAGE ONBOARDING pour User:", userId)

    try {
      let logoUrl: string | null = null

      if (logoFile) {
        console.log("1️⃣ Upload du logo en cours...")
        const fileName = `${userId}-${Date.now()}.png`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(fileName, logoFile)
        
        if (uploadError) {
          console.error("❌ Erreur Upload:", uploadError)
          throw new Error(`Erreur Upload: ${uploadError.message} (Code: ${uploadError.name})`)
        }
        
        console.log("✅ Logo uploadé:", uploadData)
        const { data: publicUrlData } = supabase.storage
          .from('brand-assets')
          .getPublicUrl(fileName)
        logoUrl = publicUrlData.publicUrl
      }

      console.log("2️⃣ Création de la marque...", { brandName, logoUrl })
      const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.floor(Math.random() * 1000)
      
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .insert({
          name: brandName,
          slug: slug,
          logo_url: logoUrl,
          theme_config: { primaryColor, borderRadius: '12px' }
        })
        .select()
        .single()

      if (brandError) {
        console.error("❌ Erreur Brand:", brandError)
        throw new Error(`Erreur Marque: ${brandError.message} (Code: ${brandError.code}) - Détail: ${brandError.details}`)
      }
      console.log("✅ Marque créée:", brandData)

      console.log("3️⃣ Création du store...")
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          brand_id: brandData.id,
          name: `${brandName} - Siège`,
          address: address || 'Agadir, Maroc',
        })
        .select()
        .single()

      if (storeError) {
        console.error("❌ Erreur Store:", storeError)
        throw new Error(`Erreur Magasin: ${storeError.message} (Code: ${storeError.code})`)
      }
      console.log("✅ Store créé:", storeData)

      console.log("4️⃣ Liaison Profil...")
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          store_id: storeData.id,
          brand_id: brandData.id,
          role: 'OWNER',
          full_name: 'Admin Fondateur'
        })

      if (profileError) {
        console.error("❌ Erreur Profil:", profileError)
        throw new Error(`Erreur Profil: ${profileError.message} (Code: ${profileError.code})`)
      }
      console.log("✅ Profil lié !")

      console.log("🎉 TERMINÉ AVEC SUCCÈS")
      onComplete()

    } catch (error: unknown) { // <--- CORRECTION ICI
      console.error('🚨 ERREUR FATALE:', error)
      let message = 'Une erreur inconnue est survenue'
      
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === 'object' && error !== null) {
        message = JSON.stringify(error)
      }

      setDebugError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
      
      {debugError && (
        <div className="bg-red-50 p-6 border-b border-red-100 text-red-800 text-xs font-mono overflow-auto max-h-40">
            <strong className="block text-sm mb-2 flex items-center gap-2"><AlertTriangle size={16}/> DIAGNOSTIC ERREUR :</strong>
            <pre>{debugError}</pre>
        </div>
      )}

      <div className="h-2 bg-gray-100 w-full">
        <div 
          className="h-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="p-8 md:p-12">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-900 mb-2">Configurez votre Restaurant</h2>
          <p className="text-gray-500">Étape {step} sur 3 • {step === 1 ? 'Identité' : step === 2 ? 'Visuel' : 'Localisation'}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Nom de l&apos;enseigne</label>
              <div className="relative">
                <Store className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none font-medium"
                  placeholder="ex: Atlas Burger"
                  autoFocus
                />
              </div>
            </div>
            
            <button
              onClick={() => brandName && setStep(2)}
              disabled={!brandName}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50"
            >
              Suivant <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Logo</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative group">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                {previewUrl ? (
                  <div className="relative w-32 h-32 mx-auto">
                    <Image src={previewUrl} alt="Preview" width={128} height={128} className="w-full h-full object-contain rounded-xl shadow-sm" unoptimized />
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold">Changer</div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 group-hover:text-gray-900 transition"><Upload size={24} /></div>
                    <p className="text-sm font-medium text-gray-600">Ajouter un logo (Optionnel)</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Couleur principale</label>
              <div className="flex items-center gap-4">
                <div className="h-12 w-full rounded-xl border border-gray-200 flex items-center px-4 gap-3 bg-white">
                  <Palette size={20} className="text-gray-400" />
                  <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full outline-none font-mono text-sm uppercase" />
                </div>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-12 w-12 rounded-xl border-0 cursor-pointer" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Retour</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition">Suivant <ArrowRight size={20} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Adresse du siège</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none font-medium" placeholder="ex: Quartier Talborjt, Agadir" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <CheckCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-blue-800">En cliquant sur &quot;Lancer&quot;, nous allons créer votre espace administrateur sécurisé.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">Retour</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" /> : 'Lancer mon Restaurant 🚀'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}