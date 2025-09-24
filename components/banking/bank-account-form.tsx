/**
 * @file components/banking/bank-account-form.tsx
 * @description Formulaire de création et d'édition pour un compte bancaire.
 * Utilise react-hook-form pour la gestion de l'état et Zod pour la validation.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BankAccount } from '@/types/banking';
// Supposons l'existence d'un type Journal et d'une fonction API
import { Journal } from '@/types/accounting'; 
import { getBankJournals } from '@/lib/api/accounting';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// 1. Définition du schéma de validation avec Zod. C'est la source de vérité pour les règles du formulaire.
const bankAccountSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  bankName: z.string().min(2, { message: "Le nom de la banque est requis." }),
  accountNumber: z.string().min(10, { message: "Le numéro de compte (IBAN) semble invalide." }).trim(),
  journalId: z.string({ required_error: "Veuillez sélectionner un journal comptable." }),
  currency: z.enum(['EUR', 'USD'], { required_error: "La devise est requise." }),
});

// 2. Définition du type pour les données du formulaire, déduit du schéma Zod.
type BankAccountFormData = z.infer<typeof bankAccountSchema>;

// 3. Définition des props du composant
interface BankAccountFormProps {
  initialData: BankAccount | null; // null pour la création, un objet pour l'édition
  onSave: (data: BankAccountFormData) => Promise<void>;
  onCancel: () => void;
}

export function BankAccountForm({ initialData, onSave, onCancel }: BankAccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journals, setJournals] = useState<Journal[]>([]);

  // Configure le formulaire avec react-hook-form et le resolver Zod
  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: initialData?.name || '',
      bankName: initialData?.bankName || '',
      accountNumber: initialData?.accountNumber || '',
      journalId: initialData?.journalId || undefined,
      currency: initialData?.currency || 'EUR',
    },
  });

  // Charge les journaux comptables de type 'banque' au montage du composant
  useEffect(() => {
    async function fetchJournals() {
      try {
        // NOTE: Vous devrez créer cette fonction API qui retourne uniquement les journaux de type 'banque'
        const bankJournals = await getBankJournals();
        setJournals(bankJournals);
      } catch (error) {
        console.error("Erreur lors de la récupération des journaux bancaires:", error);
        // Afficher une notification d'erreur à l'utilisateur serait une bonne amélioration (Toast)
      }
    }
    fetchJournals();
  }, []);

  // Fonction de soumission du formulaire
  const onSubmit = async (data: BankAccountFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
    } catch (error) {
      console.error("Échec de la sauvegarde du compte bancaire:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Champ Nom du Compte */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du compte</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Compte Courant Professionnel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Champ Nom de la Banque */}
        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la banque</FormLabel>
              <FormControl>
                <Input placeholder="Ex: BNP Paribas" {...field} />
              </FormControl>
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
              <FormLabel>Numéro de compte (IBAN)</FormLabel>
              <FormControl>
                <Input placeholder="FR76..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Champ Journal Comptable (Select) */}
        <FormField
          control={form.control}
          name="journalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journal Comptable</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={journals.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le journal associé..." />
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
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Champ Devise (Select) */}
         <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Devise</FormLabel>
               <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une devise..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                   <SelectItem value="EUR">Euro (EUR)</SelectItem>
                   <SelectItem value="USD">Dollar Américain (USD)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pied de page avec les boutons d'action */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Enregistrer les modifications' : 'Créer le compte'}
          </Button>
        </div>
      </form>
    </Form>
  );
}