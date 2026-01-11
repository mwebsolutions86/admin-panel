import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, SlidersHorizontal } from 'lucide-react';
import { AnalyticsFilters } from '@/types/analytics';
import { DateRangePicker } from './DateRangePicker';
import { DateRange } from "react-day-picker";

interface FilterPanelProps {
  filters: AnalyticsFilters;
  onFilterChange: (filters: AnalyticsFilters) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function FilterPanel({ filters, onFilterChange, onRefresh, loading }: FilterPanelProps) {
  
  const getPickerValue = (range: any): DateRange | undefined => {
    if (!range?.start) return undefined;
    return {
      from: new Date(range.start),
      to: range.end ? new Date(range.end) : undefined
    };
  };

  const handlePickerChange = (range: DateRange | undefined) => {
    if (range?.from) {
      onFilterChange({
        ...filters,
        dateRange: {
          start: range.from,
          end: range.to || range.from
        }
      });
    }
  };

  return (
    <Card className="mb-6 border-none shadow-sm bg-muted/30">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md border shadow-sm">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Filtres</span>
            </div>
            
            <div className="h-8 w-[1px] bg-gray-300 hidden sm:block mx-2"></div>

            <DateRangePicker 
              value={getPickerValue(filters.dateRange)} 
              onChange={handlePickerChange} 
              presets={true}
              className="w-[260px]" 
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="bg-white hover:bg-gray-50 border-gray-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              className="bg-black text-white hover:bg-gray-800"
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}