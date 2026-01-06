/**
 * Composant FilterPanel
 * Universal Eats - Module Analytics
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Filter, 
  X, 
  Store, 
  Package, 
  Truck, 
  Users,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { AnalyticsFilters } from '@/types/analytics';
import { DateRangePicker } from './DateRangePicker';

interface FilterPanelProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: Partial<AnalyticsFilters>) => void;
  onClose: () => void;
  className?: string;
}

export function FilterPanel({ 
  filters, 
  onFiltersChange, 
  onClose, 
  className = '' 
}: FilterPanelProps) {
  // Données simulées pour les filtres
  const stores = [
    { id: 'store-1', name: 'Momo Delice Casablanca' },
    { id: 'store-2', name: 'Momo Delice Rabat' },
    { id: 'store-3', name: 'Momo Delice Marrakech' },
    { id: 'store-4', name: 'Momo Delice Fès' }
  ];

  const categories = [
    { id: 'cat-1', name: 'Burgers' },
    { id: 'cat-2', name: 'Pizzas' },
    { id: 'cat-3', name: 'Salades' },
    { id: 'cat-4', name: 'Desserts' },
    { id: 'cat-5', name: 'Boissons' }
  ];

  const orderTypes = [
    { id: 'dine-in', name: 'Sur place' },
    { id: 'takeaway', name: 'À emporter' },
    { id: 'delivery', name: 'Livraison' }
  ];

  const handleStoreToggle = (storeId: string) => {
    const currentStores = filters.stores || [];
    const newStores = currentStores.includes(storeId)
      ? currentStores.filter(id => id !== storeId)
      : [...currentStores, storeId];
    
    onFiltersChange({ stores: newStores });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    onFiltersChange({ categories: newCategories });
  };

  const handleOrderTypeToggle = (orderTypeId: string) => {
    const currentOrderTypes = filters.orderTypes || [];
    const newOrderTypes = currentOrderTypes.includes(orderTypeId)
      ? currentOrderTypes.filter(id => id !== orderTypeId)
      : [...currentOrderTypes, orderTypeId];
    
    onFiltersChange({ orderTypes: newOrderTypes });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      stores: [],
      categories: [],
      orderTypes: []
    });
  };

  const hasActiveFilters = 
    (filters.stores && filters.stores.length > 0) ||
    (filters.categories && filters.categories.length > 0) ||
    (filters.orderTypes && filters.orderTypes.length > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {[
                  filters.stores?.length || 0,
                  filters.categories?.length || 0,
                  filters.orderTypes?.length || 0
                ].reduce((a, b) => a + b, 0)} actifs
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Période */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4" />
            Période d'analyse
          </Label>
          <DateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => onFiltersChange({ dateRange })}
          />
        </div>

        {/* Magasins */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Store className="h-4 w-4" />
            Magasins
          </Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stores.map((store) => (
              <div key={store.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`store-${store.id}`}
                  checked={filters.stores?.includes(store.id) || false}
                  onCheckedChange={() => handleStoreToggle(store.id)}
                />
                <Label 
                  htmlFor={`store-${store.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {store.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Catégories */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4" />
            Catégories de produits
          </Label>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={filters.categories?.includes(category.id) || false}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <Label 
                  htmlFor={`category-${category.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Types de commande */}
        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4" />
            Types de commande
          </Label>
          <div className="space-y-2">
            {orderTypes.map((orderType) => (
              <div key={orderType.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`ordertype-${orderType.id}`}
                  checked={filters.orderTypes?.includes(orderType.id) || false}
                  onCheckedChange={() => handleOrderTypeToggle(orderType.id)}
                />
                <Label 
                  htmlFor={`ordertype-${orderType.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {orderType.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Effacer tout
          </Button>
          
          <Button 
            size="sm"
            onClick={onClose}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Appliquer
          </Button>
        </div>

        {/* Résumé des filtres actifs */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Filtres actifs :</h4>
            <div className="space-y-1 text-xs">
              {filters.stores && filters.stores.length > 0 && (
                <div className="flex items-center gap-2">
                  <Store className="h-3 w-3" />
                  <span>{filters.stores.length} magasin(s) sélectionné(s)</span>
                </div>
              )}
              {filters.categories && filters.categories.length > 0 && (
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  <span>{filters.categories.length} catégorie(s) sélectionnée(s)</span>
                </div>
              )}
              {filters.orderTypes && filters.orderTypes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3" />
                  <span>{filters.orderTypes.length} type(s) de commande sélectionné(s)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FilterPanel;