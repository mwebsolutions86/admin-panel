'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTaxSettings } from '@/hooks/use-tax-settings';
import { TaxReportsList } from './TaxReportsList';
import { Save, AlertCircle } from 'lucide-react';

interface TaxAdministrationPanelProps {
  storeId: string;
}

export function TaxAdministrationPanel({ storeId }: TaxAdministrationPanelProps) {
  const { config, updateSettings, isSaving, isLoading } = useTaxSettings(storeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    updateSettings({
      standardRate: parseFloat(formData.get('standardRate') as string),
      reducedRate: parseFloat(formData.get('reducedRate') as string),
      superReducedRate: parseFloat(formData.get('superReducedRate') as string),
      vatId: formData.get('vatId') as string,
      professionalTaxId: formData.get('professionalTaxId') as string,
    });
  };

  if (isLoading) return <div>Chargement de la configuration...</div>;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Fiscale</CardTitle>
          <CardDescription>
            Définition des taux de TVA et informations légales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Taux de TVA (%)</span>
                </h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="standardRate">Taux Standard</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="standardRate"
                      name="standardRate"
                      type="number" 
                      defaultValue={config.standardRate} 
                      className="w-24 text-right"
                      step="0.1"
                    />
                    <span className="text-muted-foreground w-4">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="reducedRate">Taux Réduit</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="reducedRate"
                      name="reducedRate"
                      type="number" 
                      defaultValue={config.reducedRate} 
                      className="w-24 text-right"
                      step="0.1"
                    />
                    <span className="text-muted-foreground w-4">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="superReducedRate">Taux Super-réduit</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="superReducedRate"
                      name="superReducedRate"
                      type="number" 
                      defaultValue={config.superReducedRate} 
                      className="w-24 text-right"
                      step="0.1"
                    />
                    <span className="text-muted-foreground w-4">%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="text-sm bg-gray-100 text-gray-800 px-2 py-0.5 rounded">Identifiants Légaux</span>
                </h4>
                
                <div className="space-y-2">
                  <Label htmlFor="vatId">Identifiant Fiscal (IF)</Label>
                  <Input 
                    id="vatId"
                    name="vatId"
                    defaultValue={config.vatId} 
                    placeholder="Ex: 12345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professionalTaxId">Taxe Professionnelle (TP)</Label>
                  <Input 
                    id="professionalTaxId"
                    name="professionalTaxId"
                    defaultValue={config.professionalTaxId} 
                    placeholder="Ex: 87654321"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>Sauvegarde...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer la configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Historique des rapports */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Déclarations</CardTitle>
          <CardDescription>
            Liste des rapports TVA générés et leur statut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaxReportsList storeId={storeId} />
        </CardContent>
      </Card>

      {/* Obligations */}
      <Card>
        <CardHeader>
          <CardTitle>Calendrier Fiscal</CardTitle>
          <CardDescription>Prochaines échéances automatiques</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded bg-orange-50 border-orange-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium text-orange-900">Déclaration TVA Mensuelle</div>
                  <div className="text-sm text-orange-700">Échéance : 20 du mois prochain</div>
                </div>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-800">
                Automatisé
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}