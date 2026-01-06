/**
 * API Endpoint - Export Comptable
 * Universal Eats - API d'export des données comptables
 */

import { NextRequest, NextResponse } from 'next/server';
import accountingService from '@/lib/accounting-service';
import financialManager from '@/lib/financial-manager';
import { ExportConfig, ExportFormat } from '@/types/accounting';

/**
 * POST /api/accounting/export
 * Exporte les données comptables dans différents formats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format,
      storeId,
      periodId,
      reportType,
      filters
    } = body;

    // Validation
    if (!format || !storeId || !reportType) {
      return NextResponse.json(
        { error: 'format, storeId et reportType sont requis' },
        { status: 400 }
      );
    }

    const validFormats: ExportFormat[] = ['pdf', 'excel', 'csv', 'xml'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Format non supporté. Formats acceptés: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Préparer la configuration d'export
    const exportConfig: ExportConfig = {
      format,
      dateRange: {
        start: new Date(filters?.startDate || new Date().getFullYear() + '-01-01'),
        end: new Date(filters?.endDate || new Date().getFullYear() + '-12-31')
      },
      storeIds: filters?.storeIds || [storeId],
      accounts: filters?.accounts,
      includeSubAccounts: filters?.includeSubAccounts || true,
      includeZeroBalances: filters?.includeZeroBalances || false,
      currency: filters?.currency || 'MAD',
      language: filters?.language || 'fr'
    };

    let exportData: any = {};
    let filename = '';

    // Récupérer les données selon le type de rapport
    switch (reportType) {
      case 'trial_balance':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour la balance générale' },
            { status: 400 }
          );
        }
        const trialBalance = await accountingService.getTrialBalance(periodId, storeId);
        exportData = trialBalance;
        filename = `balance-generale-${periodId}.${format}`;
        break;

      case 'income_statement':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour le compte de résultat' },
            { status: 400 }
          );
        }
        const incomeStatement = await accountingService.generateFinancialStatement(
          'income_statement', periodId, storeId
        );
        exportData = incomeStatement;
        filename = `compte-resultat-${periodId}.${format}`;
        break;

      case 'balance_sheet':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour le bilan' },
            { status: 400 }
          );
        }
        const balanceSheet = await accountingService.generateFinancialStatement(
          'balance_sheet', periodId, storeId
        );
        exportData = balanceSheet;
        filename = `bilan-${periodId}.${format}`;
        break;

      case 'cash_flow':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour le tableau des flux de trésorerie' },
            { status: 400 }
          );
        }
        const startDate = exportConfig.dateRange.start;
        const endDate = exportConfig.dateRange.end;
        const cashFlow = await financialManager.getCashFlow(storeId, startDate, endDate);
        exportData = { cashFlow };
        filename = `flux-tresorerie-${periodId}.${format}`;
        break;

      case 'vat_report':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour le rapport TVA' },
            { status: 400 }
          );
        }
        const vatReport = await accountingService.calculateVAT(periodId, storeId);
        exportData = vatReport;
        filename = `rapport-tva-${periodId}.${format}`;
        break;

      case 'profitability_analysis':
        if (!periodId) {
          return NextResponse.json(
            { error: 'periodId est requis pour l\'analyse de rentabilité' },
            { status: 400 }
          );
        }
        const profitability = await accountingService.analyzeProfitability(periodId, storeId);
        exportData = profitability;
        filename = `analyse-rentabilite-${periodId}.${format}`;
        break;

      case 'journal_entries':
        // Récupérer les écritures du journal
        const { data: entries } = await supabase
          .from('accounting_entries')
          .select(`
            *,
            journal_entry_lines (*)
          `)
          .eq('store_id', storeId)
          .gte('date', exportConfig.dateRange.start.toISOString())
          .lte('date', exportConfig.dateRange.end.toISOString())
          .order('date', { ascending: false });

        exportData = { entries: entries || [] };
        filename = `journal-ecritures-${new Date().toISOString().split('T')[0]}.${format}`;
        break;

      default:
        return NextResponse.json(
          { error: `Type de rapport non supporté: ${reportType}` },
          { status: 400 }
        );
    }

    // Générer le fichier d'export
    const fileBuffer = await generateExportFile(exportData, format, exportConfig);

    // Retourner le fichier
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.byteLength.toString()
      }
    });

    return response;

  } catch (error) {
    console.error('Erreur API export:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'export',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/accounting/export/formats
 * Récupère la liste des formats d'export disponibles
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'formats') {
    const formats = [
      {
        format: 'pdf',
        name: 'PDF',
        description: 'Portable Document Format - Pour impression et archivage',
        mimeType: 'application/pdf'
      },
      {
        format: 'excel',
        name: 'Excel',
        description: 'Microsoft Excel - Pour analyse et manipulation',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      {
        format: 'csv',
        name: 'CSV',
        description: 'Comma Separated Values - Pour import dans d\'autres systèmes',
        mimeType: 'text/csv'
      },
      {
        format: 'xml',
        name: 'XML',
        description: 'eXtensible Markup Language - Pour intégration système',
        mimeType: 'application/xml'
      }
    ];

    return NextResponse.json({
      success: true,
      data: formats
    });
  }

  if (action === 'report-types') {
    const reportTypes = [
      {
        type: 'trial_balance',
        name: 'Balance Générale',
        description: 'Équilibre des comptes à une date donnée',
        requiresPeriodId: true
      },
      {
        type: 'income_statement',
        name: 'Compte de Résultat',
        description: 'Produits et charges sur une période',
        requiresPeriodId: true
      },
      {
        type: 'balance_sheet',
        name: 'Bilan',
        description: 'Actif, passif et capitaux propres',
        requiresPeriodId: true
      },
      {
        type: 'cash_flow',
        name: 'Tableau des Flux de Trésorerie',
        description: 'Mouvements de trésorerie',
        requiresPeriodId: true
      },
      {
        type: 'vat_report',
        name: 'Rapport TVA',
        description: 'Déclaration de TVA',
        requiresPeriodId: true
      },
      {
        type: 'profitability_analysis',
        name: 'Analyse de Rentabilité',
        description: 'Analyse détaillée de la rentabilité',
        requiresPeriodId: true
      },
      {
        type: 'journal_entries',
        name: 'Journal des Écritures',
        description: 'Liste des écritures comptables',
        requiresPeriodId: false
      }
    ];

    return NextResponse.json({
      success: true,
      data: reportTypes
    });
  }

  return NextResponse.json(
    { error: 'Action non reconnue' },
    { status: 400 }
  );
}

/**
 * Fonctions utilitaires pour l'export
 */
