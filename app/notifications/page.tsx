"use client";

import React, { useEffect, useState } from "react";
import LayoutShell from "@/components/LayoutShell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        } else {
            router.push('/login');
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
      } finally {
        setLoading(false);
      }
    }
    getUser();
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

  if (!userId) return null;

  return (
    <LayoutShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="h-full w-full">
          <NotificationCenter userId={userId} showAnalytics={true} />
        </div>
      </div>
    </LayoutShell>
  );
}