'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. On laisse passer si c'est la page de login pour éviter une boucle infinie
      if (pathname === '/login') {
        setLoading(false);
        return;
      }

      // 2. Vérification de la session active
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Pas connecté -> Oust !
        router.replace('/login');
      } else {
        // Connecté -> Bienvenue
        setIsAuthenticated(true);
        setLoading(false);
      }
    };

    checkAuth();

    // Écouteur en cas de déconnexion soudaine (ex: suppression cookies)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (pathname !== '/login') {
            router.replace('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  // ÉTAT 1 : Chargement... (On affiche un écran blanc avec loader)
  if (loading && pathname !== '/login') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={40} className="animate-spin text-slate-900" />
      </div>
    );
  }

  // ÉTAT 2 : Pas connecté (On n'affiche rien du tout en attendant la redirection)
  if (!isAuthenticated && pathname !== '/login') {
    return null; 
  }

  // ÉTAT 3 : Tout est bon, on affiche l'application
  return <>{children}</>;
}