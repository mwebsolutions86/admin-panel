'use client'

import React from 'react'
// 🗑️ Import supprimé : import AnalyticsNav from '@/components/analytics/AnalyticsNav'

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* 🗑️ Suppression de <AnalyticsNav /> 
          La navigation par onglets est retirée comme demandé.
          Le header spécifique est désormais géré par chaque page individuellement (ex: page.tsx).
      */}
      
      {/* Contenu de la page */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  )
}