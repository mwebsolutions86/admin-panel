"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutShell from "@/components/LayoutShell";
import PromotionEditor from "@/components/promotions/PromotionEditor";
import { usePromotionsActions } from "@/hooks/use-promotions";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModuleFooter } from "@/components/ModuleFooter";

export default function NewPromotionPage() {
  const router = useRouter();
  const { createPromotion, isProcessing } = usePromotionsActions();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubmit = async (data: any) => {
    if (!userId) return;
    try {
      await createPromotion({
        ...data,
        createdBy: userId
      });
      // Redirection vers la liste après succès
      router.push("/promotions");
    } catch (error) {
      console.error("Erreur lors de la création de la promotion:", error);
      // La gestion d'erreur UI est généralement gérée par le hook ou des toasts
    }
  };

  const handleCancel = () => {
    router.back();
  };

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
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Nouvelle Promotion</h2>
        </div>

        <div className="mx-auto max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Configuration de la promotion</CardTitle>
                    <CardDescription>Définissez les règles, la durée et les conditions de votre offre.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PromotionEditor
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isLoading={isProcessing}
                    />
                </CardContent>
            </Card>
        </div>
      </div>
      {/* AJOUT FOOTER */}
      <ModuleFooter />
    </LayoutShell>
  );
}