async function generateExportFile(data: any, format: ExportFormat, config: ExportConfig): Promise<ArrayBuffer> {
  switch (format) {
    case 'csv':
      return generateCSV(data, config);
    case 'excel':
      return generateExcel(data, config);
    case 'pdf':
      return generatePDF(data, config);
    case 'xml':
      return generateXML(data, config);
    default:
      throw new Error(`Format non supporté: ${format}`);
  }
}

function generateCSV(data: any, config: ExportConfig): ArrayBuffer {
  let csvContent = '';

  if (data.trialBalance) {
    // CSV pour la balance générale
    csvContent = 'Compte,Intitulé,Solde Débiteur,Solde Créditeur\n';
    data.trialBalance.accounts.forEach((account: any) => {
      csvContent += `"${account.accountCode}","${account.accountName}",${account.closingDebit},${account.closingCredit}\n`;
    });
  } else if (data.entries) {
    // CSV pour les écritures
    csvContent = 'Numéro,Date,Journal,Description,Débit,Crédit,Compte,Libellé\n';
    data.entries.forEach((entry: any) => {
      entry.journal_entry_lines.forEach((line: any) => {
        csvContent += `"${entry.entry_number}","${entry.date}","${entry.journal}","${entry.description}",${line.debit},${line.credit},"${line.account_code}","${line.account_name}"\n`;
      });
    });
  }

  return new TextEncoder().encode(csvContent).buffer;
}

function generateExcel(data: any, config: ExportConfig): ArrayBuffer {
  // Implémentation simplifiée - à remplacer par une vraie librairie comme ExcelJS
  // Pour l'instant, retourner un CSV avec extension .xlsx
  return generateCSV(data, config);
}

function generatePDF(data: any, config: ExportConfig): ArrayBuffer {
  // Implémentation simplifiée - à remplacer par une vraie librairie comme jsPDF
  // Pour l'instant, retourner un message simple
  const pdfContent = 'PDF generation not implemented yet';
  return new TextEncoder().encode(pdfContent).buffer;
}

function generateXML(data: any, config: ExportConfig): ArrayBuffer {
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<accounting_export>\n';

  if (data.trialBalance) {
    xmlContent += '  <trial_balance>\n';
    data.trialBalance.accounts.forEach((account: any) => {
      xmlContent += `    <account>\n`;
      xmlContent += `      <code>${account.accountCode}</code>\n`;
      xmlContent += `      <name>${account.accountName}</name>\n`;
      xmlContent += `      <debit_balance>${account.closingDebit}</debit_balance>\n`;
      xmlContent += `      <credit_balance>${account.closingCredit}</credit_balance>\n`;
      xmlContent += `    </account>\n`;
    });
    xmlContent += '  </trial_balance>\n';
  }

  xmlContent += '</accounting_export>';

  return new TextEncoder().encode(xmlContent).buffer;
}

function getContentType(format: ExportFormat): string {
  const contentTypes: Record<ExportFormat, string> = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    xml: 'application/xml',
    json: 'application/json',
    sage: 'text/plain',
    ebics: 'application/xml'
  };

  return contentTypes[format] || 'application/octet-stream';
}