import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LayoutShell from "@/components/LayoutShell";

export default function PrivacyPage() {
  return (
    <LayoutShell>
      <div className="container max-w-4xl py-8 space-y-6">
        <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
        <Card>
          <CardHeader>
            <CardTitle>Protection des Données (RGPD)</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>Nous nous engageons à protéger les données de vos clients et de vos points de vente...</p>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}