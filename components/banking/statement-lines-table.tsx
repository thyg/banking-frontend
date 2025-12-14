/**
 * @file components/banking/statement-lines-table.tsx
 * @description Affiche la table des transactions d'un relevé bancaire.
 * Gère la sélection d'une ligne pour le rapprochement et les états d'affichage.
 * 
 * @version 2.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React from 'react';
import { StatementLine, ReconciliationStatus } from '@/types/banking';
import { cn } from '@/lib/utils';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  MinusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StatementLinesTableProps {
  /** Liste des lignes du relevé */
  lines: StatementLine[];
  /** Indicateur de chargement */
  isLoading: boolean;
  /** ID de la ligne actuellement sélectionnée */
  selectedLineId: string | null;
  /** Callback appelé lors de la sélection d'une ligne */
  onSelectLine: (lineId: string) => void;
  /** Code devise pour le formatage (défaut: EUR) */
  currencyCode?: string;
  /** Titre personnalisé pour la carte */
  title?: string;
  /** Description personnalisée */
  description?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Formate une date en français
 */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Formate un montant en devise
 */
function formatCurrency(amount: number, currencyCode: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Retourne les informations de badge selon le statut de réconciliation
 */
function getStatusBadgeInfo(status: ReconciliationStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
} {
  switch (status) {
    case 'MATCHED':
      return {
        label: 'Rapproché',
        variant: 'default',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />
      };
    case 'PARTIALLY_MATCHED':
      return {
        label: 'Partiel',
        variant: 'secondary',
        icon: <AlertCircle className="h-3 w-3 mr-1" />
      };
    case 'IGNORED':
      return {
        label: 'Ignoré',
        variant: 'outline',
        icon: <MinusCircle className="h-3 w-3 mr-1" />
      };
    case 'UNMATCHED':
    default:
      return {
        label: 'À traiter',
        variant: 'secondary',
        icon: <Circle className="h-3 w-3 mr-1" />
      };
  }
}

/**
 * Vérifie si une ligne est considérée comme traitée
 */
function isLineProcessed(status: ReconciliationStatus): boolean {
  return status === 'MATCHED' || status === 'IGNORED';
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function StatementLinesTable({
  lines,
  isLoading,
  selectedLineId,
  onSelectLine,
  currencyCode = 'EUR',
  title = 'Transactions du relevé',
  description
}: StatementLinesTableProps) {

  // Calcul des statistiques
  const stats = React.useMemo(() => {
    if (lines.length === 0) return null;
    
    const matched = lines.filter(l => l.reconciliationStatus === 'MATCHED').length;
    const unmatched = lines.filter(l => l.reconciliationStatus === 'UNMATCHED').length;
    const ignored = lines.filter(l => l.reconciliationStatus === 'IGNORED').length;
    
    return { matched, unmatched, ignored, total: lines.length };
  }, [lines]);

  // Rendu du corps de la table
  const renderTableBody = () => {
    // 1. État de chargement
    if (isLoading) {
      return Array.from({ length: 8 }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-full max-w-[200px]" /></TableCell>
          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
        </TableRow>
      ));
    }

    // 2. État vide (après chargement)
    if (lines.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-48 text-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="font-semibold text-lg">Aucune ligne</h3>
              <p className="text-sm">Ce relevé ne contient aucune transaction.</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // 3. Vérifier si tout est rapproché
    const allProcessed = lines.every(l => isLineProcessed(l.reconciliationStatus));
    if (allProcessed) {
      return (
        <>
          {lines.map((line) => renderLine(line))}
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center bg-green-50 dark:bg-green-950">
              <div className="flex flex-col items-center justify-center text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-8 w-8 mb-2" />
                <h3 className="font-semibold">Rapprochement terminé !</h3>
                <p className="text-sm opacity-80">Toutes les transactions ont été traitées.</p>
              </div>
            </TableCell>
          </TableRow>
        </>
      );
    }

    // 4. État normal avec des données
    return lines.map((line) => renderLine(line));
  };

  // Rendu d'une ligne individuelle
  const renderLine = (line: StatementLine) => {
    const isSelected = selectedLineId === line.id;
    const isProcessed = isLineProcessed(line.reconciliationStatus);
    const statusInfo = getStatusBadgeInfo(line.reconciliationStatus);
    const isCredit = line.direction === 'CREDIT';

    return (
      <TableRow
        key={line.id}
        onClick={() => onSelectLine(line.id)}
        className={cn(
          "cursor-pointer transition-colors",
          isSelected && "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary",
          !isSelected && "hover:bg-muted/50",
          isProcessed && !isSelected && "opacity-60"
        )}
      >
        {/* Numéro de ligne */}
        <TableCell className="w-[60px] text-center font-mono text-sm text-muted-foreground">
          {line.lineNumber}
        </TableCell>

        {/* Date */}
        <TableCell className="w-[120px]">
          <div className="flex flex-col">
            <span className="font-medium">{formatDate(line.transactionDate)}</span>
            {line.valueDate && line.valueDate !== line.transactionDate && (
              <span className="text-xs text-muted-foreground">
                Valeur: {formatDate(line.valueDate)}
              </span>
            )}
          </div>
        </TableCell>

        {/* Description / Libellé */}
        <TableCell className="max-w-[300px]">
          <div className="flex flex-col">
            <p className="font-medium truncate" title={line.description || undefined}>
              {line.description || 'Sans libellé'}
            </p>
            {line.partnerName && (
              <p className="text-xs text-muted-foreground truncate" title={line.partnerName}>
                {line.partnerName}
              </p>
            )}
            {line.reference && (
              <p className="text-xs text-muted-foreground font-mono">
                Réf: {line.reference}
              </p>
            )}
          </div>
        </TableCell>

        {/* Direction */}
        <TableCell className="w-[100px]">
          <div className="flex items-center gap-1">
            {isCredit ? (
              <>
                <ArrowDownCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Crédit</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-600 font-medium">Débit</span>
              </>
            )}
          </div>
        </TableCell>

        {/* Montant */}
        <TableCell className="text-right w-[150px]">
          <span className={cn(
            'font-semibold font-mono text-base',
            isCredit ? 'text-green-600' : 'text-foreground',
            isProcessed && 'font-normal opacity-70'
          )}>
            {isCredit ? '+' : '-'}{formatCurrency(line.amount, currencyCode)}
          </span>
        </TableCell>

        {/* Statut */}
        <TableCell className="w-[130px]">
          <Badge 
            variant={statusInfo.variant}
            className={cn(
              "flex items-center w-fit",
              line.reconciliationStatus === 'MATCHED' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            )}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          
          {/* Badge de statistiques */}
          {stats && !isLoading && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                {stats.matched}
              </Badge>
              <Badge variant="outline">
                <Circle className="h-3 w-3 mr-1" />
                {stats.unmatched}
              </Badge>
              {stats.ignored > 0 && (
                <Badge variant="outline" className="opacity-60">
                  <MinusCircle className="h-3 w-3 mr-1" />
                  {stats.ignored}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px] text-center">#</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="text-right w-[150px]">Montant</TableHead>
                <TableHead className="w-[130px]">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableBody()}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ALIAS POUR COMPATIBILITÉ ARRIÈRE
// ============================================================================

/**
 * @deprecated Utilisez StatementLine à la place de BankStatementLine
 * Cet alias est fourni pour la compatibilité avec l'ancien code
 */
export type BankStatementLine = StatementLine;

/**
 * @deprecated Utilisez ReconciliationStatus à la place de ReconciliationTargetType
 * Cet alias est fourni pour la compatibilité avec l'ancien code
 */
export type ReconciliationTargetType = ReconciliationStatus;

export default StatementLinesTable;