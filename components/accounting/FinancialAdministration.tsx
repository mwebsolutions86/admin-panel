/**
 * Interface d'Administration Financière
 * Universal Eats - Configuration et gestion complète du module comptable
 */

'use client';

import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { 
  useChartOfAccounts, 
  useBudgets, 
  useFinancialAlerts,
  useVATReports,
  useAccountingExport
} from '@/hooks/use-accounting';
import {
  Account,
  ChartOfAccounts,
  Budget,
  FinancialAlert,
  VATReport,
  BudgetStatus,
  ExportConfig
} from '@/types/accounting';

// Icônes simplifiées
const Icon = {
  Settings: () => <span>⚙️</span>,
  Users: () => <span>👥</span>,
  FileText: () => <span>📄</span>,
  Calculator: () => <span>🧮</span>,
  BarChart3: () => <span>📊</span>,
  TrendingUp: () => <span>📈</span>,
  AlertTriangle: () => <span>⚠️</span>,
  CheckCircle: () => <span>✅</span>,
  Clock: () => <span>🕐</span>,
  DollarSign: () => <span>💰</span>,
  Download: () => <span>⬇️</span>,
  Plus: () => <span>➕</span>,
  Edit: () => <span>✏️</span>,
  Trash2: () => <span>🗑️</span>,
  RefreshCw: () => <span>🔄</span>,
  Shield: () => <span>🛡️</span>,
  Database: () => <span>🗄️</span>,
  Calendar: () => <span>📅</span>,
  Mail: () => <span>📧</span>,
  Phone: () => <span>📞</span>
};

/**
 * === COMPOSANT PRINCIPAL D'ADMINISTRATION FINANCIÈRE ===
 */
interface FinancialAdministrationProps {
  storeId: string;
  className?: string;
}

