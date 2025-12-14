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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transactions récentes</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Link href="/banking/transactions">
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
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Partenaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-[100px]">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.slice(0, 10).map((transaction) => {
              const isCredit = transaction.direction === 'CREDIT';
              
              return (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {formatDate(transaction.transactionDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isCredit ? (
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        {transaction.transactionTypeLabel || transaction.transactionTypeCode || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {transaction.description || '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {transaction.partnerName || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-mono font-medium",
                      isCredit ? "text-green-600" : "text-foreground"
                    )}>
                      {isCredit ? '+' : '-'}{formatCurrency(transaction.amount, currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(transaction.status)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {transactions.length > 10 && (
          <div className="p-4 text-center border-t">
            <Link href="/banking/transactions">
              <Button variant="link">
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