/**
 * @file components/banking/settings/bank-form.tsx
 * @description Formulaire de création et d'édition pour une banque.
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 * 
 * @version 1.0.1 - Fix typage react-hook-form v7.60
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { Bank, BankCategory, CreateBankData } from '@/types/banking';

// API
import { getBankCategories } from '@/lib/api/banking';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, Building2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea'

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
  
  swiftCode: z
    .string()
    .max(11, { message: "Le code BIC/SWIFT ne peut pas dépasser 11 caractères." })
    .regex(/^[A-Za-z0-9]*$/, {
      message: "Le code BIC ne peut contenir que des lettres et chiffres."
    })
    .optional()
    .or(z.literal('')),

  bankCode: z
    .string()
    .length(5, { message: "Le code banque doit contenir exactement 5 chiffres." })
    .regex(/^[0-9]{5}$/, {
      message: "Le code banque doit contenir uniquement 5 chiffres."
    })
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .max(500, { message: "L'adresse ne peut pas dépasser 500 caractères." })
    .optional()
    .or(z.literal('')),

  bankCategoryId: z
    .string({ required_error: "Veuillez sélectionner une catégorie." })
    .min(1, { message: "Veuillez sélectionner une catégorie." }),

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
  const [categories, setCategories] = useState<BankCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Déterminer si on est en mode édition
  const isEditMode = initialData !== null;

  // Charger les catégories de banques
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getBankCategories();
        setCategories(data);
      } catch (error) {
        console.error("[BankForm] Erreur chargement catégories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // Configuration du formulaire avec react-hook-form et Zod
  const form = useForm<BankFormData>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: {
      code: initialData?.code ?? '',
      name: initialData?.name ?? '',
      swiftCode: initialData?.swiftCode ?? '',
      bankCode: initialData?.bankCode ?? '',
      address: initialData?.address ?? '',
      bankCategoryId: initialData?.bankCategoryId ?? '',
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
        swiftCode: data.swiftCode || undefined,
        bankCode: data.bankCode || undefined,
        address: data.address || undefined,
        bankCategoryId: data.bankCategoryId,
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
        {/* En-tête du formulaire - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-blue-100 rounded-lg w-fit">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              {isEditMode ? 'Modifier la banque' : 'Nouvelle banque'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {isEditMode
                ? 'Modifiez les informations de l\'établissement bancaire.'
                : 'Ajoutez un nouvel établissement bancaire à votre liste.'
              }
            </p>
          </div>
        </div>

        {/* Grille responsive pour Code et Nom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                    disabled={isEditMode}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Code unique (2-10 car.).
                  {isEditMode && " Non modifiable."}
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
                <FormDescription className="text-xs">
                  Nom complet de l'établissement bancaire.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Champ Catégorie - pleine largeur */}
        <FormField
          control={form.control}
          name="bankCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingCategories
                          ? "Chargement..."
                          : "Sélectionnez une catégorie..."
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                Type d'institution (Banque, Mobile Money, Microfinance...).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Grille responsive pour Code BIC et Code Banque */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Champ Code BIC/SWIFT */}
          <FormField
            control={form.control}
            name="swiftCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code BIC/SWIFT</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: BNPAFRPP..."
                    {...field}
                    className="uppercase"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Code d'identification bancaire international.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Champ Code Banque National */}
          <FormField
            control={form.control}
            name="bankCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code Banque National</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 10005"
                    maxLength={5}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Code à 5 chiffres pour la génération d'IBAN.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Champ Adresse - pleine largeur */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adresse du siège ou de l'agence principale..."
                  rows={3}
                  className="resize-none sm:resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Adresse postale de la banque (optionnel).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Switch Actif - responsive */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5 min-w-0 flex-1">
                <FormLabel className="text-sm sm:text-base">Banque active</FormLabel>
                <FormDescription className="text-xs sm:text-sm">
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

        {/* Pied de page avec boutons d'action - responsives */}
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
            {isEditMode ? 'Enregistrer les modifications' : 'Créer la banque'}
          </Button>
        </div>
      </form>
    </Form>
  );
}