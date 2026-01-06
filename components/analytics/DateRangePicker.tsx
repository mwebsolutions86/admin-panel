/**
 * Composant DateRangePicker
 * Universal Eats - Module Analytics
 */

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock } from 'lucide-react';
import { DateRange } from '@/types/analytics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (dateRange: DateRange) => void;
  className?: string;
  presets?: boolean;
}

export function DateRangePicker({ 
  value, 
  onChange, 
  className = '',
  presets = true 
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>(
    value || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
      end: new Date()
    }
  );

  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
      onChange(range);
    }
  };

  const handlePresetSelect = (preset: { label: string; days: number }) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - preset.days);
    
    const newRange = { start, end };
    setDateRange(newRange);
    onChange(newRange);
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange) => {
    return `${format(range.start, 'dd MMM yyyy', { locale: fr })} - ${format(range.end, 'dd MMM yyyy', { locale: fr })}`;
  };

  const presetsOptions = [
    { label: 'Aujourd\'hui', days: 0 },
    { label: '7 derniers jours', days: 7 },
    { label: '30 derniers jours', days: 30 },
    { label: '90 derniers jours', days: 90 },
    { label: '6 derniers mois', days: 180 },
    { label: '1 an', days: 365 }
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn('w-full justify-start text-left font-normal', className)}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {dateRange ? formatDateRange(dateRange) : 'Sélectionner une période'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Calendrier */}
          <div>
            <Calendar
              mode="range"
              defaultMonth={dateRange?.start}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={fr}
            />
          </div>
          
          {/* Presets */}
          {presets && (
            <div className="border-l">
              <Card className="border-0 rounded-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Périodes rapides
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {presetsOptions.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        className="w-full justify-start h-auto p-2 text-sm"
                        onClick={() => handlePresetSelect(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-between p-3 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const range = { start, end: today };
              setDateRange(range);
              onChange(range);
              setIsOpen(false);
            }}
          >
            Aujourd'hui
          </Button>
          <Button 
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;