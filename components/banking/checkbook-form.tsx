/**
 * @file components/banking/checkbook-form.tsx
 * @description Formulaire de création/édition d'un chéquier.
 * 
 * @version 1.0.0
 * @date 2024-12-24
 */
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Types
import { Checkbook } from '@/types/banking';
import { BankAccount } from '@/types/banking';

// Composants UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2 } from 'lucide-react';
import { getBankAccounts } from '@/lib/api/banking'; // Supposé exister

// Schéma de validation Zod
const checkbookFormSchema = z.object({
  bankAccountId: z.string().min(1, "Le compte bancaire est obligatoire."),
  rib: z.string().min(1, "Le RIB est obligatoire."),
  prefix: z.string().min(1, "La racine est obligatoire.").max(20),
  startNumber: z.coerce.number().int().positive("Le numéro de début doit être positif."),
  endNumber: z.coerce.number().int().positive("Le numéro de fin doit être positif."),
}).refine(data => data.endNumber > data.startNumber, {
  message: "Le numéro de fin doit être supérieur au numéro de début.",
  path: ["endNumber"],
});

type CheckbookFormData = z.infer<typeof checkbookFormSchema>;

interface CheckbookFormProps {
  initialData: Checkbook | null;
  onSave: (data: CheckbookFormData) => Promise<void>;
  onCancel: () => void;
}

export function CheckbookForm({ initialData, onSave, onCancel }: CheckbookFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const isEditMode = initialData !== null;

  const form = useForm<CheckbookFormData>({
    resolver: zodResolver(checkbookFormSchema),
    defaultValues: {
      bankAccountId: initialData?.bankAccountId ?? '',
      rib: initialData?.rib ?? '',
      prefix: initialData?.prefix ?? '',
      startNumber: initialData?.startNumber ?? ('' as unknown as number),
      endNumber: initialData?.endNumber ?? ('' as unknown as number),
    },
  });

  // Charger les comptes bancaires
  useEffect(() => {
    async function loadAccounts() {
      setIsLoading(true);
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error("Erreur chargement comptes bancaires:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
  }, []);

  // Trouver le nom du compte sélectionné
  const selectedAccountId = form.watch('bankAccountId');
  const selectedAccount = bankAccounts.find(a => a.id === selectedAccountId);

  const handleAccountChange = (accountId: string) => {
    const account = bankAccounts.find(a => a.id === accountId);
    if (account) {
      // Mettre à jour le RIB avec l'IBAN du compte (sans espaces pour respecter la limite de 30 car)
      const rib = account.iban
        ? account.iban.replace(/\s/g, '')
        : account.accountNumber;
      form.setValue('rib', rib);
    }
  };

  const handleSubmit = async (data: CheckbookFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error("Erreur sauvegarde chéquier:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher un loader si les comptes sont en chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    <SelectValue placeholder="Sélectionnez un compte">
                      {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : "Sélectionnez un compte"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
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
          name="rib"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RIB *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="RIB du compte" disabled={isEditMode} />
              </FormControl>
              <FormDescription>Auto-rempli depuis le compte si possible.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Racine / Préfixe *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Partie commune du numéro de chèque" disabled={isEditMode}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de début *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 458701"
                    disabled={isEditMode}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de fin *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 458750"
                    disabled={isEditMode}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting || isEditMode}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
      </form>
    </Form>
  );
}