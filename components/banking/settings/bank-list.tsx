/**
 * @file components/banking/settings/bank-list.tsx
 * @description Composant de présentation pour la liste des banques.
 * Affiche un tableau avec les banques et gère les états de chargement/vide.
 * C'est un composant "bête" qui reçoit toutes ses données via les props.
 * 
 * @example
 * <BankList 
 *   banks={banks}
 *   isLoading={isLoading}
 *   onAddNew={handleAddNew}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onRefresh={fetchBanks}
 * />
 */

"use client";

import React from 'react';

// Types
import { Bank } from '@/types/banking';

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
  Building2, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// =============================================================================
// PROPS
// =============================================================================

interface BankListProps {
  /** Liste des banques à afficher */
  banks: Bank[];
  /** Indicateur de chargement */
  isLoading: boolean;
  /** Callback pour ajouter une nouvelle banque */
  onAddNew: () => void;
  /** Callback pour rafraîchir la liste */
  onRefresh: () => void;
  /** Callback pour éditer une banque */
  onEdit: (bank: Bank) => void;
  /** Callback pour supprimer une banque */
  onDelete: (bank: Bank) => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function BankList({
  banks,
  isLoading,
  onAddNew,
  onRefresh,
  onEdit,
  onDelete,
}: BankListProps) {
  
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
    if (banks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-gray-300 rounded-lg">
          <Building2 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800">
            Aucune banque configurée
          </h3>
          <p className="text-gray-500 mt-2 mb-6 max-w-sm text-center">
            Commencez par ajouter les établissements bancaires avec lesquels vous travaillez.
            Ces banques pourront ensuite être associées à vos comptes bancaires.
          </p>
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une banque
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
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="w-[150px]">Code BIC</TableHead>
              <TableHead className="w-[100px] text-center">Statut</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.map((bank) => (
              <TableRow 
                key={bank.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {/* Code */}
                <TableCell className="font-mono font-medium text-gray-900">
                  {bank.code}
                </TableCell>
                
                {/* Nom */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{bank.name}</span>
                  </div>
                </TableCell>
                
                {/* Code BIC */}
                <TableCell className="font-mono text-sm text-gray-600">
                  {bank.bicCode || '-'}
                </TableCell>
                
                {/* Statut */}
                <TableCell className="text-center">
                  {bank.isActive ? (
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
                      <DropdownMenuItem onClick={() => onEdit(bank)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(bank)}
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* En-tête de la page */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Gestion des Banques
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les établissements bancaires de votre organisation.
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
            Nouvelle Banque
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      {!isLoading && banks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{banks.length}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Actives</p>
            <p className="text-2xl font-bold text-green-600">
              {banks.filter(b => b.isActive).length}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4 hidden sm:block">
            <p className="text-sm text-gray-500">Inactives</p>
            <p className="text-2xl font-bold text-gray-400">
              {banks.filter(b => !b.isActive).length}
            </p>
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