/**
 * @file components/banking/settings/transaction-type-form.tsx
 * @description Formulaire de création et d'édition pour un type de transaction.
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 1.0.1 - Fix typage react-hook-form v7.60
 */

"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { TransactionType, CreateTransactionTypeData } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  FormMessage 
} from '@/components/ui/form';
import { Loader2, ArrowUpDown } from 'lucide-react';

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Options pour le sens de la transaction.
 */
const DIRECTION_OPTIONS = [
  { value: 'DEBIT', label: 'Débit (sortie)', description: 'Diminue le solde' },
  { value: 'CREDIT', label: 'Crédit (entrée)', description: 'Augmente le solde' },
  { value: 'BOTH', label: 'Les deux', description: 'Peut être débit ou crédit' },
] as const;

/**
 * Options pour la catégorie de transaction.
 */
const CATEGORY_OPTIONS = [
  { value: 'BANK', label: 'Bancaire', description: 'Virements, prélèvements...' },
  { value: 'CASH', label: 'Espèces', description: 'Dépôts, retraits...' },
  { value: 'CHECK', label: 'Chèques', description: 'Émission, réception...' },
  { value: 'OTHER', label: 'Autre', description: 'Autres types' },
] as const;

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Schéma de validation Zod pour le formulaire de type de transaction.
 * Note: isActive n'est PAS optionnel pour éviter les erreurs de typage
 */
const transactionTypeFormSchema = z.object({
  code: z
    .string()
    .min(2, { message: "Le code doit contenir au moins 2 caractères." })
    .max(15, { message: "Le code ne peut pas dépasser 15 caractères." })
    .regex(/^[A-Za-z0-9_-]+$/, { 
      message: "Le code ne peut contenir que des lettres, chiffres, tirets et underscores." 
    })
    .transform(val => val.toUpperCase()),
  
  label: z
    .string()
    .min(2, { message: "Le libellé doit contenir au moins 2 caractères." })
    .max(100, { message: "Le libellé ne peut pas dépasser 100 caractères." }),
  
  direction: z.enum(['DEBIT', 'CREDIT', 'BOTH'], {
    required_error: "Veuillez sélectionner un sens.",
  }),
  
  category: z.enum(['BANK', 'CASH', 'CHECK', 'OTHER'], {
    required_error: "Veuillez sélectionner une catégorie.",
  }),
  
  isActive: z.boolean(),
});

/**
 * Type inféré du schéma de validation.
 */
type TransactionTypeFormData = z.infer<typeof transactionTypeFormSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface TransactionTypeFormProps {
  /** Données initiales (null pour création, objet pour édition) */
  initialData: TransactionType | null;
  /** Callback appelé lors de la sauvegarde */
  onSave: (data: CreateTransactionTypeData) => Promise<void>;
  /** Callback appelé lors de l'annulation */
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function TransactionTypeForm({ 
  initialData, 
  onSave, 
  onCancel 
}: TransactionTypeFormProps) {
  // État de soumission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Déterminer si on est en mode édition
  const isEditMode = initialData !== null;

  // Configuration du formulaire
  // Note: defaultValues doivent correspondre exactement au schéma Zod
  const form = useForm<TransactionTypeFormData>({
    resolver: zodResolver(transactionTypeFormSchema),
    defaultValues: {
      code: initialData?.code ?? '',
      label: initialData?.label ?? '',
      direction: initialData?.direction ?? 'BOTH',
      category: initialData?.category ?? 'BANK',
      isActive: initialData?.isActive ?? true,
    },
  });

  /**
   * Gère la soumission du formulaire.
   */
  const handleSubmit = async (data: TransactionTypeFormData) => {
    setIsSubmitting(true);
    
    try {
      const saveData: CreateTransactionTypeData = {
        code: data.code,
        label: data.label,
        direction: data.direction,
        category: data.category,
        isActive: data.isActive,
      };
      
      await onSave(saveData);
    } catch (error) {
      console.error("[TransactionTypeForm] Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* En-tête du formulaire */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ArrowUpDown className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditMode ? 'Modifier le type de transaction' : 'Nouveau type de transaction'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode 
                ? 'Modifiez les informations du type de transaction.'
                : 'Créez un nouveau type pour catégoriser vos opérations.'
              }
            </p>
          </div>
        </div>

        {/* Ligne 1: Code et Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Champ Code */}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: VIR, CHQ_EMI..." 
                    {...field} 
                    className="uppercase"
                    disabled={isEditMode}
                  />
                </FormControl>
                <FormDescription>
                  Code unique (2-15 caractères)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Champ Label */}
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Virement bancaire" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Nom affiché du type
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 2: Direction et Catégorie */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Champ Direction */}
          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sens *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le sens..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DIRECTION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-gray-500">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Impact sur le solde
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Champ Catégorie */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez la catégorie..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-gray-500">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Type d'opération
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Switch Actif */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Type actif</FormLabel>
                <FormDescription>
                  Un type inactif n'apparaîtra plus dans les listes de sélection lors de la saisie.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer les modifications' : 'Créer le type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}