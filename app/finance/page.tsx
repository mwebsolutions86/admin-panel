"use client";

import React, { useEffect, useState } from "react";
import LayoutShell from "@/components/LayoutShell";
import { FinancialAdministration } from "@/components/accounting/FinancialAdministration";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FinancePage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function getStoreData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Récupération du profil pour obtenir le store_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('store_id')
          .eq('id', user.id)
          .single();

        if (profile?.store_id) {
          setStoreId(profile.store_id);
        } else {
          // Fallback : Si pas de store dans le profil, on cherche le premier store actif (admin mode)
          // ou on laisse null pour afficher l'état vide
          const { data: store } = await supabase
            .from('stores')
            .select('id')
            .limit(1)
            .single();
            
          if (store) setStoreId(store.id);
        }

      } catch (error) {
        console.error("Erreur lors du chargement des données finance:", error);
      } finally {
        setLoading(false);
      }
    }
    getStoreData();
  }, [router]);

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {storeId ? (
          <FinancialAdministration storeId={storeId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
            <h3 className="text-lg font-semibold">Aucun magasin sélectionné</h3>
            <p className="text-muted-foreground">
              Veuillez sélectionner ou créer un magasin pour accéder à la gestion financière.
            </p>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}