/**
 * @file components/banking/active-filter-badges.tsx
 * @description Affiche les badges des filtres actifs avec possibilité de suppression.
 * Utilisé sur la page des chèques pour visualiser et gérer les filtres URL.
 *
 * @version 1.0.0
 * @date 2024-12-30
 */
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Filter } from "lucide-react";
import { useCheckNavigation, CheckNavigationFilters } from "@/hooks/use-check-navigation";

const FILTER_LABELS: Record<keyof CheckNavigationFilters, string> = {
  checkbookId: "Chequier",
  status: "Statut",
  checkType: "Type",
  dateFrom: "Date debut",
  dateTo: "Date fin",
  amountMin: "Montant min",
  amountMax: "Montant max",
  search: "Recherche",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  DEPOSITED: "Remis",
  CASHED: "Encaisse",
  REJECTED: "Rejete",
  CANCELLED: "Annule",
};

const TYPE_LABELS: Record<string, string> = {
  ISSUED: "Emis",
  RECEIVED: "Recu",
};

interface ActiveFilterBadgesProps {
  checkbookName?: string;
  className?: string;
}

/**
 * Composant affichant les badges des filtres actifs.
 * Chaque badge peut etre supprime individuellement.
 *
 * @example
 * ```tsx
 * <ActiveFilterBadges checkbookName={selectedCheckbook?.prefix} />
 * ```
 */
export function ActiveFilterBadges({ checkbookName, className }: ActiveFilterBadgesProps) {
  const { currentFilters, removeFilter, clearAllFilters, hasActiveFilters } = useCheckNavigation();

  if (!hasActiveFilters) {
    return null;
  }

  const activeFilters = Object.entries(currentFilters)
    .filter(([_, value]) => value !== undefined) as [keyof CheckNavigationFilters, string][];

  const formatValue = (key: keyof CheckNavigationFilters, value: string): string => {
    switch (key) {
      case "status":
        return STATUS_LABELS[value] || value;
      case "checkType":
        return TYPE_LABELS[value] || value;
      case "checkbookId":
        return checkbookName || `#${value.substring(0, 8)}...`;
      case "amountMin":
      case "amountMax":
        return new Intl.NumberFormat("fr-FR").format(Number(value)) + " XAF";
      case "dateFrom":
      case "dateTo":
        try {
          return new Date(value).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg ${className || ""}`}>
      <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground mr-2">Filtres:</span>

      {activeFilters.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="flex items-center gap-1 pr-1 pl-2 max-w-[200px]"
        >
          <span className="text-xs text-muted-foreground">{FILTER_LABELS[key]}:</span>
          <span className="font-medium truncate">{formatValue(key, value)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1 hover:bg-destructive/20 rounded-full flex-shrink-0"
            onClick={() => removeFilter(key)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Supprimer le filtre {FILTER_LABELS[key]}</span>
          </Button>
        </Badge>
      ))}

      {activeFilters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 text-muted-foreground hover:text-foreground"
          onClick={clearAllFilters}
        >
          Tout effacer
        </Button>
      )}
    </div>
  );
}
