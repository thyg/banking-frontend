/**
 * @file app/(dashboard)/banking/transactions/page.tsx
 * @description Page de gestion des transactions bancaires manuelles.
 * Orchestre les composants de liste et formulaire avec gestion d'état.
 * 
 * @version 1.0.0 - Incrément 3
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types
import { 
  BankTransaction, 
  BankTransactionFilters,
  CreateBankTransactionData 
} from '@/types/banking';

// API
import { 
  getBankTransactions,
  createBankTransaction,
  updateBankTransaction,
  deleteBankTransaction,
  validateBankTransaction,
  cancelBankTransaction,
} from '@/lib/api/bank-transaction';

// Composants
import { BankTransactionList } from '@/components/banking/bank-transaction-list';
import { BankTransactionForm } from '@/components/banking/bank-transaction-form';

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
import { useToast } from '@/components/ui/use-toast';

// =============================================================================
// COMPOSANT PAGE
// =============================================================================

export default function BankTransactionsPage() {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------
  
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BankTransactionFilters>({});
  
  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<BankTransaction | null>(null);
  const [transactionToValidate, setTransactionToValidate] = useState<BankTransaction | null>(null);
  const [transactionToCancel, setTransactionToCancel] = useState<BankTransaction | null>(null);
  
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES
  // ---------------------------------------------------------------------------

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBankTransactions(filters);
      setTransactions(data);
    } catch (error) {
      console.error('[TransactionsPage] Erreur chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les transactions.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Ouvre le formulaire pour une nouvelle transaction.
   */
  const handleAddNew = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  /**
   * Ouvre le formulaire pour modifier une transaction.
   */
  const handleEdit = (transaction: BankTransaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  /**
   * Sauvegarde une transaction (création ou modification).
   */
  const handleSave = async (data: CreateBankTransactionData) => {
    try {
      if (editingTransaction) {
        await updateBankTransaction(editingTransaction.id, data);
        toast({
          title: 'Transaction modifiée',
          description: 'La transaction a été mise à jour avec succès.',
        });
      } else {
        await createBankTransaction(data);
        toast({
          title: 'Transaction créée',
          description: 'La nouvelle transaction a été enregistrée.',
        });
      }
      
      setIsFormOpen(false);
      setEditingTransaction(null);
      await fetchTransactions();
    } catch (error) {
      console.error('[TransactionsPage] Erreur sauvegarde:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde.',
      });
    }
  };

  /**
   * Confirme la suppression d'une transaction.
   */
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    
    try {
      await deleteBankTransaction(transactionToDelete.id);
      toast({
        title: 'Transaction supprimée',
        description: 'La transaction a été supprimée.',
      });
      await fetchTransactions();
    } catch (error) {
      console.error('[TransactionsPage] Erreur suppression:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la suppression.',
      });
    } finally {
      setTransactionToDelete(null);
    }
  };

  /**
   * Confirme la validation d'une transaction.
   */
  const handleConfirmValidate = async () => {
    if (!transactionToValidate) return;
    
    try {
      await validateBankTransaction(transactionToValidate.id);
      toast({
        title: 'Transaction validée',
        description: 'La transaction a été validée et impacte maintenant le solde.',
      });
      await fetchTransactions();
    } catch (error) {
      console.error('[TransactionsPage] Erreur validation:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la validation.',
      });
    } finally {
      setTransactionToValidate(null);
    }
  };

  /**
   * Confirme l'annulation d'une transaction.
   */
  const handleConfirmCancel = async () => {
    if (!transactionToCancel) return;
    
    try {
      await cancelBankTransaction(transactionToCancel.id);
      toast({
        title: 'Transaction annulée',
        description: 'La transaction a été annulée.',
      });
      await fetchTransactions();
    } catch (error) {
      console.error('[TransactionsPage] Erreur annulation:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'annulation.',
      });
    } finally {
      setTransactionToCancel(null);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Liste des transactions */}
      <BankTransactionList
        transactions={transactions}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={setFilters}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={setTransactionToDelete}
        onValidate={setTransactionToValidate}
        onCancel={setTransactionToCancel}
        onRefresh={fetchTransactions}
        showAccountColumn={true}
      />

      {/* Modale Formulaire */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? 'Modifiez les informations de la transaction bancaire.'
                : 'Saisissez les détails de la nouvelle opération bancaire.'}
            </DialogDescription>
          </DialogHeader>
          <BankTransactionForm
            initialData={editingTransaction}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Suppression */}
      <AlertDialog 
        open={!!transactionToDelete} 
        onOpenChange={() => setTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer la transaction 
              "{transactionToDelete?.label}". Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Validation */}
      <AlertDialog 
        open={!!transactionToValidate} 
        onOpenChange={() => setTransactionToValidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              La validation de cette transaction mettra à jour le solde du compte bancaire.
              Une transaction validée ne peut plus être modifiée (uniquement annulée).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidate}>
              Valider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Annulation */}
      <AlertDialog 
        open={!!transactionToCancel} 
        onOpenChange={() => setTransactionToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'annulation de cette transaction rétablira le solde du compte.
              La transaction sera conservée dans l'historique avec le statut "Annulé".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}