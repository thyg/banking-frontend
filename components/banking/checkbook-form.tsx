/**
 * @file components/banking/checkbook-form.tsx
 * @description Formulaire de création/édition d'un chéquier.
 * 
 * @version 1.0.0
 * @date 2024-12-24
 */
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { Checkbook } from '@/types/banking';
import { BankAccount } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Calculator, Info, Wallet, AlertTriangle } from 'lucide-react';
import { getBankAccounts } from '@/lib/api/banking';

// Schéma de validation Zod (IBAN n'est pas inclus car récupéré automatiquement du compte bancaire)
const checkbookFormSchema = z.object({
  bankAccountId: z.string().min(1, "Le compte bancaire est obligatoire."),
  prefix: z.string().min(1, "La racine est obligatoire.").max(20),
  startNumber: z.coerce.number().int().positive("Le numéro de début doit être positif."),
  numberOfPages: z.coerce.number().int().min(1, "Minimum 1 feuille.").max(500, "Maximum 500 feuilles."),
});

// Fonction utilitaire pour formater les montants
const formatCurrency = (amount: number, currency: string = 'XAF'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
};

type CheckbookFormData = z.infer<typeof checkbookFormSchema>;

interface CheckbookFormProps {
  initialData: Checkbook | null;
  onSave: (data: CheckbookFormData) => Promise<void>;
  onCancel: () => void;
}

export function CheckbookForm({ initialData, onSave, onCancel }: CheckbookFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const isEditMode = initialData !== null;

  // Calculer numberOfPages à partir des données initiales si disponibles
  const initialNumberOfPages = initialData && initialData.endNumber !== null && initialData.startNumber !== null
    ? (initialData.endNumber - initialData.startNumber + 1)
    : ('' as unknown as number);

  const form = useForm<CheckbookFormData>({
    resolver: zodResolver(checkbookFormSchema),
    defaultValues: {
      bankAccountId: initialData?.bankAccountId ?? '',
      prefix: initialData?.prefix ?? '',
      startNumber: initialData?.startNumber ?? ('' as unknown as number),
      numberOfPages: initialNumberOfPages,
    },
  });

  // Observer les valeurs pour le calcul automatique
  const watchPrefix = form.watch('prefix');
  const watchStartNumber = form.watch('startNumber');
  const watchNumberOfPages = form.watch('numberOfPages');

  // Calcul automatique du premier et dernier chèque
  const calculatedFirstCheck = useMemo(() => {
    if (!watchPrefix || !watchStartNumber) return null;
    return `${watchPrefix}-${watchStartNumber}`;
  }, [watchPrefix, watchStartNumber]);

  const calculatedLastCheck = useMemo(() => {
    if (!watchPrefix || !watchStartNumber || !watchNumberOfPages) return null;
    const lastNumber = Number(watchStartNumber) + Number(watchNumberOfPages) - 1;
    return `${watchPrefix}-${lastNumber}`;
  }, [watchPrefix, watchStartNumber, watchNumberOfPages]);

  const calculatedEndNumber = useMemo(() => {
    if (!watchStartNumber || !watchNumberOfPages) return null;
    return Number(watchStartNumber) + Number(watchNumberOfPages) - 1;
  }, [watchStartNumber, watchNumberOfPages]);

  // Charger les comptes bancaires
  useEffect(() => {
    async function loadAccounts() {
      setIsLoading(true);
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error("Erreur chargement comptes bancaires:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
  }, []);

  // Trouver le nom du compte sélectionné
  const selectedAccountId = form.watch('bankAccountId');
  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);


  const handleSubmit = async (data: CheckbookFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error("Erreur sauvegarde chéquier:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher un loader si les comptes sont en chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bankAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compte bancaire *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isEditMode}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un compte">
                      {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : "Sélectionnez un compte"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Informations du compte sélectionné */}
        {selectedAccount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-blue-800 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informations du compte sélectionné
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-600">IBAN :</span>
                <span className="font-mono ml-2 text-blue-900">
                  {selectedAccount.generatedIban || selectedAccount.iban || selectedAccount.accountNumber || 'Non renseigné'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-600" />
                <span className="text-blue-600">Solde actuel :</span>
                <span className="font-bold text-blue-900">
                  {formatCurrency(selectedAccount.currentBalance || 0, selectedAccount.currency)}
                </span>
              </div>
              {selectedAccount.overdraftAuthorized && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700">
                    Découvert autorisé : {formatCurrency(selectedAccount.overdraftLimit || 0, selectedAccount.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IBAN affiché en lecture seule */}
        <div className="space-y-2">
          <label className="text-sm font-medium">IBAN / RIB</label>
          <Input
            value={selectedAccount?.generatedIban || selectedAccount?.iban || selectedAccount?.accountNumber || ''}
            placeholder="Sélectionnez un compte bancaire"
            disabled
          />
          <p className="text-sm text-muted-foreground">Récupéré automatiquement du compte bancaire.</p>
        </div>
        
        <FormField
          control={form.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Racine / Préfixe *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Partie commune du numéro de chèque" disabled={isEditMode}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de début *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 209"
                    disabled={isEditMode}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>Premier numéro de chèque du carnet.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numberOfPages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de feuilles *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 100"
                    disabled={isEditMode}
                    min={1}
                    max={500}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>Nombre total de chèques dans le carnet.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Aperçu calculé automatiquement */}
        {calculatedFirstCheck && calculatedLastCheck && watchNumberOfPages > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-emerald-800 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Aperçu calculé automatiquement
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-emerald-600 block">Racine :</span>
                <span className="font-mono font-bold text-emerald-900">{watchPrefix}</span>
              </div>
              <div>
                <span className="text-emerald-600 block">Premier chèque :</span>
                <span className="font-mono font-bold text-emerald-900">{calculatedFirstCheck}</span>
              </div>
              <div>
                <span className="text-emerald-600 block">Dernier chèque :</span>
                <span className="font-mono font-bold text-emerald-900">{calculatedLastCheck}</span>
              </div>
              <div>
                <span className="text-emerald-600 block">Total feuilles :</span>
                <span className="font-bold text-emerald-900">{watchNumberOfPages}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || isEditMode}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </form>
    </Form>
  );
}