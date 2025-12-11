/**
 * @file components/banking/bank-transaction-list.tsx
 * @description Composant de présentation pour afficher la liste des transactions bancaires.
 * Gère les états de chargement, vide et données avec statistiques et filtres.
 * 
 * @version 1.0.1 - Fix: Attribut title sur icône Lucide
 */

"use client";

import React, { useState } from 'react';
import { BankTransaction, BankTransactionFilters } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
} from 'lucide-react';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function DirectionBadge({ direction }: { direction: 'DEBIT' | 'CREDIT' }) {
  if (direction === 'CREDIT') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        <ArrowDownLeft className="h-3 w-3 mr-1" />
        Crédit
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
      <ArrowUpRight className="h-3 w-3 mr-1" />
      Débit
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'VALIDATED':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validé
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
          <XCircle className="h-3 w-3 mr-1" />
          Annulé
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Brouillon
        </Badge>
      );
  }
}

// =============================================================================
// PROPS
// =============================================================================

interface BankTransactionListProps {
  transactions: BankTransaction[];
  isLoading: boolean;
  filters: BankTransactionFilters;
  onFiltersChange: (filters: BankTransactionFilters) => void;
  onAddNew: () => void;
  onEdit: (transaction: BankTransaction) => void;
  onDelete: (transaction: BankTransaction) => void;
  onValidate?: (transaction: BankTransaction) => void;
  onCancel?: (transaction: BankTransaction) => void;
  onRefresh: () => void;
  /** Afficher la colonne compte (utile si vue globale) */
  showAccountColumn?: boolean;
  /** Afficher le solde courant */
  showRunningBalance?: boolean;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function BankTransactionList({
  transactions,
  isLoading,
  filters,
  onFiltersChange,
  onAddNew,
  onEdit,
  onDelete,
  onValidate,
  onCancel,
  onRefresh,
  showAccountColumn = false,
  showRunningBalance = false,
}: BankTransactionListProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Statistiques
  const validatedTxns = transactions.filter(t => t.status === 'VALIDATED');
  const totalCredits = validatedTxns
    .filter(t => t.direction === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = validatedTxns
    .filter(t => t.direction === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);
  const draftCount = transactions.filter(t => t.status === 'DRAFT').length;

  // Gérer la recherche avec debounce
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // Debounce simple
    setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  };

  // ---------------------------------------------------------------------------
  // RENDU DU CONTENU
  // ---------------------------------------------------------------------------

  const renderContent = () => {
    // État de chargement
    if (isLoading) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sens</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    // État vide
    if (transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-blue-50 rounded-full mb-4">
            <Receipt className="h-10 w-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune transaction
          </h3>
          <p className="text-gray-500 mb-6 max-w-md">
            {filters.search || filters.dateFrom || filters.dateTo
              ? "Aucune transaction ne correspond à vos critères de recherche."
              : "Créez votre première transaction bancaire pour commencer."}
          </p>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle transaction
          </Button>
        </div>
      );
    }

    // État avec données
    return (
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {showAccountColumn && <TableHead>Compte</TableHead>}
              <TableHead>Libellé</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sens</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              {showRunningBalance && <TableHead className="text-right">Solde</TableHead>}
              <TableHead>Statut</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(txn => (
              <TableRow
                key={txn.id}
                className={txn.status === 'CANCELLED' ? 'opacity-50' : ''}
              >
                <TableCell className="font-medium">
                  {formatDate(txn.transactionDate)}
                </TableCell>
                {showAccountColumn && (
                  <TableCell className="text-gray-600">
                    {txn.bankAccountName}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{txn.label}</span>
                    {txn.partnerName && (
                      <span className="text-sm text-gray-500">{txn.partnerName}</span>
                    )}
                    {txn.reference && (
                      <span className="text-xs text-gray-400">Réf: {txn.reference}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{txn.transactionTypeCode}</Badge>
                </TableCell>
                <TableCell>
                  <DirectionBadge direction={txn.direction} />
                </TableCell>
                <TableCell className={`text-right font-medium ${
                  txn.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {txn.direction === 'CREDIT' ? '+' : '-'}
                  {formatCurrency(txn.amount, txn.currency)}
                </TableCell>
                {showRunningBalance && (
                  <TableCell className="text-right font-medium">
                    {txn.runningBalance !== undefined 
                      ? formatCurrency(txn.runningBalance, txn.currency)
                      : '—'
                    }
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={txn.status} />
                    {txn.isReconciled && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link2 className="h-4 w-4 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rapproché</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => onEdit(txn)}
                        disabled={txn.status === 'VALIDATED' || txn.status === 'CANCELLED'}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      {txn.status === 'DRAFT' && onValidate && (
                        <DropdownMenuItem onClick={() => onValidate(txn)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Valider
                        </DropdownMenuItem>
                      )}
                      {txn.status === 'VALIDATED' && onCancel && !txn.isReconciled && (
                        <DropdownMenuItem onClick={() => onCancel(txn)}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Annuler
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(txn)}
                        className="text-red-600 focus:text-red-600"
                        disabled={txn.status !== 'DRAFT'}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TooltipProvider>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDU PRINCIPAL
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Transactions Bancaires
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez vos opérations bancaires manuelles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Transaction
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
              Total crédits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatCurrency(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
              Total débits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totalDebits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Brouillons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par libellé, référence, tiers..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.direction || 'all'}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    direction: value === 'all' ? undefined : value as 'DEBIT' | 'CREDIT'
                  })
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DEBIT">Débits</SelectItem>
                  <SelectItem value="CREDIT">Crédits</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    status: value === 'all' ? undefined : value as 'DRAFT' | 'VALIDATED' | 'CANCELLED',
                  })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DRAFT">Brouillons</SelectItem>
                  <SelectItem value="VALIDATED">Validés</SelectItem>
                  <SelectItem value="CANCELLED">Annulés</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })
                }
                className="w-[150px]"
                placeholder="Du"
              />
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateTo: e.target.value || undefined })
                }
                className="w-[150px]"
                placeholder="Au"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}