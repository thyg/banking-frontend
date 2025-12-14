/**
 * @file app/(dashboard)/banking/journal/page.tsx
 * @description Page du Journal des Opérations (Audit Log)
 * @version 1.0.0 - Incrément 5
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types
import type { AuditLog, AuditLogFilters, FilterOption } from '@/types/audit';

// API
import {
  getAuditLogs,
  countAuditLogs,
  getAuditModules,
  getAuditActions,
  exportToCsv,
  exportToJson,
} from '@/lib/api/audit';

// Composants
import { JournalList } from '@/components/banking/journal-list';
import { JournalFilters } from '@/components/banking/journal-filters';
import { JournalDetailModal } from '@/components/banking/journal-detail-modal';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

// Icons
import { 
  FileText, 
  Download, 
  RefreshCw,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';

// =============================================================================
// COMPOSANT PAGE
// =============================================================================

export default function JournalPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 0,
    size: 50,
  });

  // Options pour les filtres
  const [modules, setModules] = useState<FilterOption[]>([]);
  const [actions, setActions] = useState<FilterOption[]>([]);

  // Modal de détail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------------------------

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsData, count] = await Promise.all([
        getAuditLogs(filters),
        countAuditLogs(filters),
      ]);
      setLogs(logsData);
      setTotalCount(count);
    } catch (error) {
      console.error('[JournalPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger le journal des opérations.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [modulesData, actionsData] = await Promise.all([
        getAuditModules(),
        getAuditActions(),
      ]);
      setModules(modulesData);
      setActions(actionsData);
    } catch (error) {
      console.error('[JournalPage] Erreur chargement options:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Met à jour les filtres et reset la pagination.
   */
  const handleFiltersChange = (newFilters: Partial<AuditLogFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 0, // Reset to first page on filter change
    }));
  };

  /**
   * Change de page.
   */
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  /**
   * Ouvre le modal de détail.
   */
  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  /**
   * Exporte en CSV.
   */
  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Export impossible',
        description: 'Aucune donnée à exporter.',
      });
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCsv(logs, `journal-operations-${dateStr}.csv`);
    
    toast({
      title: 'Export réussi',
      description: `${logs.length} entrées exportées en CSV.`,
    });
  };

  /**
   * Exporte en JSON.
   */
  const handleExportJson = () => {
    if (logs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Export impossible',
        description: 'Aucune donnée à exporter.',
      });
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    exportToJson(logs, `journal-operations-${dateStr}.json`);
    
    toast({
      title: 'Export réussi',
      description: `${logs.length} entrées exportées en JSON.`,
    });
  };

  /**
   * Actualise les données.
   */
  const handleRefresh = () => {
    fetchLogs();
    toast({
      title: 'Actualisation',
      description: 'Le journal a été actualisé.',
    });
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  const totalPages = Math.ceil(totalCount / (filters.size || 50));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Journal des Opérations
          </h1>
          <p className="text-muted-foreground">
            Historique complet de toutes les actions effectuées dans le module Banking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          
          {/* Menu export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
                <FileJson className="mr-2 h-4 w-4" />
                Exporter en JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
          <CardDescription>
            Affinez votre recherche par module, action, date ou texte libre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JournalFilters
            filters={filters}
            modules={modules}
            actions={actions}
            onFiltersChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Résultats ({totalCount.toLocaleString('fr-FR')} entrées)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <JournalList
            logs={logs}
            isLoading={isLoading}
            currentPage={filters.page || 0}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>

      {/* Modal Détail */}
      <JournalDetailModal
        log={selectedLog}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}