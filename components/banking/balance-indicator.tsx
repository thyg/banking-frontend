/**
 * @file components/banking/balance-indicator.tsx
 * @description Indicateur visuel du solde avec decouvert en temps reel.
 * Affiche le solde actuel, le decouvert autorise et la projection apres operation.
 *
 * @version 1.0.0
 * @date 2024-12-30
 */
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceInfo {
  currentBalance: number;
  overdraftLimit: number;
  availableBalance: number;
  overdraftUsed: number;
  overdraftAuthorized: boolean;
}

interface BalanceIndicatorProps {
  balanceInfo: BalanceInfo;
  pendingAmount?: number;
  currency?: string;
  className?: string;
}

/**
 * Composant affichant l'etat du solde d'un compte avec projection.
 * Inclut des alertes visuelles pour les operations utilisant le decouvert
 * ou depassant le solde disponible.
 *
 * @example
 * ```tsx
 * <BalanceIndicator
 *   balanceInfo={{
 *     currentBalance: 50000,
 *     overdraftLimit: 100000,
 *     availableBalance: 150000,
 *     overdraftUsed: 0,
 *     overdraftAuthorized: true
 *   }}
 *   pendingAmount={75000}
 *   currency="XAF"
 * />
 * ```
 */
export function BalanceIndicator({
  balanceInfo,
  pendingAmount = 0,
  currency = "XAF",
  className,
}: BalanceIndicatorProps) {
  const {
    currentBalance,
    overdraftLimit,
    availableBalance,
    overdraftUsed,
    overdraftAuthorized,
  } = balanceInfo;

  // Projection apres operation
  const projectedBalance = currentBalance - pendingAmount;
  const projectedAvailable = availableBalance - pendingAmount;
  const projectedOverdraftUsed =
    projectedBalance < 0 ? Math.abs(projectedBalance) : 0;

  // Alertes
  const isOverdraftExceeded = pendingAmount > availableBalance;
  const willUseOverdraft = projectedBalance < 0 && !isOverdraftExceeded;

  const formatAmount = (amount: number) => {
    return (
      new Intl.NumberFormat("fr-CM", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) +
      " " +
      currency
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Solde actuel */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">Solde actuel</span>
              </div>
              <p
                className={cn(
                  "text-sm sm:text-base md:text-lg font-bold tabular-nums truncate",
                  currentBalance < 0 && "text-destructive"
                )}
                title={formatAmount(currentBalance)}
              >
                {formatAmount(currentBalance)}
              </p>
            </div>

            {/* Decouvert autorise */}
            {overdraftAuthorized && (
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PiggyBank className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Découvert</span>
                </div>
                <p className="text-sm sm:text-base md:text-lg font-semibold text-blue-600 tabular-nums truncate" title={formatAmount(overdraftLimit)}>
                  + {formatAmount(overdraftLimit)}
                </p>
              </div>
            )}

            {/* Disponible total */}
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-muted-foreground truncate">
                Disponible
              </div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-green-600 tabular-nums truncate" title={formatAmount(availableBalance)}>
                {formatAmount(availableBalance)}
              </p>
            </div>

            {/* Decouvert utilise */}
            {overdraftAuthorized && (
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Utilisé</span>
                </div>
                <p
                  className={cn(
                    "text-sm sm:text-base md:text-lg font-semibold tabular-nums truncate",
                    overdraftUsed > 0
                      ? "text-orange-500"
                      : "text-muted-foreground"
                  )}
                  title={formatAmount(overdraftUsed)}
                >
                  {formatAmount(overdraftUsed)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projection si montant en cours - responsive */}
      {pendingAmount > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs sm:text-sm font-medium mb-2 text-muted-foreground truncate">
              Après opération de {formatAmount(pendingAmount)} :
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Nouveau solde</p>
                <p
                  className={cn(
                    "text-xs sm:text-sm font-semibold tabular-nums truncate",
                    projectedBalance < 0 && "text-destructive"
                  )}
                  title={formatAmount(projectedBalance)}
                >
                  {formatAmount(projectedBalance)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">Reste dispo.</p>
                <p
                  className={cn(
                    "text-xs sm:text-sm font-semibold tabular-nums truncate",
                    projectedAvailable < 0
                      ? "text-destructive"
                      : "text-green-600"
                  )}
                  title={formatAmount(Math.max(0, projectedAvailable))}
                >
                  {formatAmount(Math.max(0, projectedAvailable))}
                </p>
              </div>
              {overdraftAuthorized && (
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground truncate">
                    Découvert utilisé
                  </p>
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-semibold tabular-nums truncate",
                      projectedOverdraftUsed > 0 && "text-orange-500"
                    )}
                    title={formatAmount(projectedOverdraftUsed)}
                  >
                    {formatAmount(projectedOverdraftUsed)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      {isOverdraftExceeded && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Operation impossible :</strong> Le montant depasse le solde
            disponible
            {overdraftAuthorized && " (incluant le decouvert autorise)"}.
          </AlertDescription>
        </Alert>
      )}

      {willUseOverdraft && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Attention :</strong> Cette operation utilisera{" "}
            {formatAmount(projectedOverdraftUsed)} de decouvert.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
