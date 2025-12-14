/**
 * @file app/(dashboard)/banking/statements/[id]/page.tsx
 * @description Page de rapprochement d'un relevé bancaire.
 * 
 * @version 2.0.0 - Fix: Routes de navigation corrigées (/dashboard/banking/...)
 * @author RT-ComOps Team
 * @since 2024-12-12
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types
import type {
  BankStatement,
  StatementLine,
  BankStatementLine,
  TransactionType,
  ReconciliationSuggestion,
  ReconciliationStats,
} from '@/types/banking';

// API - Utilise le backend réel
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
// CONSTANTES - ROUTES
// =============================================================================

/**
 * Préfixe des routes banking.
 * IMPORTANT: Modifier cette constante si la structure de routing change.
 */
const BANKING_BASE_ROUTE = '/banking';

// =============================================================================
// UTILITAIRES
// =============================================================================

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const formatCurrency = (amount: number, currency: string = 'XAF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export default function StatementReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const statementId = params.id as string;

  // ---------------------------------------------------------------------------
  // ÉTATS
  // ---------------------------------------------------------------------------
  
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isAutoReconciling, setIsAutoReconciling] = useState(false);
  const [showAutoReconcileDialog, setShowAutoReconcileDialog] = useState(false);

  // ---------------------------------------------------------------------------
  // CHARGEMENT INITIAL
  // ---------------------------------------------------------------------------
  
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
      
      // Sélectionner la première ligne non rapprochée
      const firstUnreconciled = linesData.find(l => 
        l.reconciliationStatus === 'UNMATCHED' && !l.isReconciled
      );
      if (firstUnreconciled) {
        setSelectedLineId(firstUnreconciled.id);
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de charger le relevé.',
      });
    } finally {
      setIsLoadingPage(false);
    }
  }, [statementId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES SUGGESTIONS
  // ---------------------------------------------------------------------------
  
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
      if (line && line.reconciliationStatus === 'UNMATCHED' && !line.isReconciled) {
        fetchSuggestions(selectedLineId);
      } else {
        setSuggestions([]);
      }
    }
  }, [selectedLineId, lines, fetchSuggestions]);

  // ---------------------------------------------------------------------------
  // RAFRAÎCHISSEMENT
  // ---------------------------------------------------------------------------
  
  const refreshLines = async () => {
    try {
      const [linesData, statsData] = await Promise.all([
        getStatementLines(statementId),
        getStatementReconciliationStats(statementId),
      ]);
      setLines(linesData);
      setStats(statsData);
    } catch (error) {
      console.error('[ReconciliationPage] Erreur refresh:', error);
    }
  };

  // ---------------------------------------------------------------------------
  // SÉLECTION DE LA PROCHAINE LIGNE
  // ---------------------------------------------------------------------------
  
  const selectNextUnreconciled = (currentLineId: string) => {
    const currentIndex = lines.findIndex(l => l.id === currentLineId);
    const nextUnreconciled = lines.find(
      (l, index) => index > currentIndex && 
        l.reconciliationStatus === 'UNMATCHED' && 
        !l.isReconciled
    ) || lines.find(l => 
      l.reconciliationStatus === 'UNMATCHED' && !l.isReconciled
    );
    
    if (nextUnreconciled) {
      setSelectedLineId(nextUnreconciled.id);
    } else {
      setSelectedLineId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  
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
          title: 'Ligne rapprochée',
          description: `Rapprochée avec ${suggestion.reference}`,
        });
        
        await refreshLines();
        selectNextUnreconciled(lineId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || 'Échec du rapprochement',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
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
          title: 'Transaction créée',
          description: 'Transaction créée et rapprochée avec succès',
        });
        
        await refreshLines();
        selectNextUnreconciled(lineId);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || 'Échec de la création',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    }
  };

  const handleAutoReconcile = async () => {
    setShowAutoReconcileDialog(false);
    setIsAutoReconciling(true);
    
    try {
      const result = await bulkReconcile(statementId);
      
      toast({
        title: 'Rapprochement automatique terminé',
        description: `${result.reconciled} lignes rapprochées, ${result.skipped} ignorées`,
      });
      
      await refreshLines();
      
      // Sélectionner la première ligne non rapprochée
      const updatedLines = await getStatementLines(statementId);
      const firstUnreconciled = updatedLines.find(l => 
        l.reconciliationStatus === 'UNMATCHED' && !l.isReconciled
      );
      if (firstUnreconciled) {
        setSelectedLineId(firstUnreconciled.id);
      } else {
        setSelectedLineId(null);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Échec du rapprochement automatique',
      });
    } finally {
      setIsAutoReconciling(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedLineId(null);
    setSuggestions([]);
  };

  /**
   * Retour à la liste des relevés.
   * IMPORTANT: Utilise BANKING_BASE_ROUTE pour le bon chemin.
   */
  const handleBackToStatements = () => {
    router.push(`${BANKING_BASE_ROUTE}/statements`);
  };

  // ---------------------------------------------------------------------------
  // DONNÉES DÉRIVÉES
  // ---------------------------------------------------------------------------
  
  // Ligne sélectionnée
  const selectedLine = selectedLineId 
    ? lines.find(l => l.id === selectedLineId) || null
    : null;

  // Stats formatées pour le composant StatementLinesTable
  const tableStats = stats ? {
    total: stats.totalLines,
    reconciled: stats.reconciledLines,
    pending: stats.pendingLines,
    percentage: stats.percentage,
  } : undefined;

  // ---------------------------------------------------------------------------
  // RENDU - CHARGEMENT
  // ---------------------------------------------------------------------------
  
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

  // ---------------------------------------------------------------------------
  // RENDU - RELEVÉ NON TROUVÉ
  // ---------------------------------------------------------------------------
  
  if (!statement) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500 mb-4">Relevé non trouvé</p>
            <p className="text-sm text-gray-400 mb-6">
              Le relevé demandé n'existe pas ou a été supprimé.
            </p>
            <Button
              variant="outline"
              onClick={handleBackToStatements}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux relevés
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDU PRINCIPAL
  // ---------------------------------------------------------------------------
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToStatements}
            title="Retour aux relevés"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {statement.name || statement.reference || `Relevé du ${formatDate(statement.statementDate)}`}
            </h1>
            <p className="text-gray-500">
              {statement.bankAccountName} • {formatDate(statement.periodStart)} au {formatDate(statement.periodEnd)}
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
            {stats.reconciledLines} sur {stats.totalLines} lignes rapprochées
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
              ayant une correspondance exacte (score supérieur ou égal à 90% et montant identique).
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