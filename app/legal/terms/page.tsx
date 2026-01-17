import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LayoutShell from "@/components/LayoutShell";

export default function TermsPage() {
  return (
    <LayoutShell>
      <div className="container max-w-4xl py-8 space-y-6">
        <h1 className="text-3xl font-bold">Mentions Légales & CGU</h1>
        <Card>
          <CardHeader>
            <CardTitle>Conditions Générales d'Utilisation</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>Dernière mise à jour : {new Date().toLocaleDateString()}</p>
            <p>L'utilisation de ce panneau d'administration est strictement réservée au personnel autorisé...</p>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}