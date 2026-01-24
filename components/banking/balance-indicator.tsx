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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Solde actuel */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                Solde actuel
              </div>
              <p
                className={cn(
                  "text-lg font-bold tabular-nums",
                  currentBalance < 0 && "text-destructive"
                )}
              >
                {formatAmount(currentBalance)}
              </p>
            </div>

            {/* Decouvert autorise */}
            {overdraftAuthorized && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PiggyBank className="h-3 w-3" />
                  Decouvert autorise
                </div>
                <p className="text-lg font-semibold text-blue-600 tabular-nums">
                  + {formatAmount(overdraftLimit)}
                </p>
              </div>
            )}

            {/* Disponible total */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Disponible total
              </div>
              <p className="text-lg font-bold text-green-600 tabular-nums">
                {formatAmount(availableBalance)}
              </p>
            </div>

            {/* Decouvert utilise */}
            {overdraftAuthorized && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  Decouvert utilise
                </div>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    overdraftUsed > 0
                      ? "text-orange-500"
                      : "text-muted-foreground"
                  )}
                >
                  {formatAmount(overdraftUsed)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projection si montant en cours */}
      {pendingAmount > 0 && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-3 pb-3">
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Apres operation de {formatAmount(pendingAmount)} :
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Nouveau solde</p>
                <p
                  className={cn(
                    "font-semibold tabular-nums",
                    projectedBalance < 0 && "text-destructive"
                  )}
                >
                  {formatAmount(projectedBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reste disponible</p>
                <p
                  className={cn(
                    "font-semibold tabular-nums",
                    projectedAvailable < 0
                      ? "text-destructive"
                      : "text-green-600"
                  )}
                >
                  {formatAmount(Math.max(0, projectedAvailable))}
                </p>
              </div>
              {overdraftAuthorized && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Decouvert utilise
                  </p>
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      projectedOverdraftUsed > 0 && "text-orange-500"
                    )}
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
