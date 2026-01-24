/**
 * @file components/banking/settings/account-type-form.tsx
 * @description Formulaire de creation/edition d'un type de compte.
 *
 * @version 1.0.0
 * @date 2024-12-30
 */

"use client";

import React, { useState } from 'react';
import { AccountType, CreateAccountTypeData } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface AccountTypeFormProps {
  initialData: AccountType | null;
  onSave: (data: CreateAccountTypeData) => Promise<void>;
  onCancel: () => void;
}

export function AccountTypeForm({ initialData, onSave, onCancel }: AccountTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState(initialData?.code || '');
  const [libelle, setLibelle] = useState(initialData?.libelle || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [peutEmettreChecques, setPeutEmettreChecques] = useState(initialData?.peutEmettreChecques || false);
  const [peutRecevoirChecques, setPeutRecevoirChecques] = useState(initialData?.peutRecevoirChecques || false);
  const [peutTransactionsEspeces, setPeutTransactionsEspeces] = useState(initialData?.peutTransactionsEspeces || false);
  const [decouvertAutorise, setDecouvertAutorise] = useState(initialData?.decouvertAutorise || false);
  const [decouvertParDefaut, setDecouvertParDefaut] = useState(initialData?.decouvertParDefaut?.toString() || '0');
  const [ordreAffichage, setOrdreAffichage] = useState(initialData?.ordreAffichage?.toString() || '0');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    if (!code.trim()) {
      setError('Le code est requis');
      setIsSubmitting(false);
      return;
    }

    if (!libelle.trim()) {
      setError('Le libelle est requis');
      setIsSubmitting(false);
      return;
    }

    try {
      const data: CreateAccountTypeData = {
        code: code.toUpperCase().trim(),
        libelle: libelle.trim(),
        description: description.trim() || undefined,
        peutEmettreChecques,
        peutRecevoirChecques,
        peutTransactionsEspeces,
        decouvertAutorise,
        decouvertParDefaut: decouvertAutorise ? parseFloat(decouvertParDefaut) || 0 : 0,
        ordreAffichage: parseInt(ordreAffichage) || 0,
        isActive,
      };

      await onSave(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Informations de base */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CHEQUE"
              maxLength={20}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Identifiant unique (lettres, chiffres, underscores)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordreAffichage">Ordre d'affichage</Label>
            <Input
              id="ordreAffichage"
              type="number"
              value={ordreAffichage}
              onChange={(e) => setOrdreAffichage(e.target.value)}
              min={0}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="libelle">Libelle *</Label>
          <Input
            id="libelle"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Compte Cheque"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle du type de compte..."
            maxLength={500}
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Separator />

      {/* Permissions Cheques */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Permissions Cheques</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Peut emettre des cheques</Label>
            <p className="text-xs text-muted-foreground">
              Autorise l'emission de cheques depuis ce type de compte
            </p>
          </div>
          <Switch
            checked={peutEmettreChecques}
            onCheckedChange={setPeutEmettreChecques}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Peut recevoir des cheques</Label>
            <p className="text-xs text-muted-foreground">
              Autorise la reception de cheques sur ce type de compte
            </p>
          </div>
          <Switch
            checked={peutRecevoirChecques}
            onCheckedChange={setPeutRecevoirChecques}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Separator />

      {/* Permissions Especes */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Permissions Especes</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Transactions en especes</Label>
            <p className="text-xs text-muted-foreground">
              Autorise les depots et retraits en especes
            </p>
          </div>
          <Switch
            checked={peutTransactionsEspeces}
            onCheckedChange={setPeutTransactionsEspeces}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Separator />

      {/* Decouvert */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Decouvert</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Decouvert autorise</Label>
            <p className="text-xs text-muted-foreground">
              Permet aux comptes de ce type d'avoir un solde negatif
            </p>
          </div>
          <Switch
            checked={decouvertAutorise}
            onCheckedChange={setDecouvertAutorise}
            disabled={isSubmitting}
          />
        </div>

        {decouvertAutorise && (
          <div className="space-y-2">
            <Label htmlFor="decouvertParDefaut">Limite de decouvert par defaut (XAF)</Label>
            <Input
              id="decouvertParDefaut"
              type="number"
              value={decouvertParDefaut}
              onChange={(e) => setDecouvertParDefaut(e.target.value)}
              min={0}
              step={1000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Montant par defaut pour les nouveaux comptes (modifiable par compte)
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Statut */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Type actif</Label>
          <p className="text-xs text-muted-foreground">
            Les types inactifs ne peuvent pas etre assignes a de nouveaux comptes
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isSubmitting}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? 'Mettre a jour' : 'Creer'}
        </Button>
      </div>
    </form>
  );
}
