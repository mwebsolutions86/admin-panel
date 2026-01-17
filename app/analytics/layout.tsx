'use client'

import React from 'react'
import AnalyticsNav from '@/components/analytics/AnalyticsNav'
// ❌ On supprime l'import de ModuleFooter ici

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* Navigation du Haut (Onglets) */}
      <AnalyticsNav />
      
      {/* Contenu de la page */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>

      {/* ❌ On supprime le bloc <div className="mt-auto"><ModuleFooter /></div> ici */}
    </div>
  )
}