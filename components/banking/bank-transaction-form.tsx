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
import { ThirdPartySelector } from '@/components/banking/third-party-selector';
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
  partnerId: z.string().uuid().optional(),

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
      partnerId: initialData?.partnerId ?? undefined,
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
      if (selectedCheck.partnerId) form.setValue('partnerId', selectedCheck.partnerId);
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
        partnerId: data.partnerId || undefined,
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

  const watchDirection = form.watch('direction');
  const currency = selectedAccount?.currency || 'FCFA';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 w-full min-w-0">

        {/* En-tête */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base">
              {isEditMode ? 'Modifier la transaction' : 'Nouvelle transaction'}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {isEditMode
                ? 'Modifiez les détails de la transaction bancaire.'
                : 'Saisissez les détails de la nouvelle opération bancaire.'}
            </p>
          </div>
        </div>

        {/* Alerte si validée */}
        {isValidated && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <span>Cette transaction est validée et ne peut plus être modifiée. Seule l'annulation est possible.</span>
          </div>
        )}

        {/* ── SECTION 1 : Références ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Références</p>
          <div className="grid grid-cols-3 gap-3">
            {/* Nos Réf. */}
            <FormItem className="min-w-0">
              <FormLabel className="text-xs">Nos Réf.</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={initialData?.reference || 'Auto-générée'}
                  className="bg-gray-100 font-medium text-xs h-9 truncate"
                />
              </FormControl>
              <FormDescription className="text-[10px]">Réf. interne</FormDescription>
            </FormItem>

            {/* Vos Réf. */}
            <FormField
              control={form.control}
              name="externalReference"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Vos Réf.</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="N° document..."
                      {...field}
                      disabled={isValidated}
                      className="text-xs h-9"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">Réf. externe (optionnel)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date système */}
            <FormItem className="min-w-0">
              <FormLabel className="text-xs">Date système</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={
                    initialData?.systemDate
                      ? new Date(initialData.systemDate).toLocaleDateString('fr-FR')
                      : new Date().toLocaleDateString('fr-FR')
                  }
                  className="bg-gray-100 text-xs h-9"
                />
              </FormControl>
              <FormDescription className="text-[10px]">Enregistrement</FormDescription>
            </FormItem>
          </div>
        </div>

        {/* ── SECTION 2 : Classification ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Classification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="transactionTypeId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Type de transaction *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isValidated}>
                    <FormControl>
                      <SelectTrigger className="w-full text-xs h-9">
                        <SelectValue placeholder="Sélectionnez un type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredTypes.map(type => (
                        <SelectItem key={type.id} value={type.id} className="text-xs">
                          {type.label} ({type.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Compte bancaire *</FormLabel>
                  <Select
                    onValueChange={(value) => { field.onChange(value); handleAccountChange(value); }}
                    value={field.value}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full text-xs h-9">
                        <SelectValue placeholder="Sélectionnez un compte..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id} className="text-xs">
                          {account.name} — {account.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── SECTION 3 : Sens de l'opération ── */}
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Sens de l'opération *
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-3 mt-1"
                  disabled={isValidated}
                >
                  <label
                    htmlFor="debit"
                    className={`flex items-center gap-2 flex-1 cursor-pointer rounded-lg border-2 px-3 py-2.5 transition-colors ${
                      field.value === 'DEBIT'
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value="DEBIT" id="debit" className="shrink-0" />
                    <ArrowUpRight className={`h-4 w-4 shrink-0 ${field.value === 'DEBIT' ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">
                      Débit <span className="text-xs text-gray-500 font-normal">(sortie)</span>
                    </span>
                  </label>

                  <label
                    htmlFor="credit"
                    className={`flex items-center gap-2 flex-1 cursor-pointer rounded-lg border-2 px-3 py-2.5 transition-colors ${
                      field.value === 'CREDIT'
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value="CREDIT" id="credit" className="shrink-0" />
                    <ArrowDownLeft className={`h-4 w-4 shrink-0 ${field.value === 'CREDIT' ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">
                      Crédit <span className="text-xs text-gray-500 font-normal">(entrée)</span>
                    </span>
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── SECTION 4 : Règlement ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Règlement</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Moyen de paiement
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isValidated}>
                    <FormControl>
                      <SelectTrigger className="w-full text-xs h-9">
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER" className="text-xs">Virement bancaire</SelectItem>
                      <SelectItem value="CHECK" className="text-xs">Chèque</SelectItem>
                      <SelectItem value="CASH" className="text-xs">Espèces</SelectItem>
                      <SelectItem value="MOBILE_MONEY" className="text-xs">Mobile Money</SelectItem>
                      <SelectItem value="OTHER" className="text-xs">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px]">Mode de règlement (optionnel)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditMode && (
              <FormField
                control={form.control}
                name="checkId"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel className="text-xs">Lier à un chèque</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!watchBankAccountId || isLoadingChecks}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs h-9">
                          <SelectValue placeholder={
                            isLoadingChecks ? "Chargement..."
                              : !watchBankAccountId ? "Choisir un compte d'abord"
                              : "Aucun (optionnel)"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableChecks.length > 0
                          ? availableChecks.map(check => (
                            <SelectItem key={check.id} value={check.id} className="text-xs">
                              N°{check.checkNumber} · {check.partnerName} · {check.amount.toLocaleString('fr-FR')} {currency}
                            </SelectItem>
                          ))
                          : (
                            <SelectItem value="__none__" disabled className="text-xs">
                              {watchBankAccountId ? "Aucun chèque disponible" : "Sélectionnez un compte"}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[10px]">Pré-remplit et lie automatiquement</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* ── SECTION 5 : Montant ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Montant</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Montant *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={isValidated}
                        className="pr-14 text-sm h-9 font-medium"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">
                        {currency}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem className="min-w-0">
              <FormLabel className="text-xs">Montant en lettres</FormLabel>
              <FormControl>
                <Input
                  readOnly
                  value={amountInWordsText}
                  className="bg-gray-50 italic text-xs h-9 text-gray-600"
                />
              </FormControl>
            </FormItem>
          </div>
        </div>

        {/* ── SECTION 6 : Dates ── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Dates</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Date d'opération *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isEditMode} className="text-xs h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valueDate"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel className="text-xs">Date de valeur</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isValidated} className="text-xs h-9" />
                  </FormControl>
                  <FormDescription className="text-[10px]">Optionnel</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── SECTION 7 : Bénéficiaire / Émetteur ── */}
        <FormField
          control={form.control}
          name="partnerName"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel className="text-xs">
                {watchDirection === 'DEBIT' ? 'Bénéficiaire' : 'Émetteur'}
              </FormLabel>
              <FormControl>
                <ThirdPartySelector
                  value={form.watch('partnerId')}
                  displayValue={field.value}
                  role={watchDirection === 'DEBIT' ? 'SUPPLIER' : 'CUSTOMER'}
                  placeholder={watchDirection === 'DEBIT' ? 'Sélectionner un fournisseur' : 'Sélectionner un client'}
                  disabled={isValidated}
                  onSelect={(tp) => {
                    if (tp) {
                      form.setValue('partnerName', tp.displayName, { shouldValidate: true });
                      form.setValue('partnerId', tp.id);
                    } else {
                      form.setValue('partnerName', '');
                      form.setValue('partnerId', undefined);
                    }
                  }}
                />
              </FormControl>
              <FormDescription className="text-[10px]">
                {watchDirection === 'DEBIT' ? 'Fournisseur ou tiers destinataire' : 'Client ou tiers émetteur'} (optionnel)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── SECTION 8 : Description ── */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="min-w-0">
              <FormLabel className="text-xs">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Description de l'opération..."
                  rows={2}
                  className="resize-none text-xs"
                  {...field}
                  disabled={isValidated}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Boutons ── */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
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
              {isEditMode ? 'Enregistrer les modifications' : 'Créer la transaction'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}