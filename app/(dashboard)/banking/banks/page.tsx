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
import { Bank, BankAccount, CreateBankData } from '@/types/banking';
import {
  getBanks,
  createBank,
  updateBank,
  deleteBank,
  getBankAccountsByBankId
} from '@/lib/api/banking';

// Composants
import { BankList } from '@/components/banking/settings/bank-list';
import { BankForm } from '@/components/banking/settings/bank-form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Icônes
import {
  Building2,
  CreditCard,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

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
// COMPOSANT DE DÉTAILS DE BANQUE
// =============================================================================

interface BankDetailsViewProps {
  bank: Bank;
  accounts: BankAccount[];
  isLoadingAccounts: boolean;
  onEdit: () => void;
}

function BankDetailsView({ bank, accounts, isLoadingAccounts, onEdit }: BankDetailsViewProps) {
  return (
    <div className="space-y-6">
      {/* En-tête avec statut */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{bank.name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{bank.code}</p>
          </div>
        </div>
        {bank.isActive ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Actif
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            Inactif
          </Badge>
        )}
      </div>

      <Separator />

      {/* Informations de la banque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bank.swiftCode && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Code SWIFT/BIC</p>
              <p className="font-mono font-medium">{bank.swiftCode}</p>
            </div>
          </div>
        )}
        {bank.bankCode && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Code Banque</p>
              <p className="font-mono font-medium">{bank.bankCode}</p>
            </div>
          </div>
        )}
        {bank.country && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Pays</p>
              <p className="font-medium">{bank.country}</p>
            </div>
          </div>
        )}
        {bank.address && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Adresse</p>
              <p className="font-medium">{bank.address}</p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Comptes associés */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Comptes bancaires associés
        </h3>

        {isLoadingAccounts ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-6 bg-muted/30 rounded-lg">
            <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucun compte associé à cette banque
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {account.iban || account.accountNumber || '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: account.currency || 'XOF'
                    }).format(account.currentBalance)}
                  </p>
                  {account.isActive ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Inactif
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dates de création/modification */}
      <Separator />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Créé le {new Date(bank.createdAt).toLocaleDateString('fr-FR')}</span>
        <span>Modifié le {new Date(bank.updatedAt).toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  );
}

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
   * Affiche les détails d'une banque dans une modale.
   */
  const handleViewDetails = async (bank: Bank) => {
    // État local pour les comptes - géré via une ref pour éviter les re-renders
    let bankAccounts: BankAccount[] = [];
    let loadingAccounts = true;

    // Ouvrir la modale immédiatement avec un état de chargement
    const updateModalContent = (accounts: BankAccount[], loading: boolean) => {
      onOpen({
        title: `Détails - ${bank.name}`,
        content: (
          <div className="p-6">
            <BankDetailsView
              bank={bank}
              accounts={accounts}
              isLoadingAccounts={loading}
              onEdit={() => {
                onClose();
                handleEdit(bank);
              }}
            />
          </div>
        )
      });
    };

    // Afficher d'abord avec chargement
    updateModalContent([], true);

    // Charger les comptes associés
    try {
      bankAccounts = await getBankAccountsByBankId(bank.id);
      loadingAccounts = false;
      // Mettre à jour avec les données
      updateModalContent(bankAccounts, false);
    } catch (error) {
      console.error("[BanksPage] Erreur lors du chargement des comptes:", error);
      // Afficher sans comptes en cas d'erreur
      updateModalContent([], false);
    }
  };

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
        onViewDetails={handleViewDetails}
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