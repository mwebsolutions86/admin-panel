/**
 * Composants UI pour la Comptabilité et Gestion Financière
 * Universal Eats - Interface utilisateur comptable
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  useFinancialDashboard, 
  useEntries, 
  useChartOfAccounts, 
  useVATReports, 
  useFinancialAlerts, 
  useTrialBalance 
} from '@/hooks/use-accounting';
import type {
  AccountingEntry,
  JournalEntryLine,
  FinancialKPI,
  FinancialAlert,
  Account,
  TrialBalance,
  VATReport,
  FinancialStatementType
} from '@/types/accounting';

// Icônes (à remplacer par des vraies icônes)
const Icon: Record<string, (props?: any) => JSX.Element> = {
  TrendingUp: (props?: any) => <span {...props}>📈</span>,
  TrendingDown: (props?: any) => <span {...props}>📉</span>,
  DollarSign: (props?: any) => <span {...props}>💰</span>,
  AlertTriangle: (props?: any) => <span {...props}>⚠️</span>,
  CheckCircle: (props?: any) => <span {...props}>✅</span>,
  XCircle: (props?: any) => <span {...props}>❌</span>,
  FileText: (props?: any) => <span {...props}>📄</span>,
  Calculator: (props?: any) => <span {...props}>🧮</span>,
  BarChart3: (props?: any) => <span {...props}>📊</span>,
  PieChart: (props?: any) => <span {...props}>🥧</span>,
  Download: (props?: any) => <span {...props}>⬇️</span>,
  Plus: (props?: any) => <span {...props}>➕</span>,
  Filter: (props?: any) => <span {...props}>🔍</span>,
  RefreshCw: (props?: any) => <span {...props}>🔄</span>
};

/**
 * === TABLEAU DE BORD FINANCIER PRINCIPAL ===
 */
interface FinancialDashboardProps {
  storeId: string;
  className?: string;
}

