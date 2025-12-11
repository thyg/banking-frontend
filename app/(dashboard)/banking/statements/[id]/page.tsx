/**
 * @file app/(dashboard)/banking/statements/[id]/page.tsx
 * @description Page de rapprochement d'un releve bancaire.
 * 
 * @version 1.1.0 - Fix: Type stats compatible avec StatementLinesTableProps
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types
import {
  BankStatement,
  BankStatementLine,
  TransactionType,
  ReconciliationSuggestion,
  ReconciliationStats,
} from '@/types/banking';

// API
import {
  getBankStatementById,
  getStatementLines,
  getReconciliationSuggestions,
  getStatementReconciliationStats,
  reconcileLine,
  reconcileWithNewTransaction,
  bulkReconcile,
} from '@/lib/api/reconciliation';
import { getTransactionTypes } from '@/lib/api/banking';

// Composants
import { ReconciliationPanel, ManualReconciliationData } from '@/components/banking/reconciliation-panel';
import { StatementLinesTable } from '@/components/banking/statement-lines-table';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  ArrowLeft,
  RefreshCw,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function StatementReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const statementId = params.id as string;

  // Etats
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [lines, setLines] = useState<BankStatementLine[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [showAutoReconcileDialog, setShowAutoReconcileDialog] = useState(false);

  // Chargement initial
  const fetchData = useCallback(async () => {
    setIsLoadingPage(true);
    try {
      const [statementData, linesData, typesData, statsData] = await Promise.all([
        getBankStatementById(statementId),
        getStatementLines(statementId),
        getTransactionTypes(true),
        getStatementReconciliationStats(statementId),
      ]);
      
      setStatement(statementData);
      setLines(linesData);
      setTransactionTypes(typesData);
      setStats(statsData);
      
      // Selectionner la premiere ligne non rapprochee
      const firstUnreconciled = linesData.find(l => !l.isReconciled);
      if (firstUnreconciled) {
        setSelectedLineId(firstUnreconciled.id);
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger le releve.',
      });
    } finally {
      setIsLoadingPage(false);
    }
  }, [statementId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Charger les suggestions quand une ligne est selectionnee
  const fetchSuggestions = useCallback(async (lineId: string) => {
    setIsLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const suggestionsData = await getReconciliationSuggestions(lineId);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('[ReconciliationPage] Erreur suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLineId) {
      const line = lines.find(l => l.id === selectedLineId);
      if (line && !line.isReconciled) {
        fetchSuggestions(selectedLineId);
      } else {
        setSuggestions([]);
      }
    }
  }, [selectedLineId, lines, fetchSuggestions]);

  // Rafraichir les lignes et stats
  const refreshLines = async () => {
    const [linesData, statsData] = await Promise.all([
      getStatementLines(statementId),
      getStatementReconciliationStats(statementId),
    ]);
    setLines(linesData);
    setStats(statsData);
  };

  // Selectionner la prochaine ligne non rapprochee
  const selectNextUnreconciled = (currentLineId: string) => {
    const currentIndex = lines.findIndex(l => l.id === currentLineId);
    const nextUnreconciled = lines.find(
      (l, index) => index > currentIndex && !l.isReconciled
    ) || lines.find(l => !l.isReconciled);
    
    if (nextUnreconciled) {
      setSelectedLineId(nextUnreconciled.id);
    } else {
      setSelectedLineId(null);
    }
  };

  // Handlers
  const handleSelectLine = (lineId: string) => {
    if (selectedLineId === lineId) {
      setSelectedLineId(null);
    } else {
      setSelectedLineId(lineId);
    }
  };

  const handleReconcileWithSuggestion = async (
    lineId: string,
    suggestion: ReconciliationSuggestion
  ) => {
    try {
      const result = await reconcileLine(lineId, suggestion.id, suggestion.type);
      
      if (result.success) {
        toast({
          title: 'Ligne rapprochee',
          description: `Rapprochee avec ${suggestion.reference}`,
        });
        
        await refreshLines();
        selectNextUnreconciled(lineId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || 'Echec du rapprochement',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue',
      });
    }
  };

  const handleReconcileManually = async (
    lineId: string,
    data: ManualReconciliationData
  ) => {
    try {
      const result = await reconcileWithNewTransaction(lineId, data);
      
      if (result.success) {
        toast({
          title: 'Transaction creee',
          description: 'Transaction creee et rapprochee avec succes',
        });
        
        await refreshLines();
        selectNextUnreconciled(lineId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || 'Echec de la creation',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue',
      });
    }
  };

  const handleAutoReconcile = async () => {
    setShowAutoReconcileDialog(false);
    setIsAutoReconciling(true);
    
    try {
      const result = await bulkReconcile(statementId);
      
      toast({
        title: 'Rapprochement automatique termine',
        description: `${result.reconciled} lignes rapprochees, ${result.skipped} ignorees`,
      });
      
      await refreshLines();
      
      // Selectionner la premiere ligne non rapprochee
      const firstUnreconciled = lines.find(l => !l.isReconciled);
      if (firstUnreconciled) {
        setSelectedLineId(firstUnreconciled.id);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Echec du rapprochement automatique',
      });
    } finally {
      setIsAutoReconciling(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedLineId(null);
    setSuggestions([]);
  };

  // Ligne selectionnee
  const selectedLine = selectedLineId 
    ? lines.find(l => l.id === selectedLineId) || null
    : null;

  // Stats formatees pour le composant StatementLinesTable
  const tableStats = stats ? {
    total: stats.totalLines,
    reconciled: stats.reconciledLines,
    pending: stats.pendingLines,
    percentage: stats.percentage,
  } : undefined;

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  // Chargement
  if (isLoadingPage) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-96" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Releve non trouve
  if (!statement) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">Releve non trouve</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/banking/statements')}
            >
              Retour aux releves
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/banking/statements')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {statement.name}
            </h1>
            <p className="text-gray-500">
              {statement.bankAccountName} - {formatDate(statement.periodStart)} au {formatDate(statement.periodEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoadingPage}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPage ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAutoReconcileDialog(true)}
            disabled={isAutoReconciling || stats?.pendingLines === 0}
          >
            {isAutoReconciling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Rapprochement auto
          </Button>
        </div>
      </div>

      {/* Progression globale */}
      {stats && (
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className={
              stats.percentage === 100
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }
          >
            {stats.percentage === 100 && <CheckCircle className="h-3 w-3 mr-1" />}
            {stats.percentage}%
          </Badge>
          <span className="text-sm text-gray-500">
            {stats.reconciledLines} sur {stats.totalLines} lignes rapprochees
          </span>
          <Progress value={stats.percentage} className="flex-1 h-2" />
        </div>
      )}

      {/* Contenu principal - Split View */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Table des lignes */}
        <div className="lg:col-span-3">
          <StatementLinesTable
            lines={lines}
            isLoading={isLoadingPage}
            selectedLineId={selectedLineId}
            onSelectLine={handleSelectLine}
            onRefresh={refreshLines}
            stats={tableStats}
          />
        </div>

        {/* Panneau de rapprochement */}
        <div className="lg:col-span-2">
          <ReconciliationPanel
            selectedLine={selectedLine}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            transactionTypes={transactionTypes}
            onReconcileWithSuggestion={handleReconcileWithSuggestion}
            onReconcileManually={handleReconcileManually}
            onClose={handleClosePanel}
          />
        </div>
      </div>

      {/* Dialog confirmation rapprochement auto */}
      <AlertDialog open={showAutoReconcileDialog} onOpenChange={setShowAutoReconcileDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rapprochement automatique</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va rapprocher automatiquement toutes les lignes 
              ayant une correspondance exacte (score superieur ou egal a 90% et montant identique).
              <br /><br />
              <strong>{stats?.pendingLines || 0}</strong> lignes sont en attente de rapprochement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoReconcile}>
              <Sparkles className="h-4 w-4 mr-2" />
              Lancer le rapprochement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}