"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AccountConnectorField } from "@/types/banking";

interface DynamicConnectorFieldsProps {
  fields: AccountConnectorField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

function getInputType(fieldType: string): string {
  switch (fieldType) {
    case "PHONE":
      return "tel";
    case "EMAIL":
      return "email";
    case "NUMBER":
      return "number";
    default:
      return "text";
  }
}

function getPlaceholder(fieldType: string, label: string): string {
  switch (fieldType) {
    case "PHONE":
      return "+237 6XX XXX XXX";
    case "EMAIL":
      return "exemple@domaine.com";
    default:
      return label;
  }
}

export function DynamicConnectorFields({
  fields,
  values,
  onChange,
  errors,
  disabled = false,
}: DynamicConnectorFieldsProps) {
  const sortedFields = [...fields].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const handleFieldChange = (fieldKey: string, value: string) => {
    onChange({ ...values, [fieldKey]: value });
  };

  if (sortedFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sortedFields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <Label
            htmlFor={`connector-field-${field.fieldKey}`}
            className={cn(field.isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}
          >
            {field.label}
          </Label>
          <Input
            id={`connector-field-${field.fieldKey}`}
            type={getInputType(field.fieldType)}
            placeholder={getPlaceholder(field.fieldType, field.label)}
            value={values[field.fieldKey] || ""}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            disabled={disabled}
            className={cn(errors?.[field.fieldKey] && "border-red-500")}
          />
          {errors?.[field.fieldKey] && (
            <p className="text-sm text-red-500">{errors[field.fieldKey]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Valide les champs dynamiques selon la configuration du connecteur.
 * Retourne un objet d'erreurs (vide si tout est valide).
 */
export function validateConnectorFields(
  fields: AccountConnectorField[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.fieldKey]?.trim() || "";

    if (field.isRequired && !value) {
      errors[field.fieldKey] = `${field.label} est requis`;
      continue;
    }

    if (value && field.fieldType === "PHONE") {
      const phoneRegex = /^[+]?[\d\s\-()]{6,20}$/;
      if (!phoneRegex.test(value)) {
        errors[field.fieldKey] = "Numéro de téléphone invalide";
      }
    }

    if (value && field.fieldType === "EMAIL") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors[field.fieldKey] = "Adresse email invalide";
      }
    }
  }

  return errors;
}
