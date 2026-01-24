/**
 * @file components/banking/journal-list.tsx
 * @description Liste des entrées du journal d'audit avec pagination
 * @version 1.0.0 - Incrément 5
 */

"use client";

import React from 'react';
import type { AuditLog } from '@/types/audit';

// UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface JournalListProps {
  /** Liste des logs d'audit à afficher */
  logs: AuditLog[];
  /** Indicateur de chargement */
  isLoading: boolean;
  /** Numéro de page actuel (0-indexed) */
  currentPage: number;
  /** Nombre total de pages */
  totalPages: number;
  /** Callback pour changer de page */
  onPageChange: (page: number) => void;
  /** Callback pour voir le détail d'un log */
  onViewDetail: (log: AuditLog) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Retourne la classe CSS pour le badge de sévérité.
 */
function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'success':
      return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    case 'warning':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    case 'danger':
      return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    case 'info':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400';
  }
}

/**
 * Retourne l'icône pour une action.
 */
function getActionIcon(action: string): React.ReactNode {
  // On peut ajouter des icônes spécifiques si besoin
  return null;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function JournalList({
  logs,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onViewDetail,
}: JournalListProps) {
  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EMPTY STATE
  // ---------------------------------------------------------------------------

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Aucune entrée trouvée</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Modifiez vos filtres ou effectuez des opérations dans le module Banking 
          pour voir apparaître des entrées dans le journal.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[140px] sm:w-[160px]">Date</TableHead>
                <TableHead className="hidden sm:table-cell w-[120px] sm:w-[150px]">Module</TableHead>
                <TableHead className="w-[100px] sm:w-[130px]">Action</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="hidden md:table-cell w-[120px] sm:w-[140px]">Utilisateur</TableHead>
                <TableHead className="w-[50px] sm:w-[70px] text-center">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onViewDetail(log)}
                >
                  {/* Date */}
                  <TableCell className="text-xs sm:text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{log.formattedDate}</span>
                      <span className="text-xs text-muted-foreground">
                        {log.relativeTime}
                      </span>
                    </div>
                  </TableCell>

                  {/* Module - Hidden on mobile */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="font-normal text-xs">
                      {log.moduleLabel}
                    </Badge>
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <Badge className={`text-xs ${getSeverityClass(log.actionSeverity)}`}>
                      {getActionIcon(log.action)}
                      <span className="hidden sm:inline">{log.actionLabel}</span>
                      <span className="sm:hidden">{log.actionLabel.substring(0, 6)}</span>
                    </Badge>
                  </TableCell>

                  {/* Reference & Description */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {log.entityReference && (
                        <span className="font-mono text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                          {log.entityReference}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[350px]">
                        {log.description}
                      </span>
                      {/* Show module on mobile */}
                      <span className="sm:hidden text-xs text-muted-foreground">
                        {log.moduleLabel}
                      </span>
                    </div>
                  </TableCell>

                  {/* Utilisateur - Hidden on mobile */}
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate max-w-[100px]">
                        {log.userName}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action Detail */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(log);
                      }}
                      title="Voir les details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            Page {currentPage + 1} sur {totalPages}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(0)}
              disabled={currentPage === 0}
              title="Premiere page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              title="Page precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page indicator - simplified on mobile */}
            <div className="hidden sm:flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>

            {/* Simple page indicator on mobile */}
            <span className="sm:hidden px-2 text-sm font-medium">
              {currentPage + 1}/{totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              title="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
              title="Derniere page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}