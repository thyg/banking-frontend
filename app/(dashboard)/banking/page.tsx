/**
 * @file app/dashboard/banking/page.tsx
 * @description Page principale du module Banque - Dashboard central
 * Hub de navigation vers tous les sous-modules avec KPIs et alertes
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  CreditCard,
  FileText,
  ArrowLeftRight,
  CheckSquare,
  Settings,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Wallet,
  BarChart3,
  ArrowRight,
  BookOpen,
  BookMarked,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Types et API
import type { BankAccount, BankTransaction, Check, BankStatement, BankingStats } from '@/types/banking';
import {
  getBankAccounts,
  getBankTransactions,
  getBankTransactionsByStatus,
  getChecks,
  getChecksByStatus,
  getBankStatementsByStatus,
  getPendingChecksDueBefore
} from '@/lib/api/banking';

export const dynamic = 'force-dynamic';

// ============================================================================
// TYPES LOCAUX
// ============================================================================

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  link?: string;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function BankingDashboardPage() {
  // États
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<BankTransaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<BankTransaction[]>([]);
  const [pendingChecks, setPendingChecks] = useState<Check[]>([]);
  const [allChecks, setAllChecks] = useState<Check[]>([]);
  const [unreconciledStatements, setUnreconciledStatements] = useState<BankStatement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des données
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [
        accountsData,
        transactionsData,
        allTransactionsData,
        checksData,
        allChecksData,
        statementsData,
        dueSoonChecks
      ] = await Promise.all([
        getBankAccounts(),
        getBankTransactionsByStatus('DRAFT'),
        getBankTransactions().catch(() => []),
        getChecksByStatus('PENDING'),
        getChecks().catch(() => []),
        getBankStatementsByStatus('IN_PROGRESS'),
        getPendingChecksDueBefore(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ).catch(() => []) // Si l'API échoue, retourne tableau vide
      ]);

      setAccounts(accountsData);
      setPendingTransactions(transactionsData);
      setRecentTransactions(allTransactionsData.slice(0, 10)); // 10 dernières transactions
      setPendingChecks(checksData);
      setAllChecks(allChecksData);
      setUnreconciledStatements(statementsData);

      // Générer les alertes
      const newAlerts: Alert[] = [];
      
      if (dueSoonChecks.length > 0) {
        newAlerts.push({
          id: 'checks-due',
          type: 'warning',
          title: `${dueSoonChecks.length} chèque(s) à échéance proche`,
          message: 'Des chèques arrivent à échéance dans les 7 prochains jours',
          link: '/banking/checks?status=PENDING'
        });
      }

      if (transactionsData.length > 5) {
        newAlerts.push({
          id: 'pending-tx',
          type: 'info',
          title: `${transactionsData.length} transactions en attente`,
          message: 'Des transactions sont en attente de validation',
          link: '/banking/transactions?status=DRAFT'
        });
      }

      if (statementsData.length > 0) {
        newAlerts.push({
          id: 'reconciliation',
          type: 'warning',
          title: `${statementsData.length} relevé(s) à rapprocher`,
          message: 'Des relevés bancaires nécessitent un rapprochement',
          link: '/banking/reconciliation'
        });
      }

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Erreur lors du chargement du dashboard:', err);
      setError('Impossible de charger les données. Vérifiez votre connexion.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculs des KPIs
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const activeAccounts = accounts.filter(acc => acc.isActive).length;

  // Actions rapides
  const quickActions: QuickAction[] = [
    {
      title: 'Banques',
      description: 'Gérer les établissements bancaires',
      icon: <Building2 className="h-6 w-6" />,
      href: '/banking/banks',
      color: 'bg-blue-500'
    },
    {
      title: 'Comptes',
      description: 'Gérer les comptes bancaires',
      icon: <CreditCard className="h-6 w-6" />,
      href: '/banking/accounts',
      color: 'bg-green-500'
    },
    {
      title: 'Transactions',
      description: 'Saisir et gérer les opérations',
      icon: <ArrowLeftRight className="h-6 w-6" />,
      href: '/banking/transactions',
      color: 'bg-purple-500'
    },
    {
      title: 'Chèques',
      description: 'Gérer les chèques émis/reçus',
      icon: <CheckSquare className="h-6 w-6" />,
      href: '/banking/checks',
      color: 'bg-orange-500'
    },
    {
      title: 'Relevés',
      description: 'Importer et consulter les relevés',
      icon: <FileText className="h-6 w-6" />,
      href: '/banking/statements',
      color: 'bg-cyan-500'
    },
    {
      title: 'Rapprochement',
      description: 'Rapprocher les opérations',
      icon: <BarChart3 className="h-6 w-6" />,
      href: '/banking/reconciliation',
      color: 'bg-pink-500'
    },
    {
      title: 'Chéquiers',
      description: 'Gérer les carnets de chèques',
      icon: <BookMarked className="h-6 w-6" />,
      href: '/banking/checkbooks',
      color: 'bg-indigo-500'
    },
    {
      title: 'Journal',
      description: 'Journal des écritures',
      icon: <BookOpen className="h-6 w-6" />,
      href: '/banking/journal',
      color: 'bg-teal-500'
    },
    {
      title: 'Types Transactions',
      description: 'Configurer les types',
      icon: <Settings className="h-6 w-6" />,
      href: '/banking/transaction-types',
      color: 'bg-gray-500'
    }
  ];

  // Rendu conditionnel pour le chargement
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Rendu conditionnel pour les erreurs
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={fetchDashboardData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Module Banque</h1>
          <p className="text-muted-foreground">
            Gérez vos comptes, transactions et rapprochements bancaires
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Solde Total"
          value={formatCurrency(totalBalance)}
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          trend={totalBalance >= 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Comptes Actifs"
          value={`${activeAccounts} / ${accounts.length}`}
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Transactions en Attente"
          value={pendingTransactions.length.toString()}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          badge={pendingTransactions.length > 0 ? 'À valider' : undefined}
        />
        <StatCard
          title="Chèques en Attente"
          value={pendingChecks.length.toString()}
          icon={<CheckSquare className="h-4 w-4 text-muted-foreground" />}
          badge={pendingChecks.length > 0 ? 'En cours' : undefined}
        />
      </div>

      {/* Actions Rapides */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Accès Rapide</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>
      </div>

      {/* Liste des Comptes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Comptes Bancaires</h2>
          <Link href="/banking/accounts">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun compte bancaire configuré</p>
              <Link href="/banking/accounts">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un compte
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.slice(0, 6).map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>

      {/* Section Transactions Bancaires */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions Bancaires</h2>
          <Link href="/banking/transactions">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucune transaction bancaire</p>
              <Link href="/banking/transactions">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle transaction
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentTransactions.slice(0, 6).map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </div>

      {/* Section Chèques */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chèques</h2>
          <Link href="/banking/checks">
            <Button variant="ghost" size="sm">
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {allChecks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun chèque enregistré</p>
              <Link href="/banking/checks">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau chèque
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allChecks.slice(0, 6).map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </div>
        )}
      </div>

      {/* Relevés à Rapprocher */}
      {unreconciledStatements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Relevés à Rapprocher</h2>
            <Link href="/banking/reconciliation">
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unreconciledStatements.slice(0, 3).map((statement) => (
              <StatementCard key={statement.id} statement={statement} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  badge 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: 'up' | 'down';
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            trend === 'up' 
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          {badge && (
            <Badge variant="secondary">{badge}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Link href={action.href}>
      <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
        <CardContent className="flex items-center space-x-4 p-4">
          <div className={`p-3 rounded-lg ${action.color} text-white`}>
            {action.icon}
          </div>
          <div>
            <h3 className="font-semibold">{action.title}</h3>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AccountCard({ account }: { account: BankAccount }) {
  return (
    <Link href={`/banking/accounts/${account.id}`}>
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{account.name}</CardTitle>
            <Badge variant={account.isActive ? 'default' : 'secondary'}>
              {account.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <CardDescription>{account.bankName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Solde actuel</span>
            <span className={`text-lg font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(account.currentBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">
              {account.details?.phoneNumber ? 'Tél.' : 'IBAN'}
            </span>
            <span className="text-sm font-mono">
              {account.details?.phoneNumber
                || account.details?.iban?.slice(-8)
                || account.details?.accountNumber?.slice(-8)
                || account.iban?.slice(-8)
                || 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TransactionCard({ transaction }: { transaction: BankTransaction }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Brouillon', className: 'bg-amber-50 text-amber-700' },
    VALIDATED: { label: 'Validé', className: 'bg-green-50 text-green-700' },
    CANCELLED: { label: 'Annulé', className: 'bg-gray-100 text-gray-500' },
  };
  const status = statusConfig[transaction.status] || statusConfig.DRAFT;

  return (
    <Link href="/banking/transactions">
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base truncate">{transaction.label || transaction.reference}</CardTitle>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <CardDescription className="flex items-center gap-2">
            {transaction.direction === 'CREDIT' ? (
              <ArrowDownLeft className="h-3 w-3 text-green-500" />
            ) : (
              <ArrowUpRight className="h-3 w-3 text-red-500" />
            )}
            {transaction.direction === 'CREDIT' ? 'Crédit' : 'Débit'}
            {transaction.bankAccountName && ` - ${transaction.bankAccountName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Montant</span>
            <span className={`text-lg font-bold ${transaction.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.direction === 'CREDIT' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">{formatDate(transaction.transactionDate)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CheckCard({ check }: { check: Check }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    DEPOSITED: { label: 'Remis', className: 'bg-blue-50 text-blue-700' },
    CASHED: { label: 'Encaissé', className: 'bg-green-50 text-green-700' },
    REJECTED: { label: 'Rejeté', className: 'bg-red-50 text-red-700' },
    CANCELLED: { label: 'Annulé', className: 'bg-gray-100 text-gray-500' },
  };
  const status = statusConfig[check.status] || statusConfig.PENDING;

  return (
    <Link href="/banking/checks">
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-mono">{check.checkNumber}</CardTitle>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <CardDescription className="flex items-center gap-2">
            {check.checkType === 'RECEIVED' ? (
              <>
                <ArrowDownLeft className="h-3 w-3 text-green-500" />
                Reçu
              </>
            ) : (
              <>
                <ArrowUpRight className="h-3 w-3 text-red-500" />
                Émis
              </>
            )}
            {check.partnerName && ` - ${check.partnerName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Montant</span>
            <span className={`text-lg font-bold ${check.checkType === 'RECEIVED' ? 'text-green-600' : 'text-red-600'}`}>
              {check.checkType === 'RECEIVED' ? '+' : '-'}{formatCurrency(check.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">{formatDate(check.issueDate)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatementCard({ statement }: { statement: BankStatement }) {
  const progress = statement.lineCount > 0 
    ? Math.round((statement.reconciledCount / statement.lineCount) * 100)
    : 0;

  return (
    <Link href={`/banking/statements/${statement.id}`}>
      <Card className="hover:bg-accent transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{statement.reference || 'Sans référence'}</CardTitle>
            <Badge variant="outline">{statement.status}</Badge>
          </div>
          <CardDescription>{statement.bankAccountName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Période</span>
              <span>{formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span>{progress}% ({statement.reconciledCount}/{statement.lineCount})</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const bgColor = {
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
  }[alert.type];

  const iconColor = {
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  }[alert.type];

  return (
    <div className={`flex items-center p-4 rounded-lg border ${bgColor}`}>
      <AlertTriangle className={`h-5 w-5 mr-3 ${iconColor}`} />
      <div className="flex-1">
        <p className="font-medium">{alert.title}</p>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
      </div>
      {alert.link && (
        <Link href={alert.link}>
          <Button variant="ghost" size="sm">
            Voir
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}