"use client";

import React, { useState } from "react";
import { X, Calendar, ShoppingBag, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "./DateRangePicker";
import { AnalyticsFilters } from "@/types/analytics";

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: AnalyticsFilters;
  onApply: (filters: AnalyticsFilters) => void;
}

export function AdvancedFilters({ isOpen, onClose, currentFilters, onApply }: AdvancedFiltersProps) {
  // Initialisation de l'état local avec les filtres courants
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(currentFilters);

  if (!isOpen) return null;

  // Gestion de la sélection multiple des canaux de vente
  const toggleChannel = (channel: string) => {
    const current = localFilters.channels || [];
    // Cast en 'any' si le type strict des canaux n'est pas importé ici, 
    // ou utiliser le type précis si disponible dans AnalyticsFilters
    const updated = current.includes(channel as any)
      ? current.filter(c => c !== channel)
      : [...current, channel as any];
    setLocalFilters({ ...localFilters, channels: updated });
  };

  return (
    <>
      {/* Overlay sombre */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Panneau latéral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out flex flex-col">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Filtres Avancés</h2>
            <p className="text-sm text-gray-500">Affinez votre analyse historique</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenu défilant */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section Période */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> Période d'analyse
            </h3>
            
            {/* Utilisation du composant standardisé DateRangePicker */}
            <div className="w-full">
               <DateRangePicker 
                 value={localFilters.dateRange}
                 onChange={(range) => setLocalFilters({ ...localFilters, dateRange: range })}
                 className="w-full"
                 presets={true} // Active les raccourcis (7 jours, 30 jours...)
               />
            </div>

            {/* Option de comparaison */}
            <div className="flex items-center gap-2 mt-4 pt-2">
               <input 
                 type="checkbox" 
                 id="compare" 
                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                 checked={localFilters.comparison === 'previous_period'}
                 onChange={(e) => setLocalFilters({
                   ...localFilters, 
                   comparison: e.target.checked ? 'previous_period' : 'none'
                 })}
               />
               <label htmlFor="compare" className="text-sm text-gray-600 cursor-pointer select-none">
                 Comparer avec la période précédente
               </label>
            </div>
          </section>

          <Separator />

          {/* Section Canaux de vente */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-purple-600" /> Canaux de vente
            </h3>
            <div className="flex flex-wrap gap-2">
              {['delivery', 'pickup', 'dine_in', 'aggregator'].map((channel) => {
                const isActive = localFilters.channels?.includes(channel as any);
                return (
                  <Badge 
                    key={channel}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1 transition-colors ${
                      isActive 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => toggleChannel(channel)}
                  >
                    {channel === 'aggregator' ? 'Plateformes' : 
                     channel === 'dine_in' ? 'Sur place' : 
                     channel === 'pickup' ? 'À emporter' : 'Livraison'}
                    {isActive && <Check className="ml-1 h-3 w-3" />}
                  </Badge>
                );
              })}
            </div>
          </section>
        </div>

        {/* Pied de page avec actions */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setLocalFilters(currentFilters)}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser
          </Button>
          <Button 
            className="bg-gray-900 text-white hover:bg-gray-800 px-8"
            onClick={() => onApply(localFilters)}
          >
            Appliquer les filtres
          </Button>
        </div>
      </div>
    </>
  );
}