export function FinancialDashboard({ storeId, className }: FinancialDashboardProps) {
  const { 
    dashboard, 
    isLoading, 
    error, 
    refreshKPIs 
  } = useFinancialDashboard({ storeId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Alert variant="destructive">
        <Icon.AlertTriangle />
        <AlertDescription>
          Erreur lors du chargement du tableau de bord: {message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tableau de Bord Financier
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des performances financières en temps réel
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshKPIs}
          >
            <Icon.RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button size="sm">
            <Icon.Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {dashboard?.kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboard.kpis.map((kpi: FinancialKPI) => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Graphiques et analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dashboard?.charts && dashboard.charts.length > 0 && (
          <div className="space-y-6">
            {dashboard.charts.slice(0, 2).map((chart: any) => (
              <FinancialChart key={chart.id} chart={chart} />
            ))}
          </div>
        )}
        
        {/* Alertes */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <FinancialAlertsList alerts={dashboard.alerts} />
        )}
      </div>
    </div>
  );
}

/**
 * Carte KPI Financière
 */
interface FinancialKPICardProps {
  kpi: FinancialKPI;
}

export function FinancialKPICard({ kpi }: FinancialKPICardProps) {
  const TrendIcon = kpi.trend === 'up' ? Icon.TrendingUp : 
                   kpi.trend === 'down' ? Icon.TrendingDown : 
                   Icon.BarChart3;

  const trendColor = kpi.trend === 'up' ? 'text-green-600' : 
                    kpi.trend === 'down' ? 'text-red-600' : 
                    'text-gray-600';

  const categoryColors = {
    revenue: 'bg-blue-100 text-blue-800',
    profitability: 'bg-green-100 text-green-800',
    liquidity: 'bg-purple-100 text-purple-800',
    efficiency: 'bg-orange-100 text-orange-800',
    growth: 'bg-pink-100 text-pink-800'
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {kpi.nameFr}
        </CardTitle>
        <Badge variant="outline" className={categoryColors[kpi.category]}>
          {kpi.category}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {kpi.unit === 'currency' 
            ? `${kpi.value.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}`
            : `${kpi.value.toFixed(2)}${kpi.unit === 'percentage' ? '%' : kpi.unit === 'number' ? '' : ` ${kpi.unit}`}`
          }
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <TrendIcon className={`h-4 w-4 mr-1 ${trendColor}`} />
          <span className={trendColor}>
            {kpi.changePercentage >= 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}%
          </span>
          <span className="ml-1">vs période précédente</span>
        </div>
        {kpi.target && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Objectif</span>
              <span>{kpi.target.toFixed(1)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Composant Graphique Financier
 */
interface FinancialChartProps {
  chart: any; // Type FinancialChart
}

export function FinancialChart({ chart }: FinancialChartProps) {
  // Implémentation simplifiée - à remplacer par un vrai composant de graphique
  return (
    <Card>
      <CardHeader>
        <CardTitle>{chart.titleFr || chart.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center text-gray-500">
            <Icon.PieChart className="h-12 w-12 mx-auto mb-2" />
            <p>Graphique {chart.type}</p>
            <p className="text-sm">Données: {chart.data?.length || 0} points</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Liste des Alertes Financières
 */
interface FinancialAlertsListProps {
  alerts: FinancialAlert[];
}

export function FinancialAlertsList({ alerts }: FinancialAlertsListProps) {
  const severityColors = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-red-200 text-red-900 border-red-300'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon.AlertTriangle className="h-5 w-5 mr-2" />
          Alertes Financières ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Alert key={alert.id} className={severityColors[alert.severity]}>
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm mt-1">{alert.message}</p>
                    {alert.value && (
                      <p className="text-xs mt-1">
                        Valeur: {alert.value.toLocaleString('fr-MA', { 
                          style: 'currency', 
                          currency: 'MAD' 
                        })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {alert.category}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * === GESTION DES ÉCRITURES COMPTABLES ===
 */
interface EntriesManagementProps {
  storeId: string;
}

export function EntriesManagement({ storeId }: EntriesManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null);
  
  const { 
    entries, 
    isLoading, 
    createEntry 
  } = useEntries({ storeId });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Écritures Comptables</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Icon.Plus className="h-4 w-4 mr-2" />
          Nouvelle Écriture
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.journal}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell>
                    {entry.amount.toLocaleString('fr-MA', { 
                      style: 'currency', 
                      currency: 'MAD' 
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.isPosted ? 'default' : 'secondary'}>
                      {entry.isPosted ? 'Validée' : 'Brouillon'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>
                          <Icon.FileText className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        {!entry.isPosted && (
                          <DropdownMenuItem>
                            <Icon.CheckCircle className="h-4 w-4 mr-2" />
                            Valider
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Icon.Download className="h-4 w-4 mr-2" />
                          Exporter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de création d'écriture */}
      <CreateEntryDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        storeId={storeId}
        onSuccess={() => setShowCreateDialog(false)}
      />

      {/* Dialog de détails d'écriture */}
      {selectedEntry && (
        <EntryDetailsDialog 
          entry={selectedEntry}
          open={!!selectedEntry}
          onOpenChange={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

/**
 * Dialog de Création d'Écriture
 */
interface CreateEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onSuccess?: () => void;
}

export function CreateEntryDialog({ 
  open, 
  onOpenChange, 
  storeId, 
  onSuccess 
}: CreateEntryDialogProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    journal: 'OD',
    description: '',
    reference: '',
    currency: 'MAD'
  });

  const [lines, setLines] = useState<Omit<JournalEntryLine, 'id' | 'date' | 'storeId'>[]>([
    { accountId: '', accountCode: '', accountName: '', debit: 0, credit: 0, description: '' }
  ]);

  // Hook pour créer des écritures via le service de comptabilité
  const { createEntry, addLines } = useEntries({ storeId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validation basique
      if (!formData.description.trim()) {
        alert('La description est requise');
        return;
      }

      if (lines.length === 0) {
        alert('Au moins une ligne comptable est requise');
        return;
      }

      const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        alert(`L'écriture doit être équilibrée. Différence: ${Math.abs(totalDebit - totalCredit)}`);
        return;
      }

      // Créer l'écriture (les lignes seront ajoutées séparément)
      const createdEntry = await createEntry({
        storeId,
        entryNumber: '',
        ...formData,
        amount: Math.max(totalDebit, totalCredit),
        createdBy: 'current_user', // À remplacer
        isPosted: false,
        isReversed: false,
        lines: []
      });

      // Ajouter les lignes après création (addLines accepte les lignes sans id/date/storeId)
      if (createdEntry && createdEntry.id && lines.length > 0) {
        await addLines(createdEntry.id, lines);
      }

      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Erreur création écriture:', error);
      alert('Erreur lors de la création de l\'écriture');
    }
  };

  const addLine = () => {
    setLines([...lines, { 
      accountId: '', 
      accountCode: '', 
      accountName: '', 
      debit: 0, 
      credit: 0, 
      description: '' 
    }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nouvelle Écriture Comptable</DialogTitle>
          <DialogDescription>
            Créez une nouvelle écriture comptable en respectant le principe de la partie double.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="journal">Journal</Label>
              <Select value={formData.journal} onValueChange={(value) => setFormData({ ...formData, journal: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OD">Opérations Diverses</SelectItem>
                  <SelectItem value="VT">Ventes</SelectItem>
                  <SelectItem value="BK">Banque</SelectItem>
                  <SelectItem value="CA">Caisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'écriture"
              required
            />
          </div>

          <div>
            <Label htmlFor="reference">Référence (optionnel)</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Référence ou numéro de document"
            />
          </div>

          {/* Lignes comptables */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Lignes Comptables</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Icon.Plus className="h-4 w-4 mr-2" />
                Ajouter ligne
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                  <div className="col-span-3">
                    <Input
                      placeholder="Numéro de compte"
                      value={line.accountCode}
                      onChange={(e) => updateLine(index, 'accountCode', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      placeholder="Libellé du compte"
                      value={line.accountName}
                      onChange={(e) => updateLine(index, 'accountName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Débit"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Crédit"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      <Icon.XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totaux */}
            <div className="mt-4 p-2 bg-gray-50 rounded">
              <div className="flex justify-between text-sm">
                <span>Total Débit: {lines.reduce((sum, line) => sum + line.debit, 0).toFixed(2)} MAD</span>
                <span>Total Crédit: {lines.reduce((sum, line) => sum + line.credit, 0).toFixed(2)} MAD</span>
                <span className={`font-medium ${Math.abs(lines.reduce((sum, line) => sum + line.debit - line.credit, 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  Équilibré: {Math.abs(lines.reduce((sum, line) => sum + line.debit - line.credit, 0)) < 0.01 ? 'Oui' : 'Non'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer l'Écriture
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog de Détails d'Écriture
 */
interface EntryDetailsDialogProps {
  entry: AccountingEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryDetailsDialog({ entry, open, onOpenChange }: EntryDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Écriture {entry.entryNumber}</DialogTitle>
          <DialogDescription>
            Détails de l'écriture comptable du {new Date(entry.date).toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <p className="text-sm">{new Date(entry.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <Label>Journal</Label>
              <p className="text-sm">{entry.journal}</p>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <p className="text-sm">{entry.description}</p>
            </div>
            {entry.reference && (
              <div className="col-span-2">
                <Label>Référence</Label>
                <p className="text-sm">{entry.reference}</p>
              </div>
            )}
            <div>
              <Label>Montant</Label>
              <p className="text-sm font-medium">
                {entry.amount.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
              </p>
            </div>
            <div>
              <Label>Statut</Label>
              <Badge variant={entry.isPosted ? 'default' : 'secondary'}>
                {entry.isPosted ? 'Validée' : 'Brouillon'}
              </Badge>
            </div>
          </div>

          {/* Lignes comptables */}
          <div>
            <Label>Lignes Comptables</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.accountCode}</TableCell>
                    <TableCell>{line.accountName}</TableCell>
                    <TableCell className="text-right">
                      {line.debit > 0 ? line.debit.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit > 0 ? line.credit.toFixed(2) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {!entry.isPosted && (
            <Button>
              <Icon.CheckCircle className="h-4 w-4 mr-2" />
              Valider l'Écriture
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * === RAPPORTS TVA ===
 */
interface VATReportsProps {
  storeId: string;
  periodId: string;
}

export function VATReports({ storeId, periodId }: VATReportsProps) {
  const { vatReport, isLoading, error } = useVATReports({ storeId, periodId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rapport TVA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Alert variant="destructive">
        <Icon.AlertTriangle />
        <AlertDescription>
          Erreur lors du chargement du rapport TVA: {message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!vatReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rapport TVA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun rapport TVA disponible pour cette période.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Rapport TVA
            <Badge variant={vatReport.status === 'submitted' ? 'default' : 'secondary'}>
              {vatReport.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Période: {new Date(periodId).toLocaleDateString('fr-FR')} - 
            Taux TVA: {(vatReport.vatRate * 100).toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Ventes */}
            <div className="space-y-4">
              <h4 className="font-medium text-green-600">Ventes ( TVA Collectée )</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Chiffre d'affaires HT:</span>
                  <span className="font-medium">
                    {vatReport.taxableSales.toLocaleString('fr-MA', { 
                      style: 'currency', 
                      currency: 'MAD' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TVA collectée:</span>
                  <span className="font-medium text-green-600">
                    {vatReport.vatOnSales.toLocaleString('fr-MA', { 
                      style: 'currency', 
                      currency: 'MAD' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Achats */}
            <div className="space-y-4">
              <h4 className="font-medium text-blue-600">Achats ( TVA Déductible )</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Achats HT:</span>
                  <span className="font-medium">
                    {vatReport.taxablePurchases.toLocaleString('fr-MA', { 
                      style: 'currency', 
                      currency: 'MAD' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TVA déductible:</span>
                  <span className="font-medium text-blue-600">
                    {vatReport.vatOnPurchases.toLocaleString('fr-MA', { 
                      style: 'currency', 
                      currency: 'MAD' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Résultat */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span className="font-medium">TVA à payer:</span>
                <span className={`font-bold ${vatReport.vatPayable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {vatReport.vatPayable.toLocaleString('fr-MA', { 
                    style: 'currency', 
                    currency: 'MAD' 
                  })}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-medium">TVA récupérable:</span>
                <span className="font-bold text-blue-600">
                  {vatReport.vatRefundable.toLocaleString('fr-MA', { 
                    style: 'currency', 
                    currency: 'MAD' 
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xl border-t pt-2">
                <span className="font-bold">Net TVA:</span>
                <span className={`font-bold ${vatReport.netVAT >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {vatReport.netVAT.toLocaleString('fr-MA', { 
                    style: 'currency', 
                    currency: 'MAD' 
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline">
              <Icon.Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
            {vatReport.status === 'draft' && (
              <Button>
                Soumettre le Rapport
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * === BALANCE GÉNÉRALE ===
 */
interface TrialBalanceProps {
  storeId: string;
  periodId: string;
}

export function TrialBalance({ storeId, periodId }: TrialBalanceProps) {
  const { trialBalance, isLoading, error } = useTrialBalance({ storeId, periodId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Générale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Alert variant="destructive">
        <Icon.AlertTriangle />
        <AlertDescription>
          Erreur lors du chargement de la balance: {message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!trialBalance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balance Générale</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Balance non disponible pour cette période.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Balance Générale
          <div className="flex items-center space-x-2">
            <Badge variant={trialBalance.isBalanced ? 'default' : 'destructive'}>
              {trialBalance.isBalanced ? 'Équilibrée' : 'Déséquilibrée'}
            </Badge>
            <Button variant="outline" size="sm">
              <Icon.Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Date d'édition: {new Date(trialBalance.date).toLocaleDateString('fr-FR')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compte</TableHead>
              <TableHead>Intitulé</TableHead>
              <TableHead className="text-right">Solde Débiteur</TableHead>
              <TableHead className="text-right">Solde Créditeur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trialBalance.accounts.map((account) => (
              <TableRow key={account.accountCode}>
                <TableCell className="font-medium">{account.accountCode}</TableCell>
                <TableCell>{account.accountName}</TableCell>
                <TableCell className="text-right">
                  {account.closingDebit > 0 ? 
                    account.closingDebit.toFixed(2) : '-'
                  }
                </TableCell>
                <TableCell className="text-right">
                  {account.closingCredit > 0 ? 
                    account.closingCredit.toFixed(2) : '-'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totaux */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Débits</div>
              <div className="text-lg font-bold">
                {trialBalance.totalDebit.toFixed(2)} MAD
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Crédits</div>
              <div className="text-lg font-bold">
                {trialBalance.totalCredit.toFixed(2)} MAD
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}