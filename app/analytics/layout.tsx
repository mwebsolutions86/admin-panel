import AnalyticsNav from '@/components/analytics/AnalyticsNav'

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Navigation persistante en haut */}
      <AnalyticsNav />
      
      {/* Contenu de la page actuelle */}
      <div className="max-w-[1920px] mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  )
}