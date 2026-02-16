/**
 * @file lib/api/checkbook.ts
 * @description API pour la gestion des chéquiers.
 * @version 2.0.0 - Suppression du mock "default-erp-checkbook" et simplification pour utiliser uniquement le backend.
 */

import type { Checkbook } from '@/types/banking';

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const headers = {
  'Content-Type': 'application/json',
};

// =============================================================================
// TYPES (déjà définis, mais laissés ici pour le contexte)
// =============================================================================

export interface CreateCheckbookData {
  bankAccountId: string;
  prefix: string;
  startNumber: number;
  numberOfPages: number;
}

export interface UpdateCheckbookData {
  status?: 'ACTIVE' | 'FINISHED' | 'CANCELLED';
}

export interface CheckbookStats {
  usedChecksCount: number;
  totalAmountIssued: number;
  totalAmountCashed: number;
  remainingChecks: number;
}

// =============================================================================
// HELPER
// =============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));
    throw new Error(error.message || `Erreur HTTP: ${response.status}`);
  }
  return response.json();
}

// =============================================================================
// API CHÉQUIERS - LECTURE
// =============================================================================

/**
 * Récupère tous les chéquiers (réels et système) depuis le backend.
 */
export async function getCheckbooks(): Promise<Checkbook[]> {
  console.log('[API:Checkbook] getCheckbooks');
  const response = await fetch(`${API_BASE_URL}/checkbooks`);
  return handleResponse<Checkbook[]>(response);
}

/**
 * Récupère un chéquier par son ID.
 */
export async function getCheckbookById(id: string): Promise<Checkbook | null> {
  console.log('[API:Checkbook] getCheckbookById:', id);
  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks/${id}`);
    if (response.status === 404) return null;
    return handleResponse<Checkbook>(response);
  } catch (error) {
    console.error('[API:Checkbook] Erreur getCheckbookById:', error);
    return null;
  }
}

/**
 * Récupère le chéquier système (type=FICTIF, isSystem=true).
 * Ce chéquier est utilisé pour suivre les chèques reçus.
 *
 * @returns Le chéquier système ou null si non trouvé
 */
export async function getSystemCheckbook(): Promise<Checkbook | null> {
  console.log('[API:Checkbook] getSystemCheckbook');
  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks/system`);
    if (response.status === 404) {
      console.warn('[API:Checkbook] Chéquier système non trouvé');
      return null;
    }
    return handleResponse<Checkbook>(response);
  } catch (error) {
    console.error('[API:Checkbook] Erreur getSystemCheckbook:', error);
    return null;
  }
}

/**
 * Récupère les chéquiers actifs pour un compte donné.
 * Cela inclut les chéquiers physiques du compte ET le chéquier système global.
 */
export async function getActiveCheckbooksForAccount(accountId: string): Promise<Checkbook[]> {
  const allCheckbooks = await getCheckbooks();
  return allCheckbooks.filter(cb => 
    cb.status === 'ACTIVE' && (cb.bankAccountId === accountId || cb.isSystem)
  );
}


// =============================================================================
// API CHÉQUIERS - ÉCRITURE
// =============================================================================

/**
 * Crée un nouveau chéquier.
 */
export async function createCheckbook(data: CreateCheckbookData): Promise<Checkbook> {
  console.log('[API:Checkbook] createCheckbook:', data);
  const response = await fetch(`${API_BASE_URL}/checkbooks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<Checkbook>(response);
}

/**
 * Annule un chéquier.
 */
export async function cancelCheckbook(id: string): Promise<Checkbook> {
  console.log('[API:Checkbook] cancelCheckbook:', id);
  const response = await fetch(`${API_BASE_URL}/checkbooks/${id}/cancel`, {
    method: 'POST',
    headers,
  });
  return handleResponse<Checkbook>(response);
}

// =============================================================================
// ACTIONS SUR LES CHÉQUIERS
// =============================================================================

/**
 * Récupère le prochain numéro de chèque disponible sans le réserver.
 * Pour affichage dans le formulaire.
 */
export async function peekNextCheckNumber(checkbookId: string): Promise<string> {
  console.log('[API:Checkbook] peekNextCheckNumber:', checkbookId);
  
  const response = await fetch(`${API_BASE_URL}/checkbooks/${checkbookId}/peek-next-number`);
  const result = await handleResponse<{ checkNumber: string }>(response);
  return result.checkNumber;
}
// =============================================================================
// STATISTIQUES
// =============================================================================

/**
 * Récupère les statistiques d'utilisation d'un chéquier depuis le backend.
 */
export async function getCheckbookStats(id: string): Promise<CheckbookStats> {
  console.log('[API:Checkbook] getCheckbookStats:', id);
  try {
    const response = await fetch(`${API_BASE_URL}/checkbooks/${id}/stats`);
    return handleResponse<CheckbookStats>(response);
  } catch (error) {
    console.error('[API:Checkbook] Erreur getCheckbookStats:', error);
    throw error; // Propage l'erreur pour que le composant UI puisse l'afficher.
  }
}