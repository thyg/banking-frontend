/**
 * @file app/(dashboard)/banking/transaction-types/page.tsx
 * @description Page de gestion des types de transactions.
 * Ce composant "intelligent" gère l'état, les appels API et orchestre
 * les composants de présentation pour la gestion des types de transactions.
 * 
 * @version 1.0.1 - Fix: Utilise AlertDialog directement au lieu de ConfirmationDialog
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types et API
import { TransactionType, CreateTransactionTypeData } from '@/types/banking';
import {
  getTransactionTypes,
  createTransactionType,
  updateTransactionType,
  deleteTransactionType,
  activateTransactionType,
  deactivateTransactionType,
} from '@/lib/api/banking';

// Composants
import { TransactionTypeList } from '@/components/banking/settings/transaction-type-list';
import { TransactionTypeForm } from '@/components/banking/settings/transaction-type-form';

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

export default function TransactionTypesPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------
  
  /** Liste des types de transactions */
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  
  /** Indicateur de chargement */
  const [isLoading, setIsLoading] = useState(true);
  
  /** Type sélectionné pour suppression */
  const [typeToDelete, setTypeToDelete] = useState<TransactionType | null>(null);
  
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
   * Récupère et met à jour la liste des types de transactions.
   */
  const fetchTransactionTypes = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const data = await getTransactionTypes();
      setTransactionTypes(data);
    } catch (error) {
      console.error("[TransactionTypesPage] Erreur lors de la récupération:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les données au montage du composant
  useEffect(() => {
    fetchTransactionTypes();
  }, [fetchTransactionTypes]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Gère la sauvegarde d'un type de transaction (création ou mise à jour).
   */
  const handleSave = async (data: CreateTransactionTypeData, typeId?: string) => {
    try {
      if (typeId) {
        await updateTransactionType(typeId, data);
      } else {
        await createTransactionType(data);
      }
      
      onClose();
      await fetchTransactionTypes();
      
    } catch (error) {
      console.error("[TransactionTypesPage] Erreur lors de la sauvegarde:", error);
      throw error;
    }
  };

  /**
   * Gère la confirmation de suppression d'un type de transaction.
   */
  const confirmDelete = async () => {
    if (!typeToDelete) return;
    
    setDeleteError(null);
    setIsDeleting(true);
    
    try {
      await deleteTransactionType(typeToDelete.id);
      setTypeToDelete(null);
      await fetchTransactionTypes();
      
    } catch (error) {
      console.error("[TransactionTypesPage] Erreur lors de la suppression:", error);
      
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
    setTypeToDelete(null);
    setDeleteError(null);
  };

  // ---------------------------------------------------------------------------
  // OUVERTURE DES MODALES
  // ---------------------------------------------------------------------------

  /**
   * Ouvre le formulaire de création d'un nouveau type de transaction.
   */
  const handleAddNew = () => {
    onOpen({
      title: "Nouveau Type de Transaction",
      content: (
        <div className="p-6">
          <TransactionTypeForm 
            initialData={null} 
            onSave={(data) => handleSave(data)}
            onCancel={onClose} 
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le formulaire d'édition d'un type de transaction existant.
   */
  const handleEdit = (type: TransactionType) => {
    onOpen({
      title: `Modifier "${type.label}"`,
      content: (
        <div className="p-6">
          <TransactionTypeForm 
            initialData={type}
            onSave={(data) => handleSave(data, type.id)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Active ou désactive un type de transaction.
   */
  const handleToggleActive = async (type: TransactionType) => {
    try {
      const isActive = type.active ?? type.isActive;
      if (isActive) {
        await deactivateTransactionType(type.id);
      } else {
        await activateTransactionType(type.id);
      }
      await fetchTransactionTypes();
    } catch (error) {
      console.error("[TransactionTypesPage] Erreur toggle actif:", error);
    }
  };

  /**
   * Ouvre le dialog de confirmation de suppression.
   */
  const handleDelete = (type: TransactionType) => {
    setDeleteError(null);
    setTypeToDelete(type);
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Composant de liste principal */}
      <TransactionTypeList
        transactionTypes={transactionTypes}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchTransactionTypes}
        onToggleActive={handleToggleActive}
      />

      {/* Dialog de confirmation de suppression - Utilise AlertDialog directement */}
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer le type "{typeToDelete?.label}" ?
            </AlertDialogTitle>
            <AlertDialogDescription className={deleteError ? "text-red-600" : ""}>
              {deleteError 
                ? deleteError 
                : "Cette action est irréversible. Ce type ne pourra plus être utilisé pour catégoriser vos transactions."
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