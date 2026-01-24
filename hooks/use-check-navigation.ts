/**
 * @file hooks/use-check-navigation.ts
 * @description Hook pour gérer la navigation vers la page des chèques avec filtres URL.
 * Permet la synchronisation entre les filtres UI et les paramètres d'URL.
 *
 * @version 1.0.0
 * @date 2024-12-30
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export interface CheckNavigationFilters {
  checkbookId?: string;
  status?: string;
  checkType?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
  search?: string;
}

/**
 * Hook pour gérer la navigation filtrée vers la page des chèques.
 *
 * @example
 * ```tsx
 * const { navigateFromCheckbook, currentFilters, hasActiveFilters } = useCheckNavigation();
 *
 * // Navigation depuis un chéquier
 * <Button onClick={() => navigateFromCheckbook(checkbook.id, "PENDING")}>
 *   Voir les chèques
 * </Button>
 * ```
 */
export function useCheckNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Navigue vers la page des chèques avec les filtres spécifiés.
   */
  const navigateToChecks = useCallback(
    (filters: CheckNavigationFilters) => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      router.push(`/banking/checks${queryString ? `?${queryString}` : ""}`);
    },
    [router]
  );

  /**
   * Navigue depuis un chéquier vers ses chèques.
   * Utilisé depuis la popup détail d'un chéquier.
   *
   * @param checkbookId - ID du chéquier
   * @param status - Statut des chèques à afficher (défaut: PENDING)
   */
  const navigateFromCheckbook = useCallback(
    (checkbookId: string, status: string = "PENDING") => {
      navigateToChecks({ checkbookId, status });
    },
    [navigateToChecks]
  );

  /**
   * Lit les filtres actuels depuis l'URL.
   */
  const currentFilters = useMemo((): CheckNavigationFilters => {
    return {
      checkbookId: searchParams.get("checkbookId") || undefined,
      status: searchParams.get("status") || undefined,
      checkType: searchParams.get("checkType") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      amountMin: searchParams.get("amountMin") || undefined,
      amountMax: searchParams.get("amountMax") || undefined,
      search: searchParams.get("search") || undefined,
    };
  }, [searchParams]);

  /**
   * Met à jour un filtre spécifique dans l'URL.
   */
  const updateFilter = useCallback(
    (key: keyof CheckNavigationFilters, value: string | undefined) => {
      const newFilters = { ...currentFilters };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      navigateToChecks(newFilters);
    },
    [currentFilters, navigateToChecks]
  );

  /**
   * Supprime un filtre de l'URL.
   */
  const removeFilter = useCallback(
    (key: keyof CheckNavigationFilters) => {
      updateFilter(key, undefined);
    },
    [updateFilter]
  );

  /**
   * Supprime tous les filtres et navigue vers la page sans paramètres.
   */
  const clearAllFilters = useCallback(() => {
    router.push("/banking/checks");
  }, [router]);

  /**
   * Vérifie si des filtres sont actifs.
   */
  const hasActiveFilters = useMemo(() => {
    return Object.values(currentFilters).some(v => v !== undefined);
  }, [currentFilters]);

  /**
   * Compte le nombre de filtres actifs.
   */
  const activeFilterCount = useMemo(() => {
    return Object.values(currentFilters).filter(v => v !== undefined).length;
  }, [currentFilters]);

  return {
    navigateToChecks,
    navigateFromCheckbook,
    currentFilters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
