'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UtensilsCrossed, QrCode, Settings, LogOut, Store, HistoryIcon } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    { name: 'Commandes (Live)', href: '/', icon: LayoutDashboard },
    { name: 'Gestion Menu', href: '/menu', icon: UtensilsCrossed },
    { name: 'QR Codes', href: '/qr-codes', icon: QrCode }, // On le créera bientôt
    { name: 'Paramètres', href: '/settings', icon: Settings }, // Bientôt aussi
    { name: 'Historique', href: '/history', icon: HistoryIcon }
  ]

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* LOGO */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
            <Store size={24} className="text-yellow-400" />
        </div>
        <div>
            <h1 className="font-bold text-lg leading-tight">Universal Eats</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 p-4 space-y-2">
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
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
            <LogOut size={20} />
            <span>Déconnexion</span>
        </button>
        <p className="text-center text-[10px] text-slate-600 mt-4">v1.0.0 - Control Tower</p>
      </div>

    </aside>
  )
}