/**
 * @file components/banking/check-detail-dialog.tsx
 * @description Dialog pour afficher les détails d'un chèque avec actions contextuelles.
 *
 * @version 1.0.0
 * @date 2024-12-31
 */
"use client";

import React from 'react';
import { Check, CheckType, CheckStatus } from '@/types/banking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Hash,
  User,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  Banknote,
  Send,
  Printer,
  Ban,
  Download,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction pour formater les montants
const formatCurrency = (amount: number, currency: string = 'XAF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

// Fonction pour convertir un montant en lettres (version simplifiée)
const numberToWords = (num: number): string => {
  if (num === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const convert = (n: number): string => {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const unit = n % 10;
      const ten = Math.floor(n / 10);
      if (ten === 7 || ten === 9) {
        return tens[ten] + (unit === 1 && ten !== 9 ? '-et-' : '-') + teens[unit];
      }
      return tens[ten] + (unit === 1 && ten < 8 ? '-et-' : unit > 0 ? '-' : '') + units[unit];
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      return (hundred === 1 ? 'cent' : units[hundred] + ' cent') + (rest > 0 ? ' ' + convert(rest) : (hundred > 1 && rest === 0 ? 's' : ''));
    }
    if (n < 1000000) {
      const thousand = Math.floor(n / 1000);
      const rest = n % 1000;
      return (thousand === 1 ? 'mille' : convert(thousand) + ' mille') + (rest > 0 ? ' ' + convert(rest) : '');
    }
    if (n < 1000000000) {
      const million = Math.floor(n / 1000000);
      const rest = n % 1000000;
      return convert(million) + ' million' + (million > 1 ? 's' : '') + (rest > 0 ? ' ' + convert(rest) : '');
    }
    return num.toString();
  };

  return convert(Math.floor(num));
};

interface CheckDetailDialogProps {
  check: Check | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Actions
  onEdit?: (check: Check) => void;
  onEmit?: (check: Check) => void;
  onDeposit?: (check: Check) => void;
  onCash?: (check: Check) => void;
  onReject?: (check: Check) => void;
  onCancel?: (check: Check) => void;
  onPrint?: (check: Check) => void;
  onMarkReceived?: (check: Check) => void;
  onMarkProcessing?: (check: Check) => void;
  onMarkPaid?: (check: Check) => void;
  onViewTransaction?: (check: Check) => void;
}

export function CheckDetailDialog({
  check,
  open,
  onOpenChange,
  onEdit,
  onEmit,
  onDeposit,
  onCash,
  onReject,
  onCancel,
  onPrint,
  onMarkReceived,
  onMarkProcessing,
  onMarkPaid,
  onViewTransaction,
}: CheckDetailDialogProps) {
  if (!check) return null;

  const isReceived = check.checkType === 'RECEIVED';
  const isIssued = check.checkType === 'ISSUED';

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy à HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  // Configuration des statuts
  const statusConfig: Record<CheckStatus, { label: string; icon: React.ReactNode; className: string }> = {
    PENDING: {
      label: 'En attente',
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    RECEIVED: {
      label: 'Reçu',
      icon: <Download className="h-4 w-4" />,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    ISSUED: {
      label: 'Émis',
      icon: <Send className="h-4 w-4" />,
      className: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    DEPOSITED: {
      label: 'Remis en banque',
      icon: <Building2 className="h-4 w-4" />,
      className: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    },
    IN_PROGRESS: {
      label: 'En cours',
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    CASHED: {
      label: isReceived ? 'Encaissé' : 'Payé',
      icon: <CheckCircle className="h-4 w-4" />,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    REJECTED: {
      label: 'Rejeté',
      icon: <AlertTriangle className="h-4 w-4" />,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    CANCELLED: {
      label: 'Annulé',
      icon: <XCircle className="h-4 w-4" />,
      className: 'bg-gray-100 text-gray-500 border-gray-300',
    },
  };

  const currentStatus = statusConfig[check.status] || statusConfig.PENDING;

  // Déterminer les actions disponibles
  const getAvailableActions = () => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: 'default' | 'destructive' | 'outline' }[] = [];

    if (isIssued) {
      switch (check.status) {
        case 'PENDING':
          if (onEdit) actions.push({ label: 'Modifier', icon: <FileText className="h-4 w-4" />, onClick: () => onEdit(check), variant: 'outline' });
          if (onEmit) actions.push({ label: 'Émettre', icon: <Send className="h-4 w-4" />, onClick: () => onEmit(check) });
          if (onPrint) actions.push({ label: 'Imprimer', icon: <Printer className="h-4 w-4" />, onClick: () => onPrint(check), variant: 'outline' });
          break;
        case 'ISSUED':
          if (onDeposit) actions.push({ label: 'Marquer Déposé', icon: <Building2 className="h-4 w-4" />, onClick: () => onDeposit(check) });
          if (onPrint) actions.push({ label: 'Imprimer', icon: <Printer className="h-4 w-4" />, onClick: () => onPrint(check), variant: 'outline' });
          break;
        case 'DEPOSITED':
          if (onMarkProcessing) actions.push({ label: 'Marquer En Cours', icon: <Clock className="h-4 w-4" />, onClick: () => onMarkProcessing(check), variant: 'outline' });
          if (onMarkPaid) actions.push({ label: 'Marquer Payé', icon: <CheckCircle className="h-4 w-4" />, onClick: () => onMarkPaid(check) });
          break;
        case 'IN_PROGRESS':
          if (onMarkPaid) actions.push({ label: 'Marquer Payé', icon: <CheckCircle className="h-4 w-4" />, onClick: () => onMarkPaid(check) });
          if (onReject) actions.push({ label: 'Rejeter', icon: <Ban className="h-4 w-4" />, onClick: () => onReject(check), variant: 'destructive' });
          break;
        case 'CASHED':
          if (onViewTransaction) actions.push({ label: 'Voir Transaction', icon: <ExternalLink className="h-4 w-4" />, onClick: () => onViewTransaction(check) });
          break;
      }
    } else {
      // RECEIVED
      switch (check.status) {
        case 'PENDING':
          if (onEdit) actions.push({ label: 'Modifier', icon: <FileText className="h-4 w-4" />, onClick: () => onEdit(check), variant: 'outline' });
          if (onMarkReceived) actions.push({ label: 'Marquer Reçu', icon: <Download className="h-4 w-4" />, onClick: () => onMarkReceived(check) });
          break;
        case 'RECEIVED':
          if (onDeposit) actions.push({ label: 'Déposer en banque', icon: <Building2 className="h-4 w-4" />, onClick: () => onDeposit(check) });
          break;
        case 'DEPOSITED':
          if (onMarkProcessing) actions.push({ label: 'Marquer En Cours', icon: <Clock className="h-4 w-4" />, onClick: () => onMarkProcessing(check), variant: 'outline' });
          if (onCash) actions.push({ label: 'Encaisser', icon: <Banknote className="h-4 w-4" />, onClick: () => onCash(check) });
          break;
        case 'IN_PROGRESS':
          if (onCash) actions.push({ label: 'Encaisser', icon: <Banknote className="h-4 w-4" />, onClick: () => onCash(check) });
          if (onReject) actions.push({ label: 'Rejeter', icon: <Ban className="h-4 w-4" />, onClick: () => onReject(check), variant: 'destructive' });
          break;
        case 'CASHED':
          if (onViewTransaction) actions.push({ label: 'Voir Transaction', icon: <ExternalLink className="h-4 w-4" />, onClick: () => onViewTransaction(check) });
          break;
      }
    }

    // Actions communes pour certains états
    if (['PENDING', 'ISSUED', 'RECEIVED', 'DEPOSITED'].includes(check.status) && onCancel) {
      actions.push({ label: 'Annuler', icon: <XCircle className="h-4 w-4" />, onClick: () => onCancel(check), variant: 'destructive' });
    }

    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <Badge className={isReceived ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {isReceived ? (
                <>
                  <ArrowDownLeft className="h-3 w-3 mr-1" />
                  Reçu
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Émis
                </>
              )}
            </Badge>
            {/* Status badge */}
            <Badge variant="outline" className={currentStatus.className}>
              {currentStatus.icon}
              <span className="ml-1">{currentStatus.label}</span>
            </Badge>
          </div>
          <DialogTitle className="text-lg sm:text-xl mt-2 font-mono">
            {check.checkNumber}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Détails du chèque {isReceived ? 'reçu de' : 'émis à'} {check.partnerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Montant */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className={cn(
                "text-xl sm:text-2xl font-bold",
                isReceived ? "text-green-600" : "text-red-600"
              )}>
                {isReceived ? '+' : '-'}{formatCurrency(check.amount, check.currency)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground italic mt-1">
              {numberToWords(check.amount)} francs CFA
            </p>
          </div>

          <Separator />

          {/* Informations principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Tiers */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {isReceived ? 'Émetteur' : 'Bénéficiaire'}
              </p>
              <p className="font-medium text-sm sm:text-base">{check.partnerName}</p>
            </div>

            {/* Compte bancaire */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Compte
              </p>
              <p className="font-medium text-sm sm:text-base">{check.bankAccountName || 'N/A'}</p>
            </div>
          </div>

          {/* Description */}
          {check.description && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Description
              </p>
              <p className="text-sm bg-muted/50 rounded p-2">{check.description}</p>
            </div>
          )}

          <Separator />

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date d'émission</p>
                <p>{formatDate(check.issueDate)}</p>
              </div>
              {check.dueDate && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date d'échéance</p>
                  <p>{formatDate(check.dueDate)}</p>
                </div>
              )}
              {check.depositDate && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date de dépôt</p>
                  <p>{formatDate(check.depositDate)}</p>
                </div>
              )}
              {check.cashedDate && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {isReceived ? 'Date d\'encaissement' : 'Date de paiement'}
                  </p>
                  <p>{formatDate(check.cashedDate)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Historique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Créé le</p>
              <p>{formatDateTime(check.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Modifié le</p>
              <p>{formatDateTime(check.updatedAt)}</p>
            </div>
          </div>

          {/* Message pour états finaux */}
          {check.status === 'CANCELLED' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <XCircle className="h-4 w-4 inline mr-1" />
                Ce chèque a été annulé et ne peut plus être modifié.
              </p>
            </div>
          )}

          {check.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-700">Chèque Rejeté</span>
              </div>
              <p className="text-sm text-red-600">
                Ce chèque a été rejeté par la banque.
              </p>
              {check.rejectionReason && (
                <div className="bg-white/60 border border-red-100 rounded-md p-3 mt-2">
                  <p className="text-xs text-red-500 uppercase font-medium mb-1">
                    Motif du rejet
                  </p>
                  <p className="text-sm text-red-800 font-medium">
                    {check.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'default'}
              onClick={() => {
                action.onClick();
                onOpenChange(false);
              }}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
