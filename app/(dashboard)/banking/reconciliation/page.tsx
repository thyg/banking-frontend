/**
 * @file app/(dashboard)/banking/reconciliation/page.tsx
 * @description Page principale de rapprochement bancaire.
 * Affiche la liste des relevés et permet de sélectionner un relevé pour le rapprocher.
 * 
 * @version 1.0.0 - Incrément 4
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
import { BankStatement, BankAccount, ReconciliationStats } from '@/types/banking';

// API
import { getBankStatements, getReconciliationStats } from '@/lib/api/reconciliation';
import { getBankAccounts } from '@/lib/api/banking';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileCheck,
  Upload,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatCurrency = (amount: number, currency: string = 'EUR') =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function StatementStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'RECONCILED':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complet
        </Badge>
      );
    case 'PARTIAL':
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          En cours
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Non traité
        </Badge>
      );
  }
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'blue' 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function ReconciliationPage() {
  const router = useRouter();
  
  // États
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // Chargement des données
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statementsData, accountsData] = await Promise.all([
        getBankStatements(selectedAccountId === 'all' ? undefined : selectedAccountId),
        getBankAccounts(),
      ]);
      
      setStatements(statementsData);
      setAccounts(accountsData);
      
      // Charger les stats si un compte est sélectionné
      if (selectedAccountId !== 'all') {
        const statsData = await getReconciliationStats(selectedAccountId);
        setStats(statsData);
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation vers le rapprochement d'un relevé
  const handleOpenStatement = (statementId: string) => {
    router.push(`/banking/statements/${statementId}`);
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Rapprochement Bancaire
          </h1>
          <p className="text-gray-500 mt-1">
            Réconciliez vos relevés bancaires avec vos transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importer un relevé
          </Button>
        </div>
      </div>

      {/* Filtre par compte */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Building2 className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Sélectionnez un compte..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les comptes</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques (si compte sélectionné) */}
      {stats && selectedAccountId !== 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Lignes de relevé"
            value={stats.totalStatementLines}
            subtitle={`${stats.pendingLines} en attente`}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Taux de rapprochement"
            value={`${stats.reconciledPercentage}%`}
            subtitle={`${stats.reconciledLines} / ${stats.totalStatementLines}`}
            icon={FileCheck}
            color={stats.reconciledPercentage >= 80 ? 'green' : 'amber'}
          />
          <StatCard
            title="Transactions non rapprochées"
            value={stats.unreconciledTransactions}
            subtitle={`sur ${stats.totalTransactions} transactions`}
            icon={Clock}
            color={stats.unreconciledTransactions > 0 ? 'amber' : 'green'}
          />
          <StatCard
            title="Écart"
            value={formatCurrency(Math.abs(stats.discrepancy))}
            subtitle={stats.discrepancy === 0 ? 'Aucun écart' : 
              stats.discrepancy > 0 ? 'Relevé > Transactions' : 'Transactions > Relevé'}
            icon={stats.discrepancy >= 0 ? TrendingUp : TrendingDown}
            color={stats.discrepancy === 0 ? 'green' : 'red'}
          />
        </div>
      )}

      {/* Liste des relevés */}
      <Card>
        <CardHeader>
          <CardTitle>Relevés bancaires</CardTitle>
          <CardDescription>
            Sélectionnez un relevé pour commencer le rapprochement.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : statements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucun relevé importé
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Importez votre premier relevé bancaire pour commencer le rapprochement.
              </p>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Importer un relevé
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relevé</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Solde initial</TableHead>
                  <TableHead className="text-right">Solde final</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map(statement => (
                  <TableRow
                    key={statement.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleOpenStatement(statement.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{statement.name}</p>
                        <p className="text-sm text-gray-500">
                          {statement.bankAccountName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(statement.startBalance)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(statement.endBalance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(statement.reconciledCount / statement.lineCount) * 100} 
                          className="h-2 w-20"
                        />
                        <span className="text-xs text-gray-500">
                          {statement.reconciledCount}/{statement.lineCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatementStatusBadge status={statement.status} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}