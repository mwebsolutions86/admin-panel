'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  QrCode, 
  Settings, 
  LogOut, 
  Store, 
  HistoryIcon, 
  Users 
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string>('') 
  const [loading, setLoading] = useState(true)

  // 1. D'ABORD : On déclare tous les Hooks (useEffect, etc.)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (data) {
            setRole(data.role)
        }
      } else {
        setRole('')
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
            checkUser() 
        } else if (event === 'SIGNED_OUT') {
            setRole('')
            // router.push('/login') // Pas besoin ici, le useEffect va se relancer
        }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // 2. ENSUITE : On peut faire les retours conditionnels (Early Return)
  // Si on est sur la page login, on cache la sidebar
  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- DÉFINITION DES MENUS ---
  const commonItems = [
    { name: 'Commandes (Live)', href: '/', icon: LayoutDashboard },
    { name: 'Historique', href: '/history', icon: HistoryIcon },
    { name: 'QR Codes', href: '/qr-codes', icon: QrCode },
  ]

  const adminItems = [
    { name: 'Gestion Menu', href: '/menu', icon: UtensilsCrossed },
    { name: 'Points de Vente', href: '/stores', icon: Store },
    { name: 'Équipe & Accès', href: '/users', icon: Users },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ]

  const menuItems = role === 'SUPER_ADMIN' 
    ? [...commonItems, ...adminItems] 
    : commonItems

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* LOGO */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
            <Store size={24} className="text-yellow-400" />
        </div>
        <div>
            <h1 className="font-bold text-lg leading-tight">Universal Eats</h1>
            <p className="text-xs text-slate-400">
                {loading ? '...' : (role === 'SUPER_ADMIN' ? 'Siège / Super Admin' : 'Manager Point de Vente')}
            </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-400/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* FOOTER SIDEBAR */}
      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
            <LogOut size={20} />
            <span>Déconnexion</span>
        </button>
        <p className="text-center text-[10px] text-slate-600 mt-4">v1.0.0 - Control Tower</p>
      </div>

    </aside>
  )
}