"use client";

import React, { useEffect, useState } from "react";
import LayoutShell from "@/components/LayoutShell";
import PromotionsManager from "@/components/promotions/PromotionsManager";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function PromotionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, []);

  if (loading) {
    return (
      <LayoutShell>
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  // Si aucun utilisateur n'est trouvé (sécurité supplémentaire, bien que AuthGuard gère normalement la redirection)
  if (!userId) {
    return null; 
  }

  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Gestion des Promotions</h2>
        </div>
        <div className="h-full w-full">
          <PromotionsManager userId={userId} />
        </div>
      </div>
    </LayoutShell>
  );
}