export function FinancialAdministration({ storeId, className }: FinancialAdministrationProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateBudgetDialog, setShowCreateBudgetDialog] = useState(false);

  const { 
    chartOfAccounts, 
    createChart,
    isLoading: chartLoading 
  } = useChartOfAccounts({ storeId });

  const { 
    budgets, 
    createBudget 
  } = useBudgets({ storeId });

  const { 
    alerts, 
    isLoading: alertsLoading 
  } = useFinancialAlerts({ storeId });

  const { exportData, isExporting } = useAccountingExport();

  // Vérifier si le plan comptable existe
  useEffect(() => {
    if (!chartOfAccounts && !chartLoading) {
      // Proposer de créer le plan comptable par défaut
    }
  }, [chartOfAccounts, chartLoading]);

  const handleCreateDefaultChart = async () => {
    try {
      await createChart('Plan Comptable Universal Eats - Restaurant');
    } catch (error) {
      console.error('Erreur création plan comptable:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Administration Financière
          </h1>
          <p className="text-muted-foreground">
            Configuration et gestion complète du module comptable
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Icon.Download className="h-4 w-4 mr-2" />
            Exporter Configuration
          </Button>
          <Button size="sm">
            <Icon.RefreshCw className="h-4 w-4 mr-2" />
            Synchroniser
          </Button>
        </div>
      </div>

      {/* Alertes actives */}
      {alerts.length > 0 && (
        <Alert variant="destructive">
          <Icon.AlertTriangle />
          <AlertDescription>
            {alerts.length} alerte(s) financière(s) nécessitent votre attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="chart">Plan Comptable</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="tax">Fiscalité</TabsTrigger>
          <TabsTrigger value="automation">Automatisation</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatusCard
              title="Plan Comptable"
              status={chartOfAccounts ? 'configured' : 'missing'}
              description={chartOfAccounts ? 'Plan comptable configuré' : 'Plan comptable manquant'}
              icon={<Icon.Database />}
              action={!chartOfAccounts && (
                <Button size="sm" onClick={handleCreateDefaultChart}>
                  Créer par défaut
                </Button>
              )}
            />
            <StatusCard
              title="Budgets Actifs"
              status="active"
              description={`${budgets.filter(b => b.status === 'active').length} budgets actifs`}
              icon={<Icon.BarChart3 />}
              action={
                <Button size="sm" onClick={() => setShowCreateBudgetDialog(true)}>
                  <Icon.Plus className="h-4 w-4 mr-2" />
                  Nouveau Budget
                </Button>
              }
            />
            <StatusCard
              title="Alertes"
              status={alerts.length > 0 ? 'warning' : 'good'}
              description={`${alerts.length} alerte(s) en cours`}
              icon={<Icon.AlertTriangle />}
            />
          </div>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
              <CardDescription>
                Actions frequently utilisées dans l'administration financière
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionCard
                  title="Générer Balance"
                  description="Générer la balance générale"
                  icon={<Icon.FileText />}
                  onClick={() => {/* Action */}}
                />
                <QuickActionCard
                  title="Rapport TVA"
                  description="Calculer la TVA mensuelle"
                  icon={<Icon.Calculator />}
                  onClick={() => {/* Action */}}
                />
                <QuickActionCard
                  title="Export Comptable"
                  description="Exporter les données comptables"
                  icon={<Icon.Download />}
                  onClick={() => {/* Action */}}
                />
                <QuickActionCard
                  title="Analyse Rentabilité"
                  description="Analyser la rentabilité"
                  icon={<Icon.TrendingUp />}
                  onClick={() => {/* Action */}}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Comptable */}
        <TabsContent value="chart" className="space-y-6">
          <PlanComptableManagement 
            storeId={storeId}
            chartOfAccounts={chartOfAccounts}
            onCreateChart={handleCreateDefaultChart}
          />
        </TabsContent>

        {/* Gestion des Budgets */}
        <TabsContent value="budgets" className="space-y-6">
          <BudgetsManagement 
            storeId={storeId}
            budgets={budgets}
            onCreateBudget={() => setShowCreateBudgetDialog(true)}
          />
        </TabsContent>

        {/* Fiscalité et TVA */}
        <TabsContent value="tax" className="space-y-6">
          <TaxAdministration storeId={storeId} />
        </TabsContent>

        {/* Automatisation */}
        <TabsContent value="automation" className="space-y-6">
          <AutomationSettings storeId={storeId} />
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="security" className="space-y-6">
          <SecuritySettings storeId={storeId} />
        </TabsContent>
      </Tabs>

      {/* Dialog de création de budget */}
      {showCreateBudgetDialog && (
        <CreateBudgetDialog 
          open={showCreateBudgetDialog}
          onOpenChange={setShowCreateBudgetDialog}
          storeId={storeId}
          onSuccess={() => setShowCreateBudgetDialog(false)}
        />
      )}
    </div>
  );
}

/**
 * Carte de statut
 */
interface StatusCardProps {
  title: string;
  status: 'good' | 'warning' | 'error' | 'missing' | 'configured' | 'active';
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

function StatusCard({ title, status, description, icon, action }: StatusCardProps) {
  const statusColors = {
    good: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    error: 'bg-red-50 border-red-200',
    missing: 'bg-red-50 border-red-200',
    configured: 'bg-green-50 border-green-200',
    active: 'bg-blue-50 border-blue-200'
  };

  const statusIcons = {
    good: <Icon.CheckCircle className="h-5 w-5 text-green-600" />,
    warning: <Icon.AlertTriangle className="h-5 w-5 text-yellow-600" />,
    error: <Icon.AlertTriangle className="h-5 w-5 text-red-600" />,
    missing: <Icon.AlertTriangle className="h-5 w-5 text-red-600" />,
    configured: <Icon.CheckCircle className="h-5 w-5 text-green-600" />,
    active: <Icon.CheckCircle className="h-5 w-5 text-blue-600" />
  };

  return (
    <Card className={statusColors[status]}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{icon}</div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {statusIcons[status]}
            {action}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Carte d'action rapide
 */
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function QuickActionCard({ title, description, icon, onClick }: QuickActionCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 text-center">
        <div className="text-2xl mb-2">{icon}</div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Gestion du Plan Comptable
 */
interface PlanComptableManagementProps {
  storeId: string;
  chartOfAccounts?: ChartOfAccounts;
  onCreateChart: () => void;
}

function PlanComptableManagement({ storeId, chartOfAccounts, onCreateChart }: PlanComptableManagementProps) {
  if (!chartOfAccounts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Comptable</CardTitle>
          <CardDescription>
            Le plan comptable n'est pas configuré pour ce magasin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Icon.Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucun plan comptable configuré
            </p>
            <Button onClick={onCreateChart}>
              <Icon.Plus className="h-4 w-4 mr-2" />
              Créer le plan comptable par défaut
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Plan Comptable - {chartOfAccounts.name}
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Icon.Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button variant="outline" size="sm">
                <Icon.Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {chartOfAccounts.description || 'Plan comptable conforme aux normes marocaines'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {chartOfAccounts.accounts?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Comptes Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {chartOfAccounts.accounts?.filter(a => a.isActive).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Comptes Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {chartOfAccounts.currency}
              </div>
              <div className="text-sm text-muted-foreground">Devise</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {new Date(chartOfAccounts.fiscalYearStart).getFullYear()}
              </div>
              <div className="text-sm text-muted-foreground">Année Fiscale</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des comptes par classe */}
      <AccountsByClass accounts={chartOfAccounts.accounts || []} />
    </div>
  );
}

/**
 * Affichage des comptes par classe comptable
 */
interface AccountsByClassProps {
  accounts: Account[];
}

function AccountsByClass({ accounts }: AccountsByClassProps) {
  const accountsByClass = accounts.reduce((acc, account) => {
    const classNumber = account.code.charAt(0);
    if (!acc[classNumber]) {
      acc[classNumber] = [];
    }
    acc[classNumber].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const classNames = {
    '1': 'Comptes de Ressources Durables',
    '2': 'Comptes d\'Actif Immobilisé', 
    '3': 'Comptes de Stocks',
    '4': 'Comptes de Tiers',
    '5': 'Comptes de Trésorerie',
    '6': 'Comptes de Charges',
    '7': 'Comptes de Produits'
  };

  return (
    <div className="space-y-4">
      {Object.entries(accountsByClass).map(([classNumber, classAccounts]) => (
        <Card key={classNumber}>
          <CardHeader>
            <CardTitle className="text-lg">
              Classe {classNumber} - {classNames[classNumber as keyof typeof classNames]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Intitulé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Solde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {account.balance.toFixed(2)} MAD
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Gestion des Budgets
 */
interface BudgetsManagementProps {
  storeId: string;
  budgets: Budget[];
  onCreateBudget: () => void;
}

function BudgetsManagement({ storeId, budgets, onCreateBudget }: BudgetsManagementProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion des Budgets</h3>
          <p className="text-sm text-muted-foreground">
            Configurez et suivez les budgets de votre restaurant
          </p>
        </div>
        <Button onClick={onCreateBudget}>
          <Icon.Plus className="h-4 w-4 mr-2" />
          Nouveau Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => (
          <BudgetCard key={budget.id} budget={budget} />
        ))}
      </div>
    </div>
  );
}

/**
 * Carte de budget
 */
interface BudgetCardProps {
  budget: Budget;
}

function BudgetCard({ budget }: BudgetCardProps) {
  const varianceColor = budget.variancePercentage > 0.1 ? 'text-red-600' : 
                       budget.variancePercentage < -0.1 ? 'text-green-600' : 'text-gray-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{budget.name}</CardTitle>
        <CardDescription>
          {budget.period} - {budget.fiscalYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Budget Total:</span>
            <span className="font-medium">
              {budget.totalBudgeted.toLocaleString('fr-MA', { 
                style: 'currency', 
                currency: 'MAD' 
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Réalisé:</span>
            <span className="font-medium">
              {budget.actualAmount.toLocaleString('fr-MA', { 
                style: 'currency', 
                currency: 'MAD' 
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Écart:</span>
            <span className={`font-medium ${varianceColor}`}>
              {budget.variancePercentage > 0 ? '+' : ''}
              {(budget.variancePercentage * 100).toFixed(1)}%
            </span>
          </div>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                budget.variancePercentage > 0.1 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${Math.min(Math.abs(budget.variancePercentage) * 100, 100)}%` 
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
              {budget.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Icon.Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Icon.Download className="h-4 w-4 mr-2" />
                  Exporter
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Icon.Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Administration Fiscale
 */
interface TaxAdministrationProps {
  storeId: string;
}

function TaxAdministration({ storeId }: TaxAdministrationProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Administration Fiscale</CardTitle>
          <CardDescription>
            Gestion de la TVA et des obligations fiscales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Configuration TVA</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Taux TVA standard</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="number" defaultValue="20" className="w-20" />
                    <span>%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>TVA réduite</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="number" defaultValue="10" className="w-20" />
                    <span>%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>TVA super-réduite</Label>
                  <div className="flex items-center space-x-2">
                    <Input type="number" defaultValue="7" className="w-20" />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Obligations</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Déclaration TVA Mensuelle</div>
                    <div className="text-sm text-muted-foreground">Échéance: 20 du mois suivant</div>
                  </div>
                  <Badge variant="outline">Actif</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Bilan Annuel</div>
                    <div className="text-sm text-muted-foreground">Échéance: 31 Mars</div>
                  </div>
                  <Badge variant="outline">Actif</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Paramètres d'automatisation
 */
interface AutomationSettingsProps {
  storeId: string;
}

function AutomationSettings({ storeId }: AutomationSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Automatisation des Rapports</CardTitle>
          <CardDescription>
            Configurez la génération automatique des rapports financiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Rapports Automatiques</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Rapport Quotidien des Ventes</div>
                    <div className="text-sm text-muted-foreground">
                      Généré automatiquement chaque jour à 09:00
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Rapport Financier Hebdomadaire</div>
                    <div className="text-sm text-muted-foreground">
                      Généré automatiquement le lundi à 09:00
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Déclaration TVA Mensuelle</div>
                    <div className="text-sm text-muted-foreground">
                      Généré automatiquement le 20 de chaque mois
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Alertes Automatiques</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Alertes de Trésorerie</div>
                    <div className="text-sm text-muted-foreground">
                      Notification quand la trésorerie descend sous 25,000 MAD
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Alertes de Dépassement Budgétaire</div>
                    <div className="text-sm text-muted-foreground">
                      Notification quand un budget dépasse 90% de son allocation
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Paramètres de sécurité
 */
interface SecuritySettingsProps {
  storeId: string;
}

function SecuritySettings({ storeId }: SecuritySettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sécurité des Données Comptables</CardTitle>
          <CardDescription>
            Configuration des mesures de sécurité et contrôle d'accès
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Contrôle d'Accès</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Validation Double des Écritures</div>
                    <div className="text-sm text-muted-foreground">
                      Exiger une double validation pour les écritures > 10,000 MAD
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Journal d'Audit Complet</div>
                    <div className="text-sm text-muted-foreground">
                      Enregistrer toutes les modifications avec traçabilité
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Sauvegarde et Récupération</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Sauvegarde Automatique Quotidienne</div>
                    <div className="text-sm text-muted-foreground">
                      Sauvegarde automatique des données comptables
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">Rétention des Données</div>
                    <div className="text-sm text-muted-foreground">
                      Conservation des données pendant 10 ans (conformité marocaine)
                    </div>
                  </div>
                  <Badge variant="outline">10 ans</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Utilisateurs Autorisés</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Icon.Users className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Comptable Principal</div>
                      <div className="text-sm text-muted-foreground">Accès complet</div>
                    </div>
                  </div>
                  <Badge>Actif</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Icon.Users className="h-5 w-5" />
                    <div>
                      <div className="font-medium">Manager</div>
                      <div className="text-sm text-muted-foreground">Lecture et validation</div>
                    </div>
                  </div>
                  <Badge>Actif</Badge>
                </div>
              </div>
              
              <Button variant="outline" size="sm">
                <Icon.Plus className="h-4 w-4 mr-2" />
                Ajouter un Utilisateur
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Dialog de création de budget
 */
interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onSuccess?: () => void;
}

function CreateBudgetDialog({ open, onOpenChange, storeId, onSuccess }: CreateBudgetDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    fiscalYear: new Date().getFullYear().toString(),
    period: 'annual'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Créer le budget
      // await createBudget(formData.name, formData.fiscalYear, []);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur création budget:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un Nouveau Budget</DialogTitle>
          <DialogDescription>
            Créez un budget pour une nouvelle période fiscale.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du Budget</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Budget 2024 - Restaurant Principal"
              required
            />
          </div>

          <div>
            <Label htmlFor="fiscalYear">Année Fiscale</Label>
            <Input
              id="fiscalYear"
              type="number"
              value={formData.fiscalYear}
              onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
              min="2020"
              max="2030"
              required
            />
          </div>

          <div>
            <Label htmlFor="period">Période</Label>
            <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annuel</SelectItem>
                <SelectItem value="semester">Semestriel</SelectItem>
                <SelectItem value="quarter">Trimestriel</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le Budget
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}