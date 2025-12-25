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
import { Check, CreateCheckData, CheckType, BankAccount, Checkbook } from '@/types/banking';

// API
import { getBankAccounts } from '@/lib/api/banking';
import { getActiveCheckbooksForAccount, reserveNextCheckNumber } from '@/lib/api/checkbook';
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
import { Loader2, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const checkFormSchema = z.object({
  type: z.enum(['ISSUED', 'RECEIVED'], {
    required_error: "Veuillez sélectionner le type de chèque.",
  }),

  // Chéquier obligatoire pour les chèques émis
  checkbookId: z.string().optional(),

  checkNumber: z
    .string()
    .min(1, { message: "Le numéro de chèque est requis." })
    .max(30, { message: "Le numéro ne peut pas dépasser 30 caractères." }),

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

  partnerName: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),

  description: z
    .string()
    .max(200, { message: "La description ne peut pas dépasser 200 caractères." })
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Le chéquier est obligatoire pour les chèques émis
    if (data.type === 'ISSUED' && !data.checkbookId) {
      return false;
    }
    return true;
  },
  {
    message: "Veuillez sélectionner un chéquier pour un chèque émis.",
    path: ["checkbookId"],
  }
);

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
  const [checkbooks, setCheckbooks] = useState<Checkbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

  const isEditMode = initialData !== null;
  
  // FIX: Convertir en boolean explicite pour éviter l'erreur null → boolean
  const isProcessed = !!(initialData && !['PENDING'].includes(initialData.status));

  // Configuration du formulaire avec defaultValues explicites
  const form = useForm<CheckFormData>({
    resolver: zodResolver(checkFormSchema),
    defaultValues: {
      type: initialData?.checkType ?? preselectedType ?? 'RECEIVED',
      checkbookId: initialData?.checkbookId ?? '',
      checkNumber: initialData?.checkNumber ?? '',
      bankAccountId: initialData?.bankAccountId ?? preselectedAccountId ?? '',
      issueDate: initialData?.issueDate ?? new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate ?? '',
      amount: initialData?.amount ?? 0,
      partnerName: initialData?.partnerName ?? '',
      description: initialData?.description ?? '',
    },
  });

  const watchType = form.watch('type');
  const watchAmount = form.watch('amount');
  const amountInWordsText = amountToWords(watchAmount, selectedAccount?.currency || 'FCFA');

  // Charger les comptes et chéquiers
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const accountsData = await getBankAccounts();
        setAccounts(accountsData);

        const accountId = initialData?.bankAccountId ?? preselectedAccountId;
        if (accountId) {
          const account = accountsData.find(a => a.id === accountId);
          if (account) {
            setSelectedAccount(account);
            // Charger les chéquiers pour ce compte
            const checkbooksData = await getActiveCheckbooksForAccount(account.id);
            setCheckbooks(checkbooksData);
          }
        }
      } catch (error) {
        console.error("[CheckForm] Erreur chargement comptes:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [initialData, preselectedAccountId]);

  // Mettre à jour la devise et charger les chéquiers quand le compte change
  const handleAccountChange = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      form.setValue('checkbookId', '');
      form.setValue('checkNumber', '');
      // Charger les chéquiers pour ce compte
      try {
        const checkbooksData = await getActiveCheckbooksForAccount(account.id);
        setCheckbooks(checkbooksData);
      } catch (error) {
        console.error("[CheckForm] Erreur chargement chéquiers:", error);
        setCheckbooks([]);
      }
    }
  };
  
  const handleCheckbookChange = async (checkbookId: string) => {
    const checkbook = checkbooks.find(cb => cb.id === checkbookId);
    if (checkbook) {
      try {
        // Réserver le prochain numéro de chèque
        const checkNumber = await reserveNextCheckNumber(checkbookId);
        form.setValue('checkNumber', checkNumber);
      } catch (error) {
        // Fallback: utiliser le préfixe et le numéro courant
        form.setValue('checkNumber', `${checkbook.prefix}${checkbook.currentNumber}`);
      }
    }
  };

  /**
   * Gère la soumission du formulaire.
   */
  const handleSubmit = async (data: CheckFormData) => {
    // Validation côté client : vérifier le solde pour les chèques émis
    if (data.type === 'ISSUED' && selectedAccount) {
      const soldeActuel = selectedAccount.currentBalance || 0;
      if (soldeActuel < data.amount) {
        form.setError('amount', {
          type: 'manual',
          message: `Solde insuffisant. Solde actuel: ${new Intl.NumberFormat('fr-FR').format(soldeActuel)} ${selectedAccount.currency || 'XAF'}`,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const saveData: CreateCheckData = {
        checkType: data.type,
        checkbookId: data.checkbookId || undefined,
        checkNumber: data.checkNumber,
        bankAccountId: data.bankAccountId,
        issueDate: data.issueDate,
        dueDate: data.dueDate || undefined,
        amount: data.amount,
        partnerName: data.partnerName,
        description: data.description || undefined,
      };

      await onSave(saveData);
    } catch (error) {
      console.error("[CheckForm] Erreur sauvegarde:", error);
      // L'erreur sera gérée par le parent (page) avec un toast
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
              {/* Affichage du solde du compte sélectionné */}
              {selectedAccount && (
                <div className={`mt-2 p-3 rounded-lg border ${
                  watchType === 'ISSUED' && (selectedAccount.currentBalance || 0) < watchAmount
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Solde actuel :</span>
                    <span className="font-bold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: selectedAccount.currency || 'XAF',
                        minimumFractionDigits: selectedAccount.currency === 'XAF' ? 0 : 2,
                      }).format(selectedAccount.currentBalance || 0)}
                    </span>
                  </div>
                  {watchType === 'ISSUED' && watchAmount > 0 && (selectedAccount.currentBalance || 0) < watchAmount && (
                    <p className="text-xs mt-1 text-red-600">
                      ⚠️ Solde insuffisant pour émettre ce chèque
                    </p>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Numéro de chèque */}
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

        {/* Sélection du chéquier - obligatoire pour chèques émis */}
        {watchType === 'ISSUED' && (
          <FormField
            control={form.control}
            name="checkbookId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chéquier *</FormLabel>
                {checkbooks.length > 0 ? (
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleCheckbookChange(value);
                    }}
                    value={field.value}
                    disabled={isProcessed}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un chéquier..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {checkbooks.map(cb => (
                        <SelectItem key={cb.id} value={cb.id}>
                          {cb.id === 'default-erp-checkbook'
                            ? 'Chéquier ERP (numérotation automatique)'
                            : `${cb.prefix} (${cb.startNumber.toString().padStart(6, '0')} - ${cb.endNumber.toString().padStart(6, '0')}) - ${cb.availableChecks} chèques disponibles`
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                    {selectedAccount
                      ? "Aucun chéquier actif pour ce compte. Veuillez d'abord créer un chéquier."
                      : "Veuillez d'abord sélectionner un compte bancaire."
                    }
                  </div>
                )}
                <FormDescription>
                  Le chéquier détermine la série et le numéro du chèque.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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

        <FormItem>
            <FormLabel>Montant en lettres</FormLabel>
            <FormControl><Input readOnly value={amountInWordsText} className="bg-gray-100 italic" /></FormControl>
        </FormItem>

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
          {!isProcessed && (
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Enregistrer' : 'Créer le chèque'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}