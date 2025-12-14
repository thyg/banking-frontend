/**
 * @file app/dashboard/banking/accounts/_components/bank-account-filters.tsx
 * @description Composant de filtrage pour la liste des comptes bancaires.
 * Permet de filtrer par banque, statut, devise et recherche textuelle.
 * 
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2024-12-11
 */

"use client";

import React from 'react';
import type { Bank } from '@/types/banking';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  X, 
  Filter,
  Wallet
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar US (USD)' },
  { value: 'XAF', label: 'Franc CFA CEMAC (XAF)' },
  { value: 'XOF', label: 'Franc CFA UEMOA (XOF)' },
  { value: 'GBP', label: 'Livre Sterling (GBP)' },
  { value: 'CHF', label: 'Franc Suisse (CHF)' },
] as const;

// ============================================================================
// TYPES
// ============================================================================

interface AccountFilters {
  bankId: string | null;
  isActive: boolean | null;
  currency: string | null;
  search: string;
}

interface BankAccountFiltersProps {
  /** Liste des banques pour le filtre */
  banks: Bank[];
  /** Valeurs actuelles des filtres */
  filters: AccountFilters;
  /** Callback pour les changements de filtres */
  onFilterChange: (filters: Partial<AccountFilters>) => void;
  /** Callback pour réinitialiser les filtres */
  onClearFilters: () => void;
  /** Nombre de filtres actifs */
  activeFiltersCount: number;
  /** Solde total des comptes filtrés */
  totalBalance: number;
  /** Nombre de comptes filtrés */
  accountsCount: number;
  /** Nombre total de comptes */
  totalAccountsCount: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function BankAccountFilters({
  banks,
  filters,
  onFilterChange,
  onClearFilters,
  activeFiltersCount,
  totalBalance,
  accountsCount,
  totalAccountsCount
}: BankAccountFiltersProps) {
  
  return (
    <div className="space-y-4">
      {/* Ligne de filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un compte..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-10"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtre par banque */}
        <Select
          value={filters.bankId || 'all'}
          onValueChange={(value) => onFilterChange({ bankId: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Toutes les banques" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les banques</SelectItem>
            {banks.map(bank => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par devise */}
        <Select
          value={filters.currency || 'all'}
          onValueChange={(value) => onFilterChange({ currency: value === 'all' ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes devises</SelectItem>
            {CURRENCIES.map(currency => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par statut */}
        <Select
          value={filters.isActive === null ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={(value) => {
            if (value === 'all') {
              onFilterChange({ isActive: null });
            } else {
              onFilterChange({ isActive: value === 'active' });
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>

        {/* Bouton réinitialiser */}
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClearFilters}
            className="h-10"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Résumé des résultats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {accountsCount === totalAccountsCount ? (
              <>{accountsCount} compte{accountsCount > 1 ? 's' : ''}</>
            ) : (
              <>{accountsCount} sur {totalAccountsCount} compte{totalAccountsCount > 1 ? 's' : ''}</>
            )}
          </span>
          
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Solde total */}
        <div className="flex items-center gap-2 font-medium">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Solde total:</span>
          <span className={totalBalance >= 0 ? 'text-green-600' : 'text-destructive'}>
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BankAccountFilters;