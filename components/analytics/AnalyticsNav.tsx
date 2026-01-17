'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Activity, FileText } from 'lucide-react'

const navItems = [
  { 
    label: "Vue Globale", 
    href: "/analytics", 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    label: "Performance Produits", 
    href: "/analytics/products", 
    icon: Package,
    exact: false
  },
  { 
    label: "Opérations", 
    href: "/analytics/operations", 
    icon: Activity,
    exact: false
  },
  // Vous pourrez ajouter "Rapports" ici plus tard
]

export default function AnalyticsNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-10 pt-6 px-6 md:px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* En-tête de section */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Analytics & Rapports
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Analysez la performance de votre restaurant en temps réel.
          </p>
        </div>

        {/* Barre d'onglets */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname?.startsWith(item.href)

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                  ${isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg'
                  }
                `}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}