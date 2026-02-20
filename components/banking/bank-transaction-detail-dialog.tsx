/**
 * @file components/banking/bank-transaction-detail-dialog.tsx
 * @description Modale affichant les détails complets d'une transaction bancaire.
 * Vue riche et contextuelle avec montant en lettres, liens vers entités liées,
 * informations de rapprochement et piste d'audit.
 *
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2026-02-19
 */
"use client";

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Calendar,
  User,
  FileText,
  Link2,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Printer,
  BookOpen,
  Ban,
  CreditCard,
  FileStack,
  History,
} from 'lucide-react';

// Types
import type { BankTransaction } from '@/types/banking';

// Composants UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Utilitaires
import { amountToWords } from '@/lib/utils/number-to-words';

// =============================================================================
// PROPS
// =============================================================================

interface BankTransactionDetailDialogProps {
  transaction: BankTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
  onPrint?: (transaction: BankTransaction) => void;
  onPost?: (transaction: BankTransaction) => void;
  onCancel?: (transaction: BankTransaction) => void;
}

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Formate un montant en devise.
 */
function formatCurrency(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
}

/**
 * Formate une date en français.
 */
function formatDate(dateString: string | undefined, withTime: boolean = false): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return format(date, withTime ? 'dd MMMM yyyy à HH:mm' : 'dd MMMM yyyy', { locale: fr });
}

/**
 * Retourne le nom de la devise en toutes lettres.
 */
function getCurrencyName(currency: string = 'XAF'): string {
  switch (currency) {
    case 'XAF':
    case 'XOF':
      return 'francs CFA';
    case 'EUR':
      return 'euro';
    case 'USD':
      return 'dollar';
    default:
      return currency;
  }
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

/**
 * Badge de statut de la transaction.
 */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'VALIDATED':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Validée
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
          <XCircle className="mr-1 h-3 w-3" />
          Annulée
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="mr-1 h-3 w-3" />
          Brouillon
        </Badge>
      );
  }
}

/**
 * Badge de direction (Crédit/Débit).
 */
function DirectionBadge({ direction }: { direction: 'CREDIT' | 'DEBIT' }) {
  if (direction === 'CREDIT') {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        <ArrowDownLeft className="h-3 w-3 mr-1" />
        Crédit
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
      <ArrowUpRight className="h-3 w-3 mr-1" />
      Débit
    </Badge>
  );
}

/**
 * Section d'information avec icône.
 */
