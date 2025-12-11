/**
 * @file components/banking/check-form.tsx
 * @description Formulaire de création et d'édition pour un chèque (émis ou reçu).
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 1.0.1 - Fix: disabled={isProcessed} convertir null en boolean
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { Check, CreateCheckData, CheckType, BankAccount } from '@/types/banking';

// API
import { getBankAccounts } from '@/lib/api/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const checkFormSchema = z.object({
  type: z.enum(['ISSUED', 'RECEIVED'], {
    required_error: "Veuillez sélectionner le type de chèque.",
  }),
  
  checkNumber: z
    .string()
    .min(1, { message: "Le numéro de chèque est requis." })
    .max(20, { message: "Le numéro ne peut pas dépasser 20 caractères." }),
  
  bankAccountId: z.string({
    required_error: "Veuillez sélectionner un compte bancaire.",
  }),
  
  issueDate: z.string({
    required_error: "La date d'émission est requise.",
  }),
  
  dueDate: z.string().optional(),
  
  amount: z
    .number({
      required_error: "Le montant est requis.",
      invalid_type_error: "Veuillez entrer un montant valide.",
    })
    .positive({ message: "Le montant doit être positif." }),
  
  currency: z.enum(['EUR', 'USD', 'XAF', 'XOF']),
  
  partnerName: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),
  
  description: z
    .string()
    .max(200, { message: "La description ne peut pas dépasser 200 caractères." })
    .optional()
    .or(z.literal('')),
  
  notes: z
    .string()
    .max(500, { message: "Les notes ne peuvent pas dépasser 500 caractères." })
    .optional()
    .or(z.literal('')),
});

type CheckFormData = z.infer<typeof checkFormSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface CheckFormProps {
  initialData: Check | null;
  /** Type de chèque pré-sélectionné */
  preselectedType?: CheckType;
  /** Compte bancaire pré-sélectionné */
  preselectedAccountId?: string;
  onSave: (data: CreateCheckData) => Promise<void>;
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function CheckForm({
  initialData,
  preselectedType,
  preselectedAccountId,
  onSave,
  onCancel,
}: CheckFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const isEditMode = initialData !== null;
  
  // FIX: Convertir en boolean explicite pour éviter l'erreur null → boolean
  const isProcessed = !!(initialData && !['PENDING'].includes(initialData.status));

  // Configuration du formulaire avec defaultValues explicites
  const form = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
    defaultValues: {
      type: initialData?.type ?? preselectedType ?? 'RECEIVED',
      checkNumber: initialData?.checkNumber ?? '',
      bankAccountId: initialData?.bankAccountId ?? preselectedAccountId ?? '',
      issueDate: initialData?.issueDate ?? new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate ?? '',
      amount: initialData?.amount ?? 0,
      currency: initialData?.currency ?? 'EUR',
      partnerName: initialData?.partnerName ?? '',
      description: initialData?.description ?? '',
      notes: initialData?.notes ?? '',
    },
  });

  const watchType = form.watch('type');

  // Charger les comptes bancaires
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const accountsData = await getBankAccounts();
        setAccounts(accountsData);

        // Pré-sélectionner le compte
        const accountId = preselectedAccountId || initialData?.bankAccountId;
        if (accountId) {
          const account = accountsData.find(a => a.id === accountId);
          if (account) {
            setSelectedAccount(account);
            form.setValue('currency', account.currency);
          }
        }
      } catch (error) {
        console.error("[CheckForm] Erreur chargement comptes:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [preselectedAccountId, initialData, form]);

  // Mettre à jour la devise quand le compte change
  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      form.setValue('currency', account.currency);
    }
  };

  /**
   * Gère la soumission du formulaire.
   */
  const handleSubmit = async (data: CheckFormData) => {
    setIsSubmitting(true);

    try {
      const saveData: CreateCheckData = {
        type: data.type,
        checkNumber: data.checkNumber,
        bankAccountId: data.bankAccountId,
        issueDate: data.issueDate,
        dueDate: data.dueDate || undefined,
        amount: data.amount,
        currency: data.currency,
        partnerName: data.partnerName,
        description: data.description || undefined,
        notes: data.notes || undefined,
      };

      await onSave(saveData);
    } catch (error) {
      console.error("[CheckForm] Erreur sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditMode ? 'Modifier le chèque' : 'Nouveau chèque'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode
                ? 'Modifiez les informations du chèque.'
                : 'Enregistrez un chèque émis ou reçu.'}
            </p>
          </div>
        </div>

        {/* Avertissement si traité */}
        {isProcessed && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ Ce chèque a déjà été traité et ne peut plus être modifié.
          </div>
        )}

        {/* Type de chèque */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de chèque *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                  disabled={isEditMode}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RECEIVED" id="received" />
                    <label
                      htmlFor="received"
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                    >
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Chèque reçu (entrée)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ISSUED" id="issued" />
                    <label
                      htmlFor="issued"
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                    >
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                      Chèque émis (sortie)
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Numéro et Compte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de chèque *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 0001234"
                    {...field}
                    disabled={isProcessed}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compte bancaire *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleAccountChange(value);
                  }}
                  value={field.value}
                  disabled={isEditMode}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un compte..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'émission *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isProcessed} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchType === 'RECEIVED' && (
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'échéance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isProcessed} />
                  </FormControl>
                  <FormDescription>
                    Date à laquelle le chèque peut être encaissé
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Montant */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={isProcessed}
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    {selectedAccount?.currency || 'EUR'}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bénéficiaire/Émetteur */}
        <FormField
          control={form.control}
          name="partnerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchType === 'ISSUED' ? 'Bénéficiaire *' : 'Émetteur *'}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={
                    watchType === 'ISSUED'
                      ? "Nom du bénéficiaire du chèque"
                      : "Nom de la personne/entreprise qui a émis le chèque"
                  }
                  {...field}
                  disabled={isProcessed}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objet / Motif</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Règlement facture FA-2024-001"
                  {...field}
                  disabled={isProcessed}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informations complémentaires..."
                  rows={2}
                  {...field}
                  disabled={isProcessed}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          {!isProcessed && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Enregistrer' : 'Créer le chèque'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}