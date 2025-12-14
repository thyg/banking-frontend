/**
 * @file app/dashboard/banking/accounts/[id]/page.tsx
 * @description Page de détail d'un compte bancaire.
 * Affiche les informations complètes, les transactions récentes,
 * les relevés et permet les actions sur le compte.
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Types
import type { 
  BankAccount, 
  BankTransaction, 
  BankStatement,
  Check,
  Bank
} from '@/types/banking';

// API
import { 
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
  getBankTransactionsByAccountId,
  getBankStatementsByAccountId,
  getChecksByAccountId,
  getBanks
} from '@/lib/api/banking';

// Composants existants
import { BankAccountForm } from '@/components/banking/bank-account-form';
import { StatementUploader } from '@/components/banking/statement-uploader';

// Composants UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

// Icônes
import { 
  ArrowLeft, 
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  FileText,
  ArrowLeftRight,
  CheckSquare,
  RefreshCw,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Hash,
  Globe,
  Plus,
  ExternalLink,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function BankAccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;
  const { toast } = useToast();

  // États des données
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  
  // États de chargement
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingStatements, setIsLoadingStatements] = useState(true);
  const [isLoadingChecks, setIsLoadingChecks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États des modales
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  const fetchAccount = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountData, banksData] = await Promise.all([
        getBankAccountById(accountId),
        getBanks()
      ]);
      setAccount(accountData);
      setBanks(banksData);
    } catch (error) {
      console.error("Erreur lors du chargement du compte:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du compte.",
        variant: "destructive"
      });
      router.push('/banking/accounts');
    } finally {
      setIsLoading(false);
    }
  }, [accountId, toast, router]);

  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const data = await getBankTransactionsByAccountId(accountId);
      setTransactions(data);
    } catch (error) {
      console.error("Erreur lors du chargement des transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [accountId]);

  const fetchStatements = useCallback(async () => {
    setIsLoadingStatements(true);
    try {
      const data = await getBankStatementsByAccountId(accountId);
      setStatements(data);
    } catch (error) {
      console.error("Erreur lors du chargement des relevés:", error);
    } finally {
      setIsLoadingStatements(false);
    }
  }, [accountId]);

  const fetchChecks = useCallback(async () => {
    setIsLoadingChecks(true);
    try {
      const data = await getChecksByAccountId(accountId);
      setChecks(data);
    } catch (error) {
      console.error("Erreur lors du chargement des chèques:", error);
    } finally {
      setIsLoadingChecks(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchAccount();
    fetchTransactions();
    fetchStatements();
    fetchChecks();
  }, [fetchAccount, fetchTransactions, fetchStatements, fetchChecks]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = async () => {
    await Promise.all([
      fetchAccount(),
      fetchTransactions(),
      fetchStatements(),
      fetchChecks()
    ]);
  };

  const handleUpdate = async (data: any) => {
    setIsSubmitting(true);
    try {
      await updateBankAccount(accountId, data);
      toast({
        title: "Compte modifié",
        description: "Les informations du compte ont été mises à jour."
      });
      setIsEditOpen(false);
      await fetchAccount();
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le compte.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteBankAccount(accountId);
      toast({
        title: "Compte supprimé",
        description: "Le compte a été supprimé avec succès."
      });
      router.push('/banking/accounts');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le compte.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleUploadSuccess = (newStatement: BankStatement) => {
    setIsUploadOpen(false);
    toast({
      title: "Relevé importé",
      description: "Le relevé a été importé avec succès."
    });
    router.push(`/banking/statements/${newStatement.id}`);
  };

  // ============================================================================
  // RENDU - CHARGEMENT
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Compte non trouvé</p>
        <Link href="/banking/accounts">
          <Button variant="link">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  // ============================================================================
  // RENDU PRINCIPAL
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Link href="/banking/accounts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {account.name}
                </h1>
                <Badge variant={account.isActive ? 'default' : 'secondary'}>
                  {account.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {account.bankName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer un relevé
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer Relevé
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Cartes de statistiques */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Actuel</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {formatCurrency(account.currentBalance, account.currency)}
                </div>
                {account.currentBalance >= 0 
                  ? <TrendingUp className="h-4 w-4 text-green-500" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Rapproché</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(account.reconciledBalance, account.currency)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.status === 'DRAFT').length} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relevés</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statements.length}</div>
              <p className="text-xs text-muted-foreground">
                {statements.filter(s => s.status === 'IN_PROGRESS').length} à rapprocher
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informations du compte */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations du compte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de compte</p>
                  <p className="font-medium">{account.accountNumber}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="font-medium font-mono text-sm">{account.iban || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">BIC/SWIFT</p>
                  <p className="font-medium font-mono text-sm">{account.bic || 'Non renseigné'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Devise</p>
                  <p className="font-medium">{account.currency}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onglets */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Transactions
              <Badge variant="secondary" className="ml-1">{transactions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="statements" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Relevés
              <Badge variant="secondary" className="ml-1">{statements.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="checks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Chèques
              <Badge variant="secondary" className="ml-1">{checks.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Transactions */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Transactions récentes</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchTransactions}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                  <Link href="/banking/transactions">
                    <Button variant="outline" size="sm">
                      Voir tout <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingTransactions ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune transaction
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Partenaire</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 10).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell>{tx.partnerName || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-mono",
                              tx.direction === 'CREDIT' ? "text-green-600" : ""
                            )}>
                              {tx.direction === 'CREDIT' ? '+' : '-'}
                              {formatCurrency(tx.amount, account.currency)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'VALIDATED' ? 'default' : 'secondary'}>
                              {tx.status === 'VALIDATED' ? 'Validée' : 'Brouillon'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Relevés */}
          <TabsContent value="statements">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Relevés bancaires</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchStatements}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                  <Button size="sm" onClick={() => setIsUploadOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingStatements ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : statements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun relevé importé
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead className="text-right">Solde fin</TableHead>
                        <TableHead>Rapprochement</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statements.map((stmt) => {
                        const progress = stmt.lineCount > 0 
                          ? Math.round((stmt.reconciledCount / stmt.lineCount) * 100) 
                          : 0;
                        return (
                          <TableRow key={stmt.id}>
                            <TableCell className="font-medium">
                              {stmt.reference || `Relevé du ${formatDate(stmt.statementDate)}`}
                            </TableCell>
                            <TableCell>
                              {formatDate(stmt.periodStart)} - {formatDate(stmt.periodEnd)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(stmt.closingBalance, account.currency)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>{stmt.reconciledCount}/{stmt.lineCount}</span>
                                  <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={stmt.status === 'RECONCILED' ? 'default' : 'secondary'}>
                                {stmt.status === 'RECONCILED' ? 'Rapproché' : 
                                 stmt.status === 'IN_PROGRESS' ? 'En cours' : 'Importé'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link href={`/banking/statements/${stmt.id}`}>
                                <Button variant="ghost" size="sm">Ouvrir</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Chèques */}
          <TabsContent value="checks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Chèques</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchChecks}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                  <Link href="/banking/checks">
                    <Button variant="outline" size="sm">
                      Voir tout <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingChecks ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : checks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun chèque enregistré
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>N° Chèque</TableHead>
                        <TableHead>Partenaire</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checks.slice(0, 10).map((check) => (
                        <TableRow key={check.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {check.checkType === 'RECEIVED' ? (
                                <ArrowDownCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpCircle className="h-4 w-4 text-orange-600" />
                              )}
                              {check.checkType === 'RECEIVED' ? 'Reçu' : 'Émis'}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{check.checkNumber}</TableCell>
                          <TableCell>{check.partnerName}</TableCell>
                          <TableCell>{check.dueDate ? formatDate(check.dueDate) : '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(check.amount, account.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              check.status === 'CASHED' ? 'default' :
                              check.status === 'REJECTED' ? 'destructive' : 'secondary'
                            }>
                              {check.status === 'CASHED' ? 'Encaissé' :
                               check.status === 'DEPOSITED' ? 'Déposé' :
                               check.status === 'REJECTED' ? 'Rejeté' :
                               check.status === 'CANCELLED' ? 'Annulé' : 'En attente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal d'édition */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              Modifiez les informations du compte bancaire.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <BankAccountForm
              initialData={account}
              onSave={handleUpdate}
              onCancel={() => setIsEditOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'upload */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Importer un Relevé Bancaire</DialogTitle>
          </DialogHeader>
          <StatementUploader
            accountId={accountId}
            onCancel={() => setIsUploadOpen(false)}
            onUploadSuccess={handleUploadSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Supprimer le compte "${account.name}" ?`}
        description="Cette action est irréversible. Toutes les transactions et relevés associés seront supprimés."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        isLoading={isSubmitting}
      />
    </div>
  );
}