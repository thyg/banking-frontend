/**
 * @file app/(dashboard)/banking/statements/page.tsx
 * @description Page de liste des releves bancaires.
 * 
 * @version 1.1.0 - Fix: Import reconciliation et props StatementUploader
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
import { BankStatement, BankAccount } from '@/types/banking';

// API
import { getBankStatements } from '@/lib/api/reconciliation';
import { getBankAccounts } from '@/lib/api/banking';

// Composants
import { StatementUploader } from '@/components/banking/statement-uploader';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Upload,
  RefreshCw,
  Search,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Eye,
  Download,
  Filter,
  Building2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
          Non traite
        </Badge>
      );
  }
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function StatementsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Etats
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtres
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modales
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<BankStatement | null>(null);

  // Chargement des donnees
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statementsData, accountsData] = await Promise.all([
        getBankStatements(selectedAccountId === 'all' ? undefined : selectedAccountId),
        getBankAccounts(),
      ]);
      setStatements(statementsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('[StatementsPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les releves.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrage
  const filteredStatements = statements.filter(statement => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !statement.name.toLowerCase().includes(query) &&
        !statement.bankAccountName?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    if (statusFilter !== 'all' && statement.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  // Handlers
  const handleOpenStatement = (statementId: string) => {
    router.push(`/banking/statements/${statementId}`);
  };

  const handleDeleteStatement = async () => {
    if (!statementToDelete) return;
    
    toast({
      title: 'Releve supprime',
      description: `Le releve "${statementToDelete.name}" a ete supprime.`,
    });
    
    setStatementToDelete(null);
    setDeleteDialogOpen(false);
    fetchData();
  };

  const handleUploadComplete = (statementId: string) => {
    setShowUploadDialog(false);
    fetchData();
    toast({
      title: 'Import reussi',
      description: 'Le releve a ete importe avec succes.',
    });
  };

  // Statistiques
  const stats = {
    total: statements.length,
    reconciled: statements.filter(s => s.status === 'RECONCILED').length,
    partial: statements.filter(s => s.status === 'PARTIAL').length,
    draft: statements.filter(s => s.status === 'DRAFT').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Releves Bancaires
          </h1>
          <p className="text-gray-500 mt-1">
            Gerez et importez vos releves bancaires.
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
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importer un releve
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rapproches</p>
                <p className="text-2xl font-bold text-green-600">{stats.reconciled}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En cours</p>
                <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Non traites</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-gray-200" />
            </div>
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
                placeholder="Rechercher par nom, compte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full sm:w-64">
                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les comptes</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Non traites</SelectItem>
                <SelectItem value="PARTIAL">En cours</SelectItem>
                <SelectItem value="RECONCILED">Rapproches</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des releves */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des releves</CardTitle>
          <CardDescription>
            {filteredStatements.length} releve{filteredStatements.length > 1 ? 's' : ''} trouve{filteredStatements.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : filteredStatements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {statements.length === 0 ? 'Aucun releve importe' : 'Aucun resultat'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {statements.length === 0
                  ? 'Importez votre premier releve bancaire pour commencer.'
                  : 'Aucun releve ne correspond a vos criteres.'}
              </p>
              {statements.length === 0 && (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer un releve
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Releve</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Solde initial</TableHead>
                  <TableHead className="text-right">Solde final</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStatements.map(statement => (
                  <TableRow
                    key={statement.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleOpenStatement(statement.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{statement.name}</p>
                          <p className="text-xs text-gray-400">
                            Importe le {formatDate(statement.importedAt)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {statement.bankAccountName}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      <div>
                        <p>{formatDate(statement.periodStart)}</p>
                        <p className="text-xs text-gray-400">
                          au {formatDate(statement.periodEnd)}
                        </p>
                      </div>
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
                          className="h-2 w-16"
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {statement.reconciledCount}/{statement.lineCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatementStatusBadge status={statement.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenStatement(statement.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir / Rapprocher
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Telecharger
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setStatementToDelete(statement);
                              setDeleteDialogOpen(true);
                            }}
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
          )}
        </CardContent>
      </Card>

      {/* Dialog d'upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer un releve bancaire</DialogTitle>
            <DialogDescription>
              Selectionnez un fichier CSV ou OFX pour importer vos transactions.
            </DialogDescription>
          </DialogHeader>
          <StatementUploader
            accounts={accounts}
            onUploadComplete={handleUploadComplete}
            onCancel={() => setShowUploadDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce releve ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. Le releve "{statementToDelete?.name}" 
              et toutes ses lignes seront supprimes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStatement}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}