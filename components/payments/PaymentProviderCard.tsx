/**
 * Composant PaymentProviderCard
 * Carte d'affichage pour un fournisseur de paiement mobile
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobilePaymentProvider } from '@/lib/mobile-payments-service';

interface PaymentProviderCardProps {
  provider: MobilePaymentProvider;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function PaymentProviderCard({
  provider,
  isSelected = false,
  onSelect,
  className
}: PaymentProviderCardProps) {
  const getStatusIcon = () => {
    if (!provider.isActive) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    return provider.isActive ? 'Disponible' : 'Indisponible';
  };

  const getStatusColor = () => {
    return provider.isActive 
      ? 'text-green-700 bg-green-50 border-green-200' 
      : 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-200 cursor-pointer',
        'hover:shadow-lg hover:scale-105 active:scale-95',
        isSelected 
          ? 'ring-2 ring-blue-500 shadow-lg' 
          : 'hover:shadow-md',
        !provider.isActive && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={provider.isActive ? onSelect : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Logo du fournisseur */}
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: provider.color || '#6B7280' }}
            >
              {provider.logo ? (
                <img 
                  src={provider.logo} 
                  alt={provider.name}
                  className="w-8 h-8 rounded"
                  onError={(e) => {
                    // Fallback vers les initiales si l'image ne charge pas
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.textContent = provider.name.substring(0, 2).toUpperCase();
                    }
                  }}
                />
              ) : (
                <Smartphone className="h-6 w-6" />
              )}
            </div>
            
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{provider.name}</h3>
              <p className="text-sm text-slate-600">Paiement mobile</p>
            </div>
          </div>
          
          {/* Badge de statut */}
          <Badge 
            variant="outline" 
            className={cn('flex items-center gap-1', getStatusColor())}
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>

        {/* Informations additionnelles */}
        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Traitement en temps réel</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-3 w-3" />
            <span>Compatible avec tous les opérateurs</span>
          </div>
        </div>

        {/* Code du fournisseur (pour debug) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <code className="text-xs text-slate-400">
              Code: {provider.code}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentProviderCard;