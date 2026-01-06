/**
 * Composant MobilePaymentSelector
 * Sélecteur de fournisseur de paiement mobile avec interface intuitive
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Phone, 
  CreditCard, 
  ArrowRight, 
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobilePaymentProvider, mobilePaymentsService } from '@/lib/mobile-payments-service';
import PaymentProviderCard from './PaymentProviderCard';

interface MobilePaymentSelectorProps {
  orderId: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
  customerName?: string;
  onPaymentRequest: (providerCode: string, phoneNumber: string) => Promise<void>;
  className?: string;
}

export function MobilePaymentSelector({
  orderId,
  amount,
  currency = 'MAD',
  customerPhone = '',
  customerName = '',
  onPaymentRequest,
  className
}: MobilePaymentSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<MobilePaymentProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(customerPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = mobilePaymentsService.getActiveProviders();

  const validatePhoneNumber = (phone: string): boolean => {
    // Formats acceptés : +2126XXXXXXXX, 06XXXXXXXX, 2126XXXXXXXX
    const patterns = [
      /^\+2126\d{8}$/,
      /^06\d{8}$/,
      /^2126\d{8}$/
    ];
    
    return patterns.some(pattern => pattern.test(phone));
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    setError(null);
  };

  const handleProviderSelect = (provider: MobilePaymentProvider) => {
    setSelectedProvider(provider);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedProvider) {
      setError('Veuillez sélectionner un fournisseur de paiement');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Veuillez saisir un numéro de téléphone');
      return;
    }

    if (!validatePhoneNumber(phoneNumber.trim())) {
      setError('Format de numéro invalide. Utilisez: +2126XXXXXXXX ou 06XXXXXXXX');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onPaymentRequest(selectedProvider.code, phoneNumber.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la demande de paiement');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalFormatted = () => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Paiement Mobile
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Commande: #{orderId}</span>
          <span>•</span>
          <span className="font-bold text-foreground">{getTotalFormatted()}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informations client */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Nom du client</Label>
              <Input
                id="customerName"
                value={customerName}
                disabled
                className="bg-muted"
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">
                Numéro de téléphone *
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneNumberChange(e.target.value)}
                placeholder="+2126XXXXXXXX ou 06XXXXXXXX"
                className={cn(
                  'font-mono',
                  phoneNumber && !validatePhoneNumber(phoneNumber) && 'border-red-500'
                )}
              />
              {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                <p className="text-sm text-red-500 mt-1">
                  Format invalide. Utilisez: +2126XXXXXXXX ou 06XXXXXXXX
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Sélection du fournisseur */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <Label className="text-base font-semibold">
              Choisir un fournisseur de paiement
            </Label>
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Aucun fournisseur de paiement mobile n'est disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <PaymentProviderCard
                  key={provider.code}
                  provider={provider}
                  isSelected={selectedProvider?.code === provider.code}
                  onSelect={() => handleProviderSelect(provider)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Aperçu de la sélection */}
        {selectedProvider && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Sélection confirmée</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fournisseur:</span>
                <p className="font-medium">{selectedProvider.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Montant:</span>
                <p className="font-medium">{getTotalFormatted()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Téléphone:</span>
                <p className="font-medium font-mono">{phoneNumber}</p>
              </div>
            </div>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Erreur</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Instructions de paiement:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Vous recevrez une notification sur votre téléphone</li>
                <li>• Confirmez le paiement via votre application mobile money</li>
                <li>• La commande sera confirmée automatiquement après validation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bouton de soumission */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedProvider || !validatePhoneNumber(phoneNumber) || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Création de la demande...
            </>
          ) : (
            <>
              Demander le paiement
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default MobilePaymentSelector;