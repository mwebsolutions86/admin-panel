import React, { useState } from 'react';
import { useCombo } from '@/hooks/use-combo';
import { ProductSelector } from './ProductSelector';
import { 
  Plus, Trash2, GripVertical, AlertCircle, 
  ChevronDown, ChevronUp, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ComboManagerProps {
  parentProductId: string;
}

export default function ComboManager({ parentProductId }: ComboManagerProps) {
  const { steps, loading, addStep, deleteStep, addItemToStep, deleteItem } = useCombo(parentProductId);
  const [newStepName, setNewStepName] = useState('');
  const [openStepId, setOpenStepId] = useState<string | null>(null);

  if (loading) return <div className="p-8 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Composition du Menu
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les étapes (ex: Choix 1, Choix 2) et les produits disponibles pour ce menu.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {steps.length} étape(s) configurée(s)
        </Badge>
      </div>

      {/* Liste des Étapes */}
      <div className="space-y-4">
        {steps.map((step, index) => {
           const isOpen = openStepId === step.id;
           
           return (
            <Card key={step.id} className={`transition-all border-l-4 ${isOpen ? 'border-l-primary shadow-md' : 'border-l-slate-300'}`}>
              
              {/* Header de l'étape */}
              <div className="p-4 flex items-center justify-between">
                <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => setOpenStepId(isOpen ? null : step.id)}
                >
                  <div className="h-8 w-8 rounded-full bg-slate-100 border flex items-center justify-center font-bold text-slate-600 text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">{step.name}</h4>
                    <p className="text-xs text-muted-foreground flex gap-2">
                      <span>Min: {step.min_selection}</span> • <span>Max: {step.max_selection}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setOpenStepId(isOpen ? null : step.id)}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                        if(confirm('Supprimer cette étape et tous ses choix ?')) deleteStep(step.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Contenu de l'étape (Items + Sélecteur) */}
              {isOpen && (
                <div className="border-t bg-slate-50/50 p-4 space-y-4">
                    
                    {/* Liste des produits dans cette étape */}
                    <div className="space-y-2">
                        {step.items && step.items.length > 0 ? (
                             step.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border shadow-sm group">
                                    <div className="flex items-center gap-3">
                                        {item.product?.image_url ? (
                                            <img src={item.product.image_url} className="h-8 w-8 rounded object-cover border" />
                                        ) : (
                                            <div className="h-8 w-8 rounded bg-slate-100 border" />
                                        )}
                                        <span className="font-medium text-sm">{item.product?.name || 'Produit inconnu'}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-xs bg-slate-100 px-2 py-1 rounded">
                                            <span className="text-muted-foreground">Extra:</span>
                                            <span className="font-mono font-bold">
                                                {item.extra_price && item.extra_price > 0 ? `+${item.extra_price}€` : 'Gratuit'}
                                            </span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-slate-400 hover:text-red-500"
                                            onClick={() => deleteItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="p-4 border border-dashed rounded bg-yellow-50/50 text-yellow-700 text-sm flex items-center justify-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Aucun produit disponible pour ce choix. Ajoutez-en ci-dessous.
                            </div>
                        )}
                    </div>

                    {/* Zone d'ajout via ProductSelector */}
                    <div className="mt-4 pt-4 border-t border-dashed">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Ajouter un produit à ce choix
                        </p>
                        <ProductSelector 
                            excludedIds={step.items?.map(i => i.product_id!) || []}
                            onSelect={(prodId) => addItemToStep(step.id, prodId, 0)}
                        />
                    </div>
                </div>
              )}
            </Card>
           );
        })}

        {/* Création Nouvelle Étape */}
        {steps.length === 0 && (
            <div className="text-center py-10 bg-slate-50 border border-dashed rounded-lg">
                <Layers className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-muted-foreground">Ce menu n'a pas encore de contenu.</p>
                <p className="text-sm text-slate-400">Commencez par ajouter une étape (ex: Boissons).</p>
            </div>
        )}
      </div>

      <div className="flex gap-2 p-4 bg-white border rounded-lg shadow-sm sticky bottom-4">
        <Input 
            value={newStepName} 
            onChange={(e) => setNewStepName(e.target.value)}
            placeholder="Nom de la nouvelle étape (ex: Accompagnements)"
            className="flex-1"
        />
        <Button onClick={() => { if(newStepName) { addStep(newStepName); setNewStepName(''); }}} disabled={!newStepName}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter l'étape
        </Button>
      </div>
    </div>
  );
}