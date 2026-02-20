"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { BankCategory } from '@/types/banking';

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
import { Loader2, Tag } from 'lucide-react';

const bankCategorySchema = z.object({
  code: z
    .string()
    .min(2, { message: "Le code doit contenir au moins 2 caractères." })
    .max(50, { message: "Le code ne peut pas dépasser 50 caractères." })
    .regex(/^[A-Za-z0-9_]+$/, {
      message: "Le code ne peut contenir que des lettres, chiffres et underscores."
    })
    .transform(val => val.toUpperCase()),

  label: z
    .string()
    .min(2, { message: "Le libellé doit contenir au moins 2 caractères." })
    .max(100, { message: "Le libellé ne peut pas dépasser 100 caractères." }),
});

type BankCategoryFormData = z.infer<typeof bankCategorySchema>;

interface BankCategoryFormProps {
  initialData: BankCategory | null;
  onSave: (data: BankCategoryFormData) => Promise<void>;
  onCancel: () => void;
}

export function BankCategoryForm({ initialData, onSave, onCancel }: BankCategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = initialData !== null;

  const form = useForm<BankCategoryFormData>({
    resolver: zodResolver(bankCategorySchema),
    defaultValues: {
      code: initialData?.code ?? '',
      label: initialData?.label ?? '',
    },
  });

  const handleSubmit = async (data: BankCategoryFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error("[BankCategoryForm] Erreur:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* En-tête - responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b">
          <div className="p-2 bg-purple-100 rounded-lg w-fit">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              {isEditMode ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {isEditMode
                ? "Modifiez les informations de la catégorie."
                : "Ajoutez une nouvelle catégorie d'institution financière."
              }
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: BANK, MOBILE_MONEY, MICROFINANCE..."
                  {...field}
                  className="uppercase"
                  disabled={isEditMode}
                />
              </FormControl>
              <FormDescription>
                Identifiant unique de la catégorie (lettres, chiffres, underscores).
                {isEditMode && " Ce champ ne peut pas être modifié."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Libellé *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Banque traditionnelle, Opérateur Mobile Money..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Nom affiché dans les listes de sélection.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Boutons d'action - responsive */}
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
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Enregistrer' : 'Créer la catégorie'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
