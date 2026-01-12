import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Loader2, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assurez-vous d'avoir ce composant ou une div avec overflow-y-auto

interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

interface ProductSelectorProps {
  onSelect: (productId: string) => void;
  excludedIds?: string[]; // Pour éviter de sélectionner le produit lui-même ou des doublons
}

export function ProductSelector({ onSelect, excludedIds = [] }: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  // Debounce pour éviter trop de requêtes SQL
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedTerm || debouncedTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // On cherche seulement les produits 'simple' pour éviter les boucles (Menu dans Menu)
        let query = supabase
          .from('products')
          .select('id, name, price, image_url, category_id')
          .eq('type', 'simple') 
          .ilike('name', `%${debouncedTerm}%`)
          .limit(10);

        if (excludedIds.length > 0) {
          query = query.not('id', 'in', `(${excludedIds.join(',')})`);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Erreur recherche produit:", err);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [debouncedTerm, excludedIds]);

  return (
    <div className="space-y-3 p-3 border rounded-md bg-background shadow-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit (ex: Frites, Coca...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-[200px] overflow-y-auto rounded-md border bg-slate-50 p-1">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-2 hover:bg-white hover:shadow-sm rounded transition-all group cursor-pointer"
              onClick={() => {
                  onSelect(product.id);
                  setSearchTerm(''); // Reset après sélection
                  setResults([]);
              }}
            >
              <div className="flex items-center gap-3">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="h-8 w-8 rounded object-cover border" 
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium leading-none">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.price} €</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <Plus className="h-4 w-4 text-green-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {debouncedTerm.length >= 2 && results.length === 0 && !loading && (
        <p className="text-center text-xs text-muted-foreground py-2">
            Aucun produit trouvé.
        </p>
      )}
    </div>
  );
}