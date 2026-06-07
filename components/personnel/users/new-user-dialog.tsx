"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  username: z.string().min(3, "Minimum 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export interface NewUserPayload {
  username: string;
  email: string;
  password: string;
}

interface NewUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewUserPayload) => Promise<void>;
}

export function NewUserDialog({ isOpen, onClose, onSubmit }: NewUserDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit({ username: data.username, email: data.email, password: data.password });
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
          <DialogDescription>
            L'utilisateur pourra se connecter avec son email et mot de passe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom d'utilisateur *</FormLabel>
                <FormControl><Input placeholder="ex: jdupont" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl><Input type="email" placeholder="ex: jean.dupont@demo.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe *</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmer le mot de passe *</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Création…" : "Créer l'utilisateur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
