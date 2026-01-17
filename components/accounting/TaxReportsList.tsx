'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { VATReport } from '@/types/accounting';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaxReportsListProps {
  storeId: string;
}

export function TaxReportsList({ storeId }: TaxReportsListProps) {
  const [reports, setReports] = useState<VATReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [storeId]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('vat_reports')
        .select(`
          *,
          financial_periods (name)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Erreur chargement rapports TVA:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || ''}>
        {status === 'draft' ? 'Brouillon' : 
         status === 'submitted' ? 'Soumis' : 
         status === 'paid' ? 'Payé' : status}
      </Badge>
    );
  };

  if (isLoading) return <div>Chargement de l'historique...</div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Période</TableHead>
            <TableHead>Date création</TableHead>
            <TableHead className="text-right">TVA Collectée</TableHead>
            <TableHead className="text-right">TVA Déductible</TableHead>
            <TableHead className="text-right">Net à Payer</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                Aucune déclaration trouvée
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report: any) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {report.financial_periods?.name || 'Période inconnue'}
                </TableCell>
                <TableCell>
                  {format(new Date(report.created_at), 'dd MMM yyyy', { locale: fr })}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {/* Note: report_data est un JSONB, on accède aux valeurs stockées */}
                  {report.report_data?.vatOnSales?.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' }) || '-'}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {report.report_data?.vatOnPurchases?.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' }) || '-'}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {report.report_data?.netVAT?.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' }) || '-'}
                </TableCell>
                <TableCell>{getStatusBadge(report.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}