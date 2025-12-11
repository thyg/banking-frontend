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
import { BankAccount, Bank } from '@/types/banking';
import { Journal } from '@/types/accounting';

// API
import { getBanks } from '@/lib/api/banking';
import { getBankJournals } from '@/lib/api/accounting';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Schéma de validation Zod pour le formulaire de compte bancaire.
 * 
 * @version 2.0.0 - bankName remplacé par bankId
 */
const bankAccountSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),
  
  // NOUVEAU: bankId remplace bankName
  bankId: z
    .string({ required_error: "Veuillez sélectionner une banque." })
    .min(1, { message: "Veuillez sélectionner une banque." }),
  
  accountNumber: z
    .string()
    .min(10, { message: "Le numéro de compte (IBAN) semble invalide." })
    .max(34, { message: "Le numéro IBAN ne peut pas dépasser 34 caractères." })
    .trim(),
  
  journalId: z
    .string({ required_error: "Veuillez sélectionner un journal comptable." })
    .min(1, { message: "Veuillez sélectionner un journal comptable." }),
  
  // AMÉLIORÉ: Ajout des devises XAF et XOF
  currency: z.enum(['EUR', 'USD', 'XAF', 'XOF', 'GBP'], { 
    required_error: "La devise est requise." 
  }),
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
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingJournals, setIsLoadingJournals] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Déterminer si on est en mode édition
  const isEditMode = initialData !== null;

  // ---------------------------------------------------------------------------
  // CONFIGURATION DU FORMULAIRE
  // ---------------------------------------------------------------------------

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: initialData?.name || '',
      bankId: initialData?.bankId || undefined,
      accountNumber: initialData?.accountNumber || '',
      journalId: initialData?.journalId || undefined,
      currency: initialData?.currency || 'EUR',
    },
  });

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        
        {/* Champ Numéro de Compte (IBAN) */}
        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de compte (IBAN) *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="FR76 3000 1007 9412 3456 7890 185" 
                  {...field} 
                  className="font-mono"
                />
              </FormControl>
              <FormDescription>
                Le numéro IBAN complet du compte bancaire.
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

        {/* Pied de page avec boutons d'action */}
        <div className="flex justify-end gap-3 pt-4 border-t">
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