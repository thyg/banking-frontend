/**
 * @file components/banking/journal-detail-modal.tsx
 * @description Modal de détail d'une entrée du journal d'audit
 * Affiche les changements avant/après de manière lisible
 * @version 1.0.0 - Incrément 5
 */

"use client";

import React, { useMemo } from 'react';
import type { AuditLog } from '@/types/audit';
import { parseChanges, formatValue, translateFieldName } from '@/lib/api/audit';

// UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Icons
import {
  User,
  Clock,
  Globe,
  Monitor,
  ArrowRight,
  Minus,
  Plus,
  Hash,
  FileText,
  AlertCircle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface JournalDetailModalProps {
  /** Log d'audit à afficher */
  log: AuditLog | null;
  /** État d'ouverture du modal */
  open: boolean;
  /** Callback pour changer l'état d'ouverture */
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'danger':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400';
  }
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function JournalDetailModal({
  log,
  open,
  onOpenChange,
}: JournalDetailModalProps) {
  // ---------------------------------------------------------------------------
  // PARSE CHANGES
  // ---------------------------------------------------------------------------

  const changes = useMemo(() => {
    if (!log) return null;
    return parseChanges(log.oldValue, log.newValue);
  }, [log]);

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          {/* Badges Module & Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getSeverityClass(log.actionSeverity)}>
              {log.actionLabel}
            </Badge>
            <Badge variant="outline">{log.moduleLabel}</Badge>
            {log.hasChanges && (
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" />
                Avec modifications
              </Badge>
            )}
          </div>
          
          {/* Titre & Description */}
          <DialogTitle className="text-xl">{log.description}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <span className="font-mono">
              {log.entityReference || log.entityId}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Date :</span>
                    <span className="font-medium">{log.formattedDate}</span>
                  </div>
                  
                  {/* Utilisateur */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Utilisateur :</span>
                    <span className="font-medium">{log.userName}</span>
                  </div>
                  
                  {/* Adresse IP */}
                  {log.ipAddress && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">Adresse IP :</span>
                      <span className="font-mono text-xs">{log.ipAddress}</span>
                    </div>
                  )}
                  
                  {/* ID Entité */}
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">ID Entité :</span>
                    <span className="font-mono text-xs truncate">{log.entityId}</span>
                  </div>
                  
                  {/* User Agent */}
                  {log.userAgent && (
                    <div className="flex items-start gap-2 md:col-span-2">
                      <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Client :</span>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {log.userAgent}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section Changements */}
            {changes && changes.differences.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Détail des modifications ({changes.differences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium w-1/4">Champ</th>
                          <th className="px-3 py-2 text-left font-medium w-[37.5%]">
                            <span className="flex items-center gap-1 text-red-600">
                              <Minus className="h-3 w-3" />
                              Avant
                            </span>
                          </th>
                          <th className="px-3 py-2 text-left font-medium w-[37.5%]">
                            <span className="flex items-center gap-1 text-green-600">
                              <Plus className="h-3 w-3" />
                              Après
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {changes.differences.map((diff, index) => (
                          <tr 
                            key={index} 
                            className="border-b last:border-0 hover:bg-muted/30"
                          >
                            {/* Nom du champ */}
                            <td className="px-3 py-2 font-medium">
                              <span className="text-xs">
                                {translateFieldName(diff.field)}
                              </span>
                              <span className="block text-[10px] font-mono text-muted-foreground">
                                {diff.field}
                              </span>
                            </td>
                            
                            {/* Valeur avant */}
                            <td className="px-3 py-2">
                              {diff.before !== null ? (
                                <div className="flex items-start gap-1">
                                  <Minus className="h-3 w-3 text-red-500 flex-shrink-0 mt-1" />
                                  <pre className="text-xs whitespace-pre-wrap break-all bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded text-red-700 dark:text-red-400 max-h-24 overflow-auto">
                                    {formatValue(diff.before)}
                                  </pre>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  (vide)
                                </span>
                              )}
                            </td>
                            
                            {/* Valeur après */}
                            <td className="px-3 py-2">
                              {diff.after !== null ? (
                                <div className="flex items-start gap-1">
                                  <Plus className="h-3 w-3 text-green-500 flex-shrink-0 mt-1" />
                                  <pre className="text-xs whitespace-pre-wrap break-all bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded text-green-700 dark:text-green-400 max-h-24 overflow-auto">
                                    {formatValue(diff.after)}
                                  </pre>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  (vide)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Message si pas de changements détaillés */}
            {(!changes || changes.differences.length === 0) && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="font-medium">Aucun détail de modification disponible</p>
                    <p className="text-sm">
                      Les données avant/après n'ont pas été enregistrées pour cette opération.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section JSON brut (collapsible) */}
            {(log.oldValue || log.newValue) && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  Voir les données JSON brutes
                </summary>
                <div className="mt-2 space-y-2">
                  {log.oldValue && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">Avant :</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                        {JSON.stringify(JSON.parse(log.oldValue), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.newValue && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Après :</p>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
                        {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}