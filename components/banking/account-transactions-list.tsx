/**
 * @file app/dashboard/banking/accounts/_components/account-transactions-list.tsx
 * @description Liste des transactions d'un compte bancaire.
 * Affiche les transactions récentes avec pagination et filtres basiques.
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React from 'react';
import Link from 'next/link';
import type { BankTransaction } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw,
  Plus,
  ExternalLink,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AccountTransactionsListProps {
  /** Liste des transactions */
  transactions: BankTransaction[];
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
    case 'VALIDATED':
      return <Badge variant="default" className="bg-green-100 text-green-800">Validée</Badge>;
    case 'CANCELLED':
      return <Badge variant="destructive">Annulée</Badge>;
    case 'DRAFT':
    default:
      return <Badge variant="secondary">Brouillon</Badge>;
  }
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function AccountTransactionsList({
  transactions,
  isLoading,
  currency,
  onRefresh
}: AccountTransactionsListProps) {
  
  // État de chargement
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // État vide
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucune transaction</h3>
          <p className="text-muted-foreground text-center mb-4">
            Ce compte n'a pas encore de transactions enregistrées.
          </p>
          <Link href="/banking/transactions/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle transaction
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Liste des transactions
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">Transactions recentes</CardTitle>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={onRefresh} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Link href="/banking/transactions" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full">
              <span className="hidden sm:inline">Voir tout</span>
              <span className="sm:hidden">Tout</span>
              <ExternalLink className="h-4 w-4 ml-1 sm:ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px] sm:w-[100px]">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden lg:table-cell">Partenaire</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden sm:table-cell w-[90px] sm:w-[100px]">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 10).map((transaction) => {
                const isCredit = transaction.direction === 'CREDIT';

                return (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {formatDate(transaction.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {isCredit ? (
                          <ArrowDownCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm truncate max-w-[60px] sm:max-w-none">
                          {transaction.transactionTypeLabel || transaction.transactionTypeCode || '-'}
                        </span>
                      </div>
                      {/* Show description on mobile below type */}
                      <p className="md:hidden text-xs text-muted-foreground truncate max-w-[100px] mt-0.5">
                        {transaction.description || transaction.partnerName || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[180px] truncate text-sm">
                      {transaction.description || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[120px] truncate text-sm">
                      {transaction.partnerName || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono font-medium text-xs sm:text-sm",
                        isCredit ? "text-green-600" : "text-foreground"
                      )}>
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {transactions.length > 10 && (
          <div className="p-3 sm:p-4 text-center border-t">
            <Link href="/banking/transactions">
              <Button variant="link" className="text-sm">
                Voir les {transactions.length - 10} autres transactions
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AccountTransactionsList;