function InfoSection({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted/30'}`}>
      <Icon className={`h-5 w-5 mt-0.5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`font-medium ${highlight ? 'text-primary' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function BankTransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
  isLoading = false,
  onPrint,
  onPost,
  onCancel,
}: BankTransactionDetailDialogProps) {
  // Déterminer si on a des liens contextuels à afficher
  const hasContextualLinks = transaction && (transaction.checkId || transaction.checkDepositId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Transaction {transaction?.reference || ''}</span>
            </div>
            {transaction && (
              <StatusBadge status={transaction.status} />
            )}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Informations détaillées de la transaction bancaire.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          // État de chargement
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-24" />
          </div>
        ) : transaction ? (
          <div className="space-y-6">
            {/* =================================================================== */}
            {/* SECTION MONTANT (élément le plus visible) */}
            {/* =================================================================== */}
            <div className={`p-4 sm:p-6 rounded-lg text-center ${
              transaction.direction === 'CREDIT'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {transaction.direction === 'CREDIT' ? (
                  <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                )}
                <DirectionBadge direction={transaction.direction} />
              </div>
              <p className={`text-2xl sm:text-4xl font-bold ${
                transaction.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.direction === 'CREDIT' ? '+' : '-'}{' '}
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 italic">
                "{amountToWords(transaction.amount, getCurrencyName(transaction.currency))}"
              </p>
            </div>

            <Separator />

            {/* =================================================================== */}
            {/* DÉTAILS DE L'OPÉRATION */}
            {/* =================================================================== */}
            <div>
              <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Détails de l'opération
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoSection
                  icon={Building}
                  label="Compte bancaire"
                  value={transaction.bankAccountName || 'Compte inconnu'}
                />
                <InfoSection
                  icon={User}
                  label="Partenaire / Tiers"
                  value={transaction.partnerName || '-'}
                />
                <InfoSection
                  icon={CreditCard}
                  label="Type d'opération"
                  value={
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{transaction.transactionTypeCode}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {transaction.transactionTypeLabel}
                      </span>
                    </div>
                  }
                />
                <InfoSection
                  icon={Calendar}
                  label="Date de l'opération"
                  value={formatDate(transaction.transactionDate)}
                />
                {transaction.valueDate && (
                  <InfoSection
                    icon={Calendar}
                    label="Date de valeur"
                    value={formatDate(transaction.valueDate)}
                  />
                )}
                <InfoSection
                  icon={FileText}
                  label="Objet / Description"
                  value={transaction.description || transaction.label || '-'}
                />
                {transaction.externalReference && (
                  <InfoSection
                    icon={FileText}
                    label="Référence externe (Vos Réf.)"
                    value={transaction.externalReference}
                  />
                )}
              </div>
            </div>

            {/* =================================================================== */}
            {/* LIENS ET CONTEXTE (section dynamique) */}
            {/* =================================================================== */}
            {hasContextualLinks && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Liens et contexte
                  </h4>
                  <div className="space-y-2">
                    {transaction.checkId && (
                      <Link
                        href={`/banking/checks?id=${transaction.checkId}`}
                        className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Receipt className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">Chèque lié</p>
                          <p className="text-xs text-blue-600">
                            N° {transaction.checkNumber || transaction.checkId}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                      </Link>
                    )}
                    {transaction.checkDepositId && (
                      <Link
                        href={`/banking/check-deposits?id=${transaction.checkDepositId}`}
                        className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <FileStack className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-800">Remise de chèques liée</p>
                          <p className="text-xs text-purple-600">
                            {transaction.checkDepositReference || transaction.checkDepositId}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-purple-500" />
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* =================================================================== */}
            {/* INFORMATIONS DE RAPPROCHEMENT */}
            {/* =================================================================== */}
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Rapprochement bancaire
              </h4>
              {transaction.isReconciled ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Rapprochée</p>
                    <p className="text-sm text-green-600">
                      {transaction.reconciledAt
                        ? `Rapprochée le ${formatDate(transaction.reconciledAt, true)}`
                        : 'Cette transaction a été rapprochée avec une ligne de relevé bancaire.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800">En attente de rapprochement</p>
                    <p className="text-sm text-amber-600">
                      Cette transaction n'a pas encore été rapprochée avec un relevé bancaire.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* =================================================================== */}
            {/* PISTE D'AUDIT */}
            {/* =================================================================== */}
            <Separator />
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Piste d'audit
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-dashed">
                  <span className="text-muted-foreground">Créée le</span>
                  <span className="font-medium">{formatDate(transaction.createdAt, true)}</span>
                </div>
                {transaction.status === 'VALIDATED' && (
                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <span className="text-muted-foreground">Validée le</span>
                    <span className="font-medium text-green-600">
                      {transaction.validatedAt
                        ? formatDate(transaction.validatedAt, true)
                        : formatDate(transaction.updatedAt, true)}
                      {transaction.validatedBy && ` par ${transaction.validatedBy}`}
                    </span>
                  </div>
                )}
                {transaction.status === 'CANCELLED' && (
                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <span className="text-muted-foreground">Annulée le</span>
                    <span className="font-medium text-red-600">
                      {transaction.cancelledAt
                        ? formatDate(transaction.cancelledAt, true)
                        : formatDate(transaction.updatedAt, true)}
                      {transaction.cancelledBy && ` par ${transaction.cancelledBy}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Dernière modification</span>
                  <span className="font-medium">{formatDate(transaction.updatedAt, true)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // État vide
          <div className="text-center py-8 text-muted-foreground">
            Aucune transaction sélectionnée.
          </div>
        )}

        {/* =================================================================== */}
        {/* ACTIONS */}
        {/* =================================================================== */}
        {transaction && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {onPrint && (
              <Button variant="outline" onClick={() => onPrint(transaction)}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            )}
            {onPost && transaction.status === 'VALIDATED' && (
              <Button variant="outline" onClick={() => onPost(transaction)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Comptabiliser
              </Button>
            )}
            {onCancel && transaction.status === 'VALIDATED' && !transaction.isReconciled && (
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onCancel(transaction)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
