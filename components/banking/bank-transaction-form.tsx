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
  TransactionType,
  Check,
} from '@/types/banking';

// API
import { getBankAccounts } from '@/lib/api/banking';
import { getTransactionTypes } from '@/lib/api/banking';
import { getChecks } from '@/lib/api/check';
import { amountToWords } from '@/lib/utils/number-to-words';

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
import { Loader2, ArrowDownLeft, ArrowUpRight, Receipt, CreditCard } from 'lucide-react';

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
  
  paymentMethod: z.enum(['BANK_TRANSFER', 'CHECK', 'CASH', 'MOBILE_MONEY', 'OTHER']).optional(),

  externalReference: z
    .string()
    .max(50, { message: "La reference ne peut pas depasser 50 caracteres." })
    .optional()
    .or(z.literal('')),

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

  checkId: z.string().optional().or(z.literal('')),
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
  const [availableChecks, setAvailableChecks] = useState<Check[]>([]);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);

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
      paymentMethod: initialData?.paymentMethod ?? undefined,
      amount: initialData?.amount ?? 0,
      transactionDate: initialData?.transactionDate ?? new Date().toISOString().split('T')[0],
      valueDate: initialData?.valueDate ?? '',
      externalReference: initialData?.externalReference ?? '',
      partnerName: initialData?.partnerName ?? '',
      description: initialData?.description ?? '',
      checkId: '',
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
    }
    // Réinitialiser le chèque sélectionné si le compte change
    form.setValue('checkId', '');
  };

  // Charger les chèques disponibles lorsque le compte bancaire change
  const watchBankAccountId = form.watch('bankAccountId');
  useEffect(() => {
    if (!watchBankAccountId || isEditMode) {
      setAvailableChecks([]);
      return;
    }
    const fetchChecks = async () => {
      setIsLoadingChecks(true);
      try {
        const checksData = await getChecks({
          bankAccountId: watchBankAccountId,
          status: ['PENDING', 'ISSUED', 'RECEIVED', 'DEPOSITED'],
        });
        setAvailableChecks(checksData);
      } catch (error) {
        console.error("[BankTransactionForm] Erreur chargement chèques:", error);
        setAvailableChecks([]);
      } finally {
        setIsLoadingChecks(false);
      }
    };
    fetchChecks();
  }, [watchBankAccountId, isEditMode]);

  // Pré-remplir le formulaire quand un chèque est sélectionné
  const watchCheckId = form.watch('checkId');
  useEffect(() => {
    if (!watchCheckId) return;
    const selectedCheck = availableChecks.find(c => c.id === watchCheckId);
    if (selectedCheck) {
      form.setValue('amount', selectedCheck.amount);
      form.setValue('partnerName', selectedCheck.partnerName);
      form.setValue('description', `Règlement par chèque n°${selectedCheck.checkNumber}`);
      form.setValue('direction', selectedCheck.checkType === 'RECEIVED' ? 'CREDIT' : 'DEBIT');
      form.setValue('paymentMethod', 'CHECK');
    }
  }, [watchCheckId, availableChecks, form]);

  // Filtrer les types de transactions (la direction a été supprimée, donc pas de filtre)
  const filteredTypes = transactionTypes;

  // Montant en lettres
  const watchAmount = form.watch('amount');
  const amountInWordsText = amountToWords(watchAmount, selectedAccount?.currency || 'FCFA');

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
        // La référence (Nos Réf.) est générée côté serveur
        externalReference: data.externalReference || undefined, // Vos Réf.
        description: data.description || undefined,
        amount: data.amount,
        direction: data.direction,
        paymentMethod: data.paymentMethod || undefined,
        partnerName: data.partnerName || undefined,
        checkId: data.checkId || undefined,
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
        {/* En-tête - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-blue-100 rounded-lg w-fit">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              {isEditMode ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
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
        
        {/* Références et Date Système - responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <FormItem>
            <FormLabel>Nos Réf.</FormLabel>
            <FormControl>
              <Input
                readOnly
                value={initialData?.reference || 'Auto-générée'}
                className="font-bold text-gray-700 bg-gray-100 text-xs sm:text-sm"
              />
            </FormControl>
            <FormDescription className="text-xs">Réf. interne</FormDescription>
          </FormItem>

          <FormField
            control={form.control}
            name="externalReference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vos Réf.</FormLabel>
                <FormControl>
                  <Input
                    placeholder="N° document..."
                    {...field}
                    disabled={isValidated}
                  />
                </FormControl>
                <FormDescription className="text-xs">Réf. externe (optionnel)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date système */}
          <FormItem>
            <FormLabel>Date système</FormLabel>
            <FormControl>
              <Input
                readOnly
                value={initialData?.systemDate ? new Date(initialData.systemDate).toLocaleDateString() : new Date().toLocaleDateString()}
                className="bg-gray-100 text-xs sm:text-sm"
              />
            </FormControl>
            <FormDescription className="text-xs">Enregistrement</FormDescription>
          </FormItem>
        </div>

        {/* Grille Type de transaction + Compte bancaire - responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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

        {/* Sens de l'opération - responsive */}
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
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                  disabled={isValidated}
                >
                  <div className="flex items-center space-x-2 p-2 sm:p-0 border sm:border-0 rounded-lg sm:rounded-none">
                    <RadioGroupItem value="DEBIT" id="debit" />
                    <label
                      htmlFor="debit"
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium flex-1"
                    >
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                      <span>Débit <span className="text-gray-500 text-xs">(sortie)</span></span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 sm:p-0 border sm:border-0 rounded-lg sm:rounded-none">
                    <RadioGroupItem value="CREDIT" id="credit" />
                    <label
                      htmlFor="credit"
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium flex-1"
                    >
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      <span>Crédit <span className="text-gray-500 text-xs">(entrée)</span></span>
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Grille Moyen de paiement + Lier à un chèque - responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Moyen de paiement */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Moyen de paiement
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isValidated}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                    <SelectItem value="CHECK">Chèque</SelectItem>
                    <SelectItem value="CASH">Espèces</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money (OM, MoMo)</SelectItem>
                    <SelectItem value="OTHER">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">Mode de règlement (optionnel)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lier à un chèque (optionnel, uniquement en création) */}
          {!isEditMode && (
            <FormField
              control={form.control}
              name="checkId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lier à un chèque</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!watchBankAccountId || isLoadingChecks}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={
                          isLoadingChecks
                            ? "Chargement..."
                            : !watchBankAccountId
                              ? "Sélectionnez un compte d'abord"
                              : "Aucun chèque sélectionné"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableChecks.length > 0 ? (
                        availableChecks.map(check => (
                          <SelectItem key={check.id} value={check.id}>
                            <span className="truncate">N°{check.checkNumber} | {check.partnerName} | {check.amount.toLocaleString('fr-FR')}</span>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          {watchBankAccountId ? "Aucun chèque disponible" : "Sélectionnez un compte"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Lie et valide automatiquement la transaction.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Grille Montant + Montant en lettres - responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs sm:text-sm">
                      {selectedAccount?.currency || 'EUR'}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Montant en lettres */}
          <FormItem>
            <FormLabel className="text-xs sm:text-sm">Montant en lettres</FormLabel>
            <FormControl>
              <Input readOnly value={amountInWordsText} className="bg-gray-100 italic text-xs sm:text-sm" />
            </FormControl>
          </FormItem>
        </div>

        {/* Grille Dates + Bénéficiaire - responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                <FormDescription className="text-xs">Optionnel</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Bénéficiaire/Émetteur */}
          <FormField
            control={form.control}
            name="partnerName"
            render={({ field }) => (
              <FormItem className="sm:col-span-2 md:col-span-1">
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
        </div>

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
                  className="resize-none sm:resize-y"
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