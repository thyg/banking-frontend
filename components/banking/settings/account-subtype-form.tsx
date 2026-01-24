/**
 * @file components/banking/settings/account-subtype-form.tsx
 * @description Formulaire de creation/edition d'un sous-type de compte.
 * Les sous-types heritent des permissions du type parent mais peuvent les surcharger.
 *
 * @version 1.0.0
 * @date 2024-12-31
 */

"use client";

import React, { useState } from 'react';
import { AccountType, AccountSubType, CreateAccountSubTypeData } from '@/types/banking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ArrowRight, Info } from 'lucide-react';

interface AccountSubTypeFormProps {
  parentType: AccountType;
  initialData: AccountSubType | null;
  onSave: (data: CreateAccountSubTypeData) => Promise<void>;
  onCancel: () => void;
}

type OverrideState = 'inherit' | 'true' | 'false';

export function AccountSubTypeForm({ parentType, initialData, onSave, onCancel }: AccountSubTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState(initialData?.code || '');
  const [libelle, setLibelle] = useState(initialData?.libelle || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [ordreAffichage, setOrdreAffichage] = useState(initialData?.ordreAffichage?.toString() || '0');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Override states - 'inherit' means use parent value
  const getInitialOverride = (override: boolean | undefined | null, parentValue: boolean): OverrideState => {
    if (override === null || override === undefined) return 'inherit';
    return override ? 'true' : 'false';
  };

  const [emettreOverride, setEmettreOverride] = useState<OverrideState>(
    getInitialOverride(initialData?.peutEmettreChequesOverride, parentType.peutEmettreChecques)
  );
  const [recevoirOverride, setRecevoirOverride] = useState<OverrideState>(
    getInitialOverride(initialData?.peutRecevoirChequesOverride, parentType.peutRecevoirChecques)
  );
  const [especesOverride, setEspecesOverride] = useState<OverrideState>(
    getInitialOverride(initialData?.peutTransactionsEspecesOverride, parentType.peutTransactionsEspeces)
  );
  const [decouvertOverride, setDecouvertOverride] = useState<OverrideState>(
    getInitialOverride(initialData?.decouvertAutoriseOverride, parentType.decouvertAutorise)
  );
  const [decouvertMontantOverride, setDecouvertMontantOverride] = useState(
    initialData?.decouvertParDefautOverride?.toString() || ''
  );

  // Compute effective values
  const getEffectiveValue = (override: OverrideState, parentValue: boolean): boolean => {
    if (override === 'inherit') return parentValue;
    return override === 'true';
  };

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
      const data: CreateAccountSubTypeData = {
        accountTypeId: parentType.id,
        code: code.toUpperCase().trim(),
        libelle: libelle.trim(),
        description: description.trim() || undefined,
        peutEmettreChequesOverride: emettreOverride === 'inherit' ? null : emettreOverride === 'true',
        peutRecevoirChequesOverride: recevoirOverride === 'inherit' ? null : recevoirOverride === 'true',
        peutTransactionsEspecesOverride: especesOverride === 'inherit' ? null : especesOverride === 'true',
        decouvertAutoriseOverride: decouvertOverride === 'inherit' ? null : decouvertOverride === 'true',
        decouvertParDefautOverride: decouvertMontantOverride ? parseFloat(decouvertMontantOverride) : null,
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

  // Component for override selection
  const OverrideSelector = ({
    label,
    description: desc,
    parentValue,
    value,
    onChange,
  }: {
    label: string;
    description: string;
    parentValue: boolean;
    value: OverrideState;
    onChange: (v: OverrideState) => void;
  }) => {
    const effectiveValue = getEffectiveValue(value, parentValue);

    return (
      <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <div className="flex items-center gap-2">
            {value === 'inherit' && (
              <Badge variant="outline" className="text-xs">
                Herite du parent
              </Badge>
            )}
            <Badge variant={effectiveValue ? "default" : "secondary"} className="text-xs">
              {effectiveValue ? "Oui" : "Non"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            variant={value === 'inherit' ? 'default' : 'outline'}
            onClick={() => onChange('inherit')}
            className="text-xs"
          >
            Heriter ({parentValue ? 'Oui' : 'Non'})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value === 'true' ? 'default' : 'outline'}
            onClick={() => onChange('true')}
            className="text-xs"
          >
            Oui
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value === 'false' ? 'default' : 'outline'}
            onClick={() => onChange('false')}
            className="text-xs"
          >
            Non
          </Button>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Parent type info */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800">
          Sous-type de <strong>{parentType.libelle}</strong> ({parentType.code})
        </span>
      </div>

      {/* Basic info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="INTERNE"
              maxLength={20}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Identifiant unique du sous-type
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
            placeholder="Compte Interne"
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
            placeholder="Description optionnelle..."
            maxLength={500}
            rows={2}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Separator />

      {/* Permissions with override */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Permissions</h3>
          <Badge variant="outline" className="text-xs">
            Herite de {parentType.code}
          </Badge>
        </div>

        <OverrideSelector
          label="Peut emettre des cheques"
          description="Autorise l'emission de cheques"
          parentValue={parentType.peutEmettreChecques}
          value={emettreOverride}
          onChange={setEmettreOverride}
        />

        <OverrideSelector
          label="Peut recevoir des cheques"
          description="Autorise la reception de cheques"
          parentValue={parentType.peutRecevoirChecques}
          value={recevoirOverride}
          onChange={setRecevoirOverride}
        />

        <OverrideSelector
          label="Transactions en especes"
          description="Autorise les depots et retraits en especes"
          parentValue={parentType.peutTransactionsEspeces}
          value={especesOverride}
          onChange={setEspecesOverride}
        />

        <OverrideSelector
          label="Decouvert autorise"
          description="Permet un solde negatif"
          parentValue={parentType.decouvertAutorise}
          value={decouvertOverride}
          onChange={setDecouvertOverride}
        />

        {(decouvertOverride === 'true' || (decouvertOverride === 'inherit' && parentType.decouvertAutorise)) && (
          <div className="space-y-2 ml-4">
            <Label htmlFor="decouvertMontant">Limite de decouvert par defaut (XAF)</Label>
            <Input
              id="decouvertMontant"
              type="number"
              value={decouvertMontantOverride}
              onChange={(e) => setDecouvertMontantOverride(e.target.value)}
              placeholder={`Heriter: ${parentType.decouvertParDefaut}`}
              min={0}
              step={1000}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Laisser vide pour heriter ({parentType.decouvertParDefaut} XAF)
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Sous-type actif</Label>
          <p className="text-xs text-muted-foreground">
            Les sous-types inactifs ne peuvent pas etre assignes
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
          {initialData ? 'Mettre a jour' : 'Creer le sous-type'}
        </Button>
      </div>
    </form>
  );
}
