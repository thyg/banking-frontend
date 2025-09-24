/**
 * @file app/dashboard/banking/page.tsx
 * @description Page principale du module Banque, servant de tableau de bord.
 * Ce composant "intelligent" gère l'état, les appels API et orchestre
 * les composants de présentation pour la gestion des comptes bancaires.
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types et API
import { BankAccount, BankStatement } from '@/types/banking';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '@/lib/api/banking';

// Composants
import { BankAccountListView } from '@/components/banking/bank-account-list-view';
import { BankAccountForm } from '@/components/banking/bank-account-form';
import { StatementUploader } from '@/components/banking/statement-uploader';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// Hooks
import { useCompose } from '@/hooks/use-compose-store'; // Assumant que ce hook existe

// Type pour les données du formulaire, pour la fonction handleSave
type BankAccountFormData = Omit<BankAccount, 'id' | 'currentBalance'>;

export default function BankingDashboardPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  
  // Utilisation du hook global pour gérer les modales/panneaux
  const { onOpen, onClose } = useCompose();

  // Fonction pour récupérer et mettre à jour la liste des comptes
  const fetchBankAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBankAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Échec de la récupération des comptes bancaires:", error);
      // TODO: Afficher un toast d'erreur à l'utilisateur
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effet pour charger les données au montage du composant
  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  // Handler pour la sauvegarde (création et mise à jour)
  const handleSave = async (data: BankAccountFormData, accountId?: string) => {
    try {
      if (accountId) {
        // Mode mise à jour
        await updateBankAccount(accountId, data);
      } else {
        // Mode création
        await createBankAccount(data);
      }
      onClose(); // Ferme la modale de formulaire
      await fetchBankAccounts(); // Rafraîchit la liste
    } catch (error) {
      console.error("Échec de la sauvegarde du compte:", error);
      // TODO: Afficher un toast d'erreur
    }
  };

  // Handler pour la suppression
  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteBankAccount(accountToDelete.id);
      await fetchBankAccounts();
    } catch (error) {
      console.error("Échec de la suppression du compte:", error);
      // TODO: Afficher un toast d'erreur
    } finally {
      setAccountToDelete(null); // Ferme la boîte de dialogue de confirmation
    }
  };

  // --- Ouvre les différentes modales via le hook useCompose ---

  const handleAddNew = () => {
    onOpen({
      title: "Nouveau Compte Bancaire",
      content: (
        <div className="p-6"> {/* On ajoute un conteneur avec du padding */}
          <BankAccountForm 
            initialData={null} 
            onSave={(data) => handleSave(data)}
            onCancel={onClose} 
          />
        </div>
      )
    });
  };
 const handleEdit = (account: BankAccount) => {
    onOpen({
      title: `Modifier "${account.name}"`,
      content: (
        <div className="p-6"> {/* On ajoute le même conteneur ici */}
          <BankAccountForm 
            initialData={account}
            onSave={(data) => handleSave(data, account.id)}
            onCancel={onClose}
          />
        </div>
      )
    });
  }

  const handleUpload = (accountId: string) => {
    onOpen({
      title: "Importer un Relevé Bancaire",
      content: <StatementUploader 
                  accountId={accountId}
                  onCancel={onClose}
                  onUploadSuccess={handleUploadSuccess}
               />
    })
  };

  // Gère la redirection après un upload réussi
  const handleUploadSuccess = (newStatement: BankStatement) => {
    onClose();
    router.push(`/banking/statements/${newStatement.id}`);
  };

  return (
    <>
      <BankAccountListView 
        accounts={accounts}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={setAccountToDelete} // Ouvre la confirmation
        onUpload={handleUpload}
        onRefresh={fetchBankAccounts}
      />

      {accountToDelete && (
        <ConfirmationDialog
            isOpen={!!accountToDelete}
            onClose={() => setAccountToDelete(null)}
            onConfirm={confirmDelete}
            title={`Supprimer le compte "${accountToDelete.name}" ?`}
            description="Cette action est irréversible. Toutes les données associées à ce compte seront perdues."
        />
      )}
    </>
  );
}