import React from 'react';
import { DateRange } from '@/types/analytics';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assurez-vous d'avoir cette fonction utilitaire, sinon retirez cn()

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ dateRange, onChange, className }: DateRangePickerProps) {
  const formatDate = (date: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value);
    if (!isNaN(newStart.getTime())) {
      onChange({ ...dateRange, start: newStart });
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value);
    if (!isNaN(newEnd.getTime())) {
      onChange({ ...dateRange, end: newEnd });
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center bg-white border rounded-md shadow-sm hover:border-gray-400 transition-colors group focus-within:ring-2 focus-within:ring-offset-1 focus-within:ring-black">
        
        {/* Icône Calendrier */}
        <div className="pl-3 text-gray-500 group-hover:text-black">
          <CalendarIcon className="h-4 w-4" />
        </div>

        {/* Input Début */}
        <div className="relative">
          <input
            type="date"
            value={formatDate(dateRange.start)}
            onChange={handleStartChange}
            className="h-10 py-2 pl-3 pr-2 text-sm bg-transparent border-none outline-none cursor-pointer font-medium text-gray-700"
            required
          />
        </div>

        <span className="text-gray-400">
          <ArrowRight className="h-3 w-3" />
        </span>

        {/* Input Fin */}
        <div className="relative">
          <input
            type="date"
            value={formatDate(dateRange.end)}
            onChange={handleEndChange}
            className="h-10 py-2 pl-2 pr-3 text-sm bg-transparent border-none outline-none cursor-pointer font-medium text-gray-700"
            required
          />
        </div>
      </div>
    </div>
  );
}