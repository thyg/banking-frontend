/**
 * @file app/dashboard/banking/accounts/page.tsx
 * @description Page de gestion des comptes bancaires.
 * Utilise les composants existants dans components/banking/
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
import type { 
  BankAccount, 
  Bank,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
  BankStatement
} from '@/types/banking';

// API
import { 
  getBankAccounts, 
  createBankAccount, 
  updateBankAccount, 
  deleteBankAccount,
  getBanks
} from '@/lib/api/banking';

// Composants EXISTANTS dans components/banking/
import { BankAccountListView } from '@/components/banking/bank-account-list-view';
import { BankAccountForm } from '@/components/banking/bank-account-form';
import { StatementUploader } from '@/components/banking/statement-uploader';

// Composants UI
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function BankAccountsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // États des données
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États des modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [uploadAccountId, setUploadAccountId] = useState<string | null>(null);

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accountsData, banksData] = await Promise.all([
        getBankAccounts(),
        getBanks()
      ]);
      setAccounts(accountsData);
      setBanks(banksData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les comptes bancaires. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================================
  // HANDLERS - Formulaire
  // ============================================================================

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleSave = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await updateBankAccount(editingAccount.id, data);
        toast({
          title: "Compte modifié",
          description: `Le compte "${data.name || editingAccount.name}" a été mis à jour.`
        });
      } else {
        await createBankAccount(data);
        toast({
          title: "Compte créé",
          description: `Le compte "${data.name}" a été créé avec succès.`
        });
      }
      
      setIsFormOpen(false);
      setEditingAccount(null);
      await fetchData();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le compte. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  // ============================================================================
  // HANDLERS - Suppression
  // ============================================================================

  const handleDelete = (account: BankAccount) => {
    setAccountToDelete(account);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    setIsSubmitting(true);
    try {
      await deleteBankAccount(accountToDelete.id);
      toast({
        title: "Compte supprimé",
        description: `Le compte "${accountToDelete.name}" a été supprimé.`
      });
      setAccountToDelete(null);
      await fetchData();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le compte. Il peut contenir des transactions.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // HANDLERS - Upload
  // ============================================================================

  const handleUpload = (accountId: string) => {
    setUploadAccountId(accountId);
    setIsUploadOpen(true);
  };

  const handleUploadSuccess = (statementId: string) => {
    setIsUploadOpen(false);
    setUploadAccountId(null);
    toast({
      title: "Relevé importé",
      description: "Le relevé bancaire a été importé avec succès."
    });
    // Rediriger vers la page du relevé pour rapprochement
    router.push(`/banking/statements/${statementId}`);
  };

  const handleUploadCancel = () => {
    setIsUploadOpen(false);
    setUploadAccountId(null);
  };

  // ============================================================================
  // RENDU
  // ============================================================================

  return (
    <>
      {/* Liste des comptes - utilise le composant EXISTANT */}
      <BankAccountListView 
        accounts={accounts}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onRefresh={fetchData}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUpload={handleUpload}
      />

      {/* Modal de formulaire avec scroll - responsive */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">
              {editingAccount ? `Modifier "${editingAccount.name}"` : 'Nouveau Compte Bancaire'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingAccount
                ? 'Modifiez les informations du compte bancaire.'
                : 'Remplissez les informations pour créer un nouveau compte bancaire.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 overflow-y-auto flex-1 pr-1 sm:pr-2">
            <BankAccountForm
              initialData={editingAccount}
              onSave={handleSave}
              onCancel={handleCloseForm}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal d'upload de relevé - responsive */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Importer un Relevé Bancaire</DialogTitle>
            <DialogDescription className="text-sm">
              Sélectionnez un fichier de relevé bancaire à importer.
            </DialogDescription>
          </DialogHeader>
          {uploadAccountId && (
            <StatementUploader
              accounts={accounts}
              onCancel={handleUploadCancel}
              onUploadComplete={handleUploadSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Supprimer le compte "${accountToDelete?.name}" ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les transactions et relevés associés à ce compte seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}