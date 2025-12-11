/**
 * @file app/(dashboard)/banking/banks/page.tsx
 * @description Page de gestion des établissements bancaires.
 * Ce composant "intelligent" gère l'état, les appels API et orchestre
 * les composants de présentation pour la gestion des banques.
 * 
 * @version 1.0.1 - Fix: Utilise AlertDialog directement au lieu de ConfirmationDialog
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types et API
import { Bank, CreateBankData } from '@/types/banking';
import { 
  getBanks, 
  createBank, 
  updateBank, 
  deleteBank 
} from '@/lib/api/banking';

// Composants
import { BankList } from '@/components/banking/settings/bank-list';
import { BankForm } from '@/components/banking/settings/bank-form';

// shadcn AlertDialog (utilisé directement pour éviter les conflits)
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Hooks - Import du store Zustand existant
import { useCompose } from '@/hooks/use-compose-store';

// =============================================================================
// COMPOSANT PAGE
// =============================================================================

export default function BanksPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------
  
  /** Liste des banques */
  const [banks, setBanks] = useState<Bank[]>([]);
  
  /** Indicateur de chargement */
  const [isLoading, setIsLoading] = useState(true);
  
  /** Banque sélectionnée pour suppression (ouvre le dialog de confirmation) */
  const [bankToDelete, setBankToDelete] = useState<Bank | null>(null);
  
  /** Message d'erreur pour le dialog de suppression */
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  /** Indicateur de suppression en cours */
  const [isDeleting, setIsDeleting] = useState(false);

  // Hook pour gérer les modales
  const { onOpen, onClose } = useCompose();

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------------------------

  /**
   * Récupère et met à jour la liste des banques.
   */
  const fetchBanks = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const data = await getBanks();
      setBanks(data);
    } catch (error) {
      console.error("[BanksPage] Erreur lors de la récupération des banques:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Gère la sauvegarde d'une banque (création ou mise à jour).
   */
  const handleSave = async (data: CreateBankData, bankId?: string) => {
    try {
      if (bankId) {
        await updateBank(bankId, data);
      } else {
        await createBank(data);
      }
      
      onClose();
      await fetchBanks();
      
    } catch (error) {
      console.error("[BanksPage] Erreur lors de la sauvegarde:", error);
      throw error;
    }
  };

  /**
   * Gère la confirmation de suppression d'une banque.
   */
  const confirmDelete = async () => {
    if (!bankToDelete) return;
    
    setDeleteError(null);
    setIsDeleting(true);
    
    try {
      await deleteBank(bankToDelete.id);
      setBankToDelete(null);
      await fetchBanks();
      
    } catch (error) {
      console.error("[BanksPage] Erreur lors de la suppression:", error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Une erreur est survenue lors de la suppression.";
      
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Ferme le dialog de suppression et réinitialise l'état.
   */
  const closeDeleteDialog = () => {
    setBankToDelete(null);
    setDeleteError(null);
  };

  // ---------------------------------------------------------------------------
  // OUVERTURE DES MODALES
  // ---------------------------------------------------------------------------

  /**
   * Ouvre le formulaire de création d'une nouvelle banque.
   */
  const handleAddNew = () => {
    onOpen({
      title: "Nouvelle Banque",
      content: (
        <div className="p-6">
          <BankForm 
            initialData={null} 
            onSave={(data) => handleSave(data)}
            onCancel={onClose} 
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le formulaire d'édition d'une banque existante.
   */
  const handleEdit = (bank: Bank) => {
    onOpen({
      title: `Modifier "${bank.name}"`,
      content: (
        <div className="p-6">
          <BankForm 
            initialData={bank}
            onSave={(data) => handleSave(data, bank.id)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le dialog de confirmation de suppression.
   */
  const handleDelete = (bank: Bank) => {
    setDeleteError(null);
    setBankToDelete(bank);
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Composant de liste principal */}
      <BankList 
        banks={banks}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchBanks}
      />

      {/* Dialog de confirmation de suppression - Utilise AlertDialog directement */}
      <AlertDialog open={!!bankToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer la banque "{bankToDelete?.name}" ?
            </AlertDialogTitle>
            <AlertDialogDescription className={deleteError ? "text-red-600" : ""}>
              {deleteError 
                ? deleteError 
                : "Cette action est irréversible. Assurez-vous qu'aucun compte bancaire n'est associé à cette banque avant de la supprimer."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}