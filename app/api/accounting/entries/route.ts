/**
 * API Endpoint - Écritures Comptables
 * Universal Eats - API de gestion des écritures
 */

import { NextRequest, NextResponse } from 'next/server';
import accountingService from '@/lib/accounting-service';

/**
 * GET /api/accounting/entries
 * Récupère la liste des écritures comptables
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const journal = searchParams.get('journal');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId est requis' },
        { status: 400 }
      );
    }

    // Implémentation simplifiée - à adapter avec la vraie API
    // Dans un vrai environnement, on utiliserait une pagination réelle
    const { data: entries, error } = await supabase
      .from('accounting_entries')
      .select(`
        *,
        journal_entry_lines (
          *,
          accounts (code, name)
        )
      `)
      .eq('store_id', storeId)
      .order('date', { ascending: false })
      .range((page - 1) * limit, page * limit);

    if (error) throw error;

    // Appliquer les filtres côté serveur
    let filteredEntries = entries || [];
    
    if (journal) {
      filteredEntries = filteredEntries.filter(entry => entry.journal === journal);
    }
    
    if (status === 'posted') {
      filteredEntries = filteredEntries.filter(entry => entry.is_posted);
    } else if (status === 'draft') {
      filteredEntries = filteredEntries.filter(entry => !entry.is_posted);
    }
    
    if (startDate) {
      filteredEntries = filteredEntries.filter(entry => 
        new Date(entry.date) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filteredEntries = filteredEntries.filter(entry => 
        new Date(entry.date) <= new Date(endDate)
      );
    }

    const mappedEntries = filteredEntries.map(mapEntryFromDB);
    
    return NextResponse.json({
      success: true,
      data: mappedEntries,
      pagination: {
        page,
        limit,
        total: mappedEntries.length,
        hasMore: mappedEntries.length === limit
      }
    });

  } catch (error) {
    console.error('Erreur API entries:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des écritures',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/entries
 * Crée une nouvelle écriture comptable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      journal,
      description,
      reference,
      amount,
      currency,
      storeId,
      createdBy,
      lines
    } = body;

    // Validation
    if (!date || !journal || !description || !storeId || !createdBy || !lines) {
      return NextResponse.json(
        { error: 'Données manquantes: date, journal, description, storeId, createdBy, lines requis' },
        { status: 400 }
      );
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une ligne comptable est requise' },
        { status: 400 }
      );
    }

    // Vérifier l'équilibre de l'écriture
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { 
          error: 'Écriture non équilibrée',
          details: `Débit: ${totalDebit.toFixed(2)}, Crédit: ${totalCredit.toFixed(2)}`
        },
        { status: 400 }
      );
    }

    // Créer l'écriture
    const entry = await accountingService.createEntry({
      date,
      journal,
      description,
      reference,
      amount: Math.max(totalDebit, totalCredit),
      currency: currency || 'MAD',
      storeId,
      createdBy,
      isPosted: false,
      isReversed: false,
      lines
    });

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Écriture créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur API create entry:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de l\'écriture',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * Fonctions utilitaires
 */
function mapEntryFromDB(dbEntry: any) {
  return {
    id: dbEntry.id,
    date: dbEntry.date,
    journal: dbEntry.journal,
    entryNumber: dbEntry.entry_number,
    description: dbEntry.description,
    reference: dbEntry.reference,
    amount: dbEntry.amount,
    currency: dbEntry.currency,
    storeId: dbEntry.store_id,
    createdBy: dbEntry.created_by,
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at,
    isPosted: dbEntry.is_posted,
    isReversed: dbEntry.is_reversed,
    reversalOf: dbEntry.reversal_of,
    attachments: dbEntry.attachments || [],
    lines: (dbEntry.journal_entry_lines || []).map(mapJournalLineFromDB)
  };
}

function mapJournalLineFromDB(dbLine: any) {
  return {
    id: dbLine.id,
    accountId: dbLine.account_id,
    accountCode: dbLine.account_code,
    accountName: dbLine.account_name,
    debit: dbLine.debit,
    credit: dbLine.credit,
    description: dbLine.description,
    costCenter: dbLine.cost_center,
    project: dbLine.project,
    inventoryItemId: dbLine.inventory_item_id,
    orderId: dbLine.order_id,
    storeId: dbLine.store_id,
    date: dbLine.date
  };
}