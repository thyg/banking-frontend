/**
 * @file app/(dashboard)/banking/configuration/account-types/page.tsx
 * @description Page de gestion des types de comptes bancaires avec sous-types.
 * Permet de configurer les types de comptes avec leurs permissions et sous-types.
 *
 * @version 2.0.0
 * @date 2024-12-31
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types et API
import { AccountType, AccountSubType, CreateAccountTypeData, CreateAccountSubTypeData } from '@/types/banking';
import {
  getAccountTypes,
  getAccountSubTypes,
  createAccountType,
  updateAccountType,
  deleteAccountType,
  createAccountSubType,
  updateAccountSubType,
  deleteAccountSubType,
} from '@/lib/api/banking';

// Composants
import { AccountTypeList } from '@/components/banking/settings/account-type-list';
import { AccountTypeForm } from '@/components/banking/settings/account-type-form';
import { AccountSubTypeForm } from '@/components/banking/settings/account-subtype-form';

// shadcn AlertDialog
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
// TYPES LOCAUX
// =============================================================================

interface DeleteTarget {
  type: 'type' | 'subtype';
  parentType?: AccountType;
  item: AccountType | AccountSubType;
}

// =============================================================================
// COMPOSANT PAGE
// =============================================================================

export default function AccountTypesPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------

  /** Liste des types de comptes avec leurs sous-types */
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);

  /** Indicateur de chargement */
  const [isLoading, setIsLoading] = useState(true);

  /** Cible de suppression (type ou sous-type) */
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /** Message d'erreur pour le dialog de suppression */
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** Indicateur de suppression en cours */
  const [isDeleting, setIsDeleting] = useState(false);

  // Hook pour gerer les modales
  const { onOpen, onClose } = useCompose();

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------------------------

  /**
   * Recupere et met a jour la liste des types de comptes avec leurs sous-types.
   */
  const fetchAccountTypes = useCallback(async () => {
    setIsLoading(true);

    try {
      const types = await getAccountTypes();

      // Charger les sous-types pour chaque type
      const typesWithSubTypes = await Promise.all(
        types.map(async (type) => {
          try {
            const subTypes = await getAccountSubTypes(type.id);
            return { ...type, subTypes };
          } catch (error) {
            console.error(`[AccountTypesPage] Erreur chargement sous-types pour ${type.code}:`, error);
            return { ...type, subTypes: [] };
          }
        })
      );

      setAccountTypes(typesWithSubTypes);
    } catch (error) {
      console.error("[AccountTypesPage] Erreur lors de la recuperation:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger les donnees au montage du composant
  useEffect(() => {
    fetchAccountTypes();
  }, [fetchAccountTypes]);

  // ---------------------------------------------------------------------------
  // HANDLERS - TYPES
  // ---------------------------------------------------------------------------

  /**
   * Gere la sauvegarde d'un type de compte (creation ou mise a jour).
   */
  const handleSaveType = async (data: CreateAccountTypeData, typeId?: string) => {
    try {
      if (typeId) {
        await updateAccountType(typeId, data);
      } else {
        await createAccountType(data);
      }

      onClose();
      await fetchAccountTypes();

    } catch (error) {
      console.error("[AccountTypesPage] Erreur lors de la sauvegarde:", error);
      throw error;
    }
  };

  /**
   * Ouvre le formulaire de creation d'un nouveau type de compte.
   */
  const handleAddNewType = () => {
    onOpen({
      title: "Nouveau Type de Compte",
      content: (
        <div className="p-6">
          <AccountTypeForm
            initialData={null}
            onSave={(data) => handleSaveType(data)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le formulaire d'edition d'un type de compte existant.
   */
  const handleEditType = (type: AccountType) => {
    onOpen({
      title: `Modifier "${type.libelle}"`,
      content: (
        <div className="p-6">
          <AccountTypeForm
            initialData={type}
            onSave={(data) => handleSaveType(data, type.id)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le dialog de confirmation de suppression d'un type.
   */
  const handleDeleteType = (type: AccountType) => {
    setDeleteError(null);
    setDeleteTarget({ type: 'type', item: type });
  };

  // ---------------------------------------------------------------------------
  // HANDLERS - SOUS-TYPES
  // ---------------------------------------------------------------------------

  /**
   * Gere la sauvegarde d'un sous-type (creation ou mise a jour).
   */
  const handleSaveSubType = async (parentType: AccountType, data: CreateAccountSubTypeData, subTypeId?: string) => {
    try {
      if (subTypeId) {
        await updateAccountSubType(parentType.id, subTypeId, data);
      } else {
        await createAccountSubType(parentType.id, data);
      }

      onClose();
      await fetchAccountTypes();

    } catch (error) {
      console.error("[AccountTypesPage] Erreur lors de la sauvegarde du sous-type:", error);
      throw error;
    }
  };

  /**
   * Ouvre le formulaire de creation d'un nouveau sous-type.
   */
  const handleAddSubType = (parentType: AccountType) => {
    onOpen({
      title: `Nouveau sous-type pour "${parentType.libelle}"`,
      content: (
        <div className="p-6">
          <AccountSubTypeForm
            parentType={parentType}
            initialData={null}
            onSave={(data) => handleSaveSubType(parentType, data)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le formulaire d'edition d'un sous-type existant.
   */
  const handleEditSubType = (parentType: AccountType, subType: AccountSubType) => {
    onOpen({
      title: `Modifier "${subType.libelle}"`,
      content: (
        <div className="p-6">
          <AccountSubTypeForm
            parentType={parentType}
            initialData={subType}
            onSave={(data) => handleSaveSubType(parentType, data, subType.id)}
            onCancel={onClose}
          />
        </div>
      )
    });
  };

  /**
   * Ouvre le dialog de confirmation de suppression d'un sous-type.
   */
  const handleDeleteSubType = (parentType: AccountType, subType: AccountSubType) => {
    setDeleteError(null);
    setDeleteTarget({ type: 'subtype', parentType, item: subType });
  };

  // ---------------------------------------------------------------------------
  // HANDLERS - SUPPRESSION COMMUNE
  // ---------------------------------------------------------------------------

  /**
   * Gere la confirmation de suppression.
   */
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'type') {
        await deleteAccountType(deleteTarget.item.id);
      } else if (deleteTarget.type === 'subtype' && deleteTarget.parentType) {
        await deleteAccountSubType(deleteTarget.parentType.id, deleteTarget.item.id);
      }

      setDeleteTarget(null);
      await fetchAccountTypes();

    } catch (error) {
      console.error("[AccountTypesPage] Erreur lors de la suppression:", error);

      const errorMessage = error instanceof Error
        ? error.message
        : "Une erreur est survenue lors de la suppression.";

      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Ferme le dialog de suppression et reinitialise l'etat.
   */
  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  const getDeleteDialogContent = () => {
    if (!deleteTarget) return { title: '', description: '' };

    if (deleteTarget.type === 'type') {
      const type = deleteTarget.item as AccountType;
      const hasSubTypes = type.subTypes && type.subTypes.length > 0;
      return {
        title: `Supprimer le type "${type.libelle}" ?`,
        description: hasSubTypes
          ? `Attention: Ce type contient ${type.subTypes!.length} sous-type(s). La suppression entrainera egalement la suppression de tous les sous-types associes.`
          : "Cette action est irreversible. Ce type ne pourra plus etre utilise pour categoriser vos comptes bancaires."
      };
    } else {
      const subType = deleteTarget.item as AccountSubType;
      return {
        title: `Supprimer le sous-type "${subType.libelle}" ?`,
        description: "Cette action est irreversible. Ce sous-type ne pourra plus etre utilise pour categoriser vos comptes bancaires."
      };
    }
  };

  const dialogContent = getDeleteDialogContent();

  return (
    <>
      {/* Composant de liste principal */}
      <AccountTypeList
        accountTypes={accountTypes}
        isLoading={isLoading}
        onAddNew={handleAddNewType}
        onAddSubType={handleAddSubType}
        onEdit={handleEditType}
        onEditSubType={handleEditSubType}
        onDelete={handleDeleteType}
        onDeleteSubType={handleDeleteSubType}
        onRefresh={fetchAccountTypes}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className={deleteError ? "text-red-600" : ""}>
              {deleteError || dialogContent.description}
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
