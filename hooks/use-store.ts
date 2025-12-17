import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export interface ThemeConfig {
  primaryColor: string
  borderRadius: string
  [key: string]: unknown
}

export interface StoreProfile {
  store_id: string
  brand_id: string
  role: string
  store_name: string
  brand_name: string
  brand_logo: string | null // <--- NOUVEAU CHAMP
  theme: ThemeConfig
}

interface ProfileQueryResponse {
  store_id: string
  brand_id: string
  role: string
  stores: { name: string } | null
  // On ajoute logo_url ici aussi
  brands: { name: string; theme_config: ThemeConfig; logo_url: string | null } | null
}

export function useStore() {
  const [store, setStore] = useState<StoreProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchStoreProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        // ON AJOUTE logo_url DANS LA REQUÊTE
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            store_id,
            brand_id,
            role,
            stores ( name ),
            brands ( name, theme_config, logo_url ) 
          `)
          .eq('id', user.id)
          .single()

        if (error || !data) throw new Error('Aucun magasin associé à ce compte')

        const profileData = data as unknown as ProfileQueryResponse

        setStore({
          store_id: profileData.store_id,
          brand_id: profileData.brand_id,
          role: profileData.role,
          store_name: profileData.stores?.name ?? 'Magasin Inconnu',
          brand_name: profileData.brands?.name ?? 'Marque Inconnue',
          brand_logo: profileData.brands?.logo_url ?? null, // <--- ON LE STOCKE
          theme: profileData.brands?.theme_config ?? { primaryColor: '#000000', borderRadius: '8px' }
        })

      } catch (err) {
        console.error('Erreur authentification store:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStoreProfile()
  }, [router])

  return { store, loading }
}