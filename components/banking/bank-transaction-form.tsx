/**
 * @file components/banking/bank-transaction-form.tsx
 * @description Formulaire de création et d'édition pour une transaction bancaire.
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 1.0.1 - Fix: Erreurs TypeScript react-hook-form v7.60
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { 
  BankTransaction, 
  CreateBankTransactionData,
  BankAccount,
  TransactionType 
} from '@/types/banking';

// API
import { getBankAccounts } from '@/lib/api/banking';
import { getTransactionTypes } from '@/lib/api/banking';

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
import { Loader2, ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Schéma Zod pour le formulaire.
 * NOTE: Le statut n'inclut PAS 'CANCELLED' car on ne peut pas créer/modifier
 * une transaction avec ce statut directement (c'est une action séparée).
 */
const bankTransactionFormSchema = z.object({
  bankAccountId: z.string({
    required_error: "Veuillez sélectionner un compte bancaire.",
  }).min(1, { message: "Veuillez sélectionner un compte bancaire." }),
  
  transactionTypeId: z.string({
    required_error: "Veuillez sélectionner un type de transaction.",
  }).min(1, { message: "Veuillez sélectionner un type de transaction." }),

  direction: z.enum(['DEBIT', 'CREDIT'], {
    required_error: "Veuillez sélectionner le sens de l'opération.",
  }),
  
  amount: z
    .number({
      required_error: "Le montant est requis.",
      invalid_type_error: "Veuillez entrer un montant valide.",
    })
    .positive({ message: "Le montant doit être positif." }),
  
  transactionDate: z.string({
    required_error: "La date de l'opération est requise.",
  }),
  
  valueDate: z.string().optional(),
  
  partnerName: z
    .string()
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." })
    .optional()
    .or(z.literal('')),
  
  description: z
    .string()
    .min(3, { message: "La description doit contenir au moins 3 caractères." })
    .max(200, { message: "La description ne peut pas dépasser 200 caractères." })
    .optional()
    .or(z.literal('')),
});

type BankTransactionFormData = z.infer<typeof bankTransactionFormSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface BankTransactionFormProps {
  initialData: BankTransaction | null;
  /** Pré-sélectionner un compte bancaire */
  preselectedAccountId?: string;
  onSave: (data: CreateBankTransactionData) => Promise<void>;
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function BankTransactionForm({ 
  initialData, 
  preselectedAccountId,
  onSave, 
  onCancel 
}: BankTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const isEditMode = initialData !== null;
  const isValidated = initialData?.status === 'VALIDATED';

  // Déterminer le statut initial pour le formulaire
  // Si CANCELLED, on affiche DRAFT (car le form ne supporte pas CANCELLED)
  const getInitialStatus = (): 'DRAFT' | 'VALIDATED' => {
    if (!initialData) return 'DRAFT';
    if (initialData.status === 'CANCELLED') return 'DRAFT';
    return initialData.status;
  };

  // Configuration du formulaire avec defaultValues explicites
  const form = useForm<BankTransactionFormData>({
    resolver: zodResolver(bankTransactionFormSchema),
    defaultValues: {
      bankAccountId: initialData?.bankAccountId ?? preselectedAccountId ?? '',
      transactionTypeId: initialData?.transactionTypeId ?? '',
      direction: initialData?.direction ?? 'DEBIT',
      amount: initialData?.amount ?? 0,
      transactionDate: initialData?.transactionDate ?? new Date().toISOString().split('T')[0],
      valueDate: initialData?.valueDate ?? '',
      partnerName: initialData?.partnerName ?? '',
      description: initialData?.description ?? '',
    },
  });

  // Charger les comptes et types de transactions
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [accountsData, typesData] = await Promise.all([
          getBankAccounts(),
          getTransactionTypes(),
        ]);
        setAccounts(accountsData);
        setTransactionTypes(typesData.filter(t => t.isActive));
        
        // Pré-sélectionner le compte si spécifié
        if (preselectedAccountId) {
          const account = accountsData.find(a => a.id === preselectedAccountId);
          if (account) {
            setSelectedAccount(account);
            form.setValue('currency', account.currency);
          }
        }
      } catch (error) {
        console.error("[BankTransactionForm] Erreur chargement données:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [preselectedAccountId, form]);

  // Mettre à jour la devise quand le compte change
  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      form.setValue('currency', account.currency);
    }
  };

  // Filtrer les types de transactions (la direction a été supprimée, donc pas de filtre)
  const filteredTypes = transactionTypes;

  /**
   * Gère la soumission du formulaire.
   */
  const handleSubmit = async (data: BankTransactionFormData) => {
    setIsSubmitting(true);

    try {
      const saveData: CreateBankTransactionData = {
        bankAccountId: data.bankAccountId,
        transactionTypeId: data.transactionTypeId,
        transactionDate: data.transactionDate,
        valueDate: data.valueDate || undefined,
        // La référence est générée côté serveur
        description: data.description || undefined,
        amount: data.amount,
        direction: data.direction,
        partnerName: data.partnerName || undefined,
      };

      await onSave(saveData);
    } catch (error) {
      console.error("[BankTransactionForm] Erreur sauvegarde:", error);
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditMode ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode
                ? 'Modifiez les détails de la transaction bancaire.'
                : 'Saisissez une nouvelle opération bancaire.'}
            </p>
          </div>
        </div>

        {/* Avertissement si validée */}
        {isValidated && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ Cette transaction est validée. Seule l'annulation est possible.
          </div>
        )}
        
        {/* Référence (read-only) et Date Système (read-only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Référence</FormLabel>
            <FormControl>
              <Input 
                readOnly 
                value={initialData?.reference || 'Sera générée automatiquement'}
                className="font-bold text-gray-700 bg-gray-100"
              />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Date système</FormLabel>
            <FormControl>
              <Input 
                readOnly 
                value={initialData?.systemDate ? new Date(initialData.systemDate).toLocaleString() : 'N/A'}
                className="bg-gray-100"
              />
            </FormControl>
          </FormItem>
        </div>

        {/* Type de transaction */}
        <FormField
          control={form.control}
          name="transactionTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de transaction *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isValidated}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sens de l'opération */}
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sens de l'opération *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4"
                  disabled={isValidated}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DEBIT" id="debit" />
                    <label 
                      htmlFor="debit" 
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                    >
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                      Débit (sortie)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CREDIT" id="credit" />
                    <label 
                      htmlFor="credit" 
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                    >
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Crédit (entrée)
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Compte bancaire */}
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
                      disabled={isValidated}
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

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'opération *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isEditMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de valeur</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isValidated} />
                </FormControl>
                <FormDescription>Date effective (optionnel)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bénéficiaire/Émetteur */}
        <FormField
          control={form.control}
          name="partnerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {form.watch('direction') === 'DEBIT' ? 'Bénéficiaire' : 'Émetteur'}
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nom du tiers" 
                  {...field}
                  disabled={isValidated}
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Description de l'opération..."
                  rows={3}
                  {...field}
                  disabled={isValidated}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Boutons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          {!isValidated && (
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Enregistrer' : 'Créer la transaction'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}