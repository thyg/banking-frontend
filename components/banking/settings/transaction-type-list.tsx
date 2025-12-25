/**
 * @file components/banking/settings/transaction-type-list.tsx
 * @description Composant de présentation pour la liste des types de transactions.
 * Affiche un tableau avec les types et gère les états de chargement/vide.
 * C'est un composant "bête" qui reçoit toutes ses données via les props.
 * 
 * @example
 * <TransactionTypeList 
 *   transactionTypes={types}
 *   isLoading={isLoading}
 *   onAddNew={handleAddNew}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onRefresh={fetchTypes}
 * />
 */

"use client";

import React from 'react';

// Types
import { TransactionType } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Icônes
import {
  Plus,
  RefreshCw,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Landmark,
  Banknote,
  FileCheck,
  HelpCircle,
} from 'lucide-react';

// =============================================================================
// CONSTANTES
// =============================================================================


/**
 * Configuration d'affichage pour les catégories.
 */
const CATEGORY_CONFIG = {
  BANK: { 
    label: 'Bancaire', 
    icon: Landmark, 
    className: 'bg-blue-50 text-blue-700 border-blue-200' 
  },
  CASH: { 
    label: 'Espèces', 
    icon: Banknote, 
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200' 
  },
  CHECK: { 
    label: 'Chèques', 
    icon: FileCheck, 
    className: 'bg-purple-50 text-purple-700 border-purple-200' 
  },
  OTHER: { 
    label: 'Autre', 
    icon: HelpCircle, 
    className: 'bg-gray-50 text-gray-700 border-gray-200' 
  },
} as const;

// =============================================================================
// PROPS
// =============================================================================

interface TransactionTypeListProps {
  /** Liste des types de transactions à afficher */
  transactionTypes: TransactionType[];
  /** Indicateur de chargement */
  isLoading: boolean;
  /** Callback pour ajouter un nouveau type */
  onAddNew: () => void;
  /** Callback pour rafraîchir la liste */
  onRefresh: () => void;
  /** Callback pour éditer un type */
  onEdit: (type: TransactionType) => void;
  /** Callback pour supprimer un type */
  onDelete: (type: TransactionType) => void;
}

// =============================================================================
// COMPOSANTS AUXILIAIRES
// =============================================================================

/**
 * Badge pour afficher la catégorie d'un type de transaction.
 */
function CategoryBadge({ category }: { category: TransactionType['category'] }) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function TransactionTypeList({
  transactionTypes,
  isLoading,
  onAddNew,
  onRefresh,
  onEdit,
  onDelete,
}: TransactionTypeListProps) {
  
  /**
   * Rendu du contenu principal selon l'état.
   */
  const renderContent = () => {
    // État de chargement
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    // État vide
    if (transactionTypes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-300 rounded-lg">
          <ArrowUpDown className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">
            Aucun type de transaction configuré
          </h3>
          <p className="text-gray-500 mt-2 mb-6 max-w-sm text-center">
            Créez des types de transactions pour catégoriser vos opérations de trésorerie
            (virements, chèques, espèces, etc.).
          </p>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un type
          </Button>
        </div>
      );
    }

    // État avec données
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-[130px]">Catégorie</TableHead>
              <TableHead className="w-[100px] text-center">Statut</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionTypes.map((type) => (
              <TableRow 
                key={type.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {/* Code */}
                <TableCell className="font-mono font-medium text-gray-900">
                  {type.code}
                </TableCell>
                
                {/* Libellé */}
                <TableCell>
                  <span className="font-medium">{type.label}</span>
                </TableCell>

                {/* Catégorie */}
                <TableCell>
                  <CategoryBadge category={type.category} />
                </TableCell>
                
                {/* Statut */}
                <TableCell className="text-center">
                  {type.isActive ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactif
                    </Badge>
                  )}
                </TableCell>
                
                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(type)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(type)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Calculer les statistiques par catégorie
  const statsByCategory = {
    BANK: transactionTypes.filter(t => t.category === 'BANK').length,
    CASH: transactionTypes.filter(t => t.category === 'CASH').length,
    CHECK: transactionTypes.filter(t => t.category === 'CHECK').length,
    OTHER: transactionTypes.filter(t => t.category === 'OTHER').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Types de Transactions
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configurez les catégories pour classifier vos opérations de trésorerie.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Rafraîchir</span>
          </Button>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Type
          </Button>
        </div>
      </div>

      {/* Statistiques par catégorie */}
      {!isLoading && transactionTypes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-gray-500">Bancaire</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statsByCategory.BANK}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-gray-500">Espèces</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statsByCategory.CASH}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-gray-500">Chèques</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statsByCategory.CHECK}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-gray-600" />
              <p className="text-sm text-gray-500">Autres</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statsByCategory.OTHER}</p>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
}