'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar'; // Vérifie bien la majuscule du fichier

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // On cache la Sidebar et la marge UNIQUEMENT sur la page login
  const isLoginPage = pathname === '/login';

  return (
    <div className="flex min-h-screen">
      {/* La Sidebar ne s'affiche pas sur le login */}
      {!isLoginPage && <Sidebar />}

      {/* Le contenu principal : Si login, pas de marge. Sinon, marge de 64 (256px) */}
      <main className={`flex-1 min-h-screen bg-gray-50/50 transition-all duration-300 ${isLoginPage ? '' : 'ml-64'}`}>
        {children}
      </main>
    </div>
  );
}