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
  
  category: z.enum(['BANK', 'CASH', 'CHECK', 'OTHER'], {
    required_error: "Veuillez sélectionner une catégorie.",
  }),

  inbound: z.boolean(),

  description: z.string().max(200, { message: "La description ne peut pas dépasser 200 caractères." }).optional(),

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
      category: initialData?.category ?? 'BANK',
      inbound: initialData?.inbound ?? true,
      description: initialData?.description ?? '',
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
        category: data.category,
        inbound: data.inbound,
        description: data.description,
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
        {/* En-tête du formulaire - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-purple-100 rounded-lg w-fit">
            <ArrowUpDown className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              {isEditMode ? 'Modifier le type' : 'Nouveau type de transaction'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {isEditMode
                ? 'Modifiez les informations du type.'
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

        {/* Ligne 2: Catégorie et Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          
          {/* Champ Sens (Entrée/Sortie) */}
          <FormField
            control={form.control}
            name="inbound"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sens *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le sens..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Entrée (crédit)</SelectItem>
                    <SelectItem value="false">Sortie (débit)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Sens du mouvement de trésorerie
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Ligne 3: Description */}
        <div className="grid grid-cols-1 gap-4">
          {/* Champ Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Courte description (optionnel)" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Information additionnelle
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Switch Actif - responsive */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5 min-w-0 flex-1">
                <FormLabel className="text-sm sm:text-base">Type actif</FormLabel>
                <FormDescription className="text-xs sm:text-sm">
                  Un type inactif n'apparaîtra plus dans les listes de sélection.
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

        {/* Pied de page avec boutons d'action - responsive */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
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
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer' : 'Créer le type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}