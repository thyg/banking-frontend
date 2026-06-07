/**
 * @file components/banking/check-deposit-detail-dialog.tsx
 * @description Dialog affichant les détails d'une remise de chèques.
 * Montre les informations de la remise et la liste des chèques inclus.
 *
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2026-02-16
 */
"use client";

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, Clock, FileText, Banknote, Hash, Calendar, Building } from 'lucide-react';

// Types
import type { CheckDeposit } from '@/types/banking';

// Composants UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CheckDepositDetailDialogProps {
  deposit: CheckDeposit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

/**
 * Formate un montant en devise.
 */
function formatCurrency(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Retourne le badge de statut approprié.
 */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DEPOSITED':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="mr-1 h-3 w-3" />
          En attente de rapprochement
        </Badge>
      );
    case 'RECONCILED':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Rapproché
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

/**
 * Badge de statut pour les chèques.
 */
function CheckStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DEPOSITED':
      return <Badge variant="outline" className="text-amber-700">Déposé</Badge>;
    case 'CASHED':
      return <Badge variant="outline" className="text-green-700">Encaissé</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function CheckDepositDetailDialog({
  deposit,
  open,
  onOpenChange,
  isLoading = false,
}: CheckDepositDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Détails de la remise
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur la remise de chèques et les chèques inclus.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-32" />
          </div>
        ) : deposit ? (
          <div className="space-y-6">
            {/* En-tête avec référence et statut */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{deposit.reference}</h3>
                <p className="text-sm text-muted-foreground">
                  Créée le {format(new Date(deposit.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
              <StatusBadge status={deposit.status} />
            </div>

            <Separator />

            {/* Informations principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Compte bancaire</p>
                  <p className="font-medium">{deposit.bankAccountName || 'Compte inconnu'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Date de remise</p>
                  <p className="font-medium">
                    {format(new Date(deposit.depositDate), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre de chèques</p>
                  <p className="font-medium">{deposit.checkCount} chèques</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                <Banknote className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Montant total</p>
                  <p className="font-bold text-lg text-primary">
                    {formatCurrency(deposit.totalAmount, deposit.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction liée (si rapprochée) */}
            {deposit.status === 'RECONCILED' && deposit.bankTransactionReference && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Transaction bancaire créée
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  Référence: <span className="font-mono">{deposit.bankTransactionReference}</span>
                </p>
              </div>
            )}

            <Separator />

            {/* Liste des chèques */}
            <div>
              <h4 className="font-medium mb-3">Chèques inclus dans la remise</h4>
              {deposit.checks && deposit.checks.length > 0 ? (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Chèque</TableHead>
                        <TableHead>Émetteur</TableHead>
                        <TableHead>Date réception</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposit.checks.map((check) => (
                        <TableRow key={check.id}>
                          <TableCell className="font-medium">{check.checkNumber}</TableCell>
                          <TableCell>{check.partnerName}</TableCell>
                          <TableCell>
                            {check.receiptDate
                              ? format(new Date(check.receiptDate), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(check.amount, check.currency)}
                          </TableCell>
                          <TableCell>
                            <CheckStatusBadge status={check.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun détail de chèque disponible.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Aucune remise sélectionnée.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
