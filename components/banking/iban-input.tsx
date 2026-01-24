/**
 * @file components/banking/iban-input.tsx
 * @description Composant de saisie IBAN avec validation temps réel.
 * Utilise le format Cameroun: CMkk BBBB GGGG CCCCCCCCCCCC CC (27 chars)
 *
 * @version 1.0.0
 * @date 2024-12-30
 */
"use client";

import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IbanInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Longueurs IBAN par code pays.
 * Inclut les pays CEMAC et les principaux pays européens.
 */
const IBAN_LENGTHS: Record<string, number> = {
  // Zone CEMAC
  CM: 27, // Cameroun
  CF: 27, // Centrafrique
  TD: 27, // Tchad
  CG: 27, // Congo
  GQ: 27, // Guinée équatoriale
  GA: 27, // Gabon
  // Europe
  FR: 27,
  DE: 22,
  ES: 24,
  IT: 27,
  GB: 22,
  BE: 16,
  CH: 21,
  NL: 18,
  PT: 25,
  AT: 20,
  LU: 20,
};

/**
 * Valide un IBAN avec l'algorithme MOD 97.
 * Compatible avec tous les pays supportés par le backend.
 */
function validateIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase();

  // Longueur minimum et format de base
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) return false;

  // Vérifier la longueur spécifique au pays
  const countryCode = cleaned.substring(0, 2);
  const expectedLength = IBAN_LENGTHS[countryCode];
  if (expectedLength && cleaned.length !== expectedLength) return false;

  // Validation MOD 97
  // Réorganiser: déplacer les 4 premiers caractères à la fin
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);

  // Convertir les lettres en chiffres (A=10, B=11, ..., Z=35)
  let numeric = "";
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numeric += (char.charCodeAt(0) - 55).toString();
    } else {
      numeric += char;
    }
  }

  // Utiliser BigInt pour les grands nombres
  try {
    return BigInt(numeric) % BigInt(97) === BigInt(1);
  } catch {
    return false;
  }
}

/**
 * Formate un IBAN avec espaces tous les 4 caractères.
 */
function formatIban(input: string): string {
  const cleaned = input.replace(/\s/g, "").toUpperCase();
  const limited = cleaned.substring(0, 34);
  return limited.replace(/(.{4})(?!$)/g, "$1 ");
}

/**
 * Composant de saisie IBAN avec validation en temps réel.
 *
 * @example
 * <IbanInput
 *   value={iban}
 *   onChange={(value, isValid) => {
 *     setIban(value);
 *     setIsIbanValid(isValid);
 *   }}
 *   placeholder="CM21 1000 2000 0000 0000 0000 30"
 * />
 */
export function IbanInput({
  value,
  onChange,
  label = "IBAN",
  required = false,
  disabled = false,
  className,
  placeholder = "CM21 1000 2000 0000 0000 0000 30",
}: IbanInputProps) {
  const [validationState, setValidationState] = useState<"idle" | "valid" | "invalid">("idle");
  const [isValidating, setIsValidating] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatIban(rawValue);
      const cleaned = formatted.replace(/\s/g, "");

      setIsValidating(true);

      // Validation avec petit délai pour UX
      setTimeout(() => {
        if (cleaned.length >= 15) {
          const isValid = validateIban(cleaned);
          setValidationState(isValid ? "valid" : "invalid");
          onChange(cleaned, isValid);
        } else if (cleaned.length === 0) {
          setValidationState("idle");
          onChange("", false);
        } else {
          setValidationState("idle");
          onChange(cleaned, false);
        }
        setIsValidating(false);
      }, 150);
    },
    [onChange]
  );

  const displayValue = formatIban(value);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="iban">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id="iban"
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={42} // 34 chars + 8 espaces max
          className={cn(
            "pr-10 font-mono tracking-wider",
            validationState === "valid" && "border-green-500 focus-visible:ring-green-500",
            validationState === "invalid" && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isValidating && validationState === "valid" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {!isValidating && validationState === "invalid" && (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      {validationState === "invalid" && (
        <p className="text-sm text-destructive">
          Format IBAN invalide
        </p>
      )}
    </div>
  );
}
