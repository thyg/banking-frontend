/**
 * @file components/banking/bank-account-list-view.tsx
 * @description Composant de présentation pour la page principale du module Banque.
 * Affiche l'en-tête, gère les états de chargement/vide et affiche une grille de BankAccountCard.
 * C'est un composant "bête" qui reçoit toutes ses données et fonctions via les props.
 */

"use client";

import React from 'react';
import { BankAccount } from '@/types/banking';
import { BankAccountCard } from './bank-account-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Landmark } from 'lucide-react';

// Définition des props que ce composant attend
interface BankAccountListViewProps {
  accounts: BankAccount[];
  isLoading: boolean;
  onAddNew: () => void;
  onRefresh: () => void;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
  onUpload: (accountId: string) => void;
}

export function BankAccountListView({
  accounts,
  isLoading,
  onAddNew,
  onRefresh,
  onEdit,
  onDelete,
  onUpload
}: BankAccountListViewProps) {

  const renderContent = () => {
    // 1. État de chargement : Affiche des squelettes pour une meilleure UX
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      );
    }

    // 2. État vide : Guide l'utilisateur sur la prochaine action
    if (accounts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 border-2 border-dashed border-gray-300 rounded-lg">
          <Landmark className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">Aucun compte bancaire configuré</h3>
          <p className="text-gray-500 mt-2 mb-6 max-w-sm">
            Pour commencer, ajoutez votre premier compte bancaire. Vous pourrez ensuite importer vos relevés et commencer le rapprochement.
          </p>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un compte bancaire
          </Button>
        </div>
      );
    }

    // 3. État avec données : Affiche la grille des comptes bancaires
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <BankAccountCard
            key={account.id}
            account={account}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpload={onUpload}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Tableau de Bord Bancaire
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualisez vos comptes et lancez les imports de relevés.
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={onAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Compte
            </Button>
        </div>
      </div>

      {/* Contenu principal (géré par la fonction renderContent) */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
}