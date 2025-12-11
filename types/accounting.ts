/**
 * @file types/accounting.ts
 * @description Définition des types TypeScript pour le module Comptabilité.
 * 
 * @version 1.0.0
 * 
 * NOTE: Ce fichier reprend exactement la structure existante.
 * Les types additionnels seront ajoutés dans les incréments futurs.
 */

// =============================================================================
// TYPE PRINCIPAL (Compatible avec l'existant)
// =============================================================================

/**
 * Représente un journal comptable.
 * Les journaux sont utilisés pour catégoriser les écritures comptables.
 */
export interface Journal {
  id: string;
  name: string;
  code: string;
  type: 'banque' | 'vente' | 'achat' | 'divers';
}