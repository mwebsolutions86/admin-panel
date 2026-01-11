"use client";

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  presets?: boolean;
}

export function DateRangePicker({ 
  value, 
  onChange, 
  className = '',
  presets = true 
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // État interne pour la sélection en cours avant validation
  const [calendarDate, setCalendarDate] = useState<DateRange | undefined>(value);

  // Synchronisation props -> state quand la prop change
  useEffect(() => {
    setCalendarDate(value);
  }, [value]);

  // Handler interne : ne déclenche pas onChange tant que l'utilisateur n'a pas confirmé
  const handleDateSelect = (range: DateRange | undefined) => {
    setCalendarDate(range);
  };

  // Appliquer la sélection manuelle via le bouton "Appliquer"
  const applySelection = () => {
    onChange(calendarDate);
    setIsOpen(false);
  };

  // Sélection rapide (Preset) : Applique immédiatement
  const handlePresetSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const newRange = { from: start, to: end };
    setCalendarDate(newRange);
    onChange(newRange);
    setIsOpen(false);
  };

  // Formatage pour l'affichage dans le bouton déclencheur
  const formatDateDisplay = () => {
    if (!value?.from) return 'Sélectionner une période';
    return (
      <>
        {format(value.from, 'dd MMM yyyy', { locale: fr })} 
        {value.to && ` - ${format(value.to, 'dd MMM yyyy', { locale: fr })}`}
      </>
    );
  };

  const presetsOptions = [
    { label: "Aujourd'hui", days: 0 },
    { label: 'Hier', days: 1 },
    { label: '7 derniers jours', days: 7 },
    { label: '30 derniers jours', days: 30 },
    { label: '90 derniers jours', days: 90 },
    { label: 'Ce mois-ci', days: new Date().getDate() - 1 },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          id="date"
          variant="outline" 
          className={cn(
            'w-full justify-start text-left font-normal h-10',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
          <span className="truncate">{formatDateDisplay()}</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0 z-[100] shadow-xl border-gray-200 rounded-xl overflow-hidden" align="start">
        <div className="flex flex-col sm:flex-row max-h-[500px]">
          
          {/* Colonne Presets (Gauche) */}
          {presets && (
            <div className="bg-slate-50/80 border-b sm:border-b-0 sm:border-r border-gray-100 w-full sm:w-[160px] flex flex-col p-2 gap-1 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-gray-400 px-2 py-1 tracking-wider">
                Rapide
              </span>
              {presetsOptions.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs font-medium text-gray-600 hover:text-primary hover:bg-white/80 h-8 px-2"
                  onClick={() => handlePresetSelect(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}

          {/* Zone Calendrier (Droite) */}
          <div className="flex flex-col bg-white">
            <div className="p-3">
              <Calendar
                mode="range"
                defaultMonth={calendarDate?.from}
                selected={calendarDate}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                locale={fr}
                initialFocus
                className="p-0 pointer-events-auto"
              />
            </div>
            
            {/* Footer Actions */}
            <div className="border-t border-gray-100 p-3 bg-gray-50/30 flex items-center justify-between">
              <p className="text-xs text-muted-foreground px-2">
                {calendarDate?.from ? (
                  <>
                    Du <span className="font-medium text-gray-900">{format(calendarDate.from, 'dd MMM', { locale: fr })}</span>
                    {calendarDate.to && (
                      <> au <span className="font-medium text-gray-900">{format(calendarDate.to, 'dd MMM', { locale: fr })}</span></>
                    )}
                  </>
                ) : (
                  "Sélectionnez une plage"
                )}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setIsOpen(false)}
                >
                  Annuler
                </Button>
                <Button 
                  size="sm" 
                  className="h-8 text-xs px-4"
                  onClick={applySelection}
                  disabled={!calendarDate?.from}
                >
                  Appliquer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}