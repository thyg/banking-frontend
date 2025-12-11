/**
 * @file components/banking/settings/bank-form.tsx
 * @description Formulaire de création et d'édition pour une banque.
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
import { Bank, CreateBankData } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Loader2, Building2 } from 'lucide-react';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

/**
 * Schéma de validation Zod pour le formulaire de banque.
 */
const bankFormSchema = z.object({
  code: z
    .string()
    .min(2, { message: "Le code doit contenir au moins 2 caractères." })
    .max(10, { message: "Le code ne peut pas dépasser 10 caractères." })
    .regex(/^[A-Za-z0-9_-]+$/, { 
      message: "Le code ne peut contenir que des lettres, chiffres, tirets et underscores." 
    })
    .transform(val => val.toUpperCase()),
  
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(100, { message: "Le nom ne peut pas dépasser 100 caractères." }),
  
  bicCode: z
    .string()
    .max(11, { message: "Le code BIC/SWIFT ne peut pas dépasser 11 caractères." })
    .regex(/^[A-Za-z0-9]*$/, { 
      message: "Le code BIC ne peut contenir que des lettres et chiffres." 
    })
    .optional()
    .or(z.literal('')),
  
  isActive: z.boolean(),
});

/**
 * Type inféré du schéma de validation.
 */
type BankFormData = z.infer<typeof bankFormSchema>;

// =============================================================================
// PROPS
// =============================================================================

interface BankFormProps {
  /** Données initiales (null pour création, objet Bank pour édition) */
  initialData: Bank | null;
  /** Callback appelé lors de la sauvegarde */
  onSave: (data: CreateBankData) => Promise<void>;
  /** Callback appelé lors de l'annulation */
  onCancel: () => void;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export function BankForm({ initialData, onSave, onCancel }: BankFormProps) {
  // État de soumission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Déterminer si on est en mode édition
  const isEditMode = initialData !== null;

  // Configuration du formulaire avec react-hook-form et Zod
  // Note: Typage explicite pour react-hook-form v7.60+
  const form = useForm<BankFormData>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      code: initialData?.code ?? '',
      name: initialData?.name ?? '',
      bicCode: initialData?.bicCode ?? '',
      isActive: initialData?.isActive ?? true,
    },
  });

  /**
   * Gère la soumission du formulaire.
   */
  const handleSubmit = async (data: BankFormData) => {
    setIsSubmitting(true);
    
    try {
      // Préparer les données pour l'API
      const saveData: CreateBankData = {
        code: data.code,
        name: data.name,
        bicCode: data.bicCode || undefined,
        isActive: data.isActive,
      };
      
      await onSave(saveData);
    } catch (error) {
      // L'erreur est gérée par le parent, mais on log pour le debug
      console.error("[BankForm] Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* En-tête du formulaire */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isEditMode ? 'Modifier la banque' : 'Nouvelle banque'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditMode 
                ? 'Modifiez les informations de l\'établissement bancaire.'
                : 'Ajoutez un nouvel établissement bancaire à votre liste.'
              }
            </p>
          </div>
        </div>

        {/* Champ Code */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: BNP, SG, CA..." 
                  {...field} 
                  className="uppercase"
                  disabled={isEditMode} // Le code ne peut pas être modifié en édition
                />
              </FormControl>
              <FormDescription>
                Code unique pour identifier la banque (2-10 caractères).
                {isEditMode && " Ce champ ne peut pas être modifié."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ Nom */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la banque *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: BNP Paribas, Société Générale..." 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Nom complet de l'établissement bancaire.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ Code BIC */}
        <FormField
          control={form.control}
          name="bicCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code BIC/SWIFT</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: BNPAFRPP, SOGEFRPP..." 
                  {...field} 
                  className="uppercase"
                />
              </FormControl>
              <FormDescription>
                Code d'identification bancaire international (optionnel).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Switch Actif */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Banque active</FormLabel>
                <FormDescription>
                  Une banque inactive n'apparaîtra plus dans les listes de sélection.
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
            {isEditMode ? 'Enregistrer les modifications' : 'Créer la banque'}
          </Button>
        </div>
      </form>
    </Form>
  );
}