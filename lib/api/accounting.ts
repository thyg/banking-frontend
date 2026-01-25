/**
 * @file lib/api/accounting.ts
 * @description Fonctions d'API pour le module Comptabilité.
 * Ce fichier centralise les appels API liés à la comptabilité.
 * 
 * @version 1.0.0
 */

import { Journal } from '@/types/accounting';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Délai simulé pour les opérations de lecture (ms) */
const READ_DELAY = 300;

/**
 * Helper pour simuler la latence du réseau.
 */
const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// DONNÉES MOCKÉES
// =============================================================================

/**
 * Liste des journaux comptables simulés.
 * Les IDs sont des UUIDs valides pour compatibilité avec le backend.
 */
const mockJournals: Journal[] = [
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    code: 'BQ1',
    name: 'Banque Principale',
    type: 'banque',
  },
  {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    code: 'BQ2',
    name: 'Banque Secondaire',
    type: 'banque',
  },
  {
    id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    code: 'BQ3',
    name: 'Banque XAF',
    type: 'banque',
  },
  {
    id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    code: 'VT',
    name: 'Journal des Ventes',
    type: 'vente',
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    code: 'AC',
    name: 'Journal des Achats',
    type: 'achat',
  },
  {
    id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    code: 'OD',
    name: 'Opérations Diverses',
    type: 'divers',
  },
];

// =============================================================================
// FONCTIONS API
// =============================================================================

/**
 * Récupère tous les journaux comptables.
 * @returns Promise<Journal[]> - Liste de tous les journaux
 */
export async function getJournals(): Promise<Journal[]> {
  await wait(READ_DELAY);
  return Promise.resolve([...mockJournals]);
}

/**
 * Récupère uniquement les journaux de type 'banque'.
 * Cette fonction est utilisée pour peupler le select dans le formulaire
 * de compte bancaire.
 * 
 * @returns Promise<Journal[]> - Liste des journaux bancaires
 */
export async function getBankJournals(): Promise<Journal[]> {
  await wait(READ_DELAY);
  
  const bankJournals = mockJournals.filter(journal => journal.type === 'banque');
  
  // Tri par code alphabétique
  bankJournals.sort((a, b) => a.code.localeCompare(b.code));
  
  return Promise.resolve(bankJournals);
}

/**
 * Récupère un journal par son ID.
 * @param id - ID du journal
 * @returns Promise<Journal | null> - Le journal ou null si non trouvé
 */
export async function getJournalById(id: string): Promise<Journal | null> {
  await wait(READ_DELAY);
  
  const journal = mockJournals.find(j => j.id === id);
  return Promise.resolve(journal || null);
}

/**
 * Récupère les journaux par type.
 * @param type - Type de journal ('banque', 'vente', 'achat', 'divers')
 * @returns Promise<Journal[]> - Liste des journaux du type spécifié
 */
export async function getJournalsByType(type: Journal['type']): Promise<Journal[]> {
  await wait(READ_DELAY);
  
  const journals = mockJournals.filter(journal => journal.type === type);
  
  return Promise.resolve(journals);
}