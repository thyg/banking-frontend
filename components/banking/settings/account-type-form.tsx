"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AccountType, CreateAccountTypeData } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, AlertCircle, CheckSquare, Banknote, PackageOpen, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schéma Zod
const accountTypeSchema = z.object({
  code: z.string().min(1, "Le code est requis").max(20).regex(/^[A-Za-z0-9_]+$/, "Le code ne doit contenir que des lettres, chiffres et underscores"),
  libelle: z.string().min(1, "Le libellé est requis").max(100),
  description: z.string().max(500).optional(),
  peutEmettreChecques: z.boolean(),
  peutRecevoirChecques: z.boolean(),
  peutTransactionsEspeces: z.boolean(),
  decouvertAutorise: z.boolean(),
  ordreAffichage: z.coerce.number().int("Doit être un nombre entier").optional(),
  isActive: z.boolean(),
});

type AccountTypeFormData = z.infer<typeof accountTypeSchema>;

interface AccountTypeFormProps {
  initialData?: AccountType;
  onSave: (data: CreateAccountTypeData, id?: string) => Promise<void>;
  onCancel: () => void;
}

// SOUS-COMPOSANT TOGGLE AMÉLIORÉ (avec correction pour les thèmes)
function PermissionToggle({ field, icon, title, description }: { field: any; icon: React.ReactNode; title: string; description: string; }) {
  return (
    <FormItem
      className={cn(
        "flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm transition-colors",
        field.value
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800"
          : "bg-background hover:bg-muted/50 dark:border-muted"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1", field.value ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")}>{icon}</div>
        <div className="space-y-0.5">
          <FormLabel>{title}</FormLabel>
          <FormDescription>{description}</FormDescription>
        </div>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
          className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700"
        />
      </FormControl>
    </FormItem>
  );
}

// COMPOSANT PRINCIPAL
export function AccountTypeForm({ initialData, onSave, onCancel }: AccountTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AccountTypeFormData>({
    resolver: zodResolver(accountTypeSchema),
    defaultValues: {
      code: initialData?.code || '',
      libelle: initialData?.libelle || '',
      description: initialData?.description || '',
      peutEmettreChecques: initialData?.peutEmettreChecques || false,
      peutRecevoirChecques: initialData?.peutRecevoirChecques || false,
      peutTransactionsEspeces: initialData?.peutTransactionsEspeces || false,
      decouvertAutorise: initialData?.decouvertAutorise || false,
      ordreAffichage: initialData?.ordreAffichage || 0,
      isActive: initialData?.isActive ?? true,
    },
  });

  const handleSubmit = async (data: AccountTypeFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const finalData: CreateAccountTypeData = {
        ...data,
        decouvertParDefaut: 0,
      };
      await onSave(finalData, initialData?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 bg-background text-foreground p-1">
        {error && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>)}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: COMP_COURANT" {...field} />
                </FormControl>
                <FormDescription>Code unique du type de compte (lettres, chiffres et underscores)</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="libelle" render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Compte Courant" {...field} />
                </FormControl>
                <FormDescription>Nom d'affichage du type</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Description du type de compte..." {...field} />
              </FormControl>
              <FormDescription>Description détaillée (optionnelle)</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Permissions</h3>
          <div className="space-y-2">
            <FormField control={form.control} name="peutEmettreChecques" render={({ field }) => (<PermissionToggle field={field} icon={<CheckSquare size={20} />} title="Émission de chèques" description="Autorise la création de chèques." />)} />
            <FormField control={form.control} name="peutRecevoirChecques" render={({ field }) => (<PermissionToggle field={field} icon={<PackageOpen size={20} />} title="Réception de chèques" description="Autorise l'encaissement de chèques." />)} />
            <FormField control={form.control} name="peutTransactionsEspeces" render={({ field }) => (<PermissionToggle field={field} icon={<Banknote size={20} />} title="Transactions en espèces" description="Autorise les dépôts et retraits." />)} />
          </div>
        </div>
        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Découvert</h3>
          <FormField control={form.control} name="decouvertAutorise" render={({ field }) => (
            <PermissionToggle field={field} icon={<UserCheck size={20} />} title="Découvert autorisé" description="Permet aux comptes de ce type d'avoir un solde négatif." />
          )} />
        </div>
        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Configuration Avancée</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="ordreAffichage" render={({ field }) => (
              <FormItem>
                <FormLabel>Ordre d'affichage</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>Position dans la liste (optionnelle)</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border dark:border-muted p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Type actif</FormLabel>
                  <FormDescription>Le type est disponible pour utilisation</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700"
                  />
                </FormControl>
              </FormItem>
            )} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Créer')}
          </Button>
        </div>
      </form>
    </Form>
  );
}