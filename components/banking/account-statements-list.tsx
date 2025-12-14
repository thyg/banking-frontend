/**
 * @file app/dashboard/banking/accounts/_components/account-statements-list.tsx
 * @description Liste des relevés bancaires d'un compte.
 * Affiche les relevés avec leur statut de rapprochement.
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React from 'react';
import Link from 'next/link';
import type { BankStatement } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  RefreshCw,
  Upload,
  ExternalLink,
  FileText,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AccountStatementsListProps {
  /** Liste des relevés */
  statements: BankStatement[];
  /** État de chargement */
  isLoading: boolean;
  /** Devise du compte */
  currency: string;
  /** Callback pour rafraîchir */
  onRefresh: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'RECONCILED':
      return <Badge className="bg-green-100 text-green-800">Rapproché</Badge>;
    case 'CLOSED':
      return <Badge variant="default">Clôturé</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En cours</Badge>;
    case 'IMPORTED':
    default:
      return <Badge variant="outline">Importé</Badge>;
  }
}

function calculateProgress(lineCount: number, reconciledCount: number): number {
  if (lineCount === 0) return 0;
  return Math.round((reconciledCount / lineCount) * 100);
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function AccountStatementsList({
  statements,
  isLoading,
  currency,
  onRefresh
}: AccountStatementsListProps) {
  
  // État de chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // État vide
  if (statements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun relevé</h3>
          <p className="text-muted-foreground text-center mb-4">
            Aucun relevé bancaire n'a été importé pour ce compte.
          </p>
          <Link href="/banking/statements/upload">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Importer un relevé
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Liste des relevés
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Relevés bancaires</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Link href="/banking/statements">
            <Button variant="outline" size="sm">
              Voir tout
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Période</TableHead>
              <TableHead className="text-right">Solde fin</TableHead>
              <TableHead>Rapprochement</TableHead>
              <TableHead className="w-[100px]">Statut</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.map((statement) => {
              const progress = calculateProgress(statement.lineCount, statement.reconciledCount);
              
              return (
                <TableRow key={statement.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {statement.reference || `Relevé du ${formatDate(statement.statementDate)}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(statement.closingBalance, currency)}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{statement.reconciledCount}/{statement.lineCount} lignes</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(statement.status)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/banking/statements/${statement.id}`}>
                      <Button variant="ghost" size="sm">
                        {statement.status === 'IN_PROGRESS' || statement.status === 'IMPORTED' 
                          ? 'Rapprocher' 
                          : 'Voir'
                        }
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default AccountStatementsList;