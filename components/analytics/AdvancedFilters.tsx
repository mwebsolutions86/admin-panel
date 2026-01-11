"use client";

import React, { useState } from "react";
import { X, Calendar, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "./DateRangePicker";
import { AnalyticsFilters } from "@/types/analytics";
import { DateRange } from "react-day-picker";

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: AnalyticsFilters;
  onApply: (filters: AnalyticsFilters) => void;
}

export function AdvancedFilters({ isOpen, onClose, currentFilters, onApply }: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(currentFilters);

  if (!isOpen) return null;

  // Adaptateurs de types
  const getPickerValue = (range: any): DateRange | undefined => {
    if (!range?.start) return undefined;
    return {
      from: new Date(range.start),
      to: range.end ? new Date(range.end) : undefined
    };
  };

  const handlePickerChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setLocalFilters({
        ...localFilters,
        dateRange: {
          start: range.from,
          end: range.to || range.from
        }
      });
    } else {
      setLocalFilters({ ...localFilters, dateRange: undefined });
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Filtres Avancés</h2>
            <p className="text-sm text-gray-500">Affinez votre analyse historique</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> Période d'analyse
            </h3>
            
            <div className="w-full">
               {/* Le composant restauré avec le design premium */}
               <DateRangePicker 
                 value={getPickerValue(localFilters.dateRange)}
                 onChange={handlePickerChange}
                 className="w-full"
                 presets={true}
               />
            </div>

            <div className="flex items-center gap-2 mt-4 pt-2">
               <input 
                 type="checkbox" 
                 id="compare" 
                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                 checked={localFilters.comparison === true}
                 onChange={(e) => setLocalFilters({
                   ...localFilters, 
                   comparison: e.target.checked
                 })}
               />
               <label htmlFor="compare" className="text-sm text-gray-600 cursor-pointer select-none">
                 Comparer avec la période précédente
               </label>
            </div>
          </section>

          <Separator />
          
          {/* Les autres filtres (canaux, magasins) peuvent être ajoutés ici si besoin, 
              mais on garde propre pour l'instant pour valider le build */}
        </div>

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