/**
 * @file components/banking/bank-account-form.tsx
 * @description Formulaire de création et d'édition pour un compte bancaire.
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 2.0.0 - Incrément 1 : bankName remplacé par bankId (Select avec relation Bank)
 * 
 * CHANGEMENTS v2.0.0:
 * - Le champ `bankName` (Input texte) est remplacé par `bankId` (Select)
 * - Le Select est peuplé dynamiquement depuis l'API getBanks()
 * - Ajout de la devise XAF/XOF pour le contexte africain
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Types
import { BankAccount, Bank, AccountType, AccountSubType } from '@/types/banking';
import { Journal } from '@/types/accounting';

// API
import { getBanks, getAccountTypes } from '@/lib/api/banking';
import { getBankJournals } from '@/lib/api/accounting';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IbanInput } from '@/components/banking/iban-input';
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
import { Loader2, CreditCard, AlertCircle, Banknote, PiggyBank } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Schéma de validation Zod pour le formulaire de compte bancaire.
 *
 * @version 2.1.0 - Validation IBAN déléguée au composant IbanInput
 */
const bankAccountSchema = z.object({
  // Type de compte (CRITIQUE - nouveau champ)
  accountTypeId: z
    .string({ required_error: "Veuillez sélectionner un type de compte." })
    .min(1, { message: "Veuillez sélectionner un type de compte." }),

  // Sous-type de compte (optionnel, dépend du type)
  accountSubTypeId: z.string().optional(),

  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),

  bankId: z
    .string({ required_error: "Veuillez sélectionner une banque." })
    .min(1, { message: "Veuillez sélectionner une banque." }),

  accountNumber: z
    .string()
    .min(15, { message: "Le numéro de compte (IBAN) est requis." })
    .max(34, { message: "L'IBAN ne peut pas dépasser 34 caractères." })
    .transform(val => val.toUpperCase().replace(/\s/g, '')),

  journalId: z
    .string({ required_error: "Veuillez sélectionner un journal comptable." })
    .min(1, { message: "Veuillez sélectionner un journal comptable." }),

  currency: z.enum(['EUR', 'USD', 'XAF', 'XOF', 'GBP'], {
    required_error: "La devise est requise."
  }),

  // Gestion du découvert
  overdraftAllowed: z.boolean().default(false),
  overdraftLimit: z.number().min(0).optional(),

  // Solde initial
  initialBalance: z.number().default(0),
});

/**
 * Type inféré du schéma de validation.
 */
type BankAccountFormData = z.infer<typeof bankAccountSchema>;

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Options de devises disponibles.
 */
const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'USD', label: 'Dollar US (USD)', symbol: '$' },
  { value: 'XAF', label: 'Franc CFA CEMAC (XAF)', symbol: 'FCFA' },
  { value: 'XOF', label: 'Franc CFA UEMOA (XOF)', symbol: 'FCFA' },
] as const;

// =============================================================================
// PROPS
// =============================================================================

interface BankAccountFormProps {
  /** Données initiales (null pour création, objet pour édition) */
  initialData: BankAccount | null;
  /** Callback appelé lors de la sauvegarde */
  onSave: (data: BankAccountFormData) => Promise<void>;
  /** Callback appelé lors de l'annulation */
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
  const [journals, setJournals] = useState<Journal[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingJournals, setIsLoadingJournals] = useState(true);
  const [isLoadingAccountTypes, setIsLoadingAccountTypes] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Déterminer si on est en mode édition
  const isEditMode = initialData !== null;

  // ---------------------------------------------------------------------------
  // CONFIGURATION DU FORMULAIRE
  // ---------------------------------------------------------------------------

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountTypeId: initialData?.accountTypeId || undefined,
      accountSubTypeId: initialData?.accountSubTypeId || undefined,
      name: initialData?.name || '',
      bankId: initialData?.bankId || undefined,
      accountNumber: initialData?.accountNumber || '',
      journalId: initialData?.journalId || undefined,
      currency: initialData?.currency || 'XAF',
      overdraftAllowed: initialData?.overdraftAllowed || false,
      overdraftLimit: initialData?.overdraftLimit || 0,
      initialBalance: initialData?.initialBalance || 0,
    },
  });

  // Observer le type de compte sélectionné pour afficher les sous-types
  const watchAccountTypeId = form.watch('accountTypeId');
  const selectedType = accountTypes.find(t => t.id === watchAccountTypeId);
  const availableSubTypes = selectedType?.subTypes || [];
  const watchOverdraftAllowed = form.watch('overdraftAllowed');

  // ---------------------------------------------------------------------------
  // CHARGEMENT DES DONNÉES DE RÉFÉRENCE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function loadReferenceData() {
      setLoadingError(null);

      // Charger les banques
      try {
        setIsLoadingBanks(true);
        const banksData = await getBanks(true); // Uniquement les banques actives
        setBanks(banksData);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement banques:", error);
        setLoadingError("Impossible de charger la liste des banques.");
      } finally {
        setIsLoadingBanks(false);
      }

      // Charger les journaux comptables
      try {
        setIsLoadingJournals(true);
        const journalsData = await getBankJournals();
        setJournals(journalsData);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement journaux:", error);
        setLoadingError(prev =>
          prev
            ? `${prev} Impossible de charger les journaux comptables.`
            : "Impossible de charger les journaux comptables."
        );
      } finally {
        setIsLoadingJournals(false);
      }

      // Charger les types de compte
      try {
        setIsLoadingAccountTypes(true);
        const typesData = await getAccountTypes();
        setAccountTypes(typesData);
      } catch (error) {
        console.error("[BankAccountForm] Erreur chargement types de compte:", error);
        setLoadingError(prev =>
          prev
            ? `${prev} Impossible de charger les types de compte.`
            : "Impossible de charger les types de compte."
        );
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
    setIsSubmitting(true);
    
    try {
      await onSave(data);
    } catch (error) {
      console.error("[BankAccountForm] Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------

  // Afficher les erreurs de chargement
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
            Réessayer
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
        {/* En-tête du formulaire */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-green-100 rounded-lg">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditMode ? 'Modifier le compte bancaire' : 'Nouveau compte bancaire'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode
                ? 'Modifiez les informations du compte bancaire.'
                : 'Configurez un nouveau compte bancaire pour votre organisation.'
              }
            </p>
          </div>
        </div>

        {/* NOUVEAU: Type de compte */}
        <FormField
          control={form.control}
          name="accountTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de compte *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset le sous-type quand le type change
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
                          ? "Chargement des types..."
                          : accountTypes.length === 0
                            ? "Aucun type disponible"
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

        {/* NOUVEAU: Sous-type de compte (conditionnel) */}
        {availableSubTypes.length > 0 && (
          <FormField
            control={form.control}
            name="accountSubTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sous-type de compte</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un sous-type..." />
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
                  Précise la catégorie du compte (Interne, Fournisseur, Client, Employé...).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Champ Nom du Compte */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du compte *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Compte Courant Principal, Compte Épargne..."
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
        
        {/* NOUVEAU: Champ Banque (Select au lieu de Input) */}
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
                          ? "Chargement des banques..." 
                          : banks.length === 0 
                            ? "Aucune banque disponible"
                            : "Sélectionnez un établissement bancaire..."
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {banks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">
                          {bank.code}
                        </span>
                        <span>{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {banks.length === 0 && !isLoadingBanks ? (
                  <span className="text-amber-600">
                    Aucune banque configurée. 
                    <a href="/banking/banks" className="underline ml-1">
                      Créez-en une d'abord.
                    </a>
                  </span>
                ) : (
                  "L'établissement bancaire auprès duquel ce compte est ouvert."
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Champ Numéro de Compte (IBAN) avec validation temps réel */}
        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <IbanInput
                  value={field.value || ""}
                  onChange={(value, isValid) => {
                    field.onChange(value);
                    if (!isValid && value.length >= 15) {
                      form.setError("accountNumber", { message: "IBAN invalide" });
                    } else {
                      form.clearErrors("accountNumber");
                    }
                  }}
                  label="Numéro de compte (IBAN)"
                  required
                  placeholder="CM21 1000 2000 0000 0000 0000 30"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Le numéro IBAN complet du compte bancaire (format Cameroun : 27 caractères).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Champ Journal Comptable */}
        <FormField
          control={form.control}
          name="journalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journal Comptable *</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value} 
                disabled={isLoadingJournals || journals.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        isLoadingJournals 
                          ? "Chargement des journaux..." 
                          : journals.length === 0 
                            ? "Aucun journal disponible"
                            : "Sélectionnez le journal associé..."
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {journals.map(journal => (
                    <SelectItem key={journal.id} value={journal.id}>
                      {journal.name} ({journal.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Le journal comptable où seront enregistrées les écritures.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ Devise */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Devise *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une devise..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {option.symbol}
                        </span>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                La devise utilisée pour ce compte bancaire.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* NOUVEAU: Solde initial */}
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
                    {form.watch('currency') || 'XAF'}
                  </span>
                </div>
              </FormControl>
              <FormDescription>
                Solde du compte à la date d'ouverture.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* NOUVEAU: Section Découvert (conditionnelle si le type autorise) */}
        {selectedType?.decouvertAutorise && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium">Gestion du découvert</h4>

            <FormField
              control={form.control}
              name="overdraftAllowed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Autoriser le découvert</FormLabel>
                    <FormDescription>
                      Permet au solde de devenir négatif jusqu'à une limite définie.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchOverdraftAllowed && (
              <FormField
                control={form.control}
                name="overdraftLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de découvert *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          placeholder="Ex: 10000000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {form.watch('currency') || 'XAF'}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Montant maximum autorisé en négatif.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
        </div>
        {/* Fin zone scrollable */}

        {/* Pied de page avec boutons d'action - toujours visible */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0 bg-background">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || banks.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer les modifications' : 'Créer le compte'}
          </Button>
        </div>
      </form>
    </Form>
  );
}