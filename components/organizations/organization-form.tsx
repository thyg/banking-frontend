"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Organization, CreateOrganizationPayload, UpdateOrganizationPayload } from "@/types/organization";
import { ORGANIZATION_TYPES } from "@/types/organization";

const createSchema = z.object({
  code: z.string().min(2, "Code requis (min. 2 caractères)").max(20),
  legalName: z.string().min(2, "Raison sociale requise"),
  displayName: z.string().min(2, "Nom affiché requis"),
  organizationType: z.string().min(1, "Type requis"),
  businessActorId: z.string().optional(),
});

const editSchema = z.object({
  legalName: z.string().min(2, "Raison sociale requise"),
  displayName: z.string().min(2, "Nom affiché requis"),
  organizationType: z.string().min(1, "Type requis"),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

interface Props {
  organization?: Organization | null;
  onSave: (payload: CreateOrganizationPayload | UpdateOrganizationPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function OrganizationForm({ organization, onSave, onCancel, loading }: Props) {
  const isEdit = !!organization;

  const form = useForm<CreateForm>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      code: organization?.code ?? "",
      legalName: organization?.legalName ?? "",
      displayName: organization?.displayName ?? "",
      organizationType: organization?.organizationType ?? "",
      businessActorId: organization?.businessActorId ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      code: organization?.code ?? "",
      legalName: organization?.legalName ?? "",
      displayName: organization?.displayName ?? "",
      organizationType: organization?.organizationType ?? "",
      businessActorId: organization?.businessActorId ?? "",
    });
  }, [organization]);

  const handleSubmit = async (data: CreateForm) => {
    if (isEdit) {
      await onSave({
        legalName: data.legalName,
        displayName: data.displayName,
        organizationType: data.organizationType,
      } as UpdateOrganizationPayload);
    } else {
      await onSave({
        code: data.code,
        legalName: data.legalName,
        displayName: data.displayName,
        organizationType: data.organizationType,
        businessActorId: data.businessActorId || undefined,
      } as CreateOrganizationPayload);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" placeholder="ORG-001" {...form.register("code")} />
          {form.formState.errors.code && (
            <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="legalName">Raison sociale</Label>
        <Input id="legalName" placeholder="SARL Exemple" {...form.register("legalName")} />
        {form.formState.errors.legalName && (
          <p className="text-xs text-red-500">{form.formState.errors.legalName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">Nom affiché</Label>
        <Input id="displayName" placeholder="Exemple" {...form.register("displayName")} />
        {form.formState.errors.displayName && (
          <p className="text-xs text-red-500">{form.formState.errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Type d'organisation</Label>
        <Select
          defaultValue={organization?.organizationType}
          onValueChange={(v) => form.setValue("organizationType", v, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir un type..." />
          </SelectTrigger>
          <SelectContent>
            {ORGANIZATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.organizationType && (
          <p className="text-xs text-red-500">{form.formState.errors.organizationType.message}</p>
        )}
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="businessActorId">ID Acteur métier <span className="text-slate-400">(optionnel)</span></Label>
          <Input id="businessActorId" placeholder="UUID..." {...form.register("businessActorId")} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </form>
  );
}
