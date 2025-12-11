/**
 * @file lib/utils.ts
 * @description Utilitaires partagés pour l'application.
 * Fonction cn() pour merger les classes Tailwind.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine les classes CSS avec gestion des conflits Tailwind.
 * @example
 * cn("px-2 py-1", "px-4") // → "py-1 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}