/**
 * @file app/(dashboard)/banking/checks/page.tsx
 * @description Page de gestion des chèques (émis et reçus).
 * Orchestre les composants de liste et formulaire avec gestion des actions.
 * 
 * @version 2.0.0 - Fix: Imports corrigés pour utiliser lib/api/check.ts (backend réel)
 * @author RT-ComOps Team
 * @since 2024-12-12
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Types
import type {
  Check,
  CheckFilters,
  CheckType,
  CheckStatus,
  CreateCheckData,
  UpdateCheckData,
} from '@/types/banking';

// Hook navigation filtrée
import { useCheckNavigation } from '@/hooks/use-check-navigation';

// API - IMPORTANT: Utilise lib/api/check.ts qui appelle le backend
import {
  getChecks,
  createCheck,
  updateCheck,
  deleteCheck,
  depositCheck,
  cashCheck,
  rejectCheck,
  cancelCheck,
  emitCheck,
  markReceivedCheck,
  markProcessingCheck,
  markPaidCheck,
} from '@/lib/api/check';

// Utilitaire de génération PDF
import { generateCheckPDF } from '@/lib/utils/pdf-generator';

// Composants
import { CheckList } from '@/components/banking/check-list';
import { CheckForm } from '@/components/banking/check-form';
import { CheckDetailDialog } from '@/components/banking/check-detail-dialog';
import { ActiveFilterBadges } from '@/components/banking/active-filter-badges';

// UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

// =============================================================================
// COMPOSANT PAGE
// =============================================================================

export default function ChecksPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------

  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentFilters, hasActiveFilters } = useCheckNavigation();

  const [checks, setChecks] = useState<Check[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialiser les filtres depuis l'URL
  const [filters, setFilters] = useState<CheckFilters>(() => {
    const urlFilters: CheckFilters = {};
    const checkbookId = searchParams.get('checkbookId');
    const status = searchParams.get('status');
    const checkType = searchParams.get('checkType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const search = searchParams.get('search');

    if (checkbookId) urlFilters.checkbookId = checkbookId;
    if (status) urlFilters.status = status as CheckStatus;
    if (checkType) urlFilters.checkType = checkType as CheckType;
    if (dateFrom) urlFilters.dateFrom = dateFrom;
    if (dateTo) urlFilters.dateTo = dateTo;
    if (amountMin) urlFilters.amountMin = amountMin;
    if (amountMax) urlFilters.amountMax = amountMax;
    if (search) urlFilters.search = search;

    return urlFilters;
  });
  
  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [preselectedType, setPreselectedType] = useState<CheckType | undefined>();

  // Popup de détails
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Actions
  const [checkToDelete, setCheckToDelete] = useState<Check | null>(null);
  const [checkToDeposit, setCheckToDeposit] = useState<Check | null>(null);
  const [checkToCash, setCheckToCash] = useState<Check | null>(null);
  const [checkToReject, setCheckToReject] = useState<Check | null>(null);
  const [checkToCancel, setCheckToCancel] = useState<Check | null>(null);
  
  // Formulaires d'action
  const [depositDate, setDepositDate] = useState('');
  const [cashDate, setCashDate] = useState('');
  const [rejectDate, setRejectDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  // États de chargement pour les actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------------------------

  const fetchChecks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getChecks(filters);
      setChecks(data);
    } catch (error) {
      console.error('[ChecksPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de charger les chèques.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  // Synchroniser les filtres quand l'URL change
  useEffect(() => {
    const urlFilters: CheckFilters = {};
    const checkbookId = searchParams.get('checkbookId');
    const status = searchParams.get('status');
    const checkType = searchParams.get('checkType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const search = searchParams.get('search');

    if (checkbookId) urlFilters.checkbookId = checkbookId;
    if (status) urlFilters.status = status as CheckStatus;
    if (checkType) urlFilters.checkType = checkType as CheckType;
    if (dateFrom) urlFilters.dateFrom = dateFrom;
    if (dateTo) urlFilters.dateTo = dateTo;
    if (amountMin) urlFilters.amountMin = amountMin;
    if (amountMax) urlFilters.amountMax = amountMax;
    if (search) urlFilters.search = search;

    setFilters(urlFilters);
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // HANDLERS - CRUD
  // ---------------------------------------------------------------------------

  const handleAddNew = (type?: CheckType) => {
    setEditingCheck(null);
    setPreselectedType(type);
    setIsFormOpen(true);
  };

  const handleEdit = (check: Check) => {
    setEditingCheck(check);
    setPreselectedType(undefined);
    setIsFormOpen(true);
  };

  const handleSave = async (data: CreateCheckData) => {
    setIsSubmitting(true);
    try {
      if (editingCheck) {
        await updateCheck(editingCheck.id, data as UpdateCheckData);
        toast({
          title: 'Chèque modifié',
          description: 'Le chèque a été mis à jour avec succès.',
        });
      } else {
        await createCheck(data);
        toast({
          title: 'Chèque créé',
          description: 'Le nouveau chèque a été enregistré.',
        });
      }
      
      setIsFormOpen(false);
      setEditingCheck(null);
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur sauvegarde:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!checkToDelete) return;
    
    setIsSubmitting(true);
    try {
      await deleteCheck(checkToDelete.id);
      toast({
        title: 'Chèque supprimé',
        description: 'Le chèque a été supprimé.',
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur suppression:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression.',
      });
    } finally {
      setCheckToDelete(null);
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS - ACTIONS CHÈQUES
  // ---------------------------------------------------------------------------

  /**
   * Remettre un chèque en banque.
   */
  const handleConfirmDeposit = async () => {
    if (!checkToDeposit) return;
    
    setIsSubmitting(true);
    try {
      await depositCheck(checkToDeposit.id, depositDate || undefined);
      toast({
        title: 'Chèque remis',
        description: 'Le chèque a été remis en banque.',
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur remise:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la remise.',
      });
    } finally {
      setCheckToDeposit(null);
      setDepositDate('');
      setIsSubmitting(false);
    }
  };

  /**
   * Marquer un chèque comme encaissé/débité.
   */
  const handleConfirmCash = async () => {
    if (!checkToCash) return;
    
    setIsSubmitting(true);
    try {
      await cashCheck(checkToCash.id, cashDate || undefined);
      toast({
        title: checkToCash.checkType === 'RECEIVED' ? 'Chèque encaissé' : 'Chèque débité',
        description: 'Le chèque a été traité et la transaction bancaire créée.',
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur encaissement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du traitement.',
      });
    } finally {
      setCheckToCash(null);
      setCashDate('');
      setIsSubmitting(false);
    }
  };

  /**
   * Marquer un chèque comme rejeté.
   */
  const handleConfirmReject = async () => {
    if (!checkToReject || !rejectReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await rejectCheck(checkToReject.id, rejectReason, rejectDate || undefined);
      toast({
        variant: 'destructive',
        title: 'Chèque rejeté',
        description: 'Le chèque a été marqué comme rejeté.',
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur rejet:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du rejet.',
      });
    } finally {
      setCheckToReject(null);
      setRejectDate('');
      setRejectReason('');
      setIsSubmitting(false);
    }
  };

  /**
   * Annuler un chèque.
   */
  const handleConfirmCancel = async () => {
    if (!checkToCancel) return;

    setIsSubmitting(true);
    try {
      await cancelCheck(checkToCancel.id);
      toast({
        title: 'Chèque annulé',
        description: 'Le chèque a été annulé.',
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur annulation:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'annulation.',
      });
    } finally {
      setCheckToCancel(null);
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS - NOUVELLES ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Voir les détails d'un chèque.
   */
  const handleViewDetails = (check: Check) => {
    setSelectedCheck(check);
    setIsDetailOpen(true);
  };

  /**
   * Émettre un chèque (PENDING -> ISSUED).
   */
  const handleEmit = async (check: Check) => {
    setIsSubmitting(true);
    try {
      await emitCheck(check.id);
      toast({
        title: 'Chèque émis',
        description: `Le chèque n°${check.checkNumber} a été marqué comme émis.`,
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur émission:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'émission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Marquer un chèque comme reçu.
   */
  const handleMarkReceived = async (check: Check) => {
    setIsSubmitting(true);
    try {
      await markReceivedCheck(check.id);
      toast({
        title: 'Chèque reçu',
        description: `Le chèque n°${check.checkNumber} a été marqué comme reçu.`,
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur marquage reçu:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du marquage.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Marquer un chèque en cours de traitement.
   */
  const handleMarkProcessing = async (check: Check) => {
    setIsSubmitting(true);
    try {
      await markProcessingCheck(check.id);
      toast({
        title: 'Chèque en cours',
        description: `Le chèque n°${check.checkNumber} est maintenant en cours de traitement.`,
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur marquage en cours:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du marquage.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Marquer un chèque émis comme payé.
   */
  const handleMarkPaid = async (check: Check) => {
    setIsSubmitting(true);
    try {
      await markPaidCheck(check.id);
      toast({
        title: 'Chèque payé',
        description: `Le chèque n°${check.checkNumber} a été marqué comme payé.`,
      });
      await fetchChecks();
    } catch (error) {
      console.error('[ChecksPage] Erreur marquage payé:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du marquage.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Imprimer un chèque - Génère un PDF téléchargeable.
   */
  const handlePrint = (check: Check) => {
    try {
      generateCheckPDF(check);
      toast({
        title: 'Chèque généré',
        description: `Le PDF du chèque n°${check.checkNumber} a été ouvert dans un nouvel onglet.`,
      });
    } catch (error) {
      console.error('[ChecksPage] Erreur génération PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la génération du PDF.',
      });
    }
  };

  /**
   * Voir la transaction liée.
   */
  const handleViewTransaction = (check: Check) => {
    if (check.bankTransactionId) {
      // Naviguer vers la page des transactions avec l'ID de la transaction
      router.push(`/banking/transactions?transactionId=${check.bankTransactionId}`);
    } else {
      toast({
        variant: 'destructive',
        title: 'Pas de transaction liée',
        description: `Le chèque n°${check.checkNumber} n'a pas encore de transaction bancaire associée.`,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Badges des filtres actifs */}
      {hasActiveFilters && (
        <div className="p-4 pb-0">
          <ActiveFilterBadges />
        </div>
      )}

      {/* Liste des chèques */}
      <CheckList
        checks={checks}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={setFilters}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={setCheckToDelete}
        onDeposit={setCheckToDeposit}
        onCash={setCheckToCash}
        onReject={setCheckToReject}
        onCancel={setCheckToCancel}
        onRefresh={fetchChecks}
        onEmit={handleEmit}
        onPrint={handlePrint}
        onMarkReceived={handleMarkReceived}
        onMarkProcessing={handleMarkProcessing}
        onMarkPaid={handleMarkPaid}
        onViewTransaction={handleViewTransaction}
        onViewDetails={handleViewDetails}
      />

      {/* Modale Formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCheck ? 'Modifier le chèque' : 'Nouveau chèque'}
            </DialogTitle>
            <DialogDescription>
              {editingCheck
                ? 'Modifiez les informations du chèque.'
                : 'Enregistrez un nouveau chèque émis ou reçu.'}
            </DialogDescription>
          </DialogHeader>
          <CheckForm
            initialData={editingCheck}
            preselectedType={preselectedType}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingCheck(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Suppression */}
      <AlertDialog 
        open={!!checkToDelete} 
        onOpenChange={() => setCheckToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce chèque ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer le chèque n°{checkToDelete?.checkNumber}.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Remise en banque */}
      <AlertDialog 
        open={!!checkToDeposit} 
        onOpenChange={() => setCheckToDeposit(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre le chèque en banque ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chèque n°{checkToDeposit?.checkNumber} de {checkToDeposit?.partnerName} 
              sera marqué comme remis en banque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="depositDate">Date de remise</Label>
            <Input
              id="depositDate"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeposit} disabled={isSubmitting}>
              {isSubmitting ? 'En cours...' : 'Confirmer la remise'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Encaissement/Débit */}
      <AlertDialog 
        open={!!checkToCash} 
        onOpenChange={() => setCheckToCash(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {checkToCash?.checkType === 'RECEIVED' 
                ? 'Marquer le chèque comme encaissé ?' 
                : 'Marquer le chèque comme débité ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Une transaction bancaire sera automatiquement créée pour refléter 
              {checkToCash?.checkType === 'RECEIVED' ? ' l\'encaissement' : ' le débit'} 
              de ce chèque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cashDate">
              Date {checkToCash?.checkType === 'RECEIVED' ? "d'encaissement" : 'de débit'}
            </Label>
            <Input
              id="cashDate"
              type="date"
              value={cashDate}
              onChange={(e) => setCashDate(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCash} disabled={isSubmitting}>
              {isSubmitting ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Rejet */}
      <AlertDialog 
        open={!!checkToReject} 
        onOpenChange={() => {
          setCheckToReject(null);
          setRejectReason('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer le chèque comme rejeté ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chèque n°{checkToReject?.checkNumber} sera marqué comme impayé/rejeté.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="rejectDate">Date de rejet</Label>
              <Input
                id="rejectDate"
                type="date"
                value={rejectDate}
                onChange={(e) => setRejectDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="rejectReason">Motif du rejet *</Label>
              <Textarea
                id="rejectReason"
                placeholder="Ex: Provision insuffisante, signature non conforme..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={2}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? 'En cours...' : 'Confirmer le rejet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Annulation */}
      <AlertDialog
        open={!!checkToCancel}
        onOpenChange={() => setCheckToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce chèque ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le chèque n°{checkToCancel?.checkNumber} sera marqué comme annulé.
              Il restera visible dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} disabled={isSubmitting}>
              {isSubmitting ? 'En cours...' : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Popup de détails du chèque */}
      <CheckDetailDialog
        check={selectedCheck}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onEmit={handleEmit}
        onDeposit={(check) => setCheckToDeposit(check)}
        onCash={(check) => setCheckToCash(check)}
        onReject={(check) => setCheckToReject(check)}
        onCancel={(check) => setCheckToCancel(check)}
        onPrint={handlePrint}
        onMarkReceived={handleMarkReceived}
        onMarkProcessing={handleMarkProcessing}
        onMarkPaid={handleMarkPaid}
        onViewTransaction={handleViewTransaction}
      />
    </>
  );
}