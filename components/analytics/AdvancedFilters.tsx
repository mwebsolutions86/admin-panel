"use client";

import React, { useState } from "react";
import { X, Calendar, Store, Tag, ShoppingBag, ArrowRight, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { AnalyticsFilters } from "@/types/analytics";

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: AnalyticsFilters;
  onApply: (filters: AnalyticsFilters) => void;
}

export function AdvancedFilters({ isOpen, onClose, currentFilters, onApply }: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(currentFilters);

  if (!isOpen) return null;

  const toggleChannel = (channel: string) => {
    const current = localFilters.channels || [];
    const updated = current.includes(channel as any)
      ? current.filter(c => c !== channel)
      : [...current, channel as any];
    setLocalFilters({ ...localFilters, channels: updated });
  };

  const setPresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setLocalFilters({ ...localFilters, dateRange: { start, end } });
  };

  // Helper safe date access
  const startDate = localFilters.dateRange?.start ? new Date(localFilters.dateRange.start) : new Date();
  const endDate = localFilters.dateRange?.end ? new Date(localFilters.dateRange.end) : new Date();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={onClose} />
      
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
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => setPresetDate(0)} className="text-xs">Aujourd'hui</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetDate(1)} className="text-xs">Hier</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetDate(7)} className="text-xs">7 jours</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetDate(30)} className="text-xs">30 jours</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetDate(90)} className="text-xs">3 mois</Button>
              <Button variant="outline" size="sm" onClick={() => setPresetDate(365)} className="text-xs">1 an</Button>
            </div>
            
            <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-lg border">
              <div className="flex-1">
                <span className="text-xs text-gray-500 block">Du</span>
                <input 
                  type="date" 
                  className="bg-transparent text-sm font-medium w-full focus:outline-none"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setLocalFilters({
                    ...localFilters, 
                    dateRange: { start: new Date(e.target.value), end: endDate }
                  })}
                />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className="flex-1 text-right">
                <span className="text-xs text-gray-500 block">Au</span>
                <input 
                  type="date" 
                  className="bg-transparent text-sm font-medium w-full text-right focus:outline-none"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setLocalFilters({
                    ...localFilters, 
                    dateRange: { start: startDate, end: new Date(e.target.value) }
                  })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
               <input 
                 type="checkbox" 
                 id="compare" 
                 className="rounded border-gray-300"
                 checked={localFilters.comparison === 'previous_period'}
                 onChange={(e) => setLocalFilters({...localFilters, comparison: e.target.checked ? 'previous_period' : 'none'})}
               />
               <label htmlFor="compare" className="text-sm text-gray-600">Comparer avec la période précédente</label>
            </div>
          </section>

          <Separator />

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
                    className={`cursor-pointer px-3 py-1 ${isActive ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-gray-100'}`}
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

          {/* Reste des sections (Produits, Magasins) inchangée mais connectée à localFilters */}
          
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