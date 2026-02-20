/**
 * @file components/banking/bank-account-form.tsx
 * @description Formulaire de création et d'édition pour un compte bancaire.
 *
 * @version 3.0.0 - Réorganisation pour UX intuitive
 *
 * FLUX UTILISATEUR:
 * 1. Sélection de la banque (détermine le type de saisie)
 * 2. Type de compte + sous-type
 * 3. Nom du compte
 * 4. Informations bancaires:
 *    - Banque traditionnelle (avec code banque) → Section IBAN
 *    - Autres (Mobile Money, etc.) → Connecteur dynamique
 * 5. Journal comptable, Devise, Solde initial
 * 6. Options de découvert (si autorisé par le type)
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Types
import { BankAccount, Bank, AccountType, AccountSubType, AccountConnectorType, AccountConnectorField } from '@/types/banking';

// API
import { getBanks, getAccountTypes, getConnectorTypesByCategory, getConnectorTypeWithFields } from '@/lib/api/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DynamicConnectorFields, validateConnectorFields } from '@/components/banking/dynamic-connector-fields';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, CreditCard, AlertCircle, Banknote, PiggyBank, Building2, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

// Utilitaires
import { amountToWords } from '@/lib/utils/number-to-words';
import { generateCameroonIban } from '@/lib/utils/iban-generator';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const bankAccountSchema = z.object({
  // 1. Banque (première sélection)
  bankId: z
    .string({ required_error: "Veuillez sélectionner une banque." })
    .min(1, { message: "Veuillez sélectionner une banque." }),

  // 2. Type de compte
  accountTypeId: z
    .string({ required_error: "Veuillez sélectionner un type de compte." })
    .min(1, { message: "Veuillez sélectionner un type de compte." }),

  accountSubTypeId: z.string().optional(),

  // 3. Nom du compte
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),

  // 4a. Champs IBAN (pour banques traditionnelles)
  branchCode: z
    .string()
    .regex(/^[0-9]{5}$/, { message: "Le code guichet doit contenir exactement 5 chiffres." })
    .optional()
    .or(z.literal('')),

  accountNumber: z
    .string()
    .regex(/^[A-Za-z0-9]{11}$/, { message: "Le numéro de compte doit contenir exactement 11 caractères." })
    .optional()
    .or(z.literal('')),

  generatedIban: z.string().optional(),

  // 4b. Connecteur dynamique (pour autres types)
  connectorTypeId: z.string().optional(),

  // 5. Informations financières
  // journalId: optionnel pour l'instant (fonctionnalité comptable non activée)
  journalId: z.string().optional(),

  currency: z.enum(['EUR', 'USD', 'XAF', 'XOF', 'GBP'], {
    required_error: "La devise est requise."
  }),

  initialBalance: z.number(),

  // 6. Découvert
  overdraftAllowed: z.boolean(),
  overdraftLimit: z.number().min(0).optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

// =============================================================================
// CONSTANTES
// =============================================================================

const CURRENCY_OPTIONS = [
  { value: 'XAF', label: 'Franc CFA CEMAC (XAF)', symbol: 'FCFA' },
  { value: 'XOF', label: 'Franc CFA UEMOA (XOF)', symbol: 'FCFA' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'USD', label: 'Dollar US (USD)', symbol: '$' },
] as const;

// =============================================================================
// PROPS
// =============================================================================

interface BankAccountFormProps {
  initialData: BankAccount | null;
  onSave: (data: BankAccountFormData) => Promise<void>;
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function BankAccountForm({
  initialData,
  onSave,
  onCancel
}: BankAccountFormProps) {
  // ---------------------------------------------------------------------------
  // ÉTAT
  // ---------------------------------------------------------------------------

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingAccountTypes, setIsLoadingAccountTypes] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // État pour les connecteurs dynamiques
  const [connectorTypes, setConnectorTypes] = useState<AccountConnectorType[]>([]);
  const [connectorFields, setConnectorFields] = useState<AccountConnectorField[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [detailsValues, setDetailsValues] = useState<Record<string, string>>(
    (initialData?.details as Record<string, string>) || {}
  );
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});

  const isEditMode = initialData !== null;

  // ---------------------------------------------------------------------------
  // CONFIGURATION DU FORMULAIRE
  // ---------------------------------------------------------------------------

  const mapCurrency = (currency?: string): 'EUR' | 'USD' | 'XAF' | 'XOF' | 'GBP' => {
    const validCurrencies = ['EUR', 'USD', 'XAF', 'XOF', 'GBP'] as const;
    if (currency && validCurrencies.includes(currency as any)) {
      return currency as 'EUR' | 'USD' | 'XAF' | 'XOF' | 'GBP';
    }
    return 'XAF';
  };

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankId: initialData?.bankId ?? '',
      accountTypeId: initialData?.accountTypeId ?? '',
      accountSubTypeId: initialData?.accountSubTypeId ?? '',
      name: initialData?.name ?? '',
      branchCode: initialData?.branchCode ?? '',
      accountNumber: initialData?.accountNumber ?? '',
      generatedIban: initialData?.generatedIban ?? '',
      connectorTypeId: initialData?.connectorTypeId ?? '',
      journalId: initialData?.journalId ?? '',
      currency: mapCurrency(initialData?.currency),
      overdraftAllowed: initialData?.overdraftAllowed ?? false,
      overdraftLimit: initialData?.overdraftLimit ?? 0,
      initialBalance: initialData?.initialBalance ?? 0,
    },
  });

  // ---------------------------------------------------------------------------
  // WATCHERS
  // ---------------------------------------------------------------------------

  const watchBankId = form.watch('bankId');
  const watchAccountTypeId = form.watch('accountTypeId');
  const watchConnectorTypeId = form.watch('connectorTypeId');
  const watchOverdraftAllowed = form.watch('overdraftAllowed');
  const watchInitialBalance = form.watch('initialBalance');
  const watchCurrency = form.watch('currency');
  const watchBranchCode = form.watch('branchCode');
  const watchAccountNumber = form.watch('accountNumber');

  // Données dérivées
  const selectedBank = banks.find(b => b.id === watchBankId);
  const selectedType = accountTypes.find(t => t.id === watchAccountTypeId);
  const availableSubTypes = selectedType?.subTypes || [];

  // Détermine si c'est une banque traditionnelle (avec code banque pour IBAN)
  const isBanqueTraditionnelle = selectedBank?.bankCode && selectedBank.bankCode.length === 5;

  // Montant en lettres
  const initialBalanceInWords = amountToWords(watchInitialBalance || 0, watchCurrency === 'EUR' ? 'euro' : 'franc CFA');

  // ---------------------------------------------------------------------------
  // EFFETS
  // ---------------------------------------------------------------------------

  // Générer l'IBAN automatiquement
  useEffect(() => {
    if (isBanqueTraditionnelle && watchBranchCode && watchAccountNumber) {
      const result = generateCameroonIban(
        selectedBank!.bankCode!,
        watchBranchCode,
        watchAccountNumber
      );
      if (result.success && result.iban) {
        form.setValue('generatedIban', result.iban);
      } else {
        form.setValue('generatedIban', '');
      }
    } else {
      form.setValue('generatedIban', '');
    }
  }, [isBanqueTraditionnelle, selectedBank?.bankCode, watchBranchCode, watchAccountNumber, form]);

  // Charger les connecteurs quand la banque change (seulement si pas banque traditionnelle)
  useEffect(() => {
    if (!watchBankId || isBanqueTraditionnelle) {
      setConnectorTypes([]);
      setConnectorFields([]);
      return;
    }

    const bank = banks.find(b => b.id === watchBankId);
    if (!bank?.bankCategoryId) {
      setConnectorTypes([]);
      setConnectorFields([]);
      return;
    }

    async function loadConnectors() {
      setIsLoadingConnectors(true);
      try {
        const types = await getConnectorTypesByCategory(bank!.bankCategoryId!);
        setConnectorTypes(types);

        if (types.length === 1) {
          form.setValue('connectorTypeId', types[0].id);
        } else if (!types.find(t => t.id === form.getValues('connectorTypeId'))) {
          form.setValue('connectorTypeId', undefined);
          setConnectorFields([]);
        }
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement connecteurs:", error);
        setConnectorTypes([]);
      } finally {
        setIsLoadingConnectors(false);
      }
    }

    loadConnectors();
  }, [watchBankId, banks, isBanqueTraditionnelle, form]);

  // Charger les champs du connecteur
  useEffect(() => {
    if (!watchConnectorTypeId || isBanqueTraditionnelle) {
      setConnectorFields([]);
      return;
    }

    async function loadFields() {
      try {
        const response = await getConnectorTypeWithFields(watchConnectorTypeId!);
        setConnectorFields(response.fields);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement champs connecteur:", error);
        setConnectorFields([]);
      }
    }

    loadFields();
  }, [watchConnectorTypeId, isBanqueTraditionnelle]);

  // Reset quand la banque change
  useEffect(() => {
    if (watchBankId) {
      form.setValue('connectorTypeId', undefined);
      form.setValue('branchCode', '');
      form.setValue('accountNumber', '');
      form.setValue('generatedIban', '');
      setDetailsValues({});
      setDetailsErrors({});
    }
  }, [watchBankId]);

  // Charger les données de référence
  useEffect(() => {
    async function loadReferenceData() {
      setLoadingError(null);

      try {
        setIsLoadingBanks(true);
        const banksData = await getBanks(true);
        setBanks(banksData);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement banques:", error);
        setLoadingError("Impossible de charger la liste des banques.");
      } finally {
        setIsLoadingBanks(false);
      }

      try {
        setIsLoadingAccountTypes(true);
        const typesData = await getAccountTypes();
        setAccountTypes(typesData);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement types de compte:", error);
      } finally {
        setIsLoadingAccountTypes(false);
      }
    }

    loadReferenceData();
  }, []);

  // ---------------------------------------------------------------------------
  // SOUMISSION
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: BankAccountFormData) => {
    // Valider les champs dynamiques seulement si pas banque traditionnelle
    if (!isBanqueTraditionnelle && connectorFields.length > 0) {
      const fieldErrors = validateConnectorFields(connectorFields, detailsValues);
      if (Object.keys(fieldErrors).length > 0) {
        setDetailsErrors(fieldErrors);
        return;
      }
    }
    setDetailsErrors({});
    setIsSubmitting(true);

    try {
      // Préparer les données sans les champs optionnels vides
      const enrichedData: Record<string, any> = {
        bankId: data.bankId,
        name: data.name,
        currency: data.currency,
        initialBalance: data.initialBalance || 0,
        isActive: true,
        overdraftAllowed: data.overdraftAllowed || false,
        overdraftLimit: data.overdraftAllowed ? (data.overdraftLimit || 0) : undefined,
      };

      // Ajouter les champs optionnels seulement s'ils ont des valeurs
      if (data.accountTypeId) {
        enrichedData.accountTypeId = data.accountTypeId;
      }
      if (data.accountSubTypeId) {
        enrichedData.accountSubTypeId = data.accountSubTypeId;
      }

      // Section IBAN (banque traditionnelle)
      if (isBanqueTraditionnelle) {
        if (data.branchCode && data.branchCode.length === 5) {
          enrichedData.branchCode = data.branchCode;
        }
        if (data.accountNumber && data.accountNumber.length === 11) {
          enrichedData.accountNumber = data.accountNumber;
        }
        if (data.generatedIban) {
          enrichedData.generatedIban = data.generatedIban;
        }
      } else {
        // Section Connecteur (Mobile Money, etc.)
        if (data.connectorTypeId) {
          enrichedData.connectorTypeId = data.connectorTypeId;
        }
        if (connectorFields.length > 0 && Object.keys(detailsValues).length > 0) {
          enrichedData.details = detailsValues;
        }
      }

      console.log("[BankAccountForm] Données envoyées:", enrichedData);
      await onSave(enrichedData as any);
    } catch (error) {
      console.error("[BankAccountForm] Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  if (loadingError && banks.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {loadingError}
          <Button
            variant="link"
            className="p-0 h-auto ml-2"
            onClick={() => window.location.reload()}
          >
            Rés
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Zone scrollable */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">

          {/* En-tête - responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
            <div className="p-2 bg-green-100 rounded-lg w-fit">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                {isEditMode ? 'Modifier le compte bancaire' : 'Nouveau compte bancaire'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {isEditMode
                  ? 'Modifiez les informations du compte.'
                  : 'Configurez un nouveau compte pour votre organisation.'
                }
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* ÉTAPE 1 : SÉLECTION DE LA BANQUE                                */}
          {/* ================================================================ */}

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">1</span>
              Établissement bancaire
            </h4>

            <FormField
              control={form.control}
              name="bankId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banque *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoadingBanks || banks.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingBanks
                              ? "Chargement..."
                              : banks.length === 0
                                ? "Aucune banque disponible"
                                : "Sélectionnez l'établissement bancaire..."
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.id}>
                          <div className="flex items-center gap-2">
                            {bank.bankCode ? (
                              <Building2 className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Smartphone className="h-4 w-4 text-orange-500" />
                            )}
                            <span className="font-mono text-xs text-gray-500">{bank.code}</span>
                            <span>{bank.name}</span>
                            {bank.bankCode && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Code: {bank.bankCode}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {banks.length === 0 && !isLoadingBanks ? (
                      <span className="text-amber-600">
                        Aucune banque configurée.
                        <a href="/banking/banks" className="underline ml-1">Créez-en une d'abord.</a>
                      </span>
                    ) : selectedBank ? (
                      isBanqueTraditionnelle
                        ? "Banque traditionnelle - Génération IBAN automatique disponible"
                        : "Compte spécialisé (Mobile Money, Microfinance...)"
                    ) : (
                      "Choisissez d'abord la banque où le compte sera ouvert"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ================================================================ */}
          {/* ÉTAPE 2 : TYPE DE COMPTE (visible après sélection banque)      */}
          {/* ================================================================ */}

          {watchBankId && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">2</span>
                Type de compte
              </h4>

              <FormField
                control={form.control}
                name="accountTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de compte *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('accountSubTypeId', undefined);
                      }}
                      defaultValue={field.value}
                      disabled={isLoadingAccountTypes || accountTypes.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingAccountTypes
                                ? "Chargement..."
                                : "Sélectionnez le type de compte..."
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              {type.code === 'CHEQUE' && <CreditCard className="h-4 w-4" />}
                              {type.code === 'ESPECES' && <Banknote className="h-4 w-4" />}
                              {type.code === 'EPARGNE' && <PiggyBank className="h-4 w-4" />}
                              <span>{type.libelle}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Détermine les opérations autorisées sur ce compte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sous-type (si disponible) */}
              {availableSubTypes.length > 0 && (
                <FormField
                  control={form.control}
                  name="accountSubTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une catégorie..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubTypes.map(subType => (
                            <SelectItem key={subType.id} value={subType.id}>
                              {subType.libelle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Précise la catégorie du compte (optionnel).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 3 : NOM DU COMPTE                                         */}
          {/* ================================================================ */}

          {watchBankId && watchAccountTypeId && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">3</span>
                Identification
              </h4>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du compte *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Compte Courant Principal, Caisse Agence..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Un nom explicite pour identifier facilement ce compte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 4A : INFORMATIONS IBAN (Banque traditionnelle)            */}
          {/* ================================================================ */}

          {watchBankId && watchAccountTypeId && isBanqueTraditionnelle && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">4</span>
                Coordonnées bancaires
              </h4>

              <div className="p-4 border rounded-lg bg-blue-50/50 space-y-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-sm">Génération IBAN automatique</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="branchCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code Guichet *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="00001"
                            maxLength={5}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Code agence (5 chiffres)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de Compte *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12345678901"
                            maxLength={11}
                            {...field}
                            className="uppercase font-mono"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormDescription>
                          11 caractères
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="generatedIban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input
                          readOnly
                          {...field}
                          value={field.value ? field.value.replace(/(.{4})/g, '$1 ').trim() : ''}
                          className="bg-white font-mono text-green-700 font-semibold text-center"
                          placeholder="Remplissez les champs ci-dessus..."
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value
                          ? "Calculé automatiquement avec clé de contrôle"
                          : "L'IBAN sera généré automatiquement"}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 4B : CONNECTEUR DYNAMIQUE (Mobile Money, etc.)            */}
          {/* ================================================================ */}

          {watchBankId && watchAccountTypeId && !isBanqueTraditionnelle && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">4</span>
                Informations du compte
              </h4>

              <div className="p-4 border rounded-lg bg-orange-50/50 space-y-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-medium text-sm">Compte spécialisé</span>
                </div>

                {isLoadingConnectors ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement de la configuration...
                  </div>
                ) : connectorTypes.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Aucune configuration spécifique requise pour ce type de compte.
                  </p>
                ) : (
                  <>
                    {connectorTypes.length > 1 && (
                      <FormField
                        control={form.control}
                        name="connectorTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de compte</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                setDetailsValues({});
                                setDetailsErrors({});
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {connectorTypes.map(ct => (
                                  <SelectItem key={ct.id} value={ct.id}>
                                    {ct.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {connectorFields.length > 0 && (
                      <DynamicConnectorFields
                        fields={connectorFields}
                        values={detailsValues}
                        onChange={setDetailsValues}
                        errors={detailsErrors}
                        disabled={isSubmitting}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 5 : INFORMATIONS FINANCIÈRES                              */}
          {/* ================================================================ */}

          {watchBankId && watchAccountTypeId && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">5</span>
                Configuration financière
              </h4>

              {/* Grille responsive Devise + Solde initial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Devise */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionnez..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                  {option.symbol}
                                </span>
                                <span className="hidden sm:inline">{option.label}</span>
                                <span className="sm:hidden">{option.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Solde initial */}
                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solde initial</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {watchCurrency || 'XAF'}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Solde à la date d'ouverture.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Montant en lettres */}
              {watchInitialBalance > 0 && (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Montant en lettres</FormLabel>
                  <FormControl>
                    <Input
                      readOnly
                      value={initialBalanceInWords}
                      className="bg-muted italic text-muted-foreground text-xs sm:text-sm"
                    />
                  </FormControl>
                </FormItem>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* ÉTAPE 6 : DÉCOUVERT (si autorisé)                               */}
          {/* ================================================================ */}

          {watchBankId && watchAccountTypeId && selectedType?.decouvertAutorise && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">6</span>
                Gestion du découvert
              </h4>

              <div className="p-3 sm:p-4 border-2 border-amber-200 rounded-lg bg-amber-50/50 space-y-4">
                <FormField
                  control={form.control}
                  name="overdraftAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border-2 border-gray-300 p-3 sm:p-4 shadow-sm bg-white">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <FormLabel className="text-sm sm:text-base font-medium">Autoriser le découvert</FormLabel>
                        <FormDescription className="text-xs sm:text-sm">
                          Permet au solde de devenir négatif jusqu'à une limite définie.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${field.value ? 'bg-green-500' : 'bg-gray-300'}`}
                          onClick={() => field.onChange(!field.value)}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${field.value ? 'translate-x-8' : 'translate-x-1'}`} />
                          <span className={`absolute text-[10px] font-bold ${field.value ? 'left-1.5 text-white' : 'right-1.5 text-gray-500'}`}>
                            {field.value ? 'OUI' : 'NON'}
                          </span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchOverdraftAllowed && (
                  <>
                    <FormField
                      control={form.control}
                      name="overdraftLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Limite de découvert *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                placeholder="Ex: 10000000"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="pr-16 border-2"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs sm:text-sm font-medium">
                                {watchCurrency || 'XAF'}
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Montant maximum autorisé en négatif.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Montant du découvert en lettres */}
                    {(form.watch('overdraftLimit') || 0) > 0 && (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Limite en lettres</FormLabel>
                        <FormControl>
                          <Input
                            readOnly
                            value={amountToWords(form.watch('overdraftLimit') || 0, watchCurrency === 'EUR' ? 'euro' : 'franc CFA')}
                            className="bg-amber-100/50 italic text-amber-800 text-xs sm:text-sm border-amber-200"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
        {/* Fin zone scrollable */}

        {/* Boutons d'action - responsives */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || banks.length === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer' : 'Créer le compte'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
