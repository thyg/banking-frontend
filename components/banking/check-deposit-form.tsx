/**
 * @file components/banking/check-deposit-form.tsx
 * @description Formulaire de création de remise de chèques en lot.
 * Permet de sélectionner un compte bancaire, puis les chèques éligibles à regrouper.
 *
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2026-02-16
 */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Check as CheckIcon, Loader2 } from 'lucide-react';

// Types
import type { BankAccount, Check } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// API
import { getBankAccounts } from '@/lib/api/banking';
import { getChecks } from '@/lib/api/check';
import { createCheckDeposit } from '@/lib/api/check-deposit';

interface CheckDepositFormProps {
  onSuccess: () => void;
  onCancel: () => void;
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

export function CheckDepositForm({ onSuccess, onCancel }: CheckDepositFormProps) {
  // État du formulaire
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [selectedCheckIds, setSelectedCheckIds] = useState<Set<string>>(new Set());

  // Données
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [eligibleChecks, setEligibleChecks] = useState<Check[]>([]);

  // État de chargement
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les comptes bancaires au montage
  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getBankAccounts();
        // Filtrer les comptes actifs
        setAccounts(data.filter(a => a.isActive));
      } catch (err) {
        console.error('[CheckDepositForm] Erreur chargement comptes:', err);
        setError('Impossible de charger les comptes bancaires.');
      } finally {
        setIsLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  // Charger les chèques éligibles quand le compte change
  useEffect(() => {
    if (!selectedAccountId) {
      setEligibleChecks([]);
      setSelectedCheckIds(new Set());
      return;
    }

    async function loadChecks() {
      setIsLoadingChecks(true);
      setError(null);
      try {
        // Récupérer les chèques RECEIVED pour ce compte
        const checks = await getChecks({
          bankAccountId: selectedAccountId,
          status: 'RECEIVED',
        });
        setEligibleChecks(checks);
        // Réinitialiser la sélection
        setSelectedCheckIds(new Set());
      } catch (err) {
        console.error('[CheckDepositForm] Erreur chargement chèques:', err);
        setError('Impossible de charger les chèques éligibles.');
      } finally {
        setIsLoadingChecks(false);
      }
    }
    loadChecks();
  }, [selectedAccountId]);

  // Calculer le résumé
  const summary = useMemo(() => {
    const selectedChecks = eligibleChecks.filter(c => selectedCheckIds.has(c.id));
    const totalAmount = selectedChecks.reduce((sum, c) => sum + c.amount, 0);
    const count = selectedChecks.length;
    const currency = selectedChecks[0]?.currency || accounts.find(a => a.id === selectedAccountId)?.currency || 'XAF';

    return { count, totalAmount, currency };
  }, [eligibleChecks, selectedCheckIds, accounts, selectedAccountId]);

  // Gérer la sélection d'un chèque
  const toggleCheckSelection = (checkId: string) => {
    setSelectedCheckIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checkId)) {
        newSet.delete(checkId);
      } else {
        newSet.add(checkId);
      }
      return newSet;
    });
  };

  // Sélectionner/désélectionner tous les chèques
  const toggleSelectAll = () => {
    if (selectedCheckIds.size === eligibleChecks.length) {
      setSelectedCheckIds(new Set());
    } else {
      setSelectedCheckIds(new Set(eligibleChecks.map(c => c.id)));
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAccountId) {
      setError('Veuillez sélectionner un compte bancaire.');
      return;
    }

    if (selectedCheckIds.size === 0) {
      setError('Veuillez sélectionner au moins un chèque.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createCheckDeposit({
        bankAccountId: selectedAccountId,
        checkIds: Array.from(selectedCheckIds),
        depositDate: format(depositDate, 'yyyy-MM-dd'),
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sélection du compte bancaire */}
      <div className="space-y-2">
        <Label htmlFor="bankAccount">Compte bancaire de destination *</Label>
        {isLoadingAccounts ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedAccountId || undefined} onValueChange={setSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un compte bancaire" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Date de la remise */}
      <div className="space-y-2">
        <Label>Date de la remise *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !depositDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {depositDate ? format(depositDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={depositDate}
              onSelect={(date) => date && setDepositDate(date)}
              locale={fr}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Liste des chèques éligibles */}
      {selectedAccountId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Chèques à inclure dans la remise</Label>
            {eligibleChecks.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedCheckIds.size === eligibleChecks.length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </Button>
            )}
          </div>

          {isLoadingChecks ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : eligibleChecks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              Aucun chèque éligible (statut RECEIVED) pour ce compte.
            </div>
          ) : (
            <div className="border rounded-md max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>N° Chèque</TableHead>
                    <TableHead>Émetteur</TableHead>
                    <TableHead>Date réception</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleChecks.map((check) => (
                    <TableRow
                      key={check.id}
                      className="cursor-pointer"
                      onClick={() => toggleCheckSelection(check.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedCheckIds.has(check.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCheckSelection(check.id);
                          }}
                        />
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Résumé */}
      {summary.count > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium">Résumé de la remise</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Nombre de chèques:</span>
              <span className="ml-2 font-medium">{summary.count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Montant total:</span>
              <span className="ml-2 font-bold text-lg">
                {formatCurrency(summary.totalAmount, summary.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting || summary.count === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création...
            </>
          ) : (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Créer la remise ({summary.count} chèques